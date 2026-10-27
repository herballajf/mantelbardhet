import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';
import { Events } from './pages/Events';
import { Registrations } from './pages/Registrations';
import { CheckIn } from './pages/CheckIn';
import { SetupGuide } from './pages/SetupGuide';
import { AuditLogs } from './pages/AuditLogs';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { VerifyPublic } from './pages/VerifyPublic';
import { api } from './utils/api';

export function App() {
  const path = window.location.pathname;

  // 1. Check if public QR verification path: /verify/:token
  if (path.startsWith('/verify/')) {
    const token = path.replace('/verify/', '').split('?')[0];
    return <VerifyPublic token={token} />;
  }

  // 2. Check if login page
  if (path === '/login') {
    return <Login />;
  }

  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Load events for header dropdown
  const loadEvents = async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.events || []);
    } catch (e) {
      console.error('Failed to load events:', e);
    }
  };

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-300">Duke ngarkuar sistemin universitar...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const tabTitles = {
    dashboard: { title: 'Paneli Kryesor', subtitle: 'Përmbledhje e përgjithshme e regjistrimeve dhe statusit të biletave' },
    events: { title: 'Aktivitetet & Ceremonitë', subtitle: 'Menaxhimi i ceremonive zyrtare dhe rregullave të hyrjes' },
    registrations: { title: 'Regjistrimet & Biletat Zyrtare', subtitle: 'Lista e pjesëmarrësve, shkarkimi i PDF-ve dhe ridërgimi i emailave' },
    checkin: { title: 'Skaneri Check-in', subtitle: 'Stacioni i verifikimit në kohë reale te hyrja e sallës' },
    'setup-guide': { title: 'Integrimi me Google Forms', subtitle: 'Udhëzuesi hap-pas-hapi dhe testuesi i integrimit' },
    'audit-logs': { title: 'Siguria & Audit Log', subtitle: 'Gjurmimi i veprimeve administrative dhe privatësia' },
    settings: { title: 'Konfigurimi i Sistemit', subtitle: 'Cilësimet e serverit SMTP, llogaritë e stafit dhe mbajtja e të dhënave' }
  };

  const currentMeta = tabTitles[activeTab] || tabTitles.dashboard;

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans">
      {/* Institutional Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen">
        <Header
          title={currentMeta.title}
          subtitle={currentMeta.subtitle}
          events={events}
          selectedEventId={selectedEventId}
          onSelectEvent={setSelectedEventId}
          onOpenManualReg={() => setIsManualModalOpen(true)}
          onOpenScanner={() => setActiveTab('checkin')}
        />

        <main className="flex-1 p-6">
          {activeTab === 'dashboard' && (
            <Dashboard
              events={events}
              selectedEventId={selectedEventId}
              onSelectTab={setActiveTab}
              onOpenManualReg={() => setIsManualModalOpen(true)}
              onOpenScanner={() => setActiveTab('checkin')}
            />
          )}

          {activeTab === 'events' && (
            <Events
              onSelectEvent={setSelectedEventId}
              onSelectTab={setActiveTab}
            />
          )}

          {activeTab === 'registrations' && (
            <Registrations
              events={events}
              selectedEventId={selectedEventId}
              onSelectEvent={setSelectedEventId}
              isManualOpen={isManualModalOpen}
              onCloseManual={() => setIsManualModalOpen(false)}
            />
          )}

          {activeTab === 'checkin' && (
            <CheckIn selectedEventId={selectedEventId} />
          )}

          {activeTab === 'setup-guide' && (
            <SetupGuide
              events={events}
              selectedEventId={selectedEventId}
            />
          )}

          {activeTab === 'audit-logs' && isAdmin && (
            <AuditLogs />
          )}

          {activeTab === 'settings' && isAdmin && (
            <Settings />
          )}
        </main>
      </div>
    </div>
  );
}
