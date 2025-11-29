export enum Sector {
  RESTAURANTS = "Restaurants",
  HOTELS = "Hôtels",
  LEGAL = "Avocats/Juridique",
  DESIGN = "Agences Design",
  CRAFTS = "Artisans",
  RETAIL = "Commerces",
  HEALTH = "Santé",
  REAL_ESTATE = "Immobilier",
  TECH = "Tech/Startups",
  OTHER = "Autre"
}

export enum EmailStatus {
  VALID = "Valid",
  RISKY = "Risky",
  INVALID = "Invalid",
  UNKNOWN = "Unknown"
}

export interface CompanyData {
  id: string;
  name: string;
  siren?: string;
  sector: string;
  address: string;
  city: string;
  website?: string;
  emails: Array<{
    address: string;
    source: string; // 'Web', 'Pappers', 'LinkedIn'
    type: 'Generic' | 'Personal' | 'Pattern';
    confidence: number;
  }>;
  phone?: string;
  contactName?: string;
  contactRole?: string;
  socials: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  };
  collectedAt: string;
  qualityScore: number; // 0-100
  emailStatus: EmailStatus;
}

export interface SearchParams {
  sector: string;
  location: string;
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