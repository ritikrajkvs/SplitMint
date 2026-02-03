import { useState, useEffect } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState('');

  useEffect(() => {
    api.get('/api/groups').then(res => setGroups(res.data)).catch(console.error);
  }, []);

  const createGroup = async (e) => {
    e.preventDefault();
    if (!name) return;
    try {
      const res = await api.post('/api/groups', { name });
      setGroups([...groups, res.data]);
      setName('');
    } catch (err) { alert("Failed to create group"); }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      {/* Create Group Form */}
      <form onSubmit={createGroup} className="flex gap-2 mb-8">
        <input 
          className="border p-2 rounded w-64 shadow-sm" 
          placeholder="New Group Name" 
          value={name}
          onChange={e => setName(e.target.value)} 
        />
        <button className="bg-blue-600 text-white px-4 rounded hover:bg-blue-700 shadow-sm">+ Create Group</button>
      </form>

      {/* Group Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map(g => (
          <Link to={`/group/${g._id}`} key={g._id} className="block p-6 border rounded-lg hover:shadow-lg bg-white transition">
            <h2 className="text-xl font-bold text-gray-800">{g.name}</h2>
            <p className="text-gray-500 mt-2">{g.members.length} Members</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
