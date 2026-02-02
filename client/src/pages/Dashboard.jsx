import { useState, useEffect } from 'react';
import api from '../api'; // Use api helper
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    api.get('/api/groups')
      .then(res => setGroups(res.data))
      .catch(err => console.error("Failed to fetch groups"));
  }, []);

  const createGroup = async () => {
    if(!newGroupName) return;
    await api.post('/api/groups', { name: newGroupName });
    window.location.reload();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Your Groups</h1>
      
      <div className="flex gap-2 mb-8">
        <input className="border p-2 rounded w-64" placeholder="Group Name" onChange={e => setNewGroupName(e.target.value)} />
        <button onClick={createGroup} className="bg-blue-600 text-white px-4 rounded">+ New Group</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map(g => (
          <Link to={`/group/${g._id}`} key={g._id} className="block p-6 border rounded-lg hover:shadow-lg bg-white transition">
            <h2 className="text-xl font-semibold">{g.name}</h2>
            <p className="text-gray-500">{g.members.length} members</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
