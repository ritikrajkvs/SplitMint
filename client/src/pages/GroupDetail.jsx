import { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Sparkles, Trash2 } from 'lucide-react';

export default function GroupDetail() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [group, setGroup] = useState(null);
  const [data, setData] = useState({ expenses: [], balances: {} });
  const [aiPrompt, setAiPrompt] = useState('');
  const [form, setForm] = useState({ description: '', amount: '' });

  useEffect(() => {
    axios.get(`http://localhost:5000/api/groups/${id}`, { withCredentials: true }).then(res => setGroup(res.data));
    refreshData();
  }, [id]);

  const refreshData = () => {
    axios.get(`http://localhost:5000/api/groups/${id}/balance`, { withCredentials: true }).then(res => setData(res.data));
  };

  const handleAI = async () => {
    if(!aiPrompt) return;
    try {
      const res = await axios.post('http://localhost:5000/api/ai/parse', { text: aiPrompt }, { withCredentials: true });
      setForm({ description: res.data.description, amount: res.data.amount });
    } catch (e) { alert("AI could not understand."); }
  };

  const addExpense = async () => {
    if (!form.amount || !group) return;
    
    // Default Logic: EQUAL split among all members
    const splitAmount = form.amount / group.members.length;
    const splits = group.members.map(m => ({ user: m._id, amount: splitAmount }));

    await axios.post('http://localhost:5000/api/expenses', {
      ...form, groupId: id, splitType: 'EQUAL', splits
    }, { withCredentials: true });
    
    setForm({ description: '', amount: '' });
    refreshData();
  };

  if (!group) return <div>Loading...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">{group.name}</h1>
      <p className="text-gray-500 mb-6">Members: {group.members.map(m => m.name).join(', ')}</p>

      {/* AI Section */}
      <div className="bg-purple-50 p-4 rounded-lg mb-6 border border-purple-200">
        <div className="flex items-center gap-2 text-purple-700 font-bold mb-2">
          <Sparkles size={18} /> MintSense AI
        </div>
        <div className="flex gap-2">
          <input 
            className="border p-2 rounded w-full"
            placeholder="Ex: 'Dinner at Taj Hotel 2000'"
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
          />
          <button onClick={handleAI} className="bg-purple-600 text-white px-4 rounded whitespace-nowrap">Auto-Fill</button>
        </div>
      </div>

      {/* Manual Entry */}
      <div className="flex gap-2 mb-8 bg-gray-100 p-4 rounded shadow-sm">
        <input 
          className="border p-2 rounded w-full" placeholder="Description" 
          value={form.description} onChange={e => setForm({...form, description: e.target.value})} 
        />
        <input 
          type="number" className="border p-2 rounded w-32" placeholder="Amount" 
          value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} 
        />
        <button onClick={addExpense} className="bg-green-600 text-white px-6 rounded font-bold">Add</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Expense List */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">Recent Expenses</h3>
          {data.expenses.map(exp => (
            <div key={exp._id} className="flex justify-between py-2 border-b last:border-0">
              <div>
                <div className="font-medium">{exp.description}</div>
                <div className="text-xs text-gray-500">Paid by {exp.payer.name}</div>
              </div>
              <div className="font-mono font-bold">₹{exp.amount}</div>
            </div>
          ))}
        </div>
        
        {/* Balance Engine Visualization */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">Net Balances</h3>
          {group.members.map(member => {
            const bal = data.balances[member._id] || 0;
            return (
              <div key={member._id} className="flex justify-between py-3 items-center">
                <span>{member.name}</span>
                <span className={`px-3 py-1 rounded text-sm font-bold ${bal >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {bal >= 0 ? `Gets back ₹${bal.toFixed(2)}` : `Owes ₹${Math.abs(bal).toFixed(2)}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}