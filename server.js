import 'dotenv/config';
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

// Activation plugins anti-détection
puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

const PORT = process.env.PORT || 3001;

// --- CONSTANTES ---
const BASE_URL = 'https://www.experts-du-patrimoine.fr';

const CATEGORY_SLUG_MAP = {
    'CGP': 'cgp',
    'Avocat': 'avocat',
    'Notaire': 'notaire',
    "Agent d'assurance": 'agent-dassurance',
    'Banque privée': 'banque-privee',
    'Courtier': 'courtier',
    'Family office': 'family-office-et-mfo',
    'Professionnel immobilier': 'professionnel-immobilier',
    'Société de gestion': 'societe-de-gestion',
    'Autre': 'autre'
};

// --- UTILITAIRES ---

/**
 * Délai asynchrone avec variation aléatoire pour éviter les patterns détectables
 * @param {number} baseMs - Délai de base en millisecondes
 * @param {number} [variance=500] - Variance aléatoire +/- en ms
 */
const delay = (baseMs, variance = 500) => {
    const actualDelay = baseMs + Math.floor(Math.random() * variance * 2) - variance;
    return new Promise(res => setTimeout(res, Math.max(100, actualDelay)));
};

/**
 * Parse une adresse française pour extraire code postal et ville
 * @param {string} fullAddress - Adresse complète (ex: "95 Av. Général de Gaulle, 69300 Caluire-et-Cuire, France")
 * @returns {{ postalCode: string, city: string, cleanAddress: string }}
 */
function parseAddress(fullAddress) {
    if (!fullAddress) return { postalCode: '', city: '', cleanAddress: '' };
    
    // Pattern: "XX Rue Something, XXXXX Ville, France"
    const patterns = [
        /(\d{5})\s+([^,]+),?\s*France?$/i,  // "69300 Caluire-et-Cuire, France"
        /(\d{5})\s+([^,]+)/,                 // "69300 Caluire-et-Cuire"
        /,\s*([^,]+),?\s*France$/i           // Ville seule avant France
    ];
    
    for (const pattern of patterns) {
        const match = fullAddress.match(pattern);
        if (match) {
            if (match[1] && match[1].length === 5) {
                return {
                    postalCode: match[1],
                    city: match[2]?.trim() || '',
                    cleanAddress: fullAddress.replace(/,?\s*France$/i, '').trim()
                };
            }
        }
    }
    
    return { postalCode: '', city: '', cleanAddress: fullAddress };
}

// --- FONCTIONS DE SCRAPING ---

/**
 * Récupère les liens des profils en itérant sur les pages de l'annuaire
 * Le site utilise une pagination classique : /categorie/{slug}/page/{n}/
 * 
 * @param {import('puppeteer').Page} page - Page Puppeteer
 * @param {string} categorySlug - Slug de la catégorie (ex: "cgp")
 * @param {number} targetCount - Nombre de liens à récupérer
 * @param {number} startPage - Page de départ (pour varier les résultats)
 * @returns {Promise<string[]>} - URLs des profils
 */
async function crawlExpertDirectory(page, categorySlug, targetCount, startPage = 1) {
    const profileLinks = new Set();
    let currentPage = startPage;
    let consecutiveEmptyPages = 0;
    const MAX_EMPTY_PAGES = 2; // Arrêter après 2 pages vides consécutives (fin de l'annuaire)
    const PROFILES_PER_PAGE = 10;
    
    // Calculer le nombre de pages nécessaires (avec marge)
    const maxPages = Math.ceil(targetCount / PROFILES_PER_PAGE) + 2;
    
    console.log(`[CRAWL] Objectif: ${targetCount} profils, démarrage page ${startPage}`);
    
    while (profileLinks.size < targetCount && consecutiveEmptyPages < MAX_EMPTY_PAGES) {
        // Construire l'URL de la page
        const pageUrl = currentPage === 1 
            ? `${BASE_URL}/categorie/${categorySlug}/`
            : `${BASE_URL}/categorie/${categorySlug}/page/${currentPage}/`;
        
        console.log(`[CRAWL] Page ${currentPage}: ${pageUrl}`);
        
        try {
            await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            await delay(1000, 300);
            
            // Vérifier si on est sur une page 404 ou vide
            const pageStatus = await page.evaluate(() => {
                // Détecter les pages d'erreur
                if (document.title.includes('404') || document.title.includes('Page non trouvée')) {
                    return 'not_found';
                }
                return 'ok';
            });
            
            if (pageStatus === 'not_found') {
                console.log(`[CRAWL] Page ${currentPage} n'existe pas, fin de la catégorie`);
                break;
            }
            
            // Extraire les liens de profils sur cette page
            const pageLinks = await page.evaluate(() => {
                const links = [];
                document.querySelectorAll('a[href*="/societes/"]').forEach(el => {
                    const href = el.href;
                    // Filtrer les liens valides (pas d'ancres, pas de paramètres)
                    if (href && 
                        href.includes('/societes/') && 
                        !href.includes('#') &&
                        !href.includes('?') &&
                        href !== 'https://www.experts-du-patrimoine.fr/societes/') {
                        links.push(href);
                    }
                });
                return [...new Set(links)];
            });
            
            const previousSize = profileLinks.size;
            pageLinks.forEach(link => profileLinks.add(link));
            const newLinksCount = profileLinks.size - previousSize;
            
            console.log(`[CRAWL] Page ${currentPage}: +${newLinksCount} nouveaux (total: ${profileLinks.size})`);
            
            if (newLinksCount === 0) {
                consecutiveEmptyPages++;
            } else {
                consecutiveEmptyPages = 0;
            }
            
        } catch (error) {
            console.error(`[CRAWL] Erreur page ${currentPage}:`, error.message);
            consecutiveEmptyPages++;
        }
        
        currentPage++;
        
        // Sécurité : ne pas dépasser un nombre raisonnable de pages
        if (currentPage - startPage >= maxPages) {
            console.log(`[CRAWL] Limite de pages atteinte (${maxPages})`);
            break;
        }
    }
    
    const allLinks = Array.from(profileLinks);
    console.log(`[CRAWL] Total: ${allLinks.length} profils récupérés sur ${currentPage - startPage} pages`);
    
    return allLinks.slice(0, targetCount);
}

/**
 * Extrait les données d'un profil individuel
 * Gère les clics pour révéler email/téléphone si nécessaires
 * 
 * @param {import('puppeteer').Browser} browser 
 * @param {string} profileUrl 
 * @returns {Promise<Object|null>} - Données extraites ou null si échec
 */
async function scrapeExpertProfile(browser, profileUrl) {
    const page = await browser.newPage();
    
    try {
        await page.setUserAgent(new UserAgent({ deviceCategory: 'desktop' }).toString());
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        });
        
        // Bloque les ressources non essentielles pour accélérer
        await page.setRequestInterception(true);
        page.on('request', req => {
            const resourceType = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });
        
        await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 25000 });
        await delay(1000, 300);
        
        // Tentative de clic sur les boutons "Afficher" pour révéler les coordonnées
        await page.evaluate(() => {
            const revealSelectors = [
                'button[data-action="reveal-email"]',
                '.show-email',
                '.reveal-contact',
                'button:contains("Afficher")',
                '[onclick*="reveal"]'
            ];
            
            revealSelectors.forEach(selector => {
                try {
                    const btn = document.querySelector(selector);
                    if (btn) btn.click();
                } catch (e) { /* ignore */ }
            });
        });
        
        await delay(500, 200);
        
        // Extraction des données
        const data = await page.evaluate(() => {
            // Nom de la société (priorité au h1)
            const nameSelectors = ['h1', '.company-name', '.title-societe', '.profile-title'];
            let name = 'Inconnu';
            for (const sel of nameSelectors) {
                const el = document.querySelector(sel);
                if (el?.innerText?.trim()) {
                    name = el.innerText.trim();
                    break;
                }
            }
            
            // Adresse
            const addressSelectors = [
                '.contact-address',
                '.address',
                '[class*="address"]',
                '.coordonnees address',
                '.sidebar .location'
            ];
            let fullAddress = '';
            for (const sel of addressSelectors) {
                const el = document.querySelector(sel);
                if (el?.innerText?.trim()) {
                    fullAddress = el.innerText.trim().replace(/\s+/g, ' ');
                    break;
                }
            }
            // Fallback: cherche un texte contenant un code postal
            if (!fullAddress) {
                const allText = document.body.innerText;
                const postalMatch = allText.match(/\d{1,3}[^,\n]{5,50},?\s*\d{5}\s+[A-Za-zÀ-ÿ\-\s]+,?\s*France/i);
                if (postalMatch) fullAddress = postalMatch[0];
            }
            
            // Email
            let email = null;
            const emailLink = document.querySelector('a[href^="mailto:"]');
            if (emailLink) {
                email = emailLink.href.replace('mailto:', '').split('?')[0].toLowerCase();
            } else {
                // Recherche dans le texte
                const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                const bodyText = document.body.innerText;
                const emails = bodyText.match(emailRegex) || [];
                // Filtre les emails du site lui-même
                const validEmail = emails.find(e => 
                    !e.includes('experts-du-patrimoine') && 
                    !e.includes('example') &&
                    !e.includes('noreply')
                );
                if (validEmail) email = validEmail.toLowerCase();
            }
            
            // Site web
            let website = null;
            const websiteSelectors = [
                'a[href*="http"]:not([href*="experts-du-patrimoine"]):not([href*="linkedin"]):not([href*="facebook"]):not([href*="twitter"])',
                '.website a',
                'a.external-link'
            ];
            for (const sel of websiteSelectors) {
                const links = document.querySelectorAll(sel);
                for (const link of links) {
                    const href = link.href;
                    if (href && !href.includes('experts-du-patrimoine') && 
                        !href.includes('google') && !href.includes('linkedin') &&
                        !href.includes('facebook') && !href.includes('twitter') &&
                        !href.includes('youtube')) {
                        website = href;
                        break;
                    }
                }
                if (website) break;
            }
            
            // Domaines d'expertise
            const expertiseSelectors = [
                '.expertise-tag',
                '.service-link',
                '[class*="expertise"] a',
                '.domaines a',
                '.specialites li'
            ];
            const expertises = [];
            for (const sel of expertiseSelectors) {
                document.querySelectorAll(sel).forEach(el => {
                    const text = el.innerText?.trim();
                    if (text && text.length > 2 && text.length < 50) {
                        expertises.push(text);
                    }
                });
            }
            
            // Téléphone
            let phone = null;
            const phoneLink = document.querySelector('a[href^="tel:"]');
            if (phoneLink) {
                phone = phoneLink.href.replace('tel:', '').replace(/\s/g, '');
            } else {
                // Regex pour numéros français
                const phoneRegex = /(?:(?:\+33|0033|0)\s*[1-9])(?:[\s.-]*\d{2}){4}/g;
                const phones = document.body.innerText.match(phoneRegex) || [];
                if (phones.length > 0) phone = phones[0].replace(/[\s.-]/g, '');
            }
            
            // Description
            const descSelectors = ['.presentation p', '.description', '.about-text'];
            let description = '';
            for (const sel of descSelectors) {
                const el = document.querySelector(sel);
                if (el?.innerText?.trim()) {
                    description = el.innerText.trim().substring(0, 500);
                    break;
                }
            }
            
            // Réseaux sociaux
            const socials = {};
            document.querySelectorAll('a[href*="linkedin.com"]').forEach(a => {
                if (a.href.includes('company') || a.href.includes('/in/')) {
                    socials.linkedin = a.href;
                }
            });
            document.querySelectorAll('a[href*="facebook.com"]').forEach(a => {
                if (!a.href.includes('sharer')) socials.facebook = a.href;
            });
            
            return { 
                name, 
                fullAddress, 
                email, 
                website, 
                phone,
                expertises: [...new Set(expertises)],
                description,
                socials
            };
        });
        
        await page.close();
        return data;
        
    } catch (error) {
        console.error(`[SCRAPE ERROR] ${profileUrl}:`, error.message);
        try { await page.close(); } catch (e) { /* ignore */ }
        return null;
    }
}

/**
 * Enrichissement via l'API Recherche Entreprises du gouvernement
 * @param {string} name - Nom de l'entreprise
 * @param {string} city - Ville pour affiner la recherche
 */
async function getLegalInfo(name, city) {
    try {
        const cleanName = name.replace(/[^\w\s]/g, ' ').trim();
        const query = city ? `${cleanName} ${city}` : cleanName;
        
        const response = await axios.get(
            `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&limit=1`,
            { timeout: 10000 }
        );
        
        if (response.data.results?.length > 0) {
            const company = response.data.results[0];
            let dirigeant = null;
            
            if (company.dirigeants?.length > 0) {
                const d = company.dirigeants[0];
                dirigeant = `${d.prenoms || ''} ${d.nom || ''}`.trim() || null;
            }
            
            return {
                siren: company.siren,
                legalName: company.nom_complet,
                address: company.siege?.adresse,
                dirigeant
            };
        }
    } catch (error) {
        console.error('[LEGAL API Error]:', error.message);
    }
    return null;
}

// --- ROUTE PRINCIPALE ---

app.post('/api/scrape', async (req, res) => {
    const { sector, location = '', maxResults = 10 } = req.body;
    
    // Validation des paramètres
    const categorySlug = CATEGORY_SLUG_MAP[sector];
    if (!categorySlug) {
        return res.status(400).json({ 
            error: 'Secteur invalide', 
            validSectors: Object.keys(CATEGORY_SLUG_MAP) 
        });
    }
    
    const targetLeads = Math.min(Math.max(1, maxResults), 100); // Limite 100 max
    
    // Page de démarrage aléatoire pour varier les résultats entre requêtes
    // Si l'utilisateur veut 50 leads et qu'il y a 25 pages, on peut démarrer entre 1 et 10
    const randomStartPage = Math.floor(Math.random() * 5) + 1; // Pages 1-5 au hasard
    
    console.log(`[SCRAPER] 🎯 Objectif: ${targetLeads} leads pour ${sector} (dept: ${location || 'tous'}, page départ: ${randomStartPage})`);
    
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
                '--disable-gpu',
                '--window-size=1920,1080'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        });
        
        const mainPage = await browser.newPage();
        await mainPage.setUserAgent(new UserAgent({ deviceCategory: 'desktop' }).toString());
        await mainPage.setViewport({ width: 1920, height: 1080 });
        
        // 1. Crawler l'annuaire (on demande 2x plus pour compenser les doublons/filtres)
        const profileLinks = await crawlExpertDirectory(mainPage, categorySlug, targetLeads * 2, randomStartPage);
        await mainPage.close();
        
        if (profileLinks.length === 0) {
            await browser.close();
            return res.json([]);
        }
        
        // 2. Scraper chaque profil
        const finalResults = [];
        const processedLinks = new Set();
        
        for (const link of profileLinks) {
            if (processedLinks.has(link)) continue;
            if (finalResults.length >= targetLeads) break;
            
            processedLinks.add(link);
            
            // Délai anti-ban entre chaque profil
            await delay(1500, 500);
            
            console.log(`[SCRAPE] (${finalResults.length + 1}/${targetLeads}) ${link}`);
            
            const profileData = await scrapeExpertProfile(browser, link);
            if (!profileData || profileData.name === 'Inconnu') continue;
            
            // Parsing de l'adresse
            const { postalCode, city, cleanAddress } = parseAddress(profileData.fullAddress);
            
            // Filtre par département si spécifié
            if (location && postalCode && !postalCode.startsWith(location)) {
                console.log(`[SKIP] Département ${postalCode.substring(0, 2)} != ${location}`);
                continue;
            }
            
            // Check doublon Supabase
            const { data: exists } = await supabase.from('leads')
                .select('id')
                .ilike('name', profileData.name)
                .maybeSingle();
            
            if (exists) {
                console.log(`[SKIP] Doublon DB: ${profileData.name}`);
                continue;
            }
            
            // Enrichissement API Gouv.fr
            const legal = await getLegalInfo(profileData.name, city);
            
            // Calcul du score de qualité
            let score = 20; // Base
            if (profileData.email) score += 30;
            if (profileData.website) score += 10;
            if (profileData.phone) score += 10;
            if (legal?.siren) score += 15;
            if (legal?.dirigeant) score += 5;
            if (profileData.expertises?.length > 0) score += 5;
            if (Object.keys(profileData.socials || {}).length > 0) score += 5;
            
            const lead = {
                id: `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: legal?.legalName || profileData.name,
                sector,
                address: cleanAddress || profileData.fullAddress,
                city: city || '',
                postalCode: postalCode || '',
                website: profileData.website,
                phone: profileData.phone,
                emails: profileData.email ? [{
                    address: profileData.email,
                    source: 'Web',
                    type: 'Generic',
                    confidence: 85
                }] : [],
                socials: profileData.socials || {},
                contactName: legal?.dirigeant,
                contactRole: 'Dirigeant',
                expertises: profileData.expertises || [],
                siren: legal?.siren,
                qualityScore: Math.min(100, score),
                emailStatus: profileData.email ? 'Risky' : 'Unknown',
                collectedAt: new Date().toISOString()
            };
            
            // Sauvegarde Supabase
            try {
                const primaryEmail = lead.emails.length > 0 ? lead.emails[0].address : null;
                await supabase.from('leads').insert([{
                    name: lead.name,
                    sector: lead.sector,
                    city: lead.city,
                    address: lead.address,
                    website: lead.website,
                    phone: lead.phone,
                    email: primaryEmail,
                    socials: lead.socials,
                    contact_name: lead.contactName,
                    siren: lead.siren,
                    quality_score: lead.qualityScore
                }]);
            } catch (dbError) {
                console.error('[DB ERROR]:', dbError.message);
                // Continue même si l'insert échoue
            }
            
            finalResults.push(lead);
            console.log(`[OK] ${lead.name} - Score: ${lead.qualityScore}`);
        }
        
        console.log(`[FIN] ${finalResults.length} leads collectés`);
        await browser.close();
        res.json(finalResults);
        
    } catch (error) {
        console.error('[FATAL]', error);
        if (browser) {
            try { await browser.close(); } catch (e) { /* ignore */ }
        }
        res.status(500).json({ error: error.message, details: error.stack });
    }
});

// Route Frontend (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`[SERVER] Démarré sur le port ${PORT}`);
    console.log(`[SERVER] Catégories disponibles:`, Object.keys(CATEGORY_SLUG_MAP).join(', '));
});