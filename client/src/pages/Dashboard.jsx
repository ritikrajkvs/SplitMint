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
    } catch (err) { alert("Failed"); }
  };
  
  const getInitials = (name) => name ? name.charAt(0).toUpperCase() : "?";

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Your Groups</h1>
      <form onSubmit={createGroup} className="flex gap-2 mb-8">
        <input 
          className="border p-2 rounded w-full max-w-sm shadow-sm" 
          placeholder="New Group Name" 
          value={name}
          onChange={e => setName(e.target.value)} 
        />
        <button className="bg-blue-600 text-white px-6 rounded font-bold shadow hover:bg-blue-700">Create</button>
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map(g => (
          <Link to={`/group/${g._id}`} key={g._id} className="block p-6 border rounded-lg hover:shadow-lg bg-white transition group">
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-bold text-gray-800 group-hover:text-blue-600">{g.name}</h2>
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">{g.members.length} People</span>
            </div>
            <div className="mt-4 flex -space-x-2 overflow-hidden">
               {g.members.slice(0,4).map(m => (
                 <div key={m._id} className={`flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-white text-white text-xs font-bold ${m.avatarColor || 'bg-gray-300'}`} title={m.name}>
                   {getInitials(m.name)}
                 </div>
               ))}
               {g.members.length > 4 && <div className="h-8 w-8 rounded-full bg-gray-100 ring-2 ring-white flex items-center justify-center text-xs">+{g.members.length-4}</div>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
