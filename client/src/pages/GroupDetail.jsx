import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { AuthContext } from "../context/AuthContext";

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [splitType, setSplitType] = useState("EQUAL");
  const [customSplits, setCustomSplits] = useState({});
  const [search, setSearch] = useState("");
  const [showMemberForm, setShowMemberForm] = useState(false);

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

  const addExpense = async (e) => {
    e.preventDefault();
    try {
      const splitsArray = Object.keys(customSplits).map(uid => ({
        user: uid,
        value: customSplits[uid]
      }));
      await api.post(`/api/groups/${id}/expenses`, { 
        description: desc, amount: parseFloat(amount), splitType, splits: splitsArray
      });
      setDesc(""); setAmount(""); setCustomSplits({});
      fetchData();
    } catch (err) { alert(err.response?.data?.error || "Error"); }
  };

  const addMember = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    try {
      await api.post(`/api/groups/${id}/members`, { email });
      setShowMemberForm(false);
      fetchData();
    } catch (err) { alert(err.response?.data?.error); }
  };

  const deleteExpense = async (expId) => {
    if(!window.confirm("Delete this expense?")) return;
    await api.delete(`/api/groups/expenses/${expId}`);
    fetchData();
  };

  const removeMember = async (userId) => {
    if(!window.confirm("Remove this member?")) return;
    try {
      await api.delete(`/api/groups/${id}/members/${userId}`);
      fetchData();
    } catch (err) { alert(err.response?.data?.error); }
  };

  const deleteGroup = async () => {
    if(!window.confirm("Delete group PERMANENTLY?")) return;
    await api.delete(`/api/groups/${id}`);
    navigate('/');
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!data) return <div className="p-10 text-center">Group Not Found</div>;

  const myBalance = data.balances[user._id] || 0;
  const filteredExpenses = data.expenses.filter(e => 
    e.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">{data.group.name}</h1>
          <p className="text-gray-500">{data.group.members.length}/4 Members</p>
        </div>
        
        {/* Requirement: Summary Cards */}
        <div className="flex gap-4">
          <div className={`p-4 rounded shadow text-white font-bold ${myBalance >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
            <p className="text-xs opacity-75">MY NET BALANCE</p>
            <p className="text-xl">{myBalance >= 0 ? `+₹${myBalance.toFixed(2)}` : `-₹${Math.abs(myBalance).toFixed(2)}`}</p>
          </div>
          {data.group.createdBy === user._id && (
            <button onClick={deleteGroup} className="bg-red-100 text-red-600 px-4 py-2 rounded hover:bg-red-200">
              Delete Group
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COL: Actions */}
        <div className="space-y-6">
          
          {/* Members List */}
          <div className="bg-white p-4 rounded shadow border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Participants</h3>
              <button onClick={() => setShowMemberForm(!showMemberForm)} className="text-blue-600 text-sm font-bold">+ Add</button>
            </div>
            {showMemberForm && (
              <form onSubmit={addMember} className="mb-4 flex gap-2">
                <input name="email" placeholder="Email" className="border p-1 w-full rounded text-sm"/>
                <button className="bg-blue-600 text-white px-2 rounded">Go</button>
              </form>
            )}
            <ul className="space-y-2">
              {data.group.members.map(m => (
                <li key={m._id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-300"></div> {/* Avatar Placeholder */}
                    <span>{m.name}</span>
                  </div>
                  {m._id !== data.group.createdBy && (
                    <button onClick={() => removeMember(m._id)} className="text-red-400 hover:text-red-600">×</button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Add Expense */}
          <div className="bg-white p-6 rounded shadow border">
            <h3 className="font-bold mb-4">Add Expense</h3>
            <form onSubmit={addExpense} className="space-y-3">
              <input className="border p-2 w-full rounded" placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)} required />
              <input className="border p-2 w-full rounded" type="number" placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)} required />
              
              <div className="flex gap-2 text-xs">
                {['EQUAL', 'EXACT', 'PERCENT'].map(type => (
                  <button type="button" key={type} onClick={()=>setSplitType(type)} 
                    className={`px-2 py-1 rounded border ${splitType===type ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}>
                    {type}
                  </button>
                ))}
              </div>

              {splitType !== 'EQUAL' && (
                <div className="bg-gray-50 p-2 rounded space-y-2">
                  {data.group.members.map(m => (
                    <div key={m._id} className="flex justify-between text-sm items-center">
                      <span>{m.name}</span>
                      <input className="w-16 border p-1 rounded" placeholder="0" 
                        onChange={e => setCustomSplits({...customSplits, [m._id]: e.target.value})} />
                    </div>
                  ))}
                </div>
              )}
              <button className="bg-green-600 text-white w-full py-2 rounded font-bold">Save</button>
            </form>
          </div>
        </div>

        {/* MIDDLE COL: Visualizations */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Requirement: Balance Table / Settlements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-blue-50 p-4 rounded border border-blue-100">
               <h3 className="font-bold text-blue-900 mb-2">How to Settle Up</h3>
               {data.settlements.length === 0 ? <p className="text-sm text-gray-500">No debts.</p> : (
                 <ul className="space-y-2 text-sm">
                   {data.settlements.map((s, i) => {
                     const from = data.group.members.find(m => m._id === s.from)?.name;
                     const to = data.group.members.find(m => m._id === s.to)?.name;
                     return (
                       <li key={i} className="flex gap-2">
                         <span className="font-bold text-red-600">{from}</span> pays
                         <span className="font-bold text-green-600">{to}</span>
                         <span className="font-bold ml-auto">₹{s.amount}</span>
                       </li>
                     )
                   })}
                 </ul>
               )}
             </div>

             <div className="bg-white p-4 rounded border shadow">
               <h3 className="font-bold mb-2">Net Balances</h3>
               <ul className="space-y-2 text-sm">
                 {data.group.members.map(m => {
                   const bal = data.balances[m._id] || 0;
                   return (
                     <li key={m._id} className="flex justify-between">
                       <span>{m.name}</span>
                       <span className={bal >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                         {bal >= 0 ? `+${bal.toFixed(0)}` : `${bal.toFixed(0)}`}
                       </span>
                     </li>
                   )
                 })}
               </ul>
             </div>
          </div>

          {/* Requirement: Transaction History with Filter */}
          <div className="bg-white rounded shadow border">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold">Activity</h3>
              <input 
                placeholder="Search..." 
                className="border p-1 rounded text-sm w-40"
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-96 overflow-y-auto">
              {filteredExpenses.map(exp => (
                <div key={exp._id} className="p-4 border-b hover:bg-gray-50 flex justify-between items-center group">
                  <div>
                    <p className="font-bold text-gray-800">{exp.description}</p>
                    <p className="text-xs text-gray-500">
                      {exp.payer.name} paid ₹{exp.amount} • {new Date(exp.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-orange-600">₹{exp.amount}</span>
                    <button onClick={() => deleteExpense(exp._id)} className="text-gray-300 hover:text-red-500 text-xl font-bold px-2">×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
