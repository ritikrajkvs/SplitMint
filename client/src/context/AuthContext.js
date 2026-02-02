import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    axios.get('http://localhost:5000/api/me')
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await axios.post('http://localhost:5000/api/login', { email, password });
    setUser(res.data.user);
  };

  // --- NEW SIGNUP FUNCTION ADDED HERE ---
  const signup = async (name, email, password) => {
    const res = await axios.post('http://localhost:5000/api/signup', { name, email, password });
    setUser(res.data.user);
  };

  const logout = async () => {
    await axios.post('http://localhost:5000/api/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};