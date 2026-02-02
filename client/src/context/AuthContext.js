import { createContext, useState, useContext } from "react";
import axios from "axios";

const AuthContext = createContext();

export const useAuthContext = () => {
  return useContext(AuthContext);
};

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // 1. This line automatically picks the right URL (Localhost vs Render)
  // If VITE_API_URL is set, use it. Otherwise default to localhost.
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const signup = async (formData) => {
    try {
      // 2. We use the dynamic API_URL here instead of hardcoding localhost
      const res = await axios.post(`${API_URL}/api/signup`, formData, {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true // Important if you use cookies
      });

      // Assuming your backend returns the user data in res.data
      setUser(res.data);
      console.log("Signup success:", res.data);
      return { success: true };

    } catch (error) {
      console.error("Signup Error:", error);
      // Return the error message to display on the form
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
      setUser(res.data);
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
