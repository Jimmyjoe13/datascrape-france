// Catégories professionnelles de l'annuaire experts-du-patrimoine.fr
export enum Sector {
  CGP = "CGP",
  AVOCAT = "Avocat",
  NOTAIRE = "Notaire",
  AGENT_ASSURANCE = "Agent d'assurance",
  BANQUE_PRIVEE = "Banque privée",
  COURTIER = "Courtier",
  FAMILY_OFFICE = "Family office",
  IMMOBILIER = "Professionnel immobilier",
  SOCIETE_GESTION = "Société de gestion",
  AUTRE = "Autre",
}

export enum EmailStatus {
  VALID = "Valid",
  RISKY = "Risky",
  INVALID = "Invalid",
  UNKNOWN = "Unknown",
}

export interface CompanyData {
  id: string;
  name: string;
  siren?: string;
  sector: string;
  address: string;
  city: string;
  postalCode?: string;
  website?: string;
  emails: Array<{
    address: string;
    source: string;
    type: "Generic" | "Personal" | "Pattern";
    confidence: number;
  }>;
  phone?: string;
  contactName?: string;
  contactRole?: string;
  expertises?: string[]; // Domaines d'expertise du professionnel
  socials: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };
  collectedAt: string;
  qualityScore: number;
  emailStatus: EmailStatus;
}

export interface SearchParams {
  sector: string;
  location: string; // Code département (ex: "75", "69") ou vide pour toute la France
  maxResults: number;
  customKeywords?: string;
}

export interface ScrapingSession {
  id: string;
  date: string;
  params: SearchParams;
  totalFound: number;
  validEmails: number;
  results: CompanyData[];
}
