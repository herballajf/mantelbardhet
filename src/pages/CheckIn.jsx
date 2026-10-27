import React, { useState, useEffect, useRef } from 'react';
import { 
  QrCode, 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Users, 
  Camera, 
  RotateCcw,
  Sparkles,
  Calendar,
  MapPin,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../utils/api';
import { StatusBadge } from '../components/Badge';

export function CheckIn({ selectedEventId }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const html5QrCodeRef = useRef(null);

  const handleLookup = async (lookupQuery) => {
    const q = lookupQuery || query;
    if (!q || !q.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/checkin/lookup', { query: q.trim() });
      setResult(res.registration);
      // Play subtle chime
    } catch (err) {
      setResult(null);
      setError(err.message || 'Bileta nuk u gjet.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCheckIn = async (force = false) => {
    if (!result) return;
    setLoading(true);
    try {
      const res = await api.post('/checkin/confirm', {
        registration_id: result.id,
        force
      });
      setResult(res.registration);
      setError(null);

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C5A059', '#0B1E36', '#22c55e']
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUndoCheckIn = async () => {
    if (!result) return;
    setLoading(true);
    try {
      await api.post('/checkin/undo', { registration_id: result.id });
      setResult(prev => ({ ...prev, checked_in: 0, checked_in_at: null }));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Start Camera Scanner
  const startCamera = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      setCameraActive(true);
      setError(null);

      // Small delay for DOM element rendering
      setTimeout(async () => {
        try {
          const qrCodeScanner = new Html5Qrcode('qr-reader');
          html5QrCodeRef.current = qrCodeScanner;
          await qrCodeScanner.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 }
            },
            (decodedText) => {
              // On scan success
              setQuery(decodedText);
              handleLookup(decodedText);
              stopCamera();
            },
            () => {}
          );
        } catch (camErr) {
          setError(`Kamera nuk mund të qaset: ${camErr.message || 'Lejoni lejen e kamerës në shfletues'}`);
          setCameraActive(false);
        }
      }, 200);
    } catch (err) {
      setError('Dështoi inicializimi i skanerit.');
      setCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {}
      html5QrCodeRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title Header */}
      <div className="text-center space-y-1">
        <span className="text-xs font-bold text-[#C5A059] uppercase tracking-widest font-serif-inst">
          STACIONI ZYRTAR I HYRJES • CHECK-IN STATION
        </span>
        <h2 className="text-2xl font-extrabold text-[#0B1E36] tracking-tight">
          Verifikimi dhe Skanimi i Biletave
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Skanoni kodin QR me kamerën e pajisjes ose vendosni numrin e biletës për të verifikuar hyrjen.
        </p>
      </div>

      {/* Input / Scanner Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              placeholder="Numri i biletës (p.sh. WCC-2026-00101) ose linku i QR..."
              className="w-full pl-9 pr-4 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B1E36] focus:outline-hidden font-mono"
            />
          </div>
          <button
            onClick={() => handleLookup()}
            disabled={loading}
            className="px-5 py-2.5 font-bold text-xs text-white bg-[#0B1E36] hover:bg-[#142D50] rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            <span>Kërko Biletën</span>
          </button>
          {!cameraActive ? (
            <button
              onClick={startCamera}
              className="px-4 py-2.5 font-bold text-xs text-[#0B1E36] bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Camera className="w-4 h-4 text-[#C5A059]" />
              <span>Hap Kamerën</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="px-4 py-2.5 font-bold text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors"
            >
              Mbyll Kamerën
            </button>
          )}
        </div>

        {/* Camera Scanner Viewport */}
        {cameraActive && (
          <div className="p-3 bg-slate-900 rounded-xl overflow-hidden border border-slate-700 text-center animate-in fade-in">
            <div id="qr-reader" className="w-full max-w-sm mx-auto overflow-hidden rounded-lg"></div>
            <p className="mt-2 text-[11px] text-slate-400">
              Drejtoni kamerën drejt kodit QR në biletën e studentit
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Ticket Verification Result Card */}
      {result && (
        <div className={`rounded-xl border shadow-md overflow-hidden transition-all animate-in zoom-in-95 duration-150 ${
          result.status === 'cancelled'
            ? 'bg-rose-50/40 border-rose-300'
            : result.checked_in
            ? 'bg-amber-50/40 border-amber-300'
            : 'bg-white border-emerald-300 ring-2 ring-emerald-500/10'
        }`}>
          {/* Status Header Banner */}
          <div className={`px-6 py-4 flex items-center justify-between text-white ${
            result.status === 'cancelled'
              ? 'bg-rose-700'
              : result.checked_in
              ? 'bg-amber-600'
              : 'bg-emerald-700'
          }`}>
            <div className="flex items-center gap-2.5">
              {result.status === 'cancelled' ? (
                <XCircle className="w-6 h-6" />
              ) : result.checked_in ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <CheckCircle className="w-6 h-6" />
              )}
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-90 block">
                  STATUSI I BILETËS
                </span>
                <h3 className="text-base font-bold leading-none">
                  {result.status === 'cancelled'
                    ? 'BILETË E ANULUAR (HYRJA E NDALUAR)'
                    : result.checked_in
                    ? 'E PËRDORUR MË PARË (KUJDES: Tashmë e skanuar!)'
                    : 'BILETË E VLEFSHME ZYRTARE (HYRJA E LEJUAR)'}
                </h3>
              </div>
            </div>

            <span className="font-mono font-bold text-sm bg-black/20 px-2.5 py-1 rounded">
              {result.ticket_number}
            </span>
          </div>

          {/* Ticket Information Body */}
          <div className="p-6 space-y-5 text-xs">
            {/* Event Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Aktiviteti</span>
                <span className="text-sm font-bold text-[#0B1E36]">{result.event_name}</span>
              </div>
              <div className="text-right text-slate-600">
                <span className="block font-semibold">{result.event_date} në ora {result.event_time}</span>
                <span className="text-[11px] text-slate-400">{result.location}</span>
              </div>
            </div>

            {/* Attendee Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Pjesëmarrësi Kryesor
                </span>
                <p className="text-lg font-bold text-[#0B1E36]">{result.first_name} {result.last_name}</p>
                <p className="text-xs font-semibold text-[#C5A059] mt-0.5">{result.programme}</p>
                <p className="text-[11px] text-slate-500 font-mono mt-2">{result.email}</p>
              </div>

              {/* Accompanying Guests Card */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Persona Shoqërues të Autorizuar
                  </span>
                  <span className="px-2 py-0.5 text-xs font-extrabold rounded bg-[#0B1E36] text-[#C5A059]">
                    {result.guests_count} Mysafirë
                  </span>
                </div>

                {result.guest_list && result.guest_list.length > 0 ? (
                  <ol className="list-decimal list-inside space-y-1 text-slate-800 font-semibold mt-1">
                    {result.guest_list.map((g, idx) => (
                      <li key={idx} className="truncate">{g}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-slate-500 italic mt-2">
                    Nuk ka mysafirë të regjistruar. Bileta lejon hyrjen vetëm të studentit kryesor.
                  </p>
                )}

                <div className="mt-3 pt-2 border-t border-slate-200/80 text-[11px] font-bold text-slate-700">
                  Totali i personave të lejuar: {1 + (result.guests_count || 0)} persona
                </div>
              </div>
            </div>

            {/* Previous Check-in Timestamp Warning */}
            {result.checked_in && result.checked_in_at && (
              <div className="p-3 bg-amber-100/70 border border-amber-300 rounded-lg text-amber-900 text-xs">
                <strong>Informacion mbi Hyrjen:</strong> Kjo biletë është shënuar si e përdorur më{' '}
                <span className="font-bold underline">{result.checked_in_at}</span>.
              </div>
            )}

            {/* Check-In Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
              {result.checked_in ? (
                <>
                  <button
                    onClick={handleUndoCheckIn}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Zhbëj Check-in (Rikthe në të Papërdorur)</span>
                  </button>
                  <button
                    onClick={() => handleConfirmCheckIn(true)}
                    disabled={loading}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs"
                  >
                    Rikonfirmo Hyrjen me Detyrim (Override)
                  </button>
                </>
              ) : result.status !== 'cancelled' ? (
                <button
                  onClick={() => handleConfirmCheckIn(false)}
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 text-sm font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <CheckCircle className="w-5 h-5 text-emerald-200" />
                  <span>KRYEJ CHECK-IN (LEJO HYRJEN)</span>
                </button>
              ) : (
                <p className="text-rose-600 font-bold">
                  Bileta është e anuluar në sistem. Hyrja nuk lejohet në asnjë rrethanë.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
