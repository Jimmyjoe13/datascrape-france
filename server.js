import 'dotenv/config'; // Charge les variables du .env
import { createClient } from '@supabase/supabase-js';
import express from 'express';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import UserAgent from 'user-agents';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Activation de la furtivité
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

const PORT = process.env.PORT || 3001;
const delay = (ms) => new Promise(res => setTimeout(res, ms));

// --- NOUVELLE FONCTION DE SCROLL (INCREMENTAL) ---
// Remplace autoScroll pour permettre la boucle "tant que pas assez de leads"
async function scrollDown(page) {
    return await page.evaluate(async () => {
        const wrapper = document.querySelector('div[role="feed"]');
        if (!wrapper) return false;
        
        const previousHeight = wrapper.scrollTop;
        wrapper.scrollBy(0, 1000); // Scroll d'un écran vers le bas
        await new Promise(resolve => setTimeout(resolve, 1500)); // Attente chargement Google
        
        // Retourne true si on a réussi à descendre (la page a bougé)
        return wrapper.scrollTop > previousHeight; 
    });
}

// Récupère les liens visibles à l'écran actuel
async function getVisibleLinks(page) {
    return await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('div[role="article"]'));
        return items.map(item => {
            const link = item.querySelector('a');
            return link ? link.href : null;
        }).filter(l => l !== null);
    });
}

// --- TES FONCTIONS ORIGINALES (CONSERVÉES) ---

async function scrapeCompanyWebsite(browser, url) {
    if (!url || url.includes('google') || url.includes('facebook')) return { emails: [], socials: {}, source: 'N/A' };
    
    let page;
    try {
        page = await browser.newPage();
        await page.setUserAgent(new UserAgent({ deviceCategory: 'desktop' }).toString());
        await page.setViewport({ width: 1366, height: 768 });
        
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }); // Timeout ajusté à 15s

        const scanResult = await page.evaluate(() => {
            const emailSet = new Set();
            const socialMap = {};
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

            document.querySelectorAll('a').forEach(a => {
                const href = a.href;
                if (href.includes('linkedin.com/company') || href.includes('linkedin.com/in')) socialMap.linkedin = href;
                if (href.includes('facebook.com') && !href.includes('sharer')) socialMap.facebook = href;
                if (href.includes('instagram.com')) socialMap.instagram = href;

                if (href.startsWith('mailto:')) {
                     const email = href.replace(/^mailto:/i, '').split('?')[0];
                     if (email) emailSet.add(email);
                }
            });

            (document.body.innerText.match(emailRegex) || []).forEach(e => emailSet.add(e));
            (document.body.innerHTML.match(emailRegex) || []).forEach(e => emailSet.add(e));

            return { emails: Array.from(emailSet), socials: socialMap };
        });

        let emails = [...new Set(scanResult.emails)];
        emails = emails.filter(e => {
            const isImage = e.match(/\.(png|jpg|jpeg|gif|css|js|webp|svg|woff|ttf)$/i);
            const isJunk = e.includes('sentry') || e.includes('noreply') || e.includes('domain') || e.includes('example') || e.includes('wixpress');
            return !isImage && !isJunk;
        });

        await page.close();
        return { emails, socials: scanResult.socials, source: 'Website' };

    } catch (error) {
        if (page) await page.close();
        return { emails: [], socials: {}, source: 'Error' };
    }
}

