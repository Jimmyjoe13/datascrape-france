import { SearchParams, CompanyData } from '../types';
import axios from 'axios';

// En production, on utilise l'URL relative. En dev, on garde localhost.
const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

export const scrapeData = async (params: SearchParams): Promise<CompanyData[]> => {
  try {
    // Timeout de 5 minutes
    const response = await axios.post<CompanyData[]>(`${API_URL}/scrape`, params, {
      timeout: 300000, 
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
    console.error("API Error:", error);
    if (error.code === 'ECONNABORTED') {
      throw new Error("Le scraping a pris trop de temps (Timeout > 5min). Essayez de réduire le nombre de résultats.");
    }
    throw new Error(error.response?.data?.details || error.message || "Erreur de connexion au serveur de scraping");
  }
};