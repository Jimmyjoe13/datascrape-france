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

// Initialisation Supabase
// Assure-toi que ces variables existent dans ton fichier .env
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Nécessaire pour gérer les chemins en module ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Activation de la furtivité
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const app = express();

app.use(cors()); // CORS simplifié pour le déploiement
app.use(express.json());

// --- SERVIR LE FRONTEND ---
app.use(express.static(path.join(__dirname, 'dist')));

const PORT = process.env.PORT || 3001;

// --- FONCTIONS UTILITAIRES ---
const delay = (ms) => new Promise(res => setTimeout(res, ms));

// Fonction 1 : Scroller Maps (Version Robuste)
async function autoScroll(page, maxResults) {
    await page.evaluate(async (maxResults) => {
        const wrapper = document.querySelector('div[role="feed"]');
        if (!wrapper) return;

        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 1000;
            var attempts = 0;

            var timer = setInterval(async () => {
                var scrollHeight = wrapper.scrollHeight;
                wrapper.scrollBy(0, distance);
                totalHeight += distance;

                const items = document.querySelectorAll('div[role="article"]');

                // Cas 1 : On a atteint le nombre cible
                if (items.length >= maxResults) {
                    console.log(`Scroll terminé : ${items.length} trouvés`);
                    clearInterval(timer);
                    resolve();
                    return;
                }

                // Cas 2 : On est en bas de page
                if (wrapper.scrollTop + wrapper.clientHeight >= scrollHeight) {
                    attempts++;
                    // On attend un peu plus longtemps si on est en bas
                    if (attempts > 5) {
                        console.log("Fin de liste détectée ou chargement bloqué.");
                        clearInterval(timer);
                        resolve();
                    }
                } else {
                    attempts = 0;
                }
            }, 1500);
        });
    }, maxResults);
}

// Fonction 2 : Le Chasseur Amélioré (Scan HTML + Mailto + Socials)
async function scrapeCompanyWebsite(browser, url) {
    if (!url || url.includes('google') || url.includes('facebook')) return { emails: [], socials: {}, source: 'N/A' };
    
    let page;
    try {
        page = await browser.newPage();
        await page.setUserAgent(new UserAgent({ deviceCategory: 'desktop' }).toString());
        await page.setViewport({ width: 1366, height: 768 });
        
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

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

// Fonction 3 : Enrichissement Légal
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

// --- API ROUTES ---

app.post('/api/scrape', async (req, res) => {
    const { sector, location, maxResults = 5 } = req.body;
    
    const safeMaxResults = Math.min(maxResults, 100); 

    console.log(`[SCRAPER] 🚀 ${sector} à ${location} (${safeMaxResults} max)`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        });

        const page = await browser.newPage();
        await page.setUserAgent(new UserAgent({ deviceCategory: 'desktop' }).toString());

        const query = `${sector} ${location}`;
        const mapUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
        
        await page.goto(mapUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        try {
            const btn = await page.waitForSelector('button[aria-label="Tout refuser"], button[aria-label="Reject all"]', { timeout: 4000 });
            if (btn) await btn.click();
        } catch (e) {}

        await page.waitForSelector('div[role="feed"]', { timeout: 15000 });
        await autoScroll(page, safeMaxResults);
        await delay(1000);

        const placesLinks = await page.evaluate((max) => {
            const items = Array.from(document.querySelectorAll('div[role="article"]'));
            return items.slice(0, max).map(item => {
                const link = item.querySelector('a');
                return link ? link.href : null;
            }).filter(l => l !== null);
        }, safeMaxResults);

        console.log(`[DEBUG] Liens trouvés après scroll : ${placesLinks.length} / ${safeMaxResults} demandés`);

        const enrichedResults = [];

        // Traitement parallèle par lots de 5
        const CONCURRENCY_LIMIT = 5; 
        
        const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
            arr.slice(i * size, i * size + size)
        );

        const linkChunks = chunk(placesLinks, CONCURRENCY_LIMIT);

        for (const chunk of linkChunks) {
            const promises = chunk.map(async (link) => {
                let pageTab;
                try {
                    pageTab = await browser.newPage();
                    await pageTab.setRequestInterception(true);
                    pageTab.on('request', (req) => {
                        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) req.abort();
                        else req.continue();
                    });

                    await pageTab.goto(link, { waitUntil: 'domcontentloaded', timeout: 20000 });
                    
                    const data = await pageTab.evaluate(() => {
                        const name = document.querySelector('h1')?.innerText || "Inconnu";
                        const websiteBtn = document.querySelector('a[data-item-id="authority"]');
                        const phoneBtn = document.querySelector('button[data-item-id^="phone:"]');
                        let phone = phoneBtn ? phoneBtn.getAttribute('aria-label') : null;
                        if (phone) phone = phone.replace('Téléphone: ', '').trim();
                        return { name, website: websiteBtn ? websiteBtn.href : null, phone };
                    });

                    // --- 1. VERIFICATION SUPABASE (Anti-Doublon) ---
                    const { data: existingLead } = await supabase
                        .from('leads')
                        .select('id')
                        .ilike('name', data.name)
                        .ilike('city', location)
                        .maybeSingle();

                    if (existingLead) {
                        console.log(`[SKIP] Doublon détecté en base : ${data.name}`);
                        await pageTab.close();
                        return null;
                    }

                    // --- 2. ENRICHISSEMENT ---
                    let companyEmails = [];
                    let companySocials = {};
                    let legalInfo = null;

                    if (data.website) {
                        // Attention : scrapeCompanyWebsite utilise le 'browser' principal pour ouvrir un nouvel onglet
                        const webData = await scrapeCompanyWebsite(browser, data.website);
                        companyEmails = webData.emails;
                        companySocials = webData.socials;
                    }

                    legalInfo = await getLegalInfo(data.name, location);

                    let score = 30;
                    if (data.phone) score += 10;
                    if (data.website) score += 10;
                    if (companyEmails.length > 0) score += 30;
                    if (legalInfo && legalInfo.dirigeant) score += 10;
                    if (Object.keys(companySocials).length > 0) score += 10;

                    // --- 3. CONSTRUCTION DE L'OBJET FINAL ---
                    const finalData = {
                        id: `SOC-${Date.now()}-${Math.random()}`,
                        name: legalInfo?.legalName || data.name,
                        sector: sector,
                        city: location,
                        address: legalInfo?.address || location,
                        website: data.website,
                        emails: companyEmails.map(e => ({ address: e, type: 'Web', confidence: 90 })),
                        phone: data.phone,
                        socials: companySocials,
                        contactName: legalInfo?.dirigeant, 
                        contactRole: "Dirigeant",
                        siren: legalInfo?.siren,
                        collectedAt: new Date().toISOString(),
                        emailStatus: companyEmails.length > 0 ? 'Risky' : 'Unknown',
                        qualityScore: Math.min(100, score)
                    };

                    // --- 4. SAUVEGARDE SUPABASE ---
                    // On prend le premier email trouvé pour la colonne 'email' (si existant)
                    const primaryEmail = (finalData.emails && finalData.emails.length > 0) 
                        ? finalData.emails[0].address 
                        : null;

                    const { error: insertError } = await supabase
                        .from('leads')
                        .insert([{
                            name: finalData.name,
                            sector: sector,
                            city: location,
                            address: finalData.address,
                            website: finalData.website,
                            email: primaryEmail, 
                            phone: finalData.phone,
                            contact_name: finalData.contactName,
                            siren: finalData.siren,
                            socials: finalData.socials, // JSONB
                            quality_score: finalData.qualityScore
                        }]);
                    
                    if (insertError) {
                        // On ignore l'erreur si c'est un doublon qui aurait échappé au check initial
                        if (!insertError.message.includes('unique constraint')) {
                            console.error(`Erreur sauvegarde Supabase (${finalData.name}):`, insertError.message);
                        }
                    }

                    await pageTab.close(); 
                    return finalData;

                } catch (err) {
                    console.error(`Skipped: ${err.message}`);
                    if (pageTab && !pageTab.isClosed()) await pageTab.close();
                    return null;
                }
            });

            const chunkResults = await Promise.all(promises);
            enrichedResults.push(...chunkResults.filter(r => r !== null));
            
            await delay(2000);
        }

        await browser.close();
        res.json(enrichedResults);

    } catch (error) {
        console.error('[FATAL]', error);
        if (browser) await browser.close();
        res.status(500).json({ error: error.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});