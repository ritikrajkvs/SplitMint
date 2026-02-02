import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="bg-slate-800 text-white p-4 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold text-green-400">SplitMint</Link>
      <div>
        {user ? (
          <div className="flex gap-4 items-center">
            <span>Hi, {user.name}</span>
            <button onClick={logout} className="text-sm bg-red-500 px-3 py-1 rounded">Logout</button>
          </div>
        ) : (
          <div className="flex gap-4">
             <Link to="/login">Login</Link>
             <Link to="/signup">Signup</Link>
          </div>
        )}
      </div>
    </nav>
  );
}