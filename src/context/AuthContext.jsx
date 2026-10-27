import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('up_ticket_token');
    const cachedUser = localStorage.getItem('up_ticket_user');

    if (token && cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
        // Verify with server in background
        apiRequest('/auth/me')
          .then(res => {
            setUser(res.user);
            localStorage.setItem('up_ticket_user', JSON.stringify(res.user));
          })
          .catch(() => {
            setUser(null);
            localStorage.removeItem('up_ticket_token');
            localStorage.removeItem('up_ticket_user');
          })
          .finally(() => setLoading(false));
      } catch (e) {
        setUser(null);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    localStorage.setItem('up_ticket_token', res.token);
    localStorage.setItem('up_ticket_user', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('up_ticket_token');
    localStorage.removeItem('up_ticket_user');
    setUser(null);
    window.location.href = '/login';
  };

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff' || isAdmin;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
