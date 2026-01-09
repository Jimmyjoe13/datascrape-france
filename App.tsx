import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Database, Settings, Search, MapPin, Loader2, Zap, History, Save, AlertTriangle } from 'lucide-react';
import { Sector, SearchParams, CompanyData, ScrapingSession } from './types';
import { SECTORS, FRENCH_DEPARTMENTS } from './constants';
import { scrapeData } from './services/apiService';
import Dashboard from './components/Dashboard';
import ResultsTable from './components/ResultsTable';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scraper' | 'history'>('dashboard');
  const [isScraping, setIsScraping] = useState(false);
  // Real backend doesn't stream progress percentage easily, so we use a visual loader
  const [loadingStep, setLoadingStep] = useState<string>(''); 
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Search State
  const [searchParams, setSearchParams] = useState<SearchParams>({
    sector: SECTORS[0],
    location: FRENCH_DEPARTMENTS[0].code,
    maxResults: 10,
    customKeywords: ''
  });

  // Data State
  const [sessions, setSessions] = useState<ScrapingSession[]>([]);
  const [currentResults, setCurrentResults] = useState<CompanyData[]>([]);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('datascrape_sessions');
    if (saved) {
      setSessions(JSON.parse(saved));
    }
  }, []);

  // Save to local storage when updated
  useEffect(() => {
    localStorage.setItem('datascrape_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsScraping(true);
    setErrorMsg(null);
    setCurrentResults([]);
    setActiveTab('scraper');
    setLoadingStep('Connexion à l\'annuaire experts-du-patrimoine.fr...');

    try {
      // Simulation des étapes pour l'UX pendant l'attente
      const stepInterval = setInterval(() => {
        setLoadingStep(prev => {
           if(prev.includes('Connexion')) return 'Exploration de la catégorie...';
           if(prev.includes('catégorie')) return 'Extraction des profils...';
           if(prev.includes('profils')) return 'Enrichissement via API Gouv.fr...';
           if(prev.includes('Enrichissement')) return 'Vérification des doublons...';
           return prev;
        });
      }, 5000);

      const results = await scrapeData(searchParams);
      
      clearInterval(stepInterval);
      setCurrentResults(results);
      
      const newSession: ScrapingSession = {
        id: `SESS-${Date.now()}`,
        date: new Date().toISOString(),
        params: searchParams,
        totalFound: results.length,
        validEmails: results.filter(r => r.emailStatus === 'Valid').length,
        results: results
      };
      
      setSessions(prev => [newSession, ...prev]);

    } catch (error: any) {
      console.error("Scraping failed", error);
      setErrorMsg(error.message);
    } finally {
      setIsScraping(false);
      setLoadingStep('');
    }
  };

  const loadSession = (session: ScrapingSession) => {
      setCurrentResults(session.results);
      setActiveTab('scraper');
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-3 text-primary-500 mb-8">
            <Zap size={28} className="fill-current" />
            <h1 className="text-xl font-bold text-white tracking-tight">DataScrape FR</h1>
          </div>
          
          <nav className="space-y-2">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
            >
              <LayoutDashboard size={20} />
              <span className="font-medium">Tableau de bord</span>
            </button>
            <button 
              onClick={() => setActiveTab('scraper')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'scraper' ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
            >
              <Database size={20} />
              <span className="font-medium">Scraping & Data</span>
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}
            >
              <History size={20} />
              <span className="font-medium">Historique</span>
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-900">
           <div className="flex items-center gap-3 text-slate-400 hover:text-white cursor-pointer transition-colors">
             <Settings size={20} />
             <span className="text-sm font-medium">Paramètres</span>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
           <div className="font-bold text-primary-500 flex items-center gap-2"><Zap size={20}/> DataScrape FR</div>
           <button className="text-slate-400"><Settings size={20} /></button>
        </div>

        {/* Top Search Bar (Configuration) */}
        <div className="bg-slate-900/50 border-b border-slate-800 p-6 backdrop-blur-md z-20">
            <form onSubmit={handleScrape} className="flex flex-col md:flex-row gap-4 max-w-7xl mx-auto items-end">
                <div className="flex-1 space-y-2 w-full">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Secteur d'activité</label>
                    <div className="relative">
                        <select 
                            value={searchParams.sector}
                            onChange={(e) => setSearchParams({...searchParams, sector: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-4 pr-10 py-3 appearance-none focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        >
                            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
                    </div>
                </div>

                <div className="flex-1 space-y-2 w-full">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Département</label>
                    <div className="relative">
                         <select 
                            value={searchParams.location}
                            onChange={(e) => setSearchParams({...searchParams, location: e.target.value})}
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg pl-4 pr-10 py-3 appearance-none focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        >
                            {FRENCH_DEPARTMENTS.map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
                        </select>
                        <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={18} />
                    </div>
                </div>

                <div className="w-full md:w-32 space-y-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Max</label>
                    <input 
                        type="number" 
                        min="5" 
                        max="100"
                        value={searchParams.maxResults}
                        onChange={(e) => setSearchParams({...searchParams, maxResults: parseInt(e.target.value)})}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={isScraping}
                    className={`w-full md:w-auto px-8 py-3 rounded-lg font-semibold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${isScraping ? 'bg-slate-700 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-500 hover:shadow-primary-500/25 active:transform active:scale-95'}`}
                >
                    {isScraping ? (
                        <><Loader2 className="animate-spin" size={20} /> Stop</>
                    ) : (
                        <><Zap size={20} /> Lancer</>
                    )}
                </button>
            </form>
            
            {/* Status Bar for Real Scraping */}
            {isScraping && (
                <div className="max-w-7xl mx-auto mt-6 animate-fade-in bg-slate-800/50 rounded-lg p-3 border border-primary-500/20 flex items-center gap-3">
                    <Loader2 className="animate-spin text-primary-400" size={18} />
                    <span className="text-sm text-primary-200 font-medium">MODE REEL: {loadingStep}</span>
                </div>
            )}

            {errorMsg && (
                <div className="max-w-7xl mx-auto mt-6 animate-fade-in bg-red-500/10 rounded-lg p-3 border border-red-500/20 flex items-center gap-3 text-red-400">
                    <AlertTriangle size={18} />
                    <span className="text-sm font-medium">{errorMsg}</span>
                </div>
            )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-slate-900 custom-scrollbar">
            <div className="max-w-7xl mx-auto h-full">
                {activeTab === 'dashboard' && <Dashboard sessions={sessions} />}
                
                {activeTab === 'scraper' && (
                    <div className="h-full flex flex-col animate-fade-in">
                        {currentResults.length > 0 ? (
                            <ResultsTable data={currentResults} />
                        ) : (
                            !isScraping && !errorMsg && (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                    <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6">
                                        <Search size={40} className="text-slate-600" />
                                    </div>
                                    <h3 className="text-xl font-medium text-white mb-2">Annuaire Experts du Patrimoine</h3>
                                    <p className="max-w-md text-center text-sm">
                                        Scraping de l'annuaire experts-du-patrimoine.fr. 
                                        Assurez-vous d'avoir lancé <code className="bg-slate-800 px-1 rounded text-primary-400">npm run server</code>.
                                        Temps estimé : 2-5 min selon le nombre de résultats.
                                    </p>
                                </div>
                            )
                        )}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="grid grid-cols-1 gap-4">
                        <h2 className="text-xl font-bold mb-4">Historique des sessions</h2>
                        {sessions.length === 0 ? (
                             <p className="text-slate-500">Aucun historique disponible.</p>
                        ) : sessions.map(session => (
                            <div key={session.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4 hover:border-slate-600 transition-colors">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="font-semibold text-white">{session.params.sector}</span>
                                        <span className="text-slate-400">•</span>
                                        <span className="text-slate-300">{session.params.location}</span>
                                    </div>
                                    <div className="text-sm text-slate-500">
                                        {new Date(session.date).toLocaleDateString()} à {new Date(session.date).toLocaleTimeString()} • {session.totalFound} résultats
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right mr-4 hidden md:block">
                                        <div className="text-xs text-slate-400 uppercase tracking-wide">Emails Valides</div>
                                        <div className="text-lg font-bold text-emerald-400">{session.validEmails}</div>
                                    </div>
                                    <button 
                                        onClick={() => loadSession(session)}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                                    >
                                        Voir les résultats
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
};

export default App;