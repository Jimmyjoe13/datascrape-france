import { SearchParams, CompanyData } from '../types';
import axios from 'axios';

// Détection de l'environnement via la présence de PROD dans import.meta
// @ts-ignore - Vite injecte ces types à la compilation
const isProd = typeof import.meta !== 'undefined' && (import.meta as any).env?.PROD;
const API_URL = isProd ? '/api' : 'http://localhost:3001/api';

/**
 * Appelle le backend pour lancer le scraping de l'annuaire
 * @param params - Paramètres de recherche (sector, location, maxResults)
 * @returns Liste des leads extraits
 */
export const scrapeData = async (params: SearchParams): Promise<CompanyData[]> => {
  try {
    const response = await axios.post<CompanyData[]>(`${API_URL}/scrape`, params, {
      timeout: 600000, // 10 minutes max pour le scraping complet
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else {
      throw new Error("Format de réponse invalide");
    }
  } catch (error: any) {
    console.error("[API Error]:", error);
    
    if (error.code === 'ECONNABORTED') {
      throw new Error("Le scraping a pris trop de temps (Timeout > 10min). Réduisez le nombre de résultats.");
    }
    
    if (error.response?.status === 400) {
      throw new Error(error.response.data?.error || "Paramètres invalides");
    }
    
    throw new Error(
      error.response?.data?.details || 
      error.response?.data?.error ||
      error.message || 
      "Erreur de connexion au serveur de scraping"
    );
  }
};