import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Copy, 
  Check, 
  Send, 
  Play, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  Code2,
  RefreshCw,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { api } from '../utils/api';
import { StatusBadge } from '../components/Badge';

export function SetupGuide({ events = [], selectedEventId }) {
  const [activeEventId, setActiveEventId] = useState(selectedEventId || events[0]?.id || '');
  const [scriptCode, setScriptCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Simulator State
  const [simulatorPayload, setSimulatorPayload] = useState({
    Emri: 'Argjend',
    Mbiemri: 'Bala',
    'Email Adresa': 'argjend.bala@student.uni-pr.edu',
    'Dega / Programi i Studimit': 'Mjekësi e Përgjithshme',
    'Emrat e Personave Shoqërues': 'Dr. Naim Bala (Prind)\nValmira Bala (Prind)',
    'Numri i Personave Shoqërues': '2',
    'Numri i Telefonit': '+383 49 112 334',
    'Timestamp': new Date().toISOString()
  });
  const [simulatorLoading, setSimulatorLoading] = useState(false);
  const [simulatorResult, setSimulatorResult] = useState(null);

  const currentEvent = events.find(e => e.id === Number(activeEventId)) || events[0];

  useEffect(() => {
    if (currentEvent) {
      fetchScript(currentEvent.slug);
      fetchSyncLogs(currentEvent.id);
    }
  }, [activeEventId, currentEvent]);

  const fetchScript = async (slug) => {
    try {
      const res = await fetch(`/api/webhook/setup-script/${slug}`);
      const text = await res.text();
      setScriptCode(text);
    } catch (e) {
      console.error('Error fetching script:', e);
    }
  };

  const fetchSyncLogs = async (eventId) => {
    setLogsLoading(true);
    try {
      const res = await api.get(`/webhook/sync-logs?limit=15${eventId ? `&event_id=${eventId}` : ''}`);
      setSyncLogs(res.logs || []);
    } catch (e) {
      console.error('Error fetching sync logs:', e);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRunSimulator = async () => {
    if (!currentEvent) return;
    setSimulatorLoading(true);
    setSimulatorResult(null);
    try {
      const res = await api.post('/webhook/test-simulator', {
        event_id: currentEvent.id,
        payload: {
          namedValues: {
            'Emri': [simulatorPayload.Emri],
            'Mbiemri': [simulatorPayload.Mbiemri],
            'Email Adresa': [simulatorPayload['Email Adresa']],
            'Dega / Programi i Studimit': [simulatorPayload['Dega / Programi i Studimit']],
            'Emrat e Personave Shoqërues': [simulatorPayload['Emrat e Personave Shoqërues']],
            'Numri i Personave Shoqërues': [simulatorPayload['Numri i Personave Shoqërues']],
            'Numri i Telefonit': [simulatorPayload['Numri i Telefonit']],
            'Timestamp': [simulatorPayload.Timestamp]
          }
        }
      });
      setSimulatorResult({ success: true, data: res });
      fetchSyncLogs(currentEvent.id);
    } catch (err) {
      setSimulatorResult({ success: false, error: err.message });
      fetchSyncLogs(currentEvent.id);
    } finally {
      setSimulatorLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B1E36]">Udhëzuesi i Integrimit me Google Forms & Sheets</h2>
          <p className="text-xs text-slate-500">
            Lidhni formularin zyrtar të regjistrimit të studentëve me sistemin e gjenerimit të biletave
          </p>
        </div>

        {/* Event Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Zgjidhni Aktivitetin:</span>
          <select
            value={activeEventId}
            onChange={(e) => setActiveEventId(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold text-[#0B1E36] bg-white border border-slate-300 rounded-lg"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Step by step instructions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2">
          <div className="w-7 h-7 rounded-full bg-[#0B1E36] text-[#C5A059] flex items-center justify-center font-bold text-xs">
            1
          </div>
          <h3 className="text-sm font-bold text-[#0B1E36]">Lidhni Google Form me Sheet</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Hapni formularin tuaj në Google Forms. Shkoni te tab-i <strong>Responses</strong> dhe klikoni <strong>Link to Sheets</strong> (Krijo tabelë të re).
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2">
          <div className="w-7 h-7 rounded-full bg-[#0B1E36] text-[#C5A059] flex items-center justify-center font-bold text-xs">
            2
          </div>
          <h3 className="text-sm font-bold text-[#0B1E36]">Vendosni Apps Script</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Në Google Sheet klikoni <strong>Extensions &rarr; Apps Script</strong>. Fshini kodin ekzistues dhe ngjisni skriptën zyrtare të mëposhtme me 1 klikim.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2">
          <div className="w-7 h-7 rounded-full bg-[#0B1E36] text-[#C5A059] flex items-center justify-center font-bold text-xs">
            3
          </div>
          <h3 className="text-sm font-bold text-[#0B1E36]">Aktivizoni Shkaktuesin (Trigger)</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Në menynë majtas klikoni ikonën e orës <strong>Triggers &rarr; Add Trigger</strong>. Zgjidhni <code>onFormSubmit</code> dhe burimin <strong>On form submit</strong>.
          </p>
        </div>
      </div>

      {/* Interactive Live Webhook Test Simulator */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-amber-50/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-700 flex items-center justify-center">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0B1E36]">Testuesi i Integrimit në Kohë Reale (Live Simulator)</h3>
              <p className="text-xs text-slate-500">
                Simuloni një regjistrim të vërtetë nga Google Forms pa qenë e nevojshme të hapni llogarinë Google
              </p>
            </div>
          </div>
          <button
            onClick={handleRunSimulator}
            disabled={simulatorLoading}
            className="flex items-center gap-2 px-4 py-2 font-bold text-xs text-white bg-[#0B1E36] hover:bg-[#142D50] rounded-lg transition-all shadow-xs"
          >
            <Send className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>{simulatorLoading ? 'Duke procesuar...' : 'Dërgo të Dhëna Testuese'}</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Emri</label>
              <input
                type="text"
                value={simulatorPayload.Emri}
                onChange={(e) => setSimulatorPayload({ ...simulatorPayload, Emri: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Mbiemri</label>
              <input
                type="text"
                value={simulatorPayload.Mbiemri}
                onChange={(e) => setSimulatorPayload({ ...simulatorPayload, Mbiemri: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-slate-50"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Email Adresa</label>
              <input
                type="email"
                value={simulatorPayload['Email Adresa']}
                onChange={(e) => setSimulatorPayload({ ...simulatorPayload, 'Email Adresa': e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-slate-50 font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Dega / Programi</label>
              <input
                type="text"
                value={simulatorPayload['Dega / Programi i Studimit']}
                onChange={(e) => setSimulatorPayload({ ...simulatorPayload, 'Dega / Programi i Studimit': e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-slate-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Personat Shoqërues</label>
              <textarea
                rows="2"
                value={simulatorPayload['Emrat e Personave Shoqërues']}
                onChange={(e) => setSimulatorPayload({ ...simulatorPayload, 'Emrat e Personave Shoqërues': e.target.value })}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-slate-50 font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">ID e Dërgimit (Timestamp për Idempotency)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={simulatorPayload.Timestamp}
                  onChange={(e) => setSimulatorPayload({ ...simulatorPayload, Timestamp: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-slate-50 font-mono text-[11px]"
                />
                <button
                  type="button"
                  onClick={() => setSimulatorPayload({ ...simulatorPayload, Timestamp: new Date().toISOString() })}
                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-[11px] font-semibold text-slate-700 shrink-0"
                >
                  Gjenero të re
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Këshillë: Nëse klikoni "Dërgo" dy herë me të njëjtën ID, sistemi demonstron parandalimin e dublikatave!
              </p>
            </div>
          </div>

          {/* Simulator Result Output */}
          {simulatorResult && (
            <div className={`p-4 rounded-lg border text-xs animate-in fade-in ${
              simulatorResult.success
                ? simulatorResult.data.result.isDuplicate
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {simulatorResult.success ? (
                <div>
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{simulatorResult.data.message}</span>
                  </div>
                  {simulatorResult.data.result.isDuplicate ? (
                    <p className="text-[11px] mt-1">
                      Mbrojtja nga dublikatat aktive: Kjo kërkesë u identifikua si regjistrim ekzistues dhe nuk u krijua biletë e dyfishtë.
                    </p>
                  ) : (
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 font-mono text-[11px]">
                      <div>Bileta: <strong>{simulatorResult.data.result.ticketNumber}</strong></div>
                      <div>PDF: <strong>{simulatorResult.data.result.pdfGenerated ? '✓ Krijuar' : 'N/A'}</strong></div>
                      <div>Email: <strong>{simulatorResult.data.result.emailSent ? '✓ Dërguar' : 'Në pritje'}</strong></div>
                      <div>Mysafirë: <strong>{simulatorPayload['Numri i Personave Shoqërues']}</strong></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{simulatorResult.error}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Copy-paste Apps Script Box */}
      <div className="bg-[#0B1E36] rounded-xl border border-slate-700 overflow-hidden text-white shadow-md">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[#C5A059]" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Kodi i Gatshëm Google Apps Script ({currentEvent?.name})
            </h4>
          </div>
          <button
            onClick={handleCopyScript}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C5A059] hover:bg-[#d4af37] text-[#0B1E36] text-xs font-bold transition-all shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'U Kopjua!' : 'Kopjo Kodin'}</span>
          </button>
        </div>
        <div className="p-4 bg-[#071322] overflow-x-auto max-h-72">
          <pre className="text-[11px] font-mono text-emerald-300 leading-relaxed">
            {scriptCode || '// Duke ngarkuar kodin...'}
          </pre>
        </div>
      </div>

      {/* Sync Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h4 className="text-sm font-bold text-[#0B1E36]">Regjistri i Sinkronizimeve (Sync Logs)</h4>
            <p className="text-xs text-slate-500">Transaksionet e fundit të pranuara nga webhook-u i Google Sheets</p>
          </div>
          <button
            onClick={() => fetchSyncLogs(currentEvent?.id)}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors"
            title="Rifresko regjistrin"
          >
            <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-2.5">Koha</th>
                <th className="px-5 py-2.5">Burimi</th>
                <th className="px-5 py-2.5">Statusi</th>
                <th className="px-5 py-2.5">ID e Dërgimit</th>
                <th className="px-5 py-2.5">Mesazhi / Përmbledhja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {syncLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-6 text-center text-slate-400">
                    Nuk ka ende regjistrime në sinkronizim.
                  </td>
                </tr>
              ) : (
                syncLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="px-5 py-2.5 font-mono text-[11px] text-slate-500">{log.created_at}</td>
                    <td className="px-5 py-2.5 font-semibold text-slate-700">{log.source}</td>
                    <td className="px-5 py-2.5">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="px-5 py-2.5 font-mono text-[11px] text-slate-600 truncate max-w-xs">{log.submission_id || 'N/A'}</td>
                    <td className="px-5 py-2.5 text-slate-600">{log.message}</td>
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