async function getLegalInfo(name, city) {
    try {
        const cleanName = name.replace(/[\(\)-]/g, ' ').trim();
        const query = `${cleanName} ${city}`;
        const response = await axios.get(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&limit=1`);
        
        if (response.data.results && response.data.results.length > 0) {
            const company = response.data.results[0];
            let dirigeant = "Non mentionné";
            if (company.dirigeants && company.dirigeants.length > 0) {
                const d = company.dirigeants[0];
                dirigeant = `${d.prenoms || ''} ${d.nom || ''}`.trim();
            }
            return {
                siren: company.siren,
                legalName: company.nom_complet,
                address: company.siege.adresse,
                dirigeant: dirigeant !== "" ? dirigeant : undefined
            };
        }
    } catch (error) {}
    return null;
}

// --- ROUTE PRINCIPALE MISE À JOUR ---

app.post('/api/scrape', async (req, res) => {
    const { sector, location, maxResults = 5 } = req.body;
    
    // Si l'utilisateur demande 50, on essaiera d'avoir 50 NOUVEAUX leads
    const targetLeads = Math.min(maxResults, 100); 

    console.log(`[SCRAPER] 🎯 Objectif : ${targetLeads} NOUVEAUX leads pour ${sector} à ${location}`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--disable-gpu'],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        });

        const page = await browser.newPage();
        await page.setUserAgent(new UserAgent({ deviceCategory: 'desktop' }).toString());

        // 1. Ouvrir Google Maps
        await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(sector + ' ' + location)}`, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Gestion cookies
        try {
            const btn = await page.waitForSelector('button[aria-label="Tout refuser"], button[aria-label="Reject all"]', { timeout: 4000 });
            if (btn) await btn.click();
        } catch (e) {}

        await page.waitForSelector('div[role="feed"]', { timeout: 15000 });

        // --- DÉBUT DE LA SMART LOOP ---
        const finalResults = [];
        const processedLinks = new Set(); // Mémoire de la session pour ne pas traiter 2x le même
        let endOfList = false;
        let consecutiveScrollFailures = 0;

        // Boucle tant qu'on n'a pas atteint l'objectif (ex: 50) ET que la liste n'est pas finie
        while (finalResults.length < targetLeads && !endOfList) {
            
            // A. Récupérer les liens visibles à l'écran
            const visibleLinks = await getVisibleLinks(page);
            
            // B. Garder uniquement ceux qu'on n'a pas encore traités dans cette session
            const newLinks = visibleLinks.filter(link => !processedLinks.has(link));
            
            // C. Si aucun nouveau lien visible, on SCROLL
            if (newLinks.length === 0) {
                const hasMoved = await scrollDown(page);
                if (!hasMoved) {
                    consecutiveScrollFailures++;
                    console.log(`[SCROLL] Pas de nouveaux items ou fin de liste (${consecutiveScrollFailures}/5)`);
                    if (consecutiveScrollFailures >= 5) {
                        console.log("[FIN] Liste terminée par Google.");
                        endOfList = true;
                    }
                } else {
                    consecutiveScrollFailures = 0; // On a bougé, on reset le compteur
                }
                continue; // On retourne au début de la boucle pour analyser la nouvelle vue
            }

            // D. On a des nouveaux liens ! On les traite par paquet de 5
            // On ne prend que le nombre nécessaire pour finir le quota (targetLeads - finalResults.length)
            const needed = targetLeads - finalResults.length;
            const chunk = newLinks.slice(0, needed); // On ne surcharge pas si on a besoin de juste 2 leads

            // Traitement parallèle du paquet
            const promises = chunk.map(async (link) => {
                processedLinks.add(link); // Marquer comme traité
                let tab;
                try {
                    tab = await browser.newPage();
                    // Optimisation vitesse
                    await tab.setRequestInterception(true);
                    tab.on('request', r => ['image', 'stylesheet', 'font'].includes(r.resourceType()) ? r.abort() : r.continue());

                    await tab.goto(link, { waitUntil: 'domcontentloaded', timeout: 20000 });

                    // Extraction de base
                    const data = await tab.evaluate(() => {
                        return {
                            name: document.querySelector('h1')?.innerText || "Inconnu",
                            website: document.querySelector('a[data-item-id="authority"]')?.href || null,
                            phone: document.querySelector('button[data-item-id^="phone:"]')?.getAttribute('aria-label')?.replace('Téléphone: ', '').trim() || null
                        };
                    });

                    // --- 1. CHECK SUPABASE (Anti-Doublon GLOBAL) ---
                    const { data: exists } = await supabase.from('leads')
                        .select('id')
                        .ilike('name', data.name)
                        .ilike('city', location)
                        .maybeSingle();

                    if (exists) {
                        console.log(`[SKIP] Doublon DB : ${data.name}`);
                        await tab.close();
                        return null; // On renvoie null pour dire "pas de résultat ici"
                    }

                    // --- 2. ENRICHISSEMENT (Seulement si pas doublon) ---
                    let webData = { emails: [], socials: {} };
                    if (data.website) webData = await scrapeCompanyWebsite(browser, data.website);
                    
                    const legal = await getLegalInfo(data.name, location);

                    // --- 3. SCORING ---
                    let score = 30;
                    if (data.phone) score += 10;
                    if (data.website) score += 10;
                    if (webData.emails.length) score += 30;
                    if (legal?.dirigeant) score += 10;
                    if (Object.keys(webData.socials).length) score += 10;

                    const lead = {
                        id: `SOC-${Date.now()}-${Math.random()}`,
                        name: legal?.legalName || data.name,
                        sector, city: location,
                        address: legal?.address || location,
                        website: data.website,
                        phone: data.phone,
                        emails: webData.emails.map(e => ({ address: e, type: 'Web', confidence: 90 })),
                        socials: webData.socials,
                        contactName: legal?.dirigeant,
                        contactRole: "Dirigeant",
                        siren: legal?.siren,
                        qualityScore: Math.min(100, score),
                        emailStatus: webData.emails.length ? 'Risky' : 'Unknown',
                        collectedAt: new Date().toISOString()
                    };

                    // --- 4. SAUVEGARDE ---
                    const primaryEmail = (lead.emails && lead.emails.length > 0) ? lead.emails[0].address : null;
                    await supabase.from('leads').insert([{
                        name: lead.name,
                        sector, city: location,
                        address: lead.address,
                        website: lead.website,
                        phone: lead.phone,
                        email: primaryEmail,
                        socials: lead.socials,
                        contact_name: lead.contactName,
                        siren: lead.siren,
                        quality_score: lead.qualityScore
                    }]);

                    await tab.close();
                    return lead;

                } catch (e) {
                    // Erreur sur un onglet spécifique (ne doit pas planter le serveur)
                    if (tab) await tab.close();
                    return null;
                }
            });

            // On attend que le paquet de 5 soit fini
            const batchResults = await Promise.all(promises);
            const validLeads = batchResults.filter(r => r !== null); // On garde que les non-doublons/non-erreurs
            
            finalResults.push(...validLeads);
            
            console.log(`[PROGRESS] ${finalResults.length} / ${targetLeads} leads collectés...`);
            
            // Petit délai pour ne pas brusquer Google
            if (newLinks.length > 0) await scrollDown(page); // On scrolle un coup pour préparer la suite
            await delay(1000);
        }

        console.log(`[FIN] Scraping terminé. ${finalResults.length} leads uniques renvoyés.`);
        await browser.close();
        res.json(finalResults);

    } catch (error) {
        console.error('[FATAL]', error);
        if (browser) await browser.close();
        res.status(500).json({ error: error.message });
    }
});

// Route Frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});