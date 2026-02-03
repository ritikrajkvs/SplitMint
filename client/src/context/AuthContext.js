import { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const useAuthContext = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  // FIX 1: Lazy Initialization - Check localStorage IMMEDIATELY
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const signup = async (formData) => {
    try {
      const res = await axios.post(`${API_URL}/api/signup`, formData);
      
      // FIX 2: Save to LocalStorage so refresh works
      localStorage.setItem("user", JSON.stringify(res.data.user || res.data));
      localStorage.setItem("token", res.data.token); // Save token separately
      
      setUser(res.data.user || res.data);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.error || "Signup failed" };
    }
  };

  const login = async (formData) => {
    try {
      const res = await axios.post(`${API_URL}/api/login`, formData);
      
      // FIX 2: Save to LocalStorage
      localStorage.setItem("user", JSON.stringify(res.data.user || res.data));
      localStorage.setItem("token", res.data.token);
      
      setUser(res.data.user || res.data);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.error || "Login failed" };
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
