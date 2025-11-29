# DataScrape France - Application de Scraping B2B

Application professionnelle de scraping d'emails pour entreprises françaises.
Architecture: React (Frontend) + Node.js/Puppeteer (Backend).

## 🚀 Installation

1. Cloner le projet
2. Installer les dépendances :
```bash
npm install
```

## 🖥️ Démarrage Local

L'application nécessite deux terminaux : un pour le frontend React et un pour le backend API.

### Terminal 1 : Backend (API Scraping)
```bash
npm run server
```
Le serveur démarrera sur `http://localhost:3001`.

### Terminal 2 : Frontend (Interface)
```bash
npm start
```
L'interface s'ouvrira sur `http://localhost:3000`.

## ⚙️ Fonctionnalités Backend

- **Scraping Google** : Utilise Puppeteer pour simuler une navigation humaine.
- **Extraction Intelligente** : Visite les sites web trouvés et scanne le HTML pour trouver emails (regex), téléphones et SIREN.
- **Vérification DNS** : Vérifie les enregistrements MX des domaines pour valider la réception d'emails.
- **Rate Limiting** : Limité par défaut pour éviter le bannissement IP (Google CAPTCHA).

## ⚠️ Notes importantes pour la Production

- **Google Blocking** : Le scraping intensif de Google entraînera un blocage IP (CAPTCHA). Pour la production, intégrez une API comme SerpApi ou utilisez un pool de proxies rotatifs.
- **Hébergement** : 
  - Frontend: Vercel, Netlify.
  - Backend: Nécessite un environnement supportant Puppeteer (ex: Render, Railway, ou VPS Dockerisé).
  - Sur Vercel/Serverless, utilisez `puppeteer-core` et `chrome-aws-lambda` pour réduire la taille du bundle.

## 🛠️ Stack Technique

- **Frontend**: React 18, Tailwind CSS, Lucide Icons, Recharts.
- **Backend**: Node.js, Express, Puppeteer (Headless Chrome), DNS module.
