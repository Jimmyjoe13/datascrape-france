# Utilise une image Node.js officielle légère
FROM node:18-slim

# 1. Installe les dépendances système nécessaires pour Google Chrome
# C'est la partie la plus importante pour que Puppeteer fonctionne sur Linux
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 2. Configure le dossier de travail
WORKDIR /app

# 3. Copie les fichiers de dépendances
COPY package*.json ./

# 4. Installe les dépendances du projet
RUN npm install

# 5. Copie tout le reste du code source
COPY . .

# 6. Construit l'application React (Frontend)
# Cela va créer le dossier 'dist'
RUN npm run build

# 7. Configure l'environnement pour Puppeteer
# On dit à Puppeteer de ne pas télécharger Chromium car on a installé Chrome manuellement
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# 8. Expose le port
EXPOSE 3001

# 9. Commande de démarrage
CMD ["npm", "run", "server"]