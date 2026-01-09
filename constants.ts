import { Sector } from './types';

// Liste des secteurs pour le dropdown frontend
export const SECTORS = Object.values(Sector);

// Mapping secteur -> slug URL de l'annuaire
export const CATEGORY_SLUG_MAP: Record<string, string> = {
  [Sector.CGP]: 'cgp',
  [Sector.AVOCAT]: 'avocat',
  [Sector.NOTAIRE]: 'notaire',
  [Sector.AGENT_ASSURANCE]: 'agent-dassurance',
  [Sector.BANQUE_PRIVEE]: 'banque-privee',
  [Sector.COURTIER]: 'courtier',
  [Sector.FAMILY_OFFICE]: 'family-office-et-mfo',
  [Sector.IMMOBILIER]: 'professionnel-immobilier',
  [Sector.SOCIETE_GESTION]: 'societe-de-gestion',
  [Sector.AUTRE]: 'autre'
};

// Départements français pour le filtre de localisation
export const FRENCH_DEPARTMENTS = [
  { code: "", label: "Toute la France" },
  { code: "75", label: "75 - Paris" },
  { code: "92", label: "92 - Hauts-de-Seine" },
  { code: "93", label: "93 - Seine-Saint-Denis" },
  { code: "94", label: "94 - Val-de-Marne" },
  { code: "69", label: "69 - Rhône (Lyon)" },
  { code: "13", label: "13 - Bouches-du-Rhône (Marseille)" },
  { code: "31", label: "31 - Haute-Garonne (Toulouse)" },
  { code: "33", label: "33 - Gironde (Bordeaux)" },
  { code: "44", label: "44 - Loire-Atlantique (Nantes)" },
  { code: "59", label: "59 - Nord (Lille)" },
  { code: "67", label: "67 - Bas-Rhin (Strasbourg)" },
  { code: "06", label: "06 - Alpes-Maritimes (Nice)" },
  { code: "34", label: "34 - Hérault (Montpellier)" },
  { code: "35", label: "35 - Ille-et-Vilaine (Rennes)" }
];

// Rôles typiques par secteur (conservé pour l'enrichissement)
export const SECTOR_ROLES: Record<string, string[]> = {
  [Sector.CGP]: ["Conseiller en Gestion de Patrimoine", "Gérant", "Associé", "Directeur"],
  [Sector.AVOCAT]: ["Avocat Associé", "Avocat Collaborateur", "Avocat Fiscaliste", "Avocat d'Affaires"],
  [Sector.NOTAIRE]: ["Notaire", "Notaire Associé", "Clerc de Notaire"],
  [Sector.AGENT_ASSURANCE]: ["Agent Général", "Courtier en Assurance", "Responsable Clientèle"],
  [Sector.BANQUE_PRIVEE]: ["Banquier Privé", "Directeur de Clientèle", "Gérant de Portefeuille"],
  [Sector.COURTIER]: ["Courtier", "Courtier Financier", "Gérant"],
  [Sector.FAMILY_OFFICE]: ["Directeur", "Family Officer", "Gestionnaire de Fortune"],
  [Sector.IMMOBILIER]: ["Agent Immobilier", "Directeur d'Agence", "Conseiller Transaction"],
  [Sector.SOCIETE_GESTION]: ["Gérant de Portefeuille", "Directeur de Gestion", "Analyste Senior"],
  [Sector.AUTRE]: ["Directeur", "Gérant", "Consultant"]
};