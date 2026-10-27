import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Mail, 
  ShieldAlert, 
  Users, 
  CheckCircle2, 
  Send, 
  Key, 
  Database,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../utils/api';
import { Modal, ConfirmDialog } from '../components/Modal';

export function Settings() {
  const [settings, setSettings] = useState({
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_from: 'biletat@uni-pr.edu',
    data_retention_days: '365'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Test Email State
  const [testEmail, setTestEmail] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Users State
  const [users, setUsers] = useState([]);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    role: 'staff'
  });

  // Purge Confirmation
  const [isPurgeConfirmOpen, setIsPurgeConfirmOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchUsers();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      if (res.settings) {
        setSettings(prev => ({ ...prev, ...res.settings }));
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/settings', settings);
      setMessage({ type: 'success', text: 'Cilësimet e sistemit u ruajtën me sukses!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      alert('Ju lutemi vendosni email adresën pranuese.');
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await api.post('/settings/test-email', { test_email: testEmail });
      setTestResult({ success: true, text: res.message });
    } catch (err) {
      setTestResult({ success: false, text: err.message });
    } finally {
      setTestLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/users', newUser);
      setIsAddUserOpen(false);
      setNewUser({ username: '', email: '', password: '', fullName: '', role: 'staff' });
      fetchUsers();
      alert('Përdoruesi u krijua me sukses!');
    } catch (err) {
      alert(`Gabim: ${err.message}`);
    }
  };

  const handlePurgeData = async () => {
    try {
      const res = await api.post('/settings/retention/purge', {});
      alert(res.message);
    } catch (err) {
      alert(`Dështoi pastrimi: ${err.message}`);
    }
  };

  const handleClearSampleData = async () => {
    if (!window.confirm('A jeni të sigurt që dëshironi të fshini të gjitha regjistrimet testuese? Baza do të mbetet me 0 regjistrime, gati për studentët e vërtetë.')) return;
    try {
      const res = await api.post('/settings/clear-sample-data', {});
      alert(res.message);
      window.location.reload();
    } catch (err) {
      alert(`Gabim: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-[#0B1E36]">Konfigurimi i Sistemit & SMTP</h2>
        <p className="text-xs text-slate-500">
          Menaxhoni dërguesin e emailave zyrtarë, llogaritë e stafit dhe politikat e privatësisë
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs font-semibold ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* SMTP Email Configuration Card */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-5 text-xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0B1E36]">Konfigurimi i Serverit të Emailit (SMTP)</h3>
            <p className="text-slate-500 text-[11px]">Serveri nga i cili dërgohen biletat PDF te studentët</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Hosti SMTP</label>
            <input
              type="text"
              value={settings.smtp_host || ''}
              onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
              placeholder="p.sh. smtp.gmail.com ose mail.uni-pr.edu"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B1E36]"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Porti SMTP</label>
            <input
              type="text"
              value={settings.smtp_port || ''}
              onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
              placeholder="587 ose 465"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B1E36]"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Përdoruesi SMTP (Email)</label>
            <input
              type="text"
              value={settings.smtp_user || ''}
              onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
              placeholder="biletat@uni-pr.edu"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B1E36]"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Fjalëkalimi SMTP / App Password</label>
            <input
              type="password"
              value={settings.smtp_pass || ''}
              onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
              placeholder="••••••••••••"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B1E36]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Adresa Dërguese (From Header)</label>
            <input
              type="text"
              value={settings.smtp_from || ''}
              onChange={(e) => setSettings({ ...settings, smtp_from: e.target.value })}
              placeholder="biletat@uni-pr.edu"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0B1E36]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 font-bold text-white bg-[#0B1E36] hover:bg-[#142D50] rounded-lg transition-colors shadow-xs"
          >
            {saving ? 'Duke ruajtur...' : 'Ruaj Konfigurimin SMTP'}
          </button>
        </div>
      </form>

      {/* SMTP Test Sender */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs">
        <h4 className="text-sm font-bold text-[#0B1E36]">Testo Lidhjen SMTP</h4>
        <p className="text-slate-500">
          Dërgoni një email testues në adresën tuaj për të verifikuar nëse kredencialet e serverit janë të sakta
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Vendosni email adresën tuaj personale..."
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
          />
          <button
            type="button"
            onClick={handleSendTestEmail}
            disabled={testLoading}
            className="px-4 py-2 font-bold text-white bg-[#0B1E36] hover:bg-[#142D50] rounded-lg transition-colors shrink-0 flex items-center justify-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>{testLoading ? 'Duke dërguar...' : 'Dërgo Email Test'}</span>
          </button>
        </div>

        {testResult && (
          <div className={`p-3 rounded-lg border font-semibold ${
            testResult.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {testResult.text}
          </div>
        )}
      </div>

      {/* Privacy & Retention Policy */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0B1E36]">Politika e Ruajtjes së të Dhënave (Privacy & GDPR)</h3>
            <p className="text-slate-500 text-[11px]">Rregullat e fshirjes dhe anonimizimit të të dhënave personale të studentëve</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="font-semibold text-slate-800 block">Afati i Ruajtjes së të Dhënave</span>
            <span className="text-slate-500">Të dhënat e ndjeshme (telefoni, shënimet) anonimizohen pas kësaj periudhe</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={settings.data_retention_days || '365'}
              onChange={(e) => setSettings({ ...settings, data_retention_days: e.target.value })}
              className="w-20 px-2.5 py-1.5 border border-slate-300 rounded-lg text-center font-bold"
            />
            <span className="font-semibold text-slate-600">Ditë</span>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-slate-500 text-[11px]">
            Ekzekutimi i këtij veprimi do të anonimizojë emrat dhe kontaktet e mysafirëve për regjistrimet më të vjetra se {settings.data_retention_days} ditë.
          </span>
          <button
            type="button"
            onClick={() => setIsPurgeConfirmOpen(true)}
            className="px-3 py-1.5 font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shrink-0 transition-colors"
          >
            Anonimizo të Dhënat e Vjetra
          </button>
        </div>
      </div>

      {/* User Accounts Management */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0B1E36]">Llogaritë e Stafit & Administratorëve</h3>
              <p className="text-slate-500 text-[11px]">Përdoruesit e autorizuar për check-in dhe administrim</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddUserOpen(true)}
            className="px-3 py-1.5 font-bold text-xs text-white bg-[#0B1E36] hover:bg-[#142D50] rounded-lg transition-colors"
          >
            + Shto Përdorues
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {users.map((u) => (
            <div key={u.id} className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">{u.full_name}</span>
                <span className="text-slate-400 font-mono text-[11px]">@{u.username} • {u.email}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {u.role === 'admin' ? 'Administrator' : 'Staf Check-in'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Database Backup & Clean Slate Info */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-xs text-slate-600 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#0B1E36] font-bold">
            <Database className="w-4 h-4" />
            <span>Fillim me të Dhëna Reale (Clean Slate)</span>
          </div>
          <button
            type="button"
            onClick={handleClearSampleData}
            className="px-3 py-1.5 font-bold text-rose-700 bg-white hover:bg-rose-50 border border-rose-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Fshij të Gjitha Regjistrimet Provë</span>
          </button>
        </div>
        <p className="leading-relaxed">
          Kliko butonin e kuq më lart nëse dëshiron të heqësh të gjithë pjesëmarrësit mostër dhe të fillosh nga 0 me studentët e vërtetë që regjistrohen në Google Forms.
        </p>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Krijo Llogari të Re Stafi / Administratori"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Emri dhe Mbiemri i Plotë</label>
            <input
              type="text"
              required
              value={newUser.fullName}
              onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
              placeholder="p.sh. Dr. Astrit Berisha"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Username</label>
            <input
              type="text"
              required
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              placeholder="aberisha"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Adresa</label>
            <input
              type="email"
              required
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="astrit.berisha@uni-pr.edu"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Fjalëkalimi</label>
            <input
              type="password"
              required
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="Fjalëkalim i sigurt..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Roli në Sistem</label>
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="staff">Staf Check-in (Vetëm skanim dhe verifikim)</option>
              <option value="admin">Administrator (Qasje e plotë në konfigurim & biletat)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddUserOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Anulo
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-[#0B1E36] hover:bg-[#142D50] rounded-lg shadow-xs"
            >
              Krijo Llogarinë
            </button>
          </div>
        </form>
      </Modal>

      {/* Purge Confirm Dialog */}
      <ConfirmDialog
        isOpen={isPurgeConfirmOpen}
        onClose={() => setIsPurgeConfirmOpen(false)}
        onConfirm={handlePurgeData}
        title="Konfirmo Anonimizimin e të Dhënave të Vjetra"
        message={`Ky veprim do të fshijë numrat e telefonit dhe kontaktet e personave shoqërues për të gjitha regjistrimet më të vjetra se ${settings.data_retention_days} ditë sipas rregullores së privatësisë. Ky veprim nuk mund të kthehet mbrapa.`}
        confirmText="Anonimizo Tani"
        confirmType="danger"
      />
    </div>
  );
}
