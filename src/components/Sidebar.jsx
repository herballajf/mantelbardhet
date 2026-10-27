import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Ticket, 
  QrCode, 
  FileSpreadsheet, 
  ShieldCheck, 
  Settings, 
  LogOut,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Sidebar({ activeTab, onTabChange }) {
  const { user, logout, isAdmin } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Paneli Kryesor', icon: LayoutDashboard },
    { id: 'events', label: 'Ngjarjet & Ceremonitë', icon: Calendar },
    { id: 'registrations', label: 'Regjistrimet & Biletat', icon: Ticket },
    { id: 'checkin', label: 'Skaneri Check-in', icon: QrCode },
    { id: 'setup-guide', label: 'Integrimi Google Forms', icon: FileSpreadsheet },
    ...(isAdmin ? [
      { id: 'audit-logs', label: 'Siguria & Audit Log', icon: ShieldCheck },
      { id: 'settings', label: 'Konfigurimi i Sistemit', icon: Settings }
    ] : [])
  ];

  return (
    <aside className="w-64 bg-[#0B1E36] text-white flex flex-col shrink-0 border-r border-[#142D50] select-none h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#142D50]/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#C5A059]/15 border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059] shadow-inner">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-[#C5A059] tracking-widest uppercase font-serif-inst">
              UNIVERSITETI I PRISHTINËS
            </h1>
            <p className="text-sm font-semibold text-white tracking-tight">
              Fakulteti i Mjekësisë
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 px-2 py-1 rounded bg-[#142D50]/60 border border-slate-700/50">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[11px] font-medium text-slate-300">Sistemi Zyrtar i Biletave</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Menyja Kryesore
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#C5A059] text-[#0B1E36] shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-[#142D50]/70'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#0B1E36]' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3 border-t border-[#142D50]/80 bg-[#08172b]">
        <div className="flex items-center justify-between p-2 rounded-lg bg-[#142D50]/40">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{user?.fullName || 'Përdorues'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                isAdmin ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-blue-400/20 text-blue-300'
              }`}>
                {isAdmin ? 'Admin' : 'Staf Check-in'}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            title="Dil nga sistemi"
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors ml-2"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
