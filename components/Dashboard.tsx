import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ScrapingSession, EmailStatus } from '../types';
import { TrendingUp, Users, Mail, CheckCircle, Database } from 'lucide-react';

interface DashboardProps {
  sessions: ScrapingSession[];
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#64748b']; // Green, Amber, Red, Slate

const StatCard = ({ title, value, icon: Icon, trend }: any) => (
  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-white">{value}</h3>
      </div>
      <div className="p-2 bg-slate-700/50 rounded-lg text-primary-500">
        <Icon size={24} />
      </div>
    </div>
    {trend && (
      <div className="mt-4 flex items-center text-sm text-emerald-400">
        <TrendingUp size={16} className="mr-1" />
        <span>{trend} vs semaine dernière</span>
      </div>
    )}
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ sessions }) => {
  // Aggregate stats
  const totalLeads = sessions.reduce((acc, s) => acc + s.totalFound, 0);
  const totalValid = sessions.reduce((acc, s) => acc + s.validEmails, 0);
  const totalSessions = sessions.length;
  const avgQuality = sessions.length > 0 ? Math.round(sessions.reduce((acc, s) => {
    const sessionAvg = s.results.reduce((a, r) => a + r.qualityScore, 0) / (s.results.length || 1);
    return acc + sessionAvg;
  }, 0) / sessions.length) : 0;

  // Prepare chart data
  const sectorData = sessions.reduce((acc: any, s) => {
    const sector = s.params.sector;
    acc[sector] = (acc[sector] || 0) + s.totalFound;
    return acc;
  }, {});
  
  const barData = Object.keys(sectorData).map(key => ({
    name: key,
    leads: sectorData[key]
  })).slice(0, 5); // Top 5

  const statusData = [
    { name: 'Valides', value: totalValid },
    { name: 'Risqués', value: Math.floor(totalLeads * 0.2) }, // Simulated ratio
    { name: 'Invalides', value: Math.floor(totalLeads * 0.1) },
    { name: 'Inconnus', value: Math.max(0, totalLeads - totalValid - Math.floor(totalLeads * 0.3)) },
  ];

  if (totalLeads === 0 && statusData.every(d => d.value === 0)) {
     // Show empty state data if no real data
     statusData[0].value = 1; 
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Leads Scrapés" value={totalLeads.toLocaleString()} icon={Database} trend="+12%" />
        <StatCard title="Emails Valides" value={totalValid.toLocaleString()} icon={CheckCircle} trend="+5%" />
        <StatCard title="Recherches" value={totalSessions} icon={Users} />
        <StatCard title="Qualité Moyenne" value={`${avgQuality}%`} icon={Mail} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-6">Répartition par Secteur</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData.length ? barData : [{name: 'Aucune donnée', leads: 0}]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                  cursor={{ fill: '#334155', opacity: 0.2 }}
                />
                <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-6">Santé des Emails</h3>
          <div className="h-64 flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-xs text-slate-400 mt-2">
            {statusData.map((entry, index) => (
              <div key={entry.name} className="flex items-center">
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[index] }}></div>
                {entry.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;