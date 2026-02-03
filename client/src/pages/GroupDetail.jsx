import { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import { AuthContext } from "../context/AuthContext";

export default function GroupDetail() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  
  const [data, setData] = useState(null); // Stores group, expenses, balances, settlements
  const [loading, setLoading] = useState(true);
  
  // Expense Form State
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [splitType, setSplitType] = useState("EQUAL"); // EQUAL, EXACT, PERCENT
  const [customSplits, setCustomSplits] = useState({}); // { userId: value }
  const [search, setSearch] = useState(""); // Filter Search

  const fetchData = async () => {
    try {
      const res = await api.get(`/api/groups/${id}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleCustomChange = (userId, value) => {
    setCustomSplits(prev => ({ ...prev, [userId]: value }));
  };

  const addExpense = async (e) => {
    e.preventDefault();
    try {
      // Format splits for backend
      const splitsArray = Object.keys(customSplits).map(uid => ({
        user: uid,
        value: customSplits[uid]
      }));

      await api.post(`/api/groups/${id}/expenses`, { 
        description: desc, 
        amount: parseFloat(amount),
        splitType,
        splits: splitsArray
      });
      
      // Reset form
      setDesc(""); setAmount(""); setCustomSplits({});
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Error adding expense");
    }
  };

  const addMember = async (e) => {
    e.preventDefault();
    const email = prompt("Enter User Email:");
    if(!email) return;
    try {
      await api.post(`/api/groups/${id}/members`, { email });
      fetchData();
    } catch (err) { alert("Failed to add member"); }
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>Group not found</div>;

  // Filter Expenses
  const filteredExpenses = data.expenses.filter(e => 
    e.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{data.group.name}</h1>
        <button onClick={addMember} className="bg-blue-600 text-white px-4 py-2 rounded">
          + Add Member ({data.group.members.length}/4)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* LEFT: Add Expense Form */}
        <div className="bg-white p-6 rounded shadow border">
          <h2 className="text-xl font-bold mb-4">Add Expense</h2>
          <form onSubmit={addExpense} className="space-y-4">
            <input className="border p-2 w-full rounded" placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)} required />
            <input className="border p-2 w-full rounded" type="number" placeholder="Total Amount" value={amount} onChange={e=>setAmount(e.target.value)} required />
            
            {/* Split Type Tabs */}
            <div className="flex gap-2 mb-2">
              {['EQUAL', 'EXACT', 'PERCENT'].map(type => (
                <button 
                  key={type}
                  type="button"
                  onClick={() => setSplitType(type)}
                  className={`px-3 py-1 text-sm rounded border ${splitType === type ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Custom Split Inputs */}
            {splitType !== 'EQUAL' && (
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-xs mb-2 text-gray-500">
                  {splitType === 'EXACT' ? `Enter exact amounts (Total: ${amount || 0})` : "Enter percentages (Total: 100%)"}
                </p>
                {data.group.members.map(m => (
                  <div key={m._id} className="flex justify-between items-center mb-2">
                    <label className="text-sm">{m.name}</label>
                    <input 
                      type="number" 
                      className="border p-1 w-20 rounded text-sm"
                      placeholder="0"
                      onChange={e => handleCustomChange(m._id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}

            <button className="bg-green-600 text-white w-full py-2 rounded font-bold">Save Expense</button>
          </form>
        </div>

        {/* RIGHT: Settlements & Balances */}
        <div className="space-y-6">
          
          {/* WHO PAYS WHOM (Settlements) */}
          <div className="bg-blue-50 p-6 rounded shadow border border-blue-100">
            <h2 className="text-xl font-bold mb-4 text-blue-900">Suggested Settlements</h2>
            {data.settlements.length === 0 ? (
              <p className="text-gray-500">All settled up! 🎉</p>
            ) : (
              <ul className="space-y-2">
                {data.settlements.map((s, i) => {
                  const from = data.group.members.find(m => m._id === s.from)?.name;
                  const to = data.group.members.find(m => m._id === s.to)?.name;
                  return (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-red-600">{from}</span>
                      <span className="text-gray-500">pays</span>
                      <span className="font-bold text-green-600">{to}</span>
                      <span className="font-bold border px-2 py-1 rounded bg-white ml-auto">₹{s.amount}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* NET BALANCES */}
          <div className="bg-white p-6 rounded shadow border">
            <h2 className="text-xl font-bold mb-4">Net Balances</h2>
            <ul className="space-y-2">
              {data.group.members.map(m => {
                const bal = data.balances[m._id] || 0;
                return (
                  <li key={m._id} className="flex justify-between text-sm">
                    <span>{m.name}</span>
                    <span className={bal >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                      {bal >= 0 ? `+${bal.toFixed(0)}` : `${bal.toFixed(0)}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

        </div>
      </div>

      {/* Transaction History with Filter */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Transactions</h2>
          <input 
            placeholder="Search expenses..." 
            className="border p-2 rounded w-64"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="bg-white rounded shadow overflow-hidden">
          {filteredExpenses.map(exp => (
            <div key={exp._id} className="p-4 border-b hover:bg-gray-50 flex justify-between">
              <div>
                <p className="font-bold">{exp.description}</p>
                <p className="text-xs text-gray-500">
                  {new Date(exp.date).toLocaleDateString()} • {exp.splitType} split
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-red-600">-₹{exp.amount}</p>
                <p className="text-xs text-gray-500">Paid by {exp.payer.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
