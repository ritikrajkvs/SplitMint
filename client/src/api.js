import axios from 'axios';

// This automatically uses the environment variable in production, or localhost in dev
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export default api;
