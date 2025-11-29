import express from 'express';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import UserAgent from 'user-agents';
import cors from 'cors';
import axios from 'axios';

// Activation de la furtivité
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

const PORT = process.env.PORT || 3001;

// --- FONCTIONS UTILITAIRES ---

const delay = (ms) => new Promise(res => setTimeout(res, ms));

// Regex améliorée
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Fonction 1 : Scroller Maps
async function autoScroll(page, maxResults) {
    return await page.evaluate(async (maxResults) => {
        const wrapper = document.querySelector('div[role="feed"]');
        if (!wrapper) return;
        await new Promise((resolve) => {
            var totalHeight = 0;
            var distance = 1000;
            var timer = setInterval(async () => {
                var scrollHeight = wrapper.scrollHeight;
                wrapper.scrollBy(0, distance);
                totalHeight += distance;
                const items = document.querySelectorAll('div[role="article"]');
                if (items.length >= maxResults || totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 1000);
        });
    }, maxResults);
}

// Fonction 2 : Le Chasseur Amélioré (Scan HTML + Mailto)
async function scrapeCompanyWebsite(browser, url) {
    if (!url || url.includes('google') || url.includes('facebook')) return { emails: [], source: 'N/A' };
    
    let page;
    try {
        page = await browser.newPage();
        await page.setUserAgent(new UserAgent({ deviceCategory: 'desktop' }).toString());
        await page.setViewport({ width: 1366, height: 768 });
        
        console.log(`[WEBSITE] 🔍 Visite approfondie : ${url}`);
        
        // Timeout 15s
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

        // --- NOUVELLE LOGIQUE D'EXTRACTION ---
        const extractedEmails = await page.evaluate(() => {
            const found = new Set();
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

            // 1. Chercher spécifiquement les liens "mailto:" (Le plus fiable)
            // C'est ce qui manquait pour "Artisans d'Avenir"
            const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
            mailtoLinks.forEach(link => {
                const href = link.href;
                // On nettoie "mailto:toto@gmail.com?subject=..."
                const email = href.replace(/^mailto:/i, '').split('?')[0];
                if (email) found.add(email);
            });

            // 2. Scanner le texte visible (Classique)
            const textContent = document.body.innerText;
            const textMatches = textContent.match(emailRegex) || [];
            textMatches.forEach(e => found.add(e));

            // 3. Scanner TOUT le code HTML (Pour trouver les aria-labels, meta tags, etc.)
            // Attention : peut ramener des faux positifs dans les scripts, on filtrera après
            const htmlContent = document.body.innerHTML;
            const htmlMatches = htmlContent.match(emailRegex) || [];
            htmlMatches.forEach(e => found.add(e));

            return Array.from(found);
        });

        let emails = [...new Set(extractedEmails)];
        
        // Si toujours rien, on tente la page contact
        if (emails.length === 0) {
            try {
                const contactLink = await page.$('a[href*="contact"]');
                if (contactLink) {
                    console.log(`[WEBSITE] ➡️ Clic vers page Contact...`);
                    await contactLink.click();
                    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 8000 }).catch(()=>{});
                    
                    // On refait le même scan complet sur la page contact
                    const contactData = await page.evaluate(() => {
                        const s = new Set();
                        const r = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                        
                        document.querySelectorAll('a[href^="mailto:"]').forEach(l => {
                            s.add(l.href.replace(/^mailto:/i, '').split('?')[0]);
                        });
                        
                        (document.body.innerText.match(r) || []).forEach(e => s.add(e));
                        
                        return Array.from(s);
                    });
                    emails = [...new Set([...emails, ...contactData])];
                }
            } catch (err) {}
        }

        // --- FILTRAGE FINAL ---
        // On retire les fausses extensions d'images qui ressemblent à des emails (ex: logo@2x.png)
        // On retire les emails techniques (sentry, wix, etc.)
        emails = emails.filter(e => {
            const isImage = e.match(/\.(png|jpg|jpeg|gif|css|js|webp|svg|woff|ttf)$/i);
            const isJunk = e.includes('sentry') || e.includes('noreply') || e.includes('domain.com') || e.includes('example');
            return !isImage && !isJunk;
        });

        await page.close();
        console.log(`[WEBSITE] ✅ ${emails.length} emails trouvés pour ${url}`);
        return { emails, source: 'Website' };

    } catch (error) {
        if (page) await page.close();
        return { emails: [], source: 'Error' };
    }
}

