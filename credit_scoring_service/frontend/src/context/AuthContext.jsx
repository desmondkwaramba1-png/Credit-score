import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth as authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from memory on mount.
  // We still use sessionStorage (cleared on tab close) rather than localStorage
  // to reduce XSS exposure while preserving page-refresh UX.
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('credai_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') setUser(parsed);
      }
    } catch {
      sessionStorage.removeItem('credai_session');
    }
    setLoading(false);
  }, []);

  const _persist = (data) => {
    sessionStorage.setItem('credai_session', JSON.stringify(data));
    setUser(data);
  };

  const register = async ({ name, email, password, user_type }) => {
    const data = await authApi.register({ name, email, password, user_type });
    _persist(data);
    return data;
  };

  const login = async ({ email, password }) => {
    const data = await authApi.login({ email, password });
    _persist(data);
    return data;
  };

  const logout = () => {
    sessionStorage.removeItem('credai_session');
    setUser(null);
  };

  const rotateApiKey = async () => {
    const data = await authApi.rotateApiKey(user.email, user.access_token);
    const updated = { ...user, api_key: data.new_api_key };
    _persist(updated);
    return data.new_api_key;
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, rotateApiKey }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
