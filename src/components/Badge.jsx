import React from 'react';

export function StatusBadge({ status, label }) {
  const styles = {
    // Ticket / Registration status
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10',
    valid: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10',
    cancelled: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10',
    
    // Email status
    sent: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/10',
    queued: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/10',
    failed: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10',

    // Check-in status
    checked_in: 'bg-emerald-600 text-white border-transparent ring-emerald-600/20 shadow-xs',
    not_checked_in: 'bg-slate-100 text-slate-600 border-slate-200',

    // Sync status
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    duplicate: 'bg-amber-50 text-amber-700 border-amber-200',
    validation_error: 'bg-rose-50 text-rose-700 border-rose-200',
    processing_error: 'bg-rose-50 text-rose-700 border-rose-200'
  };

  const labels = {
    active: 'Aktive',
    valid: 'E Vlefshme',
    cancelled: 'E Anuluar',
    sent: 'Dërguar me Sukses',
    queued: 'Në Pritje',
    failed: 'Dështoi Dërgimi',
    checked_in: '✓ Hyrë në Sallë',
    not_checked_in: 'E Papërdorur',
    success: 'Sukses',
    duplicate: 'Dublikatë (Injoruar)',
    validation_error: 'Gabim Validimi',
    processing_error: 'Gabim Procesimi'
  };

  const style = styles[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  const displayLabel = label || labels[status] || status;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
      {displayLabel}
    </span>
  );
}
