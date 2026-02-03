import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext'; //
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, signup } = useContext(AuthContext); //
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        // FIX: Pass data as a single object
        await login({ email, password });
      } else {
        // FIX: Pass data as a single object with 'name' matching your Schema
        await signup({ name, email, password });
      }
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.error || 'Authentication Failed');
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isLogin ? 'Login to SplitMint' : 'Create Account'}
        </h2>

        {!isLogin && (
          <input 
            className="border p-2 w-full mb-3 rounded" 
            placeholder="Full Name" 
            value={name}
            onChange={e => setName(e.target.value)} 
            required
          />
        )}

        <input 
          className="border p-2 w-full mb-3 rounded" 
          type="email" 
          placeholder="Email" 
          value={email}
          onChange={e => setEmail(e.target.value)} 
          required
        />
        
        <input 
          className="border p-2 w-full mb-6 rounded" 
          type="password" 
          placeholder="Password" 
          value={password}
          onChange={e => setPassword(e.target.value)} 
          required
        />

        <button className="bg-green-600 text-white w-full py-2 rounded font-bold hover:bg-green-700 transition">
          {isLogin ? 'Login' : 'Sign Up'}
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-blue-600 cursor-pointer hover:underline font-bold"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </span>
        </p>
      </form>
    </div>
  );
}
