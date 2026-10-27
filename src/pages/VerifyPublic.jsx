import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, GraduationCap, Calendar, MapPin, ShieldCheck } from 'lucide-react';

export function VerifyPublic({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Kodi i verifikimit mungon.');
      setLoading(false);
      return;
    }

    fetch(`/api/verify/public/${token}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Kjo biletë nuk është e vlefshme.');
        setData(json);
      })
      .catch((err) => {
        setError(err.message || 'Dështoi verifikimi i biletës.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#0B1E36] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-700">Duke verifikuar vlefshmërinë e biletës me serverin zyrtar...</p>
        </div>
      </div>
    );
  }

  const isValid = data?.valid && data?.status !== 'cancelled';
  const isCheckedIn = data?.status === 'checked_in';

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1E36] to-slate-900 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        {/* Institutional Top Header */}
        <div className="bg-[#0B1E36] p-6 text-center text-white border-b-4 border-[#C5A059] relative">
          <div className="w-12 h-12 rounded-full bg-[#C5A059]/20 border border-[#C5A059]/50 flex items-center justify-center text-[#C5A059] mx-auto mb-2 shadow-inner">
            <GraduationCap className="w-7 h-7" />
          </div>
          <p className="text-[11px] font-bold text-[#C5A059] tracking-widest uppercase font-serif-inst">
            UNIVERSITETI I PRISHTINËS
          </p>
          <h1 className="text-base font-bold text-white tracking-tight">
            FAKULTETI I MJEKËSISË
          </h1>
          <p className="text-[11px] text-slate-300 mt-1">
            Verifikimi Publik i Autenticitetit të Biletës
          </p>
        </div>

        {/* Verification Status Card */}
        <div className="p-6 text-center space-y-4">
          {error || !isValid ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <XCircle className="w-12 h-12 text-rose-600 mx-auto" />
              <h2 className="text-base font-extrabold text-rose-800">
                BILETË E PAVLEFSHME OSE E ANULUAR
              </h2>
              <p className="text-xs text-rose-700 leading-relaxed">
                {error || data?.message || 'Ky kod nuk përputhet me asnjë biletë aktive në sistemin universitar.'}
              </p>
            </div>
          ) : isCheckedIn ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
              <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
              <h2 className="text-base font-extrabold text-amber-800">
                BILETË E PËRDORUR (CHECK-IN I KRYER)
              </h2>
              <p className="text-xs text-amber-700">
                Kjo biletë tashmë është verifikuar dhe shënuar si e përdorur në hyrje.
              </p>
              {data.checked_in_at && (
                <p className="text-[11px] font-mono font-bold text-amber-800 pt-1">
                  Koha: {data.checked_in_at}
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h2 className="text-base font-extrabold text-emerald-800 tracking-tight">
                BILETË ZYRTARE E VLEFSHME
              </h2>
              <p className="text-xs text-emerald-700 font-medium">
                Dokument autentik i verifikuar nga Fakulteti i Mjekësisë.
              </p>
            </div>
          )}

          {/* Details (Minimal for Privacy) */}
          {data && (
            <div className="space-y-3 text-left pt-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Numri i Biletës</span>
                <span className="text-sm font-mono font-bold text-[#0B1E36]">{data.ticket_number}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Pjesëmarrësi</span>
                <span className="text-sm font-bold text-slate-900">{data.participant_name}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Aktiviteti</span>
                <span className="text-sm font-bold text-[#0B1E36]">{data.event_name}</span>
                <div className="mt-2 space-y-1 text-slate-600 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{data.event_date} në ora {data.event_time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{data.location}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mbrojtje e të dhënave personale (GDPR / Ligji për Mbrojtjen e të Dhënave)</span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-center text-[10px] text-slate-400">
          Universiteti i Prishtinës &copy; {new Date().getFullYear()} • Sistemi Zyrtar i Biletave
        </div>
      </div>
    </div>
  );
}
