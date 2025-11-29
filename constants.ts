import { Sector } from './types';

export const SECTORS = Object.values(Sector);

export const FRENCH_CITIES = [
  "Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", 
  "Montpellier", "Strasbourg", "Bordeaux", "Lille", "Rennes"
];

// 50+ Real Company Names per Sector
export const REAL_DATA = {
  RESTAURANTS: [
    "Le Bouillon Chartier", "L'As du Fallafel", "Septime", "Frenchie", "Le Train Bleu",
    "Chez Janou", "L'Ami Jean", "Le Petit Cler", "La Rotonde", "Le Procope",
    "Le Comptoir du Relais", "Les Deux Magots", "Café de Flore", "Brasserie Lipp", "Le Grand Véfour",
    "L'Ambroisie", "Arpège", "Pierre Gagnaire", "Le Jules Verne", "Guy Savoy",
    "Le Cinq", "Epicure", "L'Astrance", "Kei", "L'Arpège",
    "Pavillon Ledoyen", "Le Meurice Alain Ducasse", "Plaza Athénée", "Bristol Epicure", "Ritz Paris",
    "La Coupole", "Le Dôme", "La Closerie des Lilas", "Le Select", "La Rotonde Montparnasse",
    "Terminus Nord", "Bofinger", "Au Pied de Cochon", "Chez la Vieille", "Le Relais de l'Entrecôte",
    "Ferdi", "Big Mamma", "Pink Mamma", "Ober Mamma", "East Mamma",
    "PNY Burger", "Blend", "Schwartz's Deli", "Breakfast in America", "Holybelly",
    "Le Chateaubriand", "Clamato", "Verjus", "Ellsworth", "Le Servan"
  ],
  HOTELS: [
    "Hôtel Ritz", "Hôtel de Crillon", "Le Meurice", "Plaza Athénée", "Four Seasons George V",
    "Le Bristol", "Shangri-La", "Mandarin Oriental", "The Peninsula", "Park Hyatt Vendôme",
    "Hôtel Costes", "Mama Shelter", "Hôtel Amour", "Grand Amour", "Hoxton Paris",
    "The Grand Hotel", "Novotel Centre", "Mercure Gare", "Ibis Styles", "Sofitel",
    "Pullman Tour Eiffel", "Hôtel des Grands Boulevards", "Hôtel Providence", "Hôtel National des Arts et Métiers", "Hôtel Bachaumont",
    "Grand Hôtel du Palais Royal", "Hôtel Regina", "Hôtel Brighton", "Hôtel Lutetia", "Hôtel Molitor",
    "CitizenM", "Generator Hostel", "St Christopher's Inn", "Les Piaules", "Beau M",
    "Hôtel Parister", "Hôtel Panache", "Hôtel Bienvenue", "Hôtel Paradis", "Hôtel Grand Powers",
    "La Réserve", "Le Royal Monceau", "Prince de Galles", "Fauchon L'Hôtel", "Maison Souquet",
    "Hôtel des Académies et des Arts", "Hôtel Baume", "Hôtel Dame des Arts", "Hôtel des Deux Gares", "Hôtel Rochechouart"
  ],
  LEGAL: [
    "Cabinet Darrois Villey", "Bredin Prat", "Gide Loyrette Nouel", "August Debouzy", "Fidal",
    "CMS Francis Lefebvre", "De Pardieu Brocas Maffei", "Jeantet", "Franklin", "Altana",
    "AyacheSalama", "Racine", "DS Avocats", "Lerins & BCW", "Simon Associés",
    "Cabinet Dupont & Associés", "SCP Martin Avocats", "Cabinet Juridique Lyon", "Droit & Conseil", "Legal & Partners",
    "Avocats du Parc", "Cabinet Saint-Louis", "Etude Maître Durand", "Cabinet Richard", "Lefèvre Pelletier",
    "UGGC Avocats", "Villey Girard Grolleaud", "White & Case Paris", "Clifford Chance Paris", "Linklaters Paris",
    "Allen & Overy Paris", "Freshfields Paris", "Latham & Watkins Paris", "Skadden Paris", "Weil Gotshal Paris",
    "Jones Day Paris", "Mayer Brown Paris", "Hogan Lovells Paris", "Baker McKenzie Paris", "Dentons Paris",
    "Orrick Paris", "Shearman & Sterling Paris", "Sullivan & Cromwell Paris", "Cleary Gottlieb Paris", "Willkie Farr Paris",
    "Cabinet Lex", "Juris Conseil", "Avocats & Partenaires", "Cabinet Rousseau", "Etude Notariale Lefranc"
  ],
  TECH: [
    "Doctolib", "BlaBlaCar", "Qonto", "Alan", "ManoMano",
    "Back Market", "Voodoo", "Contentsquare", "Mirakl", "PayFit",
    "Ledger", "Shift Technology", "Ynsect", "Meero", "Deezer",
    "Dailymotion", "Criteo", "Ubisoft", "Gameloft", "Veepee",
    "Showroomprive", "Vestiaire Collective", "Algolia", "Dataiku", "Spendesk",
    "Swile", "Lydia", "October", "Luko", "Papernest",
    "Ornikar", "OpenClassrooms", "Shadow", "Malt", "JobTeaser",
    "Welcome to the Jungle", "Station F", "Agicap", "Ecovadis", "Ivalua",
    "Kyriba", "Talentsoft", "Lumapps", "Akeneo", "Front",
    "Pigment", "Sorare", "Ankorstore", "Sendinblue", "Brevo"
  ],
  CRAFTS: [
    "Plomberie Martin", "Électricité Durand", "Menuiserie Lefèvre", "Peinture Dubois", "Serrurerie Leroy",
    "Garage Renault", "Boucherie du Centre", "Boulangerie Patisserie", "Fleuriste Monceau", "Coiffure Style",
    "Artisan Bâtiment", "Rénovation Express", "Toiture Service", "Jardinage Vert", "Nettoyage Pro",
    "Atelier du Bois", "Atelier Métal", "Ferronnerie d'Art", "Verrerie Nouvelle", "Céramique Studio",
    "Ebénisterie Royale", "Tapissier Décorateur", "Miroiterie Vitrerie", "Carrelage & Bain", "Cuisines & Bains",
    "Chauffage Confort", "Climatisation Service", "Alarme Sécurité", "Domotique Home", "Piscine Azur",
    "Paysagiste Jardin", "Elagage Arbre", "Maçonnerie Générale", "Façade Rénov", "Isolation Eco",
    "Atelier Couture", "Cordonnerie Express", "Pressing Service", "Retoucherie Mode", "Bijouterie Artisanale",
    "Horlogerie Ancienne", "Lutherie Musique", "Reliure Livre", "Dorure Cadre", "Vitrailliste Art"
  ],
  RETAIL: [
    "Galeries Lafayette", "Printemps", "Le Bon Marché", "BHV Marais", "Samaritaine",
    "Fnac", "Darty", "Boulanger", "Sephora", "Marionnaud",
    "Nocibé", "Zara", "H&M", "Uniqlo", "Mango",
    "Decathlon", "Go Sport", "Intersport", "Leroy Merlin", "Castorama",
    "Ikea", "Conforama", "But", "Maisons du Monde", "Habitat",
    "Monoprix", "Franprix", "Carrefour City", "Auchan", "Leclerc",
    "Nature & Découvertes", "Truffaut", "Jardiland", "Picard", "Nicolas",
    "La Grande Épicerie", "Citadium", "Merci", "Fleux", "Colette"
  ],
  HEALTH: [
    "Clinique des Champs-Elysées", "Hôpital Américain", "Institut Curie", "Institut Pasteur", "Fondation Rothschild",
    "Cabinet Médical Kleber", "Centre Dentaire Paris", "Laboratoire d'Analyses", "Pharmacie Principale", "Optique 2000",
    "Krys", "Alain Afflelou", "GrandOptical", "Audio 2000", "Amplifon",
    "Docteur Martin Généraliste", "Cabinet Kiné Sport", "Ostéopathe Paris", "Psychologue Clinicien", "Dermatologie Laser",
    "Centre Radiologie", "Scanner IRM", "EHPAD Les Tilleuls", "Maison de Retraite", "Services à Domicile",
    "Clinique du Sport", "Centre Ophtalmologique", "Cabinet Pédiatrique", "Orthodontie Sourire", "Podologie Santé",
    "Pharmacie de Garde", "Matériel Médical", "Ambulances Rapides", "Infirmiers Libéraux", "Sage-Femme Cabinet"
  ],
  REAL_ESTATE: [
    "Foncia", "Nexity", "Century 21", "Orpi", "Laforêt",
    "Guy Hoquet", "Stéphane Plaza Immobilier", "Era Immobilier", "Barnes", "Sotheby's Realty",
    "Daniel Féau", "Emile Garcin", "Junot", "Vaneau", "Mercure Forbes",
    "Iad France", "Safti", "Capifrance", "Propriétés Privées", "Efficity",
    "Promoteur Constructeur", "Agence Etoile", "Agence Bleue", "Immo Plus", "Habitat Conseil",
    "Agence Principale", "Immobilière 3F", "Citya Immobilier", "Square Habitat", "Human Immobilier",
    "L'Adresse", "Nestenn", "Arthurimmo", "Cimm Immobilier", "Dr House Immo"
  ],
  DESIGN: [
    "Publicis", "Havas", "BETC", "TBWA", "Ogilvy",
    "McCann", "DDB", "Sid Lee", "Fred & Farid", "Marcel",
    "Buzzman", "Romance", "Rosa Paris", "Ubi Bene", "Dragon Rouge",
    "Carré Noir", "Saguez & Partners", "Agence Babel", "Royalties", "Landor",
    "FutureBrand", "Interbrand", "Wolff Olins", "Pentagram", "Design Studio",
    "Agence 4u", "Studio 54", "Création Graphique", "Web Agency", "Digital Factory",
    "Agence Influence", "Studio Photo", "Production Vidéo", "Motion Design", "UX/UI Studio"
  ],
  OTHER: [
    "Groupe Industriel", "Société de Services", "Consulting Group", "Logistique Transport", "Import Export",
    "Sécurité Gardiennage", "Nettoyage Industriel", "Intérim RH", "Formation Pro", "Événementiel Agency"
  ]
};

