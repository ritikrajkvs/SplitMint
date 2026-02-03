import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { AuthContext } from "../context/AuthContext";

// --- FIX: Force Tailwind to keep these colors ---
const KEEP_COLORS = [
  "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500", "bg-lime-500",
  "bg-green-500", "bg-emerald-500", "bg-teal-500", "bg-cyan-500", "bg-sky-500",
  "bg-blue-500", "bg-indigo-500", "bg-violet-500", "bg-purple-500", "bg-fuchsia-500",
  "bg-pink-500", "bg-rose-500", "bg-gray-500"
];

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editName, setEditName] = useState("");

  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState(""); 
  const [splitType, setSplitType] = useState("EQUAL");
  const [customSplits, setCustomSplits] = useState({});
  const [search, setSearch] = useState("");

  const getInitials = (name) => name ? name.charAt(0).toUpperCase() : "?";

  const fetchData = async () => {
    try {
      const res = await api.get(`/api/groups/${id}`);
      setData(res.data);
      if(!payer && res.data.group.members.length > 0) {
        setPayer(res.data.group.members[0]._id);
      }
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const addMember = async (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    try {
      await api.post(`/api/groups/${id}/members`, { name });
      setShowMemberForm(false);
      e.target.reset();
      fetchData();
    } catch (err) { alert(err.response?.data?.error); }
  };

  const updateMemberName = async (memberId) => {
    try {
      await api.put(`/api/groups/${id}/members/${memberId}`, { name: editName });
      setEditingMember(null);
      fetchData();
    } catch (err) { alert("Failed"); }
  };

  const removeMember = async (memberId) => {
    if(!window.confirm("Remove this person?")) return;
    try {
      await api.delete(`/api/groups/${id}/members/${memberId}`);
      fetchData();
    } catch (err) { alert(err.response?.data?.error); }
  };

  const addExpense = async (e) => {
    e.preventDefault();
    try {
      const splitsArray = Object.keys(customSplits).map(uid => ({ user: uid, value: customSplits[uid] }));
      await api.post(`/api/groups/${id}/expenses`, { 
        description: desc, amount: parseFloat(amount), splitType, splits: splitsArray, payer 
      });
      setDesc(""); setAmount(""); setCustomSplits({});
      fetchData();
    } catch (err) { alert(err.response?.data?.error); }
  };

  const deleteExpense = async (expId) => {
    if(window.confirm("Delete transaction?")) {
      await api.delete(`/api/groups/expenses/${expId}`);
      fetchData();
    }
  };

  const deleteGroup = async () => {
    if(window.confirm("Delete Group Permanently?")) {
      await api.delete(`/api/groups/${id}`);
      navigate('/');
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!data) return <div className="p-10 text-center">Group Not Found</div>;

  const filteredExpenses = data.expenses.filter(e => e.description.toLowerCase().includes(search.toLowerCase()));
  const myMemberId = data.group.members.find(m => m.isAdmin)?._id || data.group.members[0]?._id;
  const myBalance = data.balances[myMemberId] || 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{data.group.name}</h1>
          <p className="text-gray-500">{data.group.members.length}/4 People</p>
        </div>
        <div className="flex gap-4 items-center">
           <div className={`px-4 py-2 rounded text-white font-bold ${myBalance>=0?'bg-green-500':'bg-red-500'}`}>
             You {myBalance>=0?'get back':'owe'} ₹{Math.abs(myBalance).toFixed(0)}
           </div>
           <button onClick={deleteGroup} className="text-red-500 text-sm hover:underline">Delete Group</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT */}
        <div className="space-y-6">
          <div className="bg-white p-4 rounded shadow border">
            <div className="flex justify-between mb-2">
              <h3 className="font-bold">People</h3>
              <button onClick={() => setShowMemberForm(!showMemberForm)} className="text-blue-600 text-sm font-bold">+ Add Person</button>
            </div>
            {showMemberForm && (
              <form onSubmit={addMember} className="flex gap-2 mb-4">
                <input name="name" placeholder="Name" className="border p-1 w-full rounded text-sm" autoFocus />
                <button className="bg-blue-600 text-white px-3 rounded text-sm">Add</button>
              </form>
            )}
            <ul className="space-y-2">
              {data.group.members.map(m => (
                <li key={m._id} className="flex justify-between items-center text-sm group">
                  {editingMember === m._id ? (
                    <div className="flex gap-1 w-full">
                      <input className="border p-1 w-full" value={editName} onChange={e=>setEditName(e.target.value)} />
                      <button onClick={()=>updateMemberName(m._id)} className="text-green-600">✓</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        {/* Avatar with Initials & Robust Color */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm ${m.avatarColor || "bg-gray-500"}`}>
                          {getInitials(m.name)}
                        </div>
                        <span>{m.name}</span>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={()=>{setEditingMember(m._id); setEditName(m.name);}} className="text-blue-400">✎</button>
                        {!m.isAdmin && <button onClick={()=>removeMember(m._id)} className="text-red-400">×</button>}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white p-6 rounded shadow border">
            <h3 className="font-bold mb-4">Add Expense</h3>
            <form onSubmit={addExpense} className="space-y-3">
              <input className="border p-2 w-full rounded" placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)} required />
              <div className="flex gap-2">
                <input className="border p-2 w-full rounded" type="number" placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)} required />
                <select className="border p-2 rounded w-1/2" value={payer} onChange={e=>setPayer(e.target.value)}>
                   {data.group.members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>
              <div className="flex gap-1 text-xs">
                {['EQUAL', 'EXACT', 'PERCENT'].map(t => (
                  <button type="button" key={t} onClick={()=>setSplitType(t)} 
                    className={`px-2 py-1 border rounded ${splitType===t?'bg-gray-800 text-white':'bg-gray-100'}`}>{t}</button>
                ))}
              </div>
              {splitType !== 'EQUAL' && (
                <div className="bg-gray-50 p-2 rounded space-y-2">
                  {data.group.members.map(m => (
                    <div key={m._id} className="flex justify-between text-sm items-center">
                      <span>{m.name}</span>
                      <input className="w-16 border p-1 rounded text-right" placeholder="0"
                        onChange={e => setCustomSplits({...customSplits, [m._id]: e.target.value})} />
                    </div>
                  ))}
                </div>
              )}
              <button className="bg-green-600 text-white w-full py-2 rounded font-bold">Save Expense</button>
            </form>
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded border border-blue-100">
              <h3 className="font-bold text-blue-800 mb-2">Settlement Plan</h3>
              {data.settlements.length === 0 ? <p className="text-gray-500 text-sm">All settled.</p> : (
                <ul className="space-y-2 text-sm">
                  {data.settlements.map((s, i) => {
                     const fromName = data.group.members.find(m => m._id === s.from)?.name;
                     const toName = data.group.members.find(m => m._id === s.to)?.name;
                     return (
                       <li key={i} className="flex gap-2 border-b border-blue-100 pb-1">
                         <span className="font-bold text-red-600">{fromName}</span> pays
                         <span className="font-bold text-green-600">{toName}</span>
                         <span className="font-bold ml-auto">₹{s.amount}</span>
                       </li>
                     )
                  })}
                </ul>
              )}
            </div>
            <div className="bg-white p-4 rounded border shadow">
               <h3 className="font-bold mb-2">Balances</h3>
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
          <div className="bg-white rounded shadow border">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold">Transactions</h3>
              <input placeholder="Search..." className="border p-1 rounded text-sm w-40"
                onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="max-h-96 overflow-y-auto">
              {filteredExpenses.map(exp => (
                <div key={exp._id} className="p-4 border-b hover:bg-gray-50 flex justify-between items-center group">
                  <div>
                    <p className="font-bold text-gray-800">{exp.description}</p>
                    <p className="text-xs text-gray-500">
                      <span className="font-bold">{exp.payerName}</span> paid ₹{exp.amount} • {new Date(exp.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-gray-700">₹{exp.amount}</span>
                    <button onClick={()=>deleteExpense(exp._id)} className="text-gray-300 hover:text-red-500 font-bold">Delete</button>
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
