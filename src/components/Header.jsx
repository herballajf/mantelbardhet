import React from 'react';
import { Plus, QrCode, Calendar, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Header({ title, subtitle, events = [], selectedEventId, onSelectEvent, onOpenManualReg, onOpenScanner }) {
  const { isAdmin } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Title & Subtitle */}
        <div>
          <h2 className="text-xl font-bold text-[#0B1E36] tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        {/* Controls & Quick Actions */}
        <div className="flex items-center gap-3">
          {/* Event Filter Dropdown */}
          <div className="relative flex items-center">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <select
              value={selectedEventId || ''}
              onChange={(e) => onSelectEvent(e.target.value ? Number(e.target.value) : null)}
              className="pl-9 pr-8 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#0B1E36] transition-all cursor-pointer"
            >
              <option value="">Të gjitha aktivitetet</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.event_date})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Check-in Scanner button */}
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
          >
            <QrCode className="w-3.5 h-3.5 text-[#0B1E36]" />
            <span>Check-in</span>
          </button>

          {/* Quick Manual Register button (Admin only) */}
          {isAdmin && (
            <button
              onClick={onOpenManualReg}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#0B1E36] hover:bg-[#142D50] rounded-lg transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Shto Regjistrim</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
