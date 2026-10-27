import React, { useState } from 'react';
import { GraduationCap, Lock, User, ArrowRight, AlertCircle, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
      window.location.href = '/';
    } catch (err) {
      setError(err.message || 'Kredencialet janë të pasakta.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Subtle Gradient & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#142D50_1px,transparent_1px)] [background-size:20px_20px] opacity-40"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0B1E36] to-[#142D50] border-2 border-[#C5A059] flex items-center justify-center text-[#C5A059] mx-auto shadow-2xl">
            <GraduationCap className="w-10 h-10" />
          </div>
          <h2 className="text-xs font-bold text-[#C5A059] tracking-widest uppercase font-serif-inst">
            UNIVERSITETI I PRISHTINËS
          </h2>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Fakulteti i Mjekësisë
          </h1>
          <p className="text-xs text-slate-400">
            Sistemi Zyrtar i Menaxhimit të Biletave & Regjistrimeve
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-200">
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs font-semibold text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Përdoruesi ose Email Adresa
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin ose admin@uni-pr.edu"
                    className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B1E36] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fjalëkalimi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B1E36] focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-[#0B1E36] hover:bg-[#142D50] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#0B1E36] transition-colors"
              >
                <span>{loading ? 'Duke u kyçur...' : 'Kyçu në Sistem'}</span>
                <ArrowRight className="w-4 h-4 text-[#C5A059]" />
              </button>
            </form>

            {/* Quick Demo Credentials for Reviewers */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Kredencialet e Paracaktuara për Testim:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleFillDemo('admin', 'Admin123!')}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
                >
                  <strong className="block text-xs text-[#0B1E36]">Administrator</strong>
                  <span className="text-[10px] text-slate-500 font-mono">admin / Admin123!</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemo('staff', 'Staff123!')}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
                >
                  <strong className="block text-xs text-[#0B1E36]">Staf Check-in</strong>
                  <span className="text-[10px] text-slate-500 font-mono">staff / Staff123!</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
