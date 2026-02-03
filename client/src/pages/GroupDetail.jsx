import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { AuthContext } from "../context/AuthContext";

// Keep colors consistent for visualization
const KEEP_COLORS = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-green-500", "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-gray-500"];

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Toggles
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Inputs
  const [groupName, setGroupName] = useState("");
  
  // Expense Form
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState(""); 
  const [splitType, setSplitType] = useState("EQUAL");
  const [customSplits, setCustomSplits] = useState({});

  // Filters (Requirement 7)
  const [search, setSearch] = useState("");
  const [filterUser, setFilterUser] = useState("ALL");
  const [filterDate, setFilterDate] = useState("");
  const [filterMinAmount, setFilterMinAmount] = useState("");

  const getInitials = (name) => name ? name.charAt(0).toUpperCase() : "?";

  const fetchData = async () => {
    try {
      const res = await api.get(`/api/groups/${id}`);
      setData(res.data);
      setGroupName(res.data.group.name);
      if(!payer && res.data.group.members.length > 0) setPayer(res.data.group.members[0]._id);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  // --- ACTIONS ---

  const updateGroupName = async () => {
    try { await api.put(`/api/groups/${id}`, { name: groupName }); setEditingGroup(false); fetchData(); } 
    catch (err) { alert("Failed"); }
  };

  const addMember = async (e) => {
    e.preventDefault();
    try { await api.post(`/api/groups/${id}/members`, { name: e.target.name.value }); setShowMemberForm(false); fetchData(); } 
    catch (err) { alert(err.response?.data?.error); }
  };

  const removeMember = async (mid) => {
    if(window.confirm("Remove member?")) {
      try { await api.delete(`/api/groups/${id}/members/${mid}`); fetchData(); }
      catch(e) { alert(e.response?.data?.error); }
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await api.put(`/api/groups/expenses/${editingExpense}`, { description: desc, amount: parseFloat(amount) });
        setEditingExpense(null);
      } else {
        const splitsArray = Object.keys(customSplits).map(uid => ({ user: uid, value: customSplits[uid] }));
        await api.post(`/api/groups/${id}/expenses`, { description: desc, amount: parseFloat(amount), splitType, splits: splitsArray, payer });
      }
      setDesc(""); setAmount(""); setCustomSplits({});
      fetchData();
    } catch (err) { alert(err.response?.data?.error); }
  };

  const startEditExpense = (exp) => {
    setEditingExpense(exp._id);
    setDesc(exp.description);
    setAmount(exp.amount);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteExpense = async (eid) => {
    if(window.confirm("Delete?")) { await api.delete(`/api/groups/expenses/${eid}`); fetchData(); }
  };

  const deleteGroup = async () => {
    if(window.confirm("Delete Group?")) { await api.delete(`/api/groups/${id}`); navigate('/'); }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!data) return <div className="p-10 text-center">Group Not Found</div>;

  // --- CALCULATIONS FOR VISUALIZATION ---
  const myMemberId = data.group.members.find(m => m.isAdmin)?._id || data.group.members[0]?._id;
  const myBalance = data.balances[myMemberId] || 0;
  
  const totalGroupSpend = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Calculate how much each person PAID (Contribution)
  const contributions = {};
  data.group.members.forEach(m => contributions[m._id] = 0);
  data.expenses.forEach(e => {
    if (contributions[e.payer] !== undefined) contributions[e.payer] += e.amount;
  });

  // Filter Logic
  const filteredExpenses = data.expenses.filter(e => {
    const matchesText = e.description.toLowerCase().includes(search.toLowerCase());
    const matchesUser = filterUser === "ALL" || e.payer === filterUser;
    const matchesDate = !filterDate || e.date.startsWith(filterDate);
    const matchesAmount = !filterMinAmount || e.amount >= parseFloat(filterMinAmount);
    return matchesText && matchesUser && matchesDate && matchesAmount;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-sm">
        <div className="flex-1">
          {editingGroup ? (
            <div className="flex gap-2">
              <input className="border p-2 text-2xl font-bold rounded" value={groupName} onChange={e=>setGroupName(e.target.value)}/>
              <button onClick={updateGroupName} className="text-green-600 font-bold px-4 py-2 bg-green-50 rounded">Save</button>
            </div>
          ) : (
            <h1 className="text-3xl font-bold flex items-center gap-2 text-gray-800">
              {data.group.name} 
              <button onClick={()=>setEditingGroup(true)} className="text-gray-400 hover:text-blue-500 text-lg">✎</button>
            </h1>
          )}
          <p className="text-gray-500 mt-1">{data.group.members.length} Participants • Created {new Date(data.group.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-4 items-center mt-4 md:mt-0">
           <button onClick={deleteGroup} className="text-red-500 font-semibold hover:bg-red-50 px-4 py-2 rounded transition">Delete Group</button>
        </div>
      </div>

      {/* REQUIREMENT 6: VISUALIZATIONS - SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card 1: Total Spent */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <p className="text-gray-500 text-sm font-semibold uppercase">Total Group Spend</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">₹{totalGroupSpend.toLocaleString()}</p>
        </div>
        
        {/* Card 2: My Contribution */}
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <p className="text-gray-500 text-sm font-semibold uppercase">You Paid</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">₹{contributions[myMemberId]?.toLocaleString() || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Total outflow</p>
        </div>

        {/* Card 3: Net Position */}
        <div className={`bg-white p-6 rounded-lg shadow border-l-4 ${myBalance >= 0 ? 'border-green-500' : 'border-red-500'}`}>
          <p className="text-gray-500 text-sm font-semibold uppercase">Your Net Balance</p>
          <p className={`text-3xl font-bold mt-1 ${myBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {myBalance >= 0 ? `+₹${myBalance.toFixed(2)}` : `-₹${Math.abs(myBalance).toFixed(2)}`}
          </p>
          <p className="text-xs text-gray-400 mt-1">{myBalance >= 0 ? "You are owed" : "You owe"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Actions & Members */}
        <div className="space-y-6">
          {/* Members List */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-bold text-gray-700">Members</h3>
              <button onClick={() => setShowMemberForm(!showMemberForm)} className="text-blue-600 text-sm font-bold bg-blue-50 px-3 py-1 rounded hover:bg-blue-100">+ Add</button>
            </div>
            {showMemberForm && (
              <form onSubmit={addMember} className="flex gap-2 mb-4">
                <input name="name" placeholder="Name" className="border p-2 w-full rounded text-sm bg-gray-50" autoFocus />
                <button className="bg-blue-600 text-white px-4 rounded text-sm font-bold">Add</button>
              </form>
            )}
            <ul className="space-y-3">
              {data.group.members.map(m => (
                <li key={m._id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm ${m.avatarColor || "bg-gray-500"}`}>{getInitials(m.name)}</div>
                    <span className="font-medium text-gray-700">{m.name} {m.isAdmin && "(You)"}</span>
                  </div>
                  {!m.isAdmin && <button onClick={()=>removeMember(m._id)} className="text-gray-300 hover:text-red-500 font-bold px-2">×</button>}
                </li>
              ))}
            </ul>
          </div>

          {/* Expense Form */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
            <h3 className="font-bold mb-4 text-gray-800">{editingExpense ? "Edit Expense" : "Add Expense"}</h3>
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <input className="border p-2 w-full rounded bg-gray-50 focus:bg-white transition" placeholder="Description (e.g. Dinner)" value={desc} onChange={e=>setDesc(e.target.value)} required />
              <div className="flex gap-2">
                <input className="border p-2 w-full rounded bg-gray-50 focus:bg-white" type="number" placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)} required />
                <select className="border p-2 rounded w-1/2 bg-gray-50" value={payer} onChange={e=>setPayer(e.target.value)} disabled={!!editingExpense}>
                   {data.group.members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>
              
              {!editingExpense && (
                <>
                  <div className="flex gap-2">
                    {['EQUAL', 'EXACT', 'PERCENT'].map(t => (
                      <button type="button" key={t} onClick={()=>setSplitType(t)} className={`flex-1 py-1 text-xs font-bold rounded border ${splitType===t?'bg-gray-800 text-white':'bg-gray-100 text-gray-600'}`}>{t}</button>
                    ))}
                  </div>
                  {splitType !== 'EQUAL' && (
                    <div className="bg-gray-50 p-3 rounded space-y-2 border">
                      {data.group.members.map(m => (
                        <div key={m._id} className="flex justify-between text-sm items-center">
                          <span>{m.name}</span>
                          <input className="w-20 border p-1 rounded text-right" placeholder="0" onChange={e => setCustomSplits({...customSplits, [m._id]: e.target.value})} />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              
              <div className="flex gap-2 pt-2">
                 <button className="bg-green-600 hover:bg-green-700 text-white w-full py-2 rounded font-bold shadow-sm transition">{editingExpense ? "Update Expense" : "Add Expense"}</button>
                 {editingExpense && <button type="button" onClick={()=>{setEditingExpense(null); setDesc(""); setAmount("");}} className="bg-gray-200 text-gray-700 w-1/3 rounded font-bold">Cancel</button>}
              </div>
            </form>
          </div>
        </div>

        {/* MIDDLE & RIGHT: Dashboard & History */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* REQUIREMENT 6: VISUALIZATION - SPENDING SHARES */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-bold text-gray-700 mb-4">Spending Contributions (Shares)</h3>
            <div className="space-y-3">
              {data.group.members.map(m => {
                const paid = contributions[m._id] || 0;
                const percent = totalGroupSpend > 0 ? (paid / totalGroupSpend) * 100 : 0;
                return (
                  <div key={m._id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold">{m.name}</span>
                      <span className="text-gray-500">{percent.toFixed(1)}% (₹{paid})</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full ${m.avatarColor?.replace('bg-', 'bg-') || 'bg-blue-500'}`} style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* REQUIREMENT 6: BALANCE TABLE (DIRECTIONAL) */}
            <div className="bg-white p-6 rounded-lg shadow border-t-4 border-blue-400">
              <h3 className="font-bold text-gray-800 mb-4">Settlement Plan (Who Owes Whom)</h3>
              {data.settlements.length === 0 ? <p className="text-gray-400 text-center italic py-4">Everyone is settled up! 🎉</p> : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b">
                      <th className="text-left pb-2">Debtor</th>
                      <th className="text-center pb-2">→</th>
                      <th className="text-right pb-2">Creditor</th>
                      <th className="text-right pb-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.settlements.map((s, i) => {
                       const fromName = data.group.members.find(m => m._id === s.from)?.name;
                       const toName = data.group.members.find(m => m._id === s.to)?.name;
                       return (
                         <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                           <td className="py-2 font-bold text-red-600">{fromName}</td>
                           <td className="py-2 text-center text-gray-400">pays</td>
                           <td className="py-2 text-right font-bold text-green-600">{toName}</td>
                           <td className="py-2 text-right font-bold">₹{s.amount}</td>
                         </tr>
                       )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* NET BALANCES */}
            <div className="bg-white p-6 rounded-lg shadow border-t-4 border-gray-400">
               <h3 className="font-bold text-gray-800 mb-4">Net Balances</h3>
               <ul className="space-y-3">
                 {data.group.members.map(m => {
                   const bal = data.balances[m._id] || 0;
                   return (
                     <li key={m._id} className="flex justify-between items-center text-sm pb-2 border-b last:border-0 last:pb-0">
                       <span className="font-medium">{m.name}</span>
                       <span className={`px-2 py-1 rounded text-xs font-bold ${bal >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                         {bal >= 0 ? `gets ₹${bal.toFixed(0)}` : `owes ₹${Math.abs(bal).toFixed(0)}`}
                       </span>
                     </li>
                   )
                 })}
               </ul>
            </div>
          </div>

          {/* REQUIREMENT 7: FILTERS & TRANSACTION LEDGER */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 bg-gray-50 border-b">
              <h3 className="font-bold text-gray-700 mb-3">Transaction History</h3>
              <div className="flex flex-wrap gap-2">
                 <input placeholder="Search expenses..." className="border p-2 rounded text-sm flex-1" onChange={e => setSearch(e.target.value)} />
                 <select className="border p-2 rounded text-sm bg-white" onChange={e => setFilterUser(e.target.value)}>
                   <option value="ALL">All Participants</option>
                   {data.group.members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                 </select>
                 <input type="date" className="border p-2 rounded text-sm bg-white" onChange={e => setFilterDate(e.target.value)} />
                 <input type="number" placeholder="Min Amount" className="border p-2 rounded text-sm w-28" onChange={e => setFilterMinAmount(e.target.value)} />
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {filteredExpenses.length === 0 ? <p className="text-center py-8 text-gray-400">No transactions found.</p> : filteredExpenses.map(exp => (
                <div key={exp._id} className="p-4 border-b hover:bg-gray-50 flex justify-between items-center group transition">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 text-blue-600 font-bold px-3 py-2 rounded text-xs uppercase text-center w-16">
                       {new Date(exp.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{exp.description}</p>
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold text-gray-700">{exp.payerName}</span> paid <span className="font-bold">₹{exp.amount}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-700 text-lg">₹{exp.amount}</span>
                    <button onClick={()=>startEditExpense(exp)} className="text-blue-400 hover:text-blue-600 px-2 font-semibold text-sm">Edit</button>
                    <button onClick={()=>deleteExpense(exp._id)} className="text-gray-300 hover:text-red-500 font-bold px-2 text-xl">×</button>
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
