import express from 'express';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import UserAgent from 'user-agents';
import cors from 'cors';

// Activation de la furtivité
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const app = express();

// Configuration CORS permissive pour le développement
app.use(cors({
    origin: '*', // Accepte tout le monde (pour tester)
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

const PORT = process.env.PORT || 3001;

// Fonction utilitaire pour attendre
const delay = (ms) => new Promise(res => setTimeout(res, ms));

// Fonction de scroll
async function autoScroll(page, maxResults) {
    return await page.evaluate(async (maxResults) => {
        const wrapper = document.querySelector('div[role="feed"]');
        if (!wrapper) return;

        await new Promise((resolve, reject) => {
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

app.post('/api/scrape', async (req, res) => {
    const { sector, location, maxResults = 10 } = req.body;
    console.log(`[SCRAPER] Demande reçue : ${sector} à ${location}`);

    let browser;
    try {
        console.log('[SCRAPER] Lancement de Puppeteer...');
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--window-size=1920,1080'
            ]
        });

        const page = await browser.newPage();
        const userAgent = new UserAgent({ deviceCategory: 'desktop' });
        await page.setUserAgent(userAgent.toString());
        await page.setViewport({ width: 1920, height: 1080 });

        // URL OFFICIELLE GOOGLE MAPS
        const query = `${sector} ${location}`;
        const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
        
        console.log(`[SCRAPER] Navigation vers : ${url}`);
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Gestion Cookies
        try {
            const btn = await page.waitForSelector('button[aria-label="Tout refuser"], button[aria-label="Reject all"], span[text="Tout refuser"]', { timeout: 4000 });
            if (btn) {
                console.log('[SCRAPER] Refus des cookies...');
                await btn.click();
            }
        } catch (e) { /* Pas grave */ }

        console.log('[SCRAPER] Recherche de la liste des résultats...');
        // Sélecteur mis à jour pour Maps 2024
        await page.waitForSelector('div[role="feed"]', { timeout: 15000 });

        console.log('[SCRAPER] Scroll en cours...');
        await autoScroll(page, maxResults);
        await delay(2000);

        const places = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('div[role="article"]'));
            return items.map(item => {
                const link = item.querySelector('a');
                let rawText = item.innerText || '';
                const lines = rawText.split('\n');
                return {
                    url: link ? link.href : null,
                    name: item.ariaLabel || lines[0] || 'Inconnu',
                };
            });
        });

        console.log(`[SCRAPER] ${places.length} fiches trouvées.`);

        const results = places.slice(0, maxResults).map((place, i) => ({
            id: `MAPS-${Date.now()}-${i}`,
            name: place.name,
            sector: sector,
            city: location,
            address: location,
            website: place.url,
            emails: [],
            phone: "Voir fiche détaillée",
            collectedAt: new Date().toISOString(),
            emailStatus: 'Unknown',
            qualityScore: 50
        }));

        await browser.close();
        res.json(results);

    } catch (error) {
        console.error('[SCRAPER] ERREUR FATALE :', error);
        if (browser) await browser.close();
        res.status(500).json({ error: 'Scraping failed', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`DataScrape Server running on http://localhost:${PORT}`);
});