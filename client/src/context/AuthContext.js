import { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext();
export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  // Load user from local storage on load
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const signup = async (formData) => {
    try {
      const res = await axios.post(`${API_URL}/api/signup`, formData);
      localStorage.setItem("user", JSON.stringify(res.data)); // Save Token
      localStorage.setItem("token", res.data.token);          // Save Token Key
      setUser(res.data);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.error };
    }
  };

  const login = async (formData) => {
    try {
      const res = await axios.post(`${API_URL}/api/login`, formData);
      localStorage.setItem("user", JSON.stringify(res.data)); // Save Token
      localStorage.setItem("token", res.data.token);          // Save Token Key
      setUser(res.data);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.error };
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
