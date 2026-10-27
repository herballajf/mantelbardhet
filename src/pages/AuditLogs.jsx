import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, Search, Clock, User, Activity } from 'lucide-react';
import { api } from '../utils/api';

export function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings/audit-logs');
      setLogs(res.logs || []);
    } catch (e) {
      console.error('Error fetching audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      l.action?.toLowerCase().includes(s) ||
      l.username?.toLowerCase().includes(s) ||
      l.full_name?.toLowerCase().includes(s) ||
      l.entity_type?.toLowerCase().includes(s) ||
      l.details?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B1E36]">Regjistri i Sigurisë & Auditimit (Audit Logs)</h2>
          <p className="text-xs text-slate-500">
            Gjurmim i të gjitha veprimeve administrative, modifikimeve të të dhënave dhe verifikimeve të hyrjes
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Rifresko</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtro sipas veprimit (p.sh. CHECKIN, RESEND, UPDATE), përdoruesit ose detajeve..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0B1E36]"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Koha</th>
                <th className="px-5 py-3">Përdoruesi</th>
                <th className="px-5 py-3">Veprimi (Action)</th>
                <th className="px-5 py-3">Objekti</th>
                <th className="px-5 py-3">Detajet</th>
                <th className="px-5 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-slate-400">
                    Nuk ka veprime të regjistruara në audit log.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {log.created_at}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-bold text-[#0B1E36] block">{log.full_name || 'Sistem / Anonim'}</span>
                      <span className="text-[10px] text-slate-400 font-mono">@{log.username || 'system'}</span>
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-amber-700">
                      {log.action}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-600">
                      {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                    </td>
                    <td className="px-5 py-3 max-w-xs font-mono text-[11px] text-slate-600 truncate" title={log.details}>
                      {log.details || '-'}
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-400">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
