const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('up_ticket_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  // If body is FormData (e.g. logo file upload), delete Content-Type so browser sets boundary
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // If not a login request and got 401, clear token
    if (!endpoint.includes('/auth/login')) {
      localStorage.removeItem('up_ticket_token');
      localStorage.removeItem('up_ticket_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/pdf')) {
    return response.blob();
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Ndodhi një gabim gjatë kërkesës.');
  }

  return data;
}

export const api = {
  get: (url) => apiRequest(url, { method: 'GET' }),
  post: (url, body) => apiRequest(url, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
  put: (url, body) => apiRequest(url, { method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }),
  delete: (url) => apiRequest(url, { method: 'DELETE' }),

  downloadPdf: async (registrationId, ticketNumber) => {
    const token = localStorage.getItem('up_ticket_token');
    const response = await fetch(`${API_BASE}/registrations/${registrationId}/pdf`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Dështoi shkarkimi i biletës PDF.');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bileta-Zyrtare-${ticketNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  exportCsv: async (eventId) => {
    const token = localStorage.getItem('up_ticket_token');
    const url = `${API_BASE}/registrations/export/csv${eventId ? `?event_id=${eventId}` : ''}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Dështoi eksportimi i të dhënave në CSV.');
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `regjistrimet-up-medicina-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  }
};
