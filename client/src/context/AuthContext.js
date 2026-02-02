import { createContext, useState, useEffect } from 'react';
import api from '../api'; // Import our new helper

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    api.get('/api/me')
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/api/login', { email, password });
    setUser(res.data.user);
  };

  const signup = async (name, email, password) => {
    const res = await api.post('/api/signup', { name, email, password });
    setUser(res.data.user);
  };

  const logout = async () => {
    await api.post('/api/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
