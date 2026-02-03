import { useState, useEffect } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/groups')
      .then(res => setGroups(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const createGroup = async (e) => {
    e.preventDefault();
    if (!name) return;
    try {
      const res = await api.post('/api/groups', { name });
      setGroups([res.data, ...groups]);
      setName('');
    } catch (err) { alert("Failed to create group"); }
  };

  const getInitials = (n) => n ? n.charAt(0).toUpperCase() : "?";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">S</div>
          <span className="font-bold text-xl tracking-tight text-gray-900">SplitMint</span>
        </div>
        <button onClick={() => { localStorage.clear(); window.location.href='/login' }} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition">Log Out</button>
      </nav>

      <main className="max-w-5xl mx-auto p-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage your shared expenses and groups.</p>
          </div>
          
          {/* Create Group Input */}
          <form onSubmit={createGroup} className="flex w-full md:w-auto shadow-sm rounded-lg overflow-hidden border border-gray-300 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
            <input 
              className="px-4 py-2.5 w-full md:w-64 outline-none text-sm" 
              placeholder="Name your new group..." 
              value={name}
              onChange={e => setName(e.target.value)} 
            />
            <button className="bg-gray-50 hover:bg-gray-100 text-indigo-600 font-semibold px-5 py-2.5 text-sm border-l border-gray-300 transition-colors">
              + Create
            </button>
          </form>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-40 bg-gray-200 rounded-xl"></div>)}
          </div>
        )}

        {/* Groups Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.length === 0 ? (
              <div className="col-span-full text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                <p className="text-gray-400 text-lg">No groups yet. Create one to get started!</p>
              </div>
            ) : (
              groups.map(g => (
                <Link to={`/group/${g._id}`} key={g._id} className="group bg-white p-6 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl font-bold text-gray-800 truncate pr-4">{g.name}</h2>
                    <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full border border-indigo-100">
                      {g.members.length} {g.members.length === 1 ? 'Person' : 'People'}
                    </span>
                  </div>
                  
                  <div className="flex items-center -space-x-2 overflow-hidden py-2">
                     {g.members.slice(0, 5).map(m => (
                       <div key={m._id} className={`flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-white text-white text-xs font-bold shadow-sm ${m.avatarColor || 'bg-gray-400'}`} title={m.name}>
                         {getInitials(m.name)}
                       </div>
                     ))}
                     {g.members.length > 5 && (
                       <div className="h-8 w-8 rounded-full bg-gray-100 ring-2 ring-white flex items-center justify-center text-xs text-gray-600 font-bold">
                         +{g.members.length - 5}
                       </div>
                     )}
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400">
                    <span>Created {new Date(g.createdAt).toLocaleDateString()}</span>
                    <span className="text-indigo-600 font-medium group-hover:underline">Open &rarr;</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