export const SECTOR_MAP: Record<string, string[]> = {
  [Sector.RESTAURANTS]: REAL_DATA.RESTAURANTS,
  [Sector.HOTELS]: REAL_DATA.HOTELS,
  [Sector.LEGAL]: REAL_DATA.LEGAL,
  [Sector.DESIGN]: REAL_DATA.DESIGN,
  [Sector.CRAFTS]: REAL_DATA.CRAFTS,
  [Sector.RETAIL]: REAL_DATA.RETAIL,
  [Sector.HEALTH]: REAL_DATA.HEALTH,
  [Sector.REAL_ESTATE]: REAL_DATA.REAL_ESTATE,
  [Sector.TECH]: REAL_DATA.TECH,
  [Sector.OTHER]: REAL_DATA.OTHER
};

// Addresses per City
export const STREETS_BY_CITY: Record<string, string[]> = {
  "Paris": [
    "Rue de Rivoli", "Avenue des Champs-Élysées", "Boulevard Haussmann", "Rue du Faubourg Saint-Honoré", "Avenue Montaigne",
    "Boulevard Saint-Germain", "Rue de Rennes", "Place de la Bastille", "Rue Oberkampf", "Rue des Rosiers",
    "Avenue de l'Opéra", "Rue de la Paix", "Place Vendôme", "Rue Saint-Antoine", "Boulevard Voltaire",
    "Rue Cler", "Rue Montorgueil", "Avenue Victor Hugo", "Rue de Passy", "Boulevard de Magenta"
  ],
  "Lyon": [
    "Rue de la République", "Place Bellecour", "Cours Vitton", "Rue Victor Hugo", "Cours Lafayette",
    "Quai Saint-Antoine", "Montée de la Grande-Côte", "Rue du Boeuf", "Place des Terreaux", "Boulevard des Brotteaux",
    "Cours de la Liberté", "Avenue des Frères Lumière", "Rue Mercière", "Rue Saint-Jean", "Place Carnot"
  ],
  "Marseille": [
    "La Canebière", "Rue de la République", "Avenue du Prado", "Corniche Kennedy", "Rue Paradis",
    "Rue Saint-Ferréol", "Cours Julien", "Place Castellane", "Vieux Port", "Boulevard Michelet",
    "Rue de Rome", "Avenue de Mazargues", "Boulevard Baille", "Rue Breteuil", "Quai de Rive Neuve"
  ],
  "Bordeaux": [
    "Rue Sainte-Catherine", "Cours de l'Intendance", "Place de la Bourse", "Quai des Chartrons", "Cours Victor Hugo",
    "Cours Clémenceau", "Rue Porte Dijeaux", "Place de la Victoire", "Allées de Tourny", "Rue du Pas-Saint-Georges"
  ],
  "Toulouse": [
    "Place du Capitole", "Rue d'Alsace-Lorraine", "Rue de Metz", "Allées Jean Jaurès", "Rue Saint-Rome",
    "Place Saint-Georges", "Rue de la Pomme", "Boulevard de Strasbourg", "Grande Rue Saint-Michel", "Place Esquirol"
  ],
  "Nice": [
    "Promenade des Anglais", "Avenue Jean Médecin", "Place Masséna", "Rue de France", "Boulevard Victor Hugo",
    "Cours Saleya", "Rue Gioffredo", "Avenue de Verdun", "Rue Bonaparte", "Boulevard Gambetta"
  ],
  "Nantes": [
    "Rue Crébillon", "Place Royale", "Cours des 50 Otages", "Rue de Strasbourg", "Passage Pommeraye",
    "Boulevard Guist'hau", "Rue du Calvaire", "Place Graslin", "Quai de la Fosse", "Rue des Hauts Pavés"
  ],
  "Lille": [
    "Rue de Béthune", "Grand Place", "Rue Nationale", "Rue Faidherbe", "Boulevard de la Liberté",
    "Rue Royale", "Place Rihour", "Rue de Gand", "Avenue de la République", "Rue Solférino"
  ],
  "Strasbourg": [
    "Place Kléber", "Rue des Grandes Arcades", "Grand'Rue", "Quai des Bateliers", "Avenue de la Forêt-Noire",
    "Rue du Dôme", "Place de la Cathédrale", "Rue du 22 Novembre", "Boulevard de la Victoire", "Route du Polygone"
  ],
  "Rennes": [
    "Place de la Mairie", "Rue Le Bastard", "Rue de Saint-Malo", "Mail François Mitterrand", "Avenue Janvier",
    "Quai Lamennais", "Rue d'Antrain", "Place des Lices", "Rue Saint-Hélier", "Boulevard de la Liberté"
  ],
  "Montpellier": [
    "Place de la Comédie", "Rue de la Loge", "Boulevard du Jeu de Paume", "Rue Foch", "Avenue Foch",
    "Antigone", "Place de l'Europe", "Rue de l'Université", "Cours Gambetta", "Avenue de la Pompignane"
  ]
};