// Fonction 3 : Enrichissement Légal (Gardée en complément)
async function getLegalInfo(name, city) {
    try {
        const cleanName = name.replace(/[\(\)-]/g, ' ').trim();
        const query = `${cleanName} ${city}`;
        const response = await axios.get(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&limit=1&mtm_campaign=datascrape-demo`);
        
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
    } catch (error) {
        // Silencieux
    }
    return null;
}

// --- ROUTE PRINCIPALE ---

app.post('/api/scrape', async (req, res) => {
    const { sector, location, maxResults = 5 } = req.body;
    console.log(`[SCRAPER V3] 🚀 Cible : ${sector} à ${location}`);

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--window-size=1920,1080']
        });

        const page = await browser.newPage();
        await page.setUserAgent(new UserAgent({ deviceCategory: 'desktop' }).toString());

        // 1. RECHERCHE MAPS
        const query = `${sector} ${location}`;
        const mapUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
        
        await page.goto(mapUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        try {
            const btn = await page.waitForSelector('button[aria-label="Tout refuser"], button[aria-label="Reject all"]', { timeout: 3000 });
            if (btn) await btn.click();
        } catch (e) {}

        await page.waitForSelector('div[role="feed"]', { timeout: 15000 });
        await autoScroll(page, maxResults);
        await delay(1000);

        const placesLinks = await page.evaluate((max) => {
            const items = Array.from(document.querySelectorAll('div[role="article"]'));
            return items.slice(0, max).map(item => {
                const link = item.querySelector('a');
                return link ? link.href : null;
            }).filter(l => l !== null);
        }, maxResults);

        console.log(`[MAPS] ${placesLinks.length} fiches récupérées.`);
        
        const enrichedResults = [];

        for (const link of placesLinks) {
            try {
                // 2. EXTRACTION FICHE MAPS
                await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 20000 });
                const data = await page.evaluate(() => {
                    const name = document.querySelector('h1')?.innerText || "Inconnu";
                    const websiteBtn = document.querySelector('a[data-item-id="authority"]');
                    const phoneBtn = document.querySelector('button[data-item-id^="phone:"]');
                    let phone = phoneBtn ? phoneBtn.getAttribute('aria-label') : null;
                    if (phone) phone = phone.replace('Téléphone: ', '').trim();
                    return { name, website: websiteBtn ? websiteBtn.href : null, phone };
                });

                let companyEmails = [];
                let legalInfo = null;

                // 3. VISITE SITE WEB (Nouveau scan puissant)
                if (data.website) {
                    const webData = await scrapeCompanyWebsite(browser, data.website);
                    companyEmails = webData.emails;
                }

                // 4. ENRICHISSEMENT LEGAL
                legalInfo = await getLegalInfo(data.name, location);

                // SCORE
                let score = 30;
                if (data.phone) score += 10;
                if (data.website) score += 10;
                if (companyEmails.length > 0) score += 30;
                if (legalInfo && legalInfo.dirigeant) score += 20;

                enrichedResults.push({
                    id: `FULL-${Date.now()}-${Math.random()}`,
                    name: legalInfo?.legalName || data.name,
                    sector: sector,
                    city: location,
                    address: legalInfo?.address || location,
                    website: data.website,
                    emails: companyEmails.map(e => ({ address: e, type: 'Web/HTML', confidence: 90 })),
                    phone: data.phone,
                    contactName: legalInfo?.dirigeant, 
                    contactRole: "Dirigeant",
                    siren: legalInfo?.siren,
                    collectedAt: new Date().toISOString(),
                    emailStatus: companyEmails.length > 0 ? 'Risky' : 'Unknown',
                    qualityScore: Math.min(100, score)
                });

            } catch (err) {
                console.error(`Skipped: ${err.message}`);
            }
            await delay(500); 
        }

        await browser.close();
        res.json(enrichedResults);

    } catch (error) {
        console.error('[FATAL]', error);
        if (browser) await browser.close();
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server V3 (HTML Deep Scan) running on http://localhost:${PORT}`);
});