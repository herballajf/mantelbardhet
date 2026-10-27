import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Ticket, 
  Send, 
  Clock, 
  AlertCircle, 
  UserCheck, 
  UserPlus, 
  ArrowUpRight,
  Calendar,
  MapPin,
  CheckCircle2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { api } from '../utils/api';
import { StatusBadge } from '../components/Badge';

export function Dashboard({ events = [], selectedEventId, onSelectTab, onOpenManualReg, onOpenScanner }) {
  const [stats, setStats] = useState(null);
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch registrations for current filter
      const res = await api.get(`/registrations?limit=10${selectedEventId ? `&event_id=${selectedEventId}` : ''}`);
      setRecentRegistrations(res.registrations || []);

      // Calculate aggregate metrics
      const regList = res.registrations || [];
      const totalRegs = res.pagination.total;

      // Fetch all event stats if no filter, or single event stats
      if (selectedEventId) {
        const evData = await api.get(`/events/${selectedEventId}`);
        setStats(evData.stats);
      } else {
        // Aggregate across all events
        const evListRes = await api.get('/events');
        const evs = evListRes.events || [];
        const agg = {
          total_registrations: evs.reduce((acc, e) => acc + (Number(e.total_registrations) || 0), 0),
          tickets_generated: evs.reduce((acc, e) => acc + (Number(e.tickets_generated) || 0), 0),
          emails_sent: evs.reduce((acc, e) => acc + (Number(e.emails_sent) || 0), 0),
          emails_failed: evs.reduce((acc, e) => acc + (Number(e.emails_failed) || 0), 0),
          emails_queued: 0,
          checked_in_count: evs.reduce((acc, e) => acc + (Number(e.checked_in_count) || 0), 0),
          total_guests: evs.reduce((acc, e) => acc + (Number(e.total_guests) || 0), 0)
        };
        agg.emails_queued = Math.max(0, agg.total_registrations - agg.emails_sent - agg.emails_failed);
        setStats(agg);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedEventId]);

  const cards = [
    {
      title: 'Regjistrime Gjithsej',
      value: stats?.total_registrations || 0,
      icon: Users,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
      description: 'Numri total i studentëve të regjistruar'
    },
    {
      title: 'Bileta të Gjeneruara',
      value: stats?.tickets_generated || 0,
      icon: Ticket,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      description: 'Bileta zyrtare PDF të krijuara'
    },
    {
      title: 'Emaila të Dërguar',
      value: stats?.emails_sent || 0,
      icon: Send,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      description: 'Dorëzuar me biletën PDF bashkëngjitur'
    },
    {
      title: 'Emaila në Pritje',
      value: stats?.emails_queued || 0,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      description: 'Në radhën e automatizuar të dërgimit'
    },
    {
      title: 'Dështime në Dërgim',
      value: stats?.emails_failed || 0,
      icon: AlertCircle,
      color: 'text-rose-600 bg-rose-50 border-rose-100',
      description: 'Kërkojnë rishikim ose ridërgim'
    },
    {
      title: 'Persona Shoqërues',
      value: stats?.total_guests || 0,
      icon: UserPlus,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      description: 'Prindër dhe mysafirë të regjistruar'
    },
    {
      title: 'Pjesëmarrës të Hyrë (Check-in)',
      value: stats?.checked_in_count || 0,
      icon: UserCheck,
      color: 'text-emerald-700 bg-emerald-100 border-emerald-200',
      description: stats?.total_registrations 
        ? `${Math.round(((stats.checked_in_count || 0) / Math.max(1, stats.total_registrations)) * 100)}% e kuotës së pranishme`
        : '0% e kuotës'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Institutional Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0B1E36] to-[#142D50] p-6 text-white shadow-sm border border-[#142D50]">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#C5A059] tracking-widest uppercase font-serif-inst">
                UNIVERSITETI I PRISHTINËS • FAKULTETI I MJEKËSISË
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Paneli Ekzekutiv i Menaxhimit të Biletave
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Sistemi automatik i përpunimit të formularëve të Google, gjenerimit me saktësi vektoriale të biletave zyrtare, 
              dërgimit me email në gjuhën shqipe dhe kontrollit të sigurt të hyrjes me QR kod.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchDashboardData}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/15"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Rifresko</span>
            </button>
            <button
              onClick={onOpenScanner}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-[#C5A059] hover:bg-[#d4af37] text-[#0B1E36] transition-all shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Fillo Check-in</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{card.title}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#0B1E36] tracking-tight">
                  {card.value.toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 leading-tight">
                {card.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Active Events Overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[#0B1E36]">Aktivitetet e Konfiguruara</h3>
            <p className="text-xs text-slate-500">Ceremonitë zyrtare dhe ngjarjet akademike aktive</p>
          </div>
          <button
            onClick={() => onSelectTab('events')}
            className="flex items-center gap-1 text-xs font-semibold text-[#0B1E36] hover:text-[#C5A059] transition-colors"
          >
            <span>Shiko të gjitha ngjarjet</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {events.slice(0, 3).map((ev) => {
            const checkedInPercent = ev.total_registrations > 0
              ? Math.round((Number(ev.checked_in_count || 0) / Number(ev.total_registrations)) * 100)
              : 0;

            return (
              <div
                key={ev.id}
                className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0B1E36] text-[#C5A059] uppercase">
                      {ev.ticket_format === 'compact' ? 'Format Digjital' : 'Format Solemn A4'}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      Prefiksi: {ev.ticket_prefix}
                    </span>
                  </div>

                  <h4 className="mt-2.5 text-sm font-bold text-[#0B1E36] leading-snug line-clamp-1">
                    {ev.name}
                  </h4>

                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ev.event_date} në ora {ev.event_time}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{ev.location}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500">Regjistrime: <strong>{ev.total_registrations}</strong></span>
                    <span className="text-emerald-700 font-semibold">{checkedInPercent}% hyrë</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${checkedInPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Registrations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-[#0B1E36]">Regjistrimet e Fundit</h3>
            <p className="text-xs text-slate-500">Pjesëmarrësit e fundit të sinkronizuar nga Google Forms ose të shtuar manualisht</p>
          </div>
          <button
            onClick={() => onSelectTab('registrations')}
            className="flex items-center gap-1 text-xs font-semibold text-[#0B1E36] hover:text-[#C5A059] transition-colors"
          >
            <span>Menaxho të gjitha biletat</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-3">Nr. i Biletës</th>
                <th className="px-6 py-3">Pjesëmarrësi</th>
                <th className="px-6 py-3">Dega / Programi</th>
                <th className="px-6 py-3">Shoqërues</th>
                <th className="px-6 py-3">Statusi i Biletës</th>
                <th className="px-6 py-3">Dërgimi i Emailit</th>
                <th className="px-6 py-3">Check-in</th>
                <th className="px-6 py-3 text-right">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentRegistrations.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-400">
                    Nuk ka ende regjistrime për kriteret e zgjedhura.
                  </td>
                </tr>
              ) : (
                recentRegistrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3 font-mono font-bold text-[#0B1E36]">
                      {reg.ticket_number}
                    </td>
                    <td className="px-6 py-3 font-semibold text-slate-900">
                      {reg.first_name} {reg.last_name}
                      <span className="block text-[11px] font-normal text-slate-400">{reg.email}</span>
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {reg.programme}
                    </td>
                    <td className="px-6 py-3">
                      <span className="font-semibold text-slate-800">{reg.guests_count}</span>
                      <span className="text-slate-400 text-[11px]"> persona</span>
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={reg.status} />
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={reg.email_status} />
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={reg.checked_in ? 'checked_in' : 'not_checked_in'} />
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => api.downloadPdf(reg.id, reg.ticket_number)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#0B1E36] bg-slate-100 hover:bg-[#C5A059] hover:text-[#0B1E36] rounded transition-all"
                      >
                        <span>PDF</span>
                      </button>
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
