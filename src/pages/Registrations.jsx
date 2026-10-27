import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Eye, 
  RotateCw, 
  Send, 
  Edit, 
  XCircle, 
  CheckCircle,
  FileSpreadsheet,
  AlertTriangle,
  UserCheck,
  Users
} from 'lucide-react';
import { api } from '../utils/api';
import { StatusBadge } from '../components/Badge';
import { Modal, ConfirmDialog } from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export function Registrations({ events = [], selectedEventId, onSelectEvent, isManualOpen, onCloseManual }) {
  const { isAdmin } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ticketStatus, setTicketStatus] = useState('');
  const [emailStatus, setEmailStatus] = useState('');
  const [checkedInFilter, setCheckedInFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modals
  const [viewReg, setViewReg] = useState(null);
  const [editReg, setEditReg] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Manual Add Form State
  const [manualForm, setManualForm] = useState({
    event_id: selectedEventId || (events[0]?.id || ''),
    first_name: '',
    last_name: '',
    email: '',
    programme: 'Mjekësi e Përgjithshme',
    phone: '',
    guests_names: '',
    notes: '',
    send_email: true
  });

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '25'
      });
      if (selectedEventId) params.append('event_id', String(selectedEventId));
      if (search.trim()) params.append('search', search.trim());
      if (ticketStatus) params.append('ticket_status', ticketStatus);
      if (emailStatus) params.append('email_status', emailStatus);
      if (checkedInFilter) params.append('checked_in', checkedInFilter);

      const res = await api.get(`/registrations?${params.toString()}`);
      setRegistrations(res.registrations || []);
      setPagination(res.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Error fetching registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [selectedEventId, search, ticketStatus, emailStatus, checkedInFilter, page]);

  useEffect(() => {
    if (selectedEventId) {
      setManualForm(prev => ({ ...prev, event_id: selectedEventId }));
    } else if (events.length > 0 && !manualForm.event_id) {
      setManualForm(prev => ({ ...prev, event_id: events[0].id }));
    }
  }, [selectedEventId, events]);

  const handleDownloadPdf = async (reg) => {
    try {
      await api.downloadPdf(reg.id, reg.ticket_number);
    } catch (err) {
      alert(`Dështoi shkarkimi i PDF: ${err.message}`);
    }
  };

  const handleRegenerate = async (reg, format = null) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/registrations/${reg.id}/regenerate`, { format });
      setFeedback({ type: 'success', text: res.message });
      fetchRegistrations();
      if (viewReg?.id === reg.id) {
        const refreshed = await api.get(`/registrations/${reg.id}`);
        setViewReg(refreshed.registration);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendEmail = async (reg) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/registrations/${reg.id}/resend`, {});
      setFeedback({ type: 'success', text: res.message });
      fetchRegistrations();
      if (viewReg?.id === reg.id) {
        const refreshed = await api.get(`/registrations/${reg.id}`);
        setViewReg(refreshed.registration);
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!cancelTarget) return;
    try {
      await api.delete(`/registrations/${cancelTarget.id}`);
      setCancelTarget(null);
      setFeedback({ type: 'success', text: `Bileta ${cancelTarget.ticket_number} u anulua.` });
      fetchRegistrations();
    } catch (err) {
      alert(`Dështoi anulimi: ${err.message}`);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/registrations/${editReg.id}`, editReg);
      setEditReg(null);
      setFeedback({ type: 'success', text: 'Të dhënat u përditësuan dhe bileta PDF u rigjenerua me sukses.' });
      fetchRegistrations();
    } catch (err) {
      alert(`Gabim gjatë ruajtjes: ${err.message}`);
    }
  };

  const handleCreateManual = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/registrations', manualForm);
      onCloseManual();
      setFeedback({ type: 'success', text: `U regjistrua me sukses! Numri i biletës: ${res.ticketNumber}` });
      // Reset form
      setManualForm({
        event_id: selectedEventId || (events[0]?.id || ''),
        first_name: '',
        last_name: '',
        email: '',
        programme: 'Mjekësi e Përgjithshme',
        phone: '',
        guests_names: '',
        notes: '',
        send_email: true
      });
      fetchRegistrations();
    } catch (err) {
      alert(`Gabim: ${err.message}`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
          feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="underline cursor-pointer">Mbyll</button>
        </div>
      )}

      {/* Control / Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Live Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Kërko sipas emrit, mbiemrit, biletës (p.sh. WCC-2026), emailit ose degës..."
              className="w-full pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0B1E36]"
            />
          </div>

          {/* Export to CSV Button */}
          <button
            onClick={() => api.exportCsv(selectedEventId)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Eksporto në CSV / Excel</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider">Filtrat:</span>
          
          {/* Ticket status filter */}
          <select
            value={ticketStatus}
            onChange={(e) => { setTicketStatus(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium cursor-pointer"
          >
            <option value="">Statusi i Biletës: Të gjitha</option>
            <option value="active">Aktive</option>
            <option value="cancelled">E Anuluar</option>
          </select>

          {/* Email status filter */}
          <select
            value={emailStatus}
            onChange={(e) => { setEmailStatus(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium cursor-pointer"
          >
            <option value="">Statusi i Emailit: Të gjitha</option>
            <option value="sent">Dërguar me Sukses</option>
            <option value="queued">Në Pritje</option>
            <option value="failed">Dështoi Dërgimi</option>
          </select>

          {/* Check-in status filter */}
          <select
            value={checkedInFilter}
            onChange={(e) => { setCheckedInFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium cursor-pointer"
          >
            <option value="">Check-in: Të gjithë</option>
            <option value="1">Vetëm të Hyrë në Sallë</option>
            <option value="0">Të Papërdorura</option>
          </select>

          {(search || ticketStatus || emailStatus || checkedInFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setTicketStatus('');
                setEmailStatus('');
                setCheckedInFilter('');
                setPage(1);
              }}
              className="text-[11px] font-semibold text-rose-600 hover:underline ml-auto"
            >
              Pastro Filtrat
            </button>
          )}
        </div>
      </div>

      {/* Registrations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Nr. i Biletës</th>
                <th className="px-5 py-3">Pjesëmarrësi</th>
                <th className="px-5 py-3">Dega / Departamenti</th>
                <th className="px-5 py-3">Persona Shoqërues</th>
                <th className="px-5 py-3">Statusi</th>
                <th className="px-5 py-3">Emaili</th>
                <th className="px-5 py-3">Check-in</th>
                <th className="px-5 py-3 text-right">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin w-5 h-5 border-2 border-[#0B1E36] border-t-transparent rounded-full mr-2"></div>
                    Duke ngarkuar regjistrimet...
                  </td>
                </tr>
              ) : registrations.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                    Nuk u gjet asnjë regjistrim sipas kritereve të kërkimit.
                  </td>
                </tr>
              ) : (
                registrations.map((reg) => {
                  let guestNames = [];
                  try {
                    guestNames = typeof reg.guests_names === 'string' ? JSON.parse(reg.guests_names) : [];
                  } catch (e) {}

                  return (
                    <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-[#0B1E36]">
                        {reg.ticket_number}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-bold text-slate-900 block">{reg.first_name} {reg.last_name}</span>
                        <span className="text-[11px] text-slate-500">{reg.email}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-600 font-medium">
                        {reg.programme}
                      </td>
                      <td className="px-5 py-3">
                        {reg.guests_count > 0 ? (
                          <div title={guestNames.join(', ')}>
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              +{reg.guests_count} mysafirë
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Vetëm 1 (Pa mysafirë)</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={reg.status} />
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={reg.email_status} />
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={reg.checked_in ? 'checked_in' : 'not_checked_in'} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewReg(reg)}
                            title="Shiko detajet e plota"
                            className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-[#0B1E36] transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(reg)}
                            title="Shkarko Biletën PDF"
                            className="p-1.5 rounded hover:bg-amber-50 text-[#0B1E36] hover:text-[#C5A059] transition-colors font-bold text-[11px]"
                          >
                            PDF
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleResendEmail(reg)}
                                title="Ridërgo biletën me email"
                                className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditReg(reg)}
                                title="Ndrysho të dhënat"
                                className="p-1.5 rounded hover:bg-slate-100 text-slate-600 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {reg.status !== 'cancelled' && (
                                <button
                                  onClick={() => setCancelTarget(reg)}
                                  title="Anulo biletën"
                                  className="p-1.5 rounded hover:bg-rose-50 text-rose-500 transition-colors"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-600">
          <span>Gjithsej: <strong>{pagination.total}</strong> regjistrime</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              &larr; Paraardhësja
            </button>
            <span className="font-semibold text-slate-700">Faqja {page} nga {pagination.totalPages || 1}</span>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1 bg-white border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors"
            >
              Pasardhësja &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewReg}
        onClose={() => setViewReg(null)}
        title={`Detajet e Biletës: ${viewReg?.ticket_number}`}
        maxWidth="max-w-2xl"
      >
        {viewReg && (
          <div className="space-y-4 text-xs">
            {/* Top Badge Summary */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Aktiviteti</span>
                <span className="text-sm font-bold text-[#0B1E36]">{viewReg.event_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={viewReg.status} />
                <StatusBadge status={viewReg.checked_in ? 'checked_in' : 'not_checked_in'} />
              </div>
            </div>

            {/* Attendee Details Grid */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-white rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400 block font-medium">Emri dhe Mbiemri:</span>
                <span className="text-base font-bold text-[#0B1E36]">{viewReg.first_name} {viewReg.last_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Programi i Studimit:</span>
                <span className="font-bold text-[#C5A059]">{viewReg.programme}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Email Adresa:</span>
                <span className="font-mono text-slate-800">{viewReg.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Numri i Telefonit:</span>
                <span className="text-slate-800">{viewReg.phone || 'Nuk është dhënë'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Koha e Regjistrimit:</span>
                <span className="text-slate-600">{viewReg.created_at}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Statusi i Emailit:</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <StatusBadge status={viewReg.email_status} />
                  {viewReg.email_sent_at && <span className="text-[10px] text-slate-400">({viewReg.email_sent_at})</span>}
                </div>
              </div>
            </div>

            {/* Accompanying Guests */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-[#0B1E36]">Personat Shoqërues të Regjistruar</h4>
                <span className="text-xs font-bold text-[#C5A059]">Totali: {viewReg.guests_count}</span>
              </div>
              {(() => {
                let gList = [];
                try {
                  gList = typeof viewReg.guests_names === 'string' ? JSON.parse(viewReg.guests_names) : [];
                } catch (e) {}

                if (gList.length === 0) {
                  return <p className="text-slate-500 italic">Nuk ka persona shoqërues të regjistruar.</p>;
                }

                return (
                  <ol className="list-decimal list-inside space-y-1 text-slate-700 font-semibold">
                    {gList.map((g, i) => (
                      <li key={i} className="py-0.5">{g}</li>
                    ))}
                  </ol>
                );
              })()}
            </div>

            {/* Check-in info */}
            {viewReg.checked_in ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
                <strong>✓ Hyrja e konfirmuar në sallë:</strong> {viewReg.checked_in_at}
              </div>
            ) : null}

            {/* Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => handleDownloadPdf(viewReg)}
                className="px-4 py-2 font-bold text-[#0B1E36] bg-slate-100 hover:bg-[#C5A059] rounded-lg transition-colors"
              >
                Shkarko PDF
              </button>
              {isAdmin && (
                <>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleRegenerate(viewReg, 'a4')}
                    className="px-3 py-2 font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    Rigjenero (A4)
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleRegenerate(viewReg, 'compact')}
                    className="px-3 py-2 font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    Rigjenero (Mobile)
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleResendEmail(viewReg)}
                    className="px-4 py-2 font-bold text-white bg-[#0B1E36] hover:bg-[#142D50] rounded-lg"
                  >
                    Ridërgo Email
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Registration Modal */}
      <Modal
        isOpen={!!editReg}
        onClose={() => setEditReg(null)}
        title={`Ndrysho Regjistrimin: ${editReg?.ticket_number}`}
        maxWidth="max-w-xl"
      >
        {editReg && (
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Emri</label>
                <input
                  type="text"
                  required
                  value={editReg.first_name}
                  onChange={(e) => setEditReg({ ...editReg, first_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mbiemri</label>
                <input
                  type="text"
                  required
                  value={editReg.last_name}
                  onChange={(e) => setEditReg({ ...editReg, last_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Adresa</label>
                <input
                  type="email"
                  required
                  value={editReg.email}
                  onChange={(e) => setEditReg({ ...editReg, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Numri i Telefonit</label>
                <input
                  type="text"
                  value={editReg.phone || ''}
                  onChange={(e) => setEditReg({ ...editReg, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Dega / Programi i Studimit</label>
              <input
                type="text"
                required
                value={editReg.programme}
                onChange={(e) => setEditReg({ ...editReg, programme: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Personat Shoqërues (Ndajini me rreshta të rinj ose presje)
              </label>
              <textarea
                rows="3"
                value={(() => {
                  try {
                    const parsed = JSON.parse(editReg.guests_names);
                    return Array.isArray(parsed) ? parsed.join('\n') : editReg.guests_names;
                  } catch (e) {
                    return editReg.guests_names || '';
                  }
                })()}
                onChange={(e) => setEditReg({ ...editReg, guests_names: e.target.value })}
                placeholder="Agim Krasniqi (Prind)&#10;Valbona Krasniqi (Prind)"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditReg(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Anulo
              </button>
              <button
                type="submit"
                className="px-5 py-2 font-bold text-white bg-[#0B1E36] hover:bg-[#142D50] rounded-lg"
              >
                Ruaj dhe Përditëso Biletën
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Manual Registration Modal */}
      <Modal
        isOpen={isManualOpen}
        onClose={onCloseManual}
        title="Regjistrim Manual i Pjesëmarrësit"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateManual} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Zgjidhni Aktivitetin *</label>
            <select
              required
              value={manualForm.event_id}
              onChange={(e) => setManualForm({ ...manualForm, event_id: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.name} ({ev.event_date})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Emri *</label>
              <input
                type="text"
                required
                value={manualForm.first_name}
                onChange={(e) => setManualForm({ ...manualForm, first_name: e.target.value })}
                placeholder="p.sh. Blerta"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mbiemri *</label>
              <input
                type="text"
                required
                value={manualForm.last_name}
                onChange={(e) => setManualForm({ ...manualForm, last_name: e.target.value })}
                placeholder="p.sh. Kastrati"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Adresa *</label>
              <input
                type="email"
                required
                value={manualForm.email}
                onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                placeholder="student@student.uni-pr.edu"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Telefoni (Opsionale)</label>
              <input
                type="text"
                value={manualForm.phone}
                onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                placeholder="+383 44 000 000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Dega / Programi i Studimit *</label>
            <input
              type="text"
              required
              value={manualForm.programme}
              onChange={(e) => setManualForm({ ...manualForm, programme: e.target.value })}
              placeholder="Mjekësi e Përgjithshme / Stomatologji / Farmaci..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">Emrat e Personave Shoqërues</label>
              <span className="text-[11px] text-slate-400">Ndajini me rreshta të rinj</span>
            </div>
            <textarea
              rows="3"
              value={manualForm.guests_names}
              onChange={(e) => setManualForm({ ...manualForm, guests_names: e.target.value })}
              placeholder="Agron Kastrati (Prind)&#10;Teuta Kastrati (Prind)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 rounded-lg border border-slate-200">
            <input
              type="checkbox"
              checked={manualForm.send_email}
              onChange={(e) => setManualForm({ ...manualForm, send_email: e.target.checked })}
              className="rounded text-[#0B1E36]"
            />
            <span className="font-semibold text-slate-800">
              Dërgo automatikisht biletën PDF në emailin e studentit pas regjistrimit
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onCloseManual}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Anulo
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-[#0B1E36] hover:bg-[#142D50] rounded-lg shadow-xs"
            >
              Regjistro dhe Gjenero Biletën
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelRegistration}
        title="Anulo Biletën Zyrtare"
        message={`A jeni të sigurt që dëshironi të anuloni biletën ${cancelTarget?.ticket_number} për ${cancelTarget?.first_name} ${cancelTarget?.last_name}? Bileta do të bëhet e pavlefshme në hyrje.`}
        confirmText="Anulo Biletën"
        confirmType="danger"
      />
    </div>
  );
}
