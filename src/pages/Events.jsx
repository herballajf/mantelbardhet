import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Plus, 
  Edit3, 
  Trash2, 
  Upload, 
  Copy, 
  Check, 
  MapPin, 
  Clock, 
  Mail, 
  Settings2,
  FileSpreadsheet,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { api } from '../utils/api';
import { Modal, ConfirmDialog } from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export function Events({ onSelectEvent, onSelectTab }) {
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deleteEventTarget, setDeleteEventTarget] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    event_date: '',
    event_time: '',
    location: '',
    organizer_name: 'Fakulteti i Mjekësisë - Universiteti i Prishtinës',
    is_ksfm_event: true,
    ticket_format: 'a4',
    ticket_prefix: 'MED',
    auto_generate_tickets: true,
    email_subject: 'Bileta juaj zyrtare – {event_name}',
    email_body: ''
  });

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/events');
      setEvents(res.events || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleOpenCreate = () => {
    setEditingEvent(null);
    setFormData({
      name: '',
      description: '',
      event_date: new Date().toISOString().slice(0, 10),
      event_time: '11:00',
      location: 'Salla e Kuqe, Pallati i Rinisë, Prishtinë',
      organizer_name: 'Fakulteti i Mjekësisë & KSFM',
      is_ksfm_event: true,
      ticket_format: 'a4',
      ticket_prefix: 'MED',
      auto_generate_tickets: true,
      email_subject: 'Bileta juaj zyrtare – {event_name}',
      email_body: `I/e nderuar {first_name} {last_name},

Regjistrimi juaj për aktivitetin "{event_name}" është pranuar me sukses.

Bashkëngjitur gjeni biletën tuaj personale zyrtare në formatin PDF. Ju lutemi, ruajeni dhe paraqiteni këtë biletë gjatë hyrjes në aktivitet.

Bileta përmban të dhënat tuaja, numrin unik të biletës ({ticket_number}) dhe informacionin për personat shoqërues ({guests_count} persona shoqërues).

Data dhe ora: {event_date}, {event_time}
Vendi: {location}

Me respekt,
{organizer_name}`
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (ev) => {
    setEditingEvent(ev);
    setFormData({
      name: ev.name,
      description: ev.description || '',
      event_date: ev.event_date,
      event_time: ev.event_time,
      location: ev.location,
      organizer_name: ev.organizer_name,
      is_ksfm_event: !!ev.is_ksfm_event,
      ticket_format: ev.ticket_format || 'a4',
      ticket_prefix: ev.ticket_prefix || 'MED',
      auto_generate_tickets: !!ev.auto_generate_tickets,
      email_subject: ev.email_subject || 'Bileta juaj zyrtare – {event_name}',
      email_body: ev.email_body || ''
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await api.put(`/events/${editingEvent.id}`, formData);
      } else {
        await api.post('/events', formData);
      }
      setIsEditModalOpen(false);
      fetchEvents();
    } catch (err) {
      alert(`Gabim: ${err.message}`);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteEventTarget) return;
    try {
      await api.delete(`/events/${deleteEventTarget.id}`);
      setDeleteEventTarget(null);
      fetchEvents();
    } catch (err) {
      alert(`Gabim gjatë fshirjes: ${err.message}`);
    }
  };

  const handleCopyWebhook = (ev) => {
    const url = `${window.location.origin}/api/webhook/google-forms/${ev.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(ev.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleLogoUpload = async (eventId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('logo', file);

    setLogoUploading(true);
    try {
      await api.post(`/events/${eventId}/logo`, data);
      fetchEvents();
    } catch (err) {
      alert(`Dështoi ngarkimi i logos: ${err.message}`);
    } finally {
      setLogoUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B1E36]">Menaxhimi i Aktiviteteve & Ceremonive</h2>
          <p className="text-xs text-slate-500">Konfiguroni ceremonitë, formatin e biletës, shabllonet e emailit dhe lidhjet me Google Forms</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#0B1E36] hover:bg-[#142D50] rounded-lg transition-all shadow-xs self-start"
          >
            <Plus className="w-4 h-4 text-[#C5A059]" />
            <span>Krijo Aktivitet të Ri</span>
          </button>
        )}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            {/* Event Card Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-start justify-between gap-2">
                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#0B1E36] text-[#C5A059] uppercase tracking-wider">
                  {ev.ticket_format === 'compact' ? 'Format Digjital (Mobile)' : 'Format Solemn (A4 Print)'}
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {ev.ticket_prefix}
                </span>
              </div>

              <h3 className="mt-3 text-base font-bold text-[#0B1E36] line-clamp-2 leading-snug">
                {ev.name}
              </h3>
              {ev.description && (
                <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {ev.description}
                </p>
              )}
            </div>

            {/* Event Details */}
            <div className="p-5 space-y-3 text-xs text-slate-600 flex-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span><strong>Data:</strong> {ev.event_date} në ora {ev.event_time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate"><strong>Vendi:</strong> {ev.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate"><strong>Organizatori:</strong> {ev.organizer_name}</span>
              </div>

              {/* Stats Bar */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="block text-sm font-extrabold text-[#0B1E36]">{ev.total_registrations}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Regjistrime</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="block text-sm font-extrabold text-emerald-600">{ev.checked_in_count}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Check-in</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="block text-sm font-extrabold text-indigo-600">{ev.total_guests}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Mysafirë</span>
                </div>
              </div>

              {/* Webhook Endpoint copy */}
              <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  URL e Webhook (Google Sheets):
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/api/webhook/google-forms/${ev.slug}`}
                    className="w-full text-[11px] font-mono text-slate-600 bg-white border border-slate-200 rounded px-2 py-1 select-all"
                  />
                  <button
                    onClick={() => handleCopyWebhook(ev)}
                    title="Kopjo Webhook URL"
                    className="p-1 rounded bg-[#0B1E36] text-white hover:bg-[#142D50] shrink-0 transition-colors"
                  >
                    {copiedId === ev.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Event Actions Footer */}
            <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  onSelectEvent(ev.id);
                  onSelectTab('registrations');
                }}
                className="text-xs font-semibold text-[#0B1E36] hover:text-[#C5A059] transition-colors"
              >
                Shiko Pjesëmarrësit &rarr;
              </button>

              {isAdmin && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(ev)}
                    title="Ndrysho konfigurimin"
                    className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteEventTarget(ev)}
                    title="Fshij aktivitetin"
                    className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Create Event Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingEvent ? `Ndrysho Aktivitetin: ${editingEvent.name}` : 'Krijo Aktivitet të Ri Institucional'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveEvent} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Emri i Aktivitetit *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="p.sh. Ceremonia e Mantelit të Bardhë 2026"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B1E36] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Organizatori Zyrtar</label>
              <input
                type="text"
                value={formData.organizer_name}
                onChange={(e) => setFormData({ ...formData, organizer_name: e.target.value })}
                placeholder="Fakulteti i Mjekësisë & KSFM"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B1E36] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Përshkrimi i Aktivitetit</label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Përshkrim i shkurtër solemn i ngjarjes..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B1E36] focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Data e Aktivitetit *</label>
              <input
                type="date"
                required
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B1E36] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ora e Fillimit *</label>
              <input
                type="time"
                required
                value={formData.event_time}
                onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B1E36] focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Prefiksi i Biletës</label>
              <input
                type="text"
                value={formData.ticket_prefix}
                onChange={(e) => setFormData({ ...formData, ticket_prefix: e.target.value })}
                placeholder="MED / WCC / KSFM"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase focus:ring-2 focus:ring-[#0B1E36] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Vendi / Lokacioni *</label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Salla e Kuqe, Pallati i Rinisë, Prishtinë"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B1E36] focus:outline-hidden"
            />
          </div>

          {/* Ticket Design & Format */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <h4 className="font-bold text-[#0B1E36] text-sm">Formati & Dizajni i Biletës PDF</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                formData.ticket_format === 'a4' ? 'bg-white border-[#C5A059] shadow-xs ring-1 ring-[#C5A059]' : 'border-slate-200 hover:border-slate-300'
              }`}>
                <input
                  type="radio"
                  name="ticket_format"
                  checked={formData.ticket_format === 'a4'}
                  onChange={() => setFormData({ ...formData, ticket_format: 'a4' })}
                  className="mt-1"
                />
                <div>
                  <strong className="block text-slate-800">Format Solemn A4 (Print-Ready)</strong>
                  <span className="text-[11px] text-slate-500">
                    Ftesë & biletë zyrtare ceremoniale me kornizë të dyfishtë ari, emblemë akademike dhe renditje për printim.
                  </span>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                formData.ticket_format === 'compact' ? 'bg-white border-[#C5A059] shadow-xs ring-1 ring-[#C5A059]' : 'border-slate-200 hover:border-slate-300'
              }`}>
                <input
                  type="radio"
                  name="ticket_format"
                  checked={formData.ticket_format === 'compact'}
                  onChange={() => setFormData({ ...formData, ticket_format: 'compact' })}
                  className="mt-1"
                />
                <div>
                  <strong className="block text-slate-800">Format Digjital (Mobile Pass)</strong>
                  <span className="text-[11px] text-slate-500">
                    Format kompakt i optimizuar për ekrane celulari, skanim të shpejtë të kodit QR dhe paraqitje në hyrje.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_ksfm_event}
                  onChange={(e) => setFormData({ ...formData, is_ksfm_event: e.target.checked })}
                  className="rounded text-[#0B1E36]"
                />
                <span className="text-slate-700 font-medium">Përfshi identifikimin e Këshillit të Studentëve (KSFM)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.auto_generate_tickets}
                  onChange={(e) => setFormData({ ...formData, auto_generate_tickets: e.target.checked })}
                  className="rounded text-[#0B1E36]"
                />
                <span className="text-slate-700 font-medium">Gjenero dhe dërgo automatikisht biletën sapo të vijë forma</span>
              </label>
            </div>
          </div>

          {/* Email Customization */}
          <div className="space-y-3">
            <h4 className="font-bold text-[#0B1E36] text-sm">Shablloni i Emailit Zyrtar (Në Gjuhën Shqipe)</h4>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Subjekti i Emailit</label>
              <input
                type="text"
                value={formData.email_subject}
                onChange={(e) => setFormData({ ...formData, email_subject: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B1E36] focus:outline-hidden"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Trupi i Emailit</label>
                <span className="text-[11px] text-slate-400">
                  Variabla të lejuara: {'{first_name}'}, {'{last_name}'}, {'{ticket_number}'}, {'{guests_count}'}, {'{event_date}'}, {'{location}'}
                </span>
              </div>
              <textarea
                rows="6"
                value={formData.email_body}
                onChange={(e) => setFormData({ ...formData, email_body: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-sans text-xs focus:ring-2 focus:ring-[#0B1E36] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Anulo
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-[#0B1E36] hover:bg-[#142D50] rounded-lg transition-colors shadow-xs"
            >
              {editingEvent ? 'Ruaj Ndryshimet' : 'Krijo Aktivitetin'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Event Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteEventTarget}
        onClose={() => setDeleteEventTarget(null)}
        onConfirm={handleDeleteEvent}
        title="Fshij Aktivitetin"
        message={`A jeni të sigurt që dëshironi të fshini aktivitetin "${deleteEventTarget?.name}"? Të gjitha biletat dhe regjistrimet e këtij eventi do të fshihen përfundimisht.`}
        confirmText="Fshij Përfundimisht"
        confirmType="danger"
      />
    </div>
  );
}