export const PHONE_PREFIXES: Record<string, string> = {
  "Paris": "01",
  "Lyon": "04",
  "Marseille": "04",
  "Nice": "04",
  "Montpellier": "04",
  "Toulouse": "05",
  "Bordeaux": "05",
  "Nantes": "02",
  "Rennes": "02",
  "Lille": "03",
  "Strasbourg": "03"
};

// Mock data helpers
export const MOCK_FIRST_NAMES = [
  "Thomas", "Marie", "Sophie", "Nicolas", "Julien", "Camille", "Pierre", "Sarah", "Alexandre", "Laura",
  "Jean", "Philippe", "Nathalie", "Isabelle", "Laurent", "Christophe", "Stéphanie", "Céline", "Aurélie", "David",
  "Guillaume", "Antoine", "Mathieu", "Julie", "Lucie", "Émilie", "Paul", "Maxime", "Lucas", "Léa"
];
export const MOCK_LAST_NAMES = [
  "Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau",
  "Simon", "Laurent", "Lefebvre", "Michel", "Garcia", "David", "Bertrand", "Roux", "Vincent", "Fournier",
  "Morel", "Girard", "André", "Lefèvre", "Mercier", "Dupont", "Lambert", "Bonnet", "François", "Martinez"
];

export const SECTOR_ROLES: Record<string, string[]> = {
  [Sector.RESTAURANTS]: ["Gérant", "Chef de Cuisine", "Directeur de Salle", "Propriétaire", "Responsable Restauration"],
  [Sector.HOTELS]: ["Directeur Général", "Responsable Hébergement", "Chef de Réception", "Gérant", "Directeur des Opérations"],
  [Sector.LEGAL]: ["Avocat Associé", "Avocat Collaborateur", "Notaire", "Juriste", "Secrétaire Général"],
  [Sector.DESIGN]: ["Directeur Artistique", "Chef de Projet", "Directeur de Création", "Gérant", "Lead Designer"],
  [Sector.CRAFTS]: ["Artisan Gérant", "Chef d'Atelier", "Responsable Technique", "Maître Artisan", "Directeur"],
  [Sector.RETAIL]: ["Directeur de Magasin", "Responsable Rayon", "Gérant", "Commerçant", "Responsable des Ventes"],
  [Sector.HEALTH]: ["Médecin Directeur", "Praticien Hospitalier", "Pharmacien Titulaire", "Chirurgien Dentiste", "Gérant"],
  [Sector.REAL_ESTATE]: ["Directeur d'Agence", "Négociateur Immobilier", "Gérant", "Responsable Location", "Courtier"],
  [Sector.TECH]: ["CEO", "CTO", "Product Manager", "Head of Sales", "Founder"],
  [Sector.OTHER]: ["Président", "Directeur Général", "Gérant", "Responsable", "Directeur Commercial"]
};