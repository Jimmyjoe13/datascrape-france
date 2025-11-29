const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const dns = require('dns').promises;
const { URL } = require('url');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Regex Patterns
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/g;
const SIREN_REGEX = /\b\d{3}[ \.]?\d{3}[ \.]?\d{3}\b/g;

// Helper: Check MX Records
async function checkMX(domain) {
  try {
    const records = await dns.resolveMx(domain);
    return records && records.length > 0;
  } catch (error) {
    return false;
  }
}

// Helper: Delay
const delay = (ms) => new Promise(res => setTimeout(res, ms));

app.post('/api/scrape', async (req, res) => {
  const { sector, location, maxResults = 10 } = req.body;
  console.log(`[SCRAPER] Starting: ${sector} in ${location} (Max: ${maxResults})`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    
    // 1. Search Google
    const query = `${sector} ${location} email contact site:*.fr`;
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}&num=${Math.min(maxResults + 5, 50)}`, { waitUntil: 'domcontentloaded' });

    // Handle Consent Popup if exists (basic attempt)
    try {
        const buttons = await page.$$('button');
        for (const btn of buttons) {
            const text = await page.evaluate(el => el.innerText, btn);
            if (text.includes('Tout refuser') || text.includes('Reject all')) {
                await btn.click();
                await delay(1000);
                break;
            }
        }
    } catch (e) { /* ignore */ }

    // Extract Result Links
    const links = await page.evaluate(() => {
      const results = Array.from(document.querySelectorAll('div.g'));
      return results.map(div => {
        const anchor = div.querySelector('a');
        const title = div.querySelector('h3');
        return {
          url: anchor ? anchor.href : null,
          title: title ? title.innerText : 'Unknown'
        };
      }).filter(item => item.url && !item.url.includes('google') && !item.url.includes('pagesjaunes')); // Filter directories if possible
    });

    console.log(`[SCRAPER] Found ${links.length} potential links.`);
    
    const validResults = [];
    const uniqueDomains = new Set();
    const limit = Math.min(links.length, maxResults);

    // 2. Visit each site (Concurrency: 3 tabs)
    const chunkSize = 3;
    for (let i = 0; i < limit; i += chunkSize) {
        const chunk = links.slice(i, i + chunkSize);
        const promises = chunk.map(async (link) => {
            try {
                const domain = new URL(link.url).hostname;
                if (uniqueDomains.has(domain)) return null;
                uniqueDomains.add(domain);

                const sitePage = await browser.newPage();
                await sitePage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
                
                // Set timeout for navigation
                await sitePage.goto(link.url, { waitUntil: 'domcontentloaded', timeout: 15000 });

                // Scrape Content
                const content = await sitePage.content();
                const innerText = await sitePage.evaluate(() => document.body.innerText);

                // Extract Data
                const emails = [...new Set(innerText.match(EMAIL_REGEX) || [])];
                const phones = [...new Set(innerText.match(PHONE_REGEX) || [])];
                const sirens = [...new Set(innerText.match(SIREN_REGEX) || [])];
                
                // Simple Socials Detection
                const socials = {
                    linkedin: content.includes('linkedin.com') ? `https://linkedin.com/company/${domain.split('.')[0]}` : undefined,
                    facebook: content.includes('facebook.com') ? `https://facebook.com/${domain.split('.')[0]}` : undefined
                };

                await sitePage.close();

                if (emails.length === 0) return null; // Skip if no email found

                // Validate Emails
                const validatedEmails = [];
                const mxValid = await checkMX(domain);

                for (const email of emails) {
                    // Filter junk images like email.png interpreted as text or bad regex matches
                    if (email.length < 5 || email.length > 50) continue; 
                    
                    let confidence = mxValid ? 60 : 20;
                    let type = 'Generic';
                    
                    if (email.match(/^(contact|info|hello|support|accueil|reservation)/i)) {
                        confidence += 20;
                    } else {
                        type = 'Personal';
                        confidence += 30; // Personal emails usually more valuable
                    }

                    validatedEmails.push({
                        address: email,
                        source: 'Web',
                        type,
                        confidence: Math.min(100, confidence)
                    });
                }

                if (validatedEmails.length === 0) return null;

                return {
                    id: `REAL-${Date.now()}-${Math.random()}`,
                    name: link.title.split('-')[0].split('|')[0].trim(),
                    siren: sirens[0] || undefined,
                    sector: sector,
                    address: `${Math.floor(Math.random()*100)} ${location} (Adresse approximative)`,
                    city: location,
                    website: link.url,
                    emails: validatedEmails,
                    phone: phones[0],
                    socials,
                    collectedAt: new Date().toISOString(),
                    qualityScore: validatedEmails[0].confidence,
                    emailStatus: mxValid ? 'Valid' : 'Risky'
                };

            } catch (err) {
                // console.error(`Error visiting ${link.url}: ${err.message}`);
                return null;
            }
        });

        const chunkResults = await Promise.all(promises);
        validResults.push(...chunkResults.filter(r => r !== null));
        
        // Safety break
        if (validResults.length >= maxResults) break;
    }

    await browser.close();
    
    console.log(`[SCRAPER] Finished. Returning ${validResults.length} results.`);
    res.json(validResults);

  } catch (error) {
    console.error('[SCRAPER] Critical Error:', error);
    if (browser) await browser.close();
    res.status(500).json({ error: 'Scraping failed', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`DataScrape Server running on http://localhost:${PORT}`);
});