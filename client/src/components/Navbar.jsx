import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo Section */}
          <div className="flex items-center gap-2">
            <div className="bg-green-500 p-1.5 rounded-lg">
              <svg 
                className="w-6 h-6 text-slate-900" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <Link to="/" className="text-2xl font-extrabold tracking-tight text-white hover:text-green-400 transition-colors">
              Split<span className="text-green-500">Mint</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            {user ? (
              <div className="flex items-center gap-6">
                <div className="hidden md:block text-right">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Signed in as</p>
                  <p className="text-sm text-slate-100 font-semibold">{user.name}</p>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-red-600/20 hover:text-red-400 px-4 py-2 rounded-lg border border-slate-700 hover:border-red-500/50 transition-all duration-200"
                >
                  Logout
                </button>
