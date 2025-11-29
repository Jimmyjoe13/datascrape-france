import React, { useState, useMemo } from 'react';
import { CompanyData, EmailStatus } from '../types';
import { Search, Download, Filter, ExternalLink, Copy, Check, AlertTriangle, XCircle, Mail, User } from 'lucide-react';

interface ResultsTableProps {
  data: CompanyData[];
}

const ResultsTable: React.FC<ResultsTableProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredData = useMemo(() => {
    return data.filter(company => {
      const matchesSearch = 
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.sector.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || company.emailStatus === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, filterStatus]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Idéalement ajouter un petit toast de confirmation ici
  };

  const exportCSV = () => {
    const headers = ["Entreprise", "Emails", "Téléphone", "Dirigeant", "Statut", "Site Web", "Ville", "Secteur", "Score"];
    const rows = filteredData.map(c => [
      `"${c.name}"`, // Guillemets pour protéger les virgules dans les noms
      // MODIFICATION ICI : On joint tous les emails avec un point-virgule
      `"${c.emails.map(e => e.address).join(' ; ')}"`, 
      `"${c.phone || ''}"`,
      `"${c.contactName || ''}"`,
      c.emailStatus,
      c.website || "",
      c.city,
      c.sector,
      c.qualityScore
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // BOM pour Excel
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `export_leads_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
      const jsonContent = JSON.stringify(filteredData, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `export_leads_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (score >= 50) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col h-[600px]">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex gap-2 items-center w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 text-slate-200 pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
          <div className="relative">
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="appearance-none bg-slate-900 border border-slate-600 text-slate-200 pl-4 pr-10 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              <option value="all">Tous les statuts</option>
              <option value={EmailStatus.VALID}>Valides</option>
              <option value={EmailStatus.RISKY}>Risqués</option>
              <option value={EmailStatus.INVALID}>Invalides</option>
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          </div>
        </div>
        
        <div className="flex gap-2">
            <div className="text-slate-400 text-sm flex items-center mr-4">
                {selectedIds.size} sélectionné(s)
            </div>
            <button onClick={exportJSON} className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors">
                <span className="font-mono">{'{ }'}</span> JSON
            </button>
            <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm rounded-lg transition-colors">
                <Download size={16} /> Export CSV
            </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-900/50 text-slate-400 text-xs font-semibold uppercase sticky top-0 z-10 backdrop-blur-sm">
            <tr>
              <th className="p-4 w-10">
                <input 
                  type="checkbox" 
                  checked={filteredData.length > 0 && selectedIds.size === filteredData.length}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-600 bg-slate-800 text-primary-600 focus:ring-primary-600 focus:ring-offset-slate-800"
                />
              </th>
              <th className="p-4">Entreprise</th>
              <th className="p-4">Contacts</th>
              <th className="p-4">Statut</th>
              <th className="p-4">Détails</th>
              <th className="p-4 text-center">Score</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700 text-sm text-slate-200">
            {filteredData.length === 0 ? (
                <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                        Aucun résultat trouvé pour cette recherche.
                    </td>
                </tr>
            ) : filteredData.map((company) => (
              <tr key={company.id} className={`hover:bg-slate-700/30 transition-colors ${selectedIds.has(company.id) ? 'bg-primary-500/5' : ''}`}>
                <td className="p-4 align-top">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(company.id)}
                    onChange={() => toggleSelect(company.id)}
                    className="rounded border-slate-600 bg-slate-800 text-primary-600 focus:ring-primary-600 focus:ring-offset-slate-800 mt-1"
                  />
                </td>
                <td className="p-4 align-top">
                  <div className="font-medium text-white">{company.name}</div>
                  <div className="text-slate-400 text-xs mt-1 truncate max-w-[200px]">{company.website?.replace('https://', '')}</div>
                  {company.siren && <div className="text-slate-500 text-[10px] mt-0.5">SIREN: {company.siren}</div>}
                </td>
                <td className="p-4 align-top">
                  {/* AFFICHAGE DU DIRIGEANT */}
                  {company.contactName && (
                    <div className="flex items-center gap-2 mb-2 text-primary-300">
                        <User size={12} />
                        <span className="font-medium">{company.contactName}</span>
                    </div>
                  )}
                  
                  {/* MODIFICATION ICI : BOUCLE SUR TOUS LES EMAILS */}
                  {company.emails.length > 0 ? (
                    <div className="space-y-1">
                      {company.emails.map((email, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-slate-400 cursor-pointer hover:text-primary-400 group" onClick={() => copyToClipboard(email.address)}>
                          <Mail size={12} />
                          <span className="truncate max-w-[180px]">{email.address}</span>
                          <Copy size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500 text-xs italic">Aucun email</span>
                  )}
                  
                  {/* Affichage du téléphone s'il existe */}
                  {company.phone && (
                      <div className="text-slate-400 text-xs mt-2 flex items-center gap-2">
                          <span className="bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">TEL</span>
                          {company.phone}
                      </div>
                  )}
                </td>
                <td className="p-4 align-top">
                  {company.emailStatus === EmailStatus.VALID && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Check size={12} /> Valide
                    </span>
                  )}
                  {company.emailStatus === EmailStatus.RISKY && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <AlertTriangle size={12} /> Risqué
                    </span>
                  )}
                  {(company.emailStatus === EmailStatus.INVALID || company.emailStatus === EmailStatus.UNKNOWN) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-400 border border-slate-600">
                      <XCircle size={12} /> {company.emailStatus === EmailStatus.UNKNOWN ? 'Inconnu' : 'Invalide'}
                    </span>
                  )}
                </td>
                <td className="p-4 align-top text-xs text-slate-400 space-y-1">
                   <div>{company.sector}</div>
                   <div>{company.city}</div>
                </td>
                <td className="p-4 align-top text-center">
                    <div className={`inline-block px-2 py-1 rounded-lg border text-xs font-bold ${getScoreColor(company.qualityScore)}`}>
                        {company.qualityScore}
                    </div>
                </td>
                <td className="p-4 align-top text-right">
                  <div className="flex items-center justify-end gap-2">
                    {company.website && (
                         <a href={company.website} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                            <ExternalLink size={16} />
                        </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;