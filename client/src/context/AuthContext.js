import { createContext, useState, useContext } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const useAuthContext = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Uses the Environment Variable from Netlify, or localhost for development
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const signup = async (formData) => {
    try {
      const res = await axios.post(`${API_URL}/api/signup`, formData, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true 
      });

      // FIX: Accessing the 'user' object from the response structure
      setUser(res.data.user || res.data);
      console.log("Signup success:", res.data);
      return { success: true };

    } catch (error) {
      console.error("Signup Error:", error);
      return { 
        success: false, 
        message: error.response?.data?.error || "Signup failed" 
      };
    }
  };

  const login = async (formData) => {
    try {
      const res = await axios.post(`${API_URL}/api/login`, formData, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true
      });
      
      // FIX: Accessing the 'user' object correctly
      setUser(res.data.user || res.data);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.error || "Login failed" 
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, signup, login }}>
      {children}
    </AuthContext.Provider>
  );
};
