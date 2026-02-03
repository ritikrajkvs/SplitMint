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
  
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const [groupName, setGroupName] = useState("");
  
  // Expense Form
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState(""); 
  const [category, setCategory] = useState("General");
  const [splitType, setSplitType] = useState("EQUAL");
  const [customSplits, setCustomSplits] = useState({});

  // 🤖 AI State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [highlightAdd, setHighlightAdd] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterUser, setFilterUser] = useState("ALL");
  const [filterMinAmount, setFilterMinAmount] = useState("");
  
  // Date Range State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const getInitials = (name) => name ? name.charAt(0).toUpperCase() : "?";

  const fetchData = async () => {
    try {
      const res = await api.get(`/api/groups/${id}`);
      setData(res.data);
      setGroupName(res.data.group.name);
      // Only set default payer if not already set (prevents overwriting during edits)
      if(!payer && res.data.group.members.length > 0) setPayer(res.data.group.members[0]._id);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  // --- 🤖 MINTSENSE AI ACTION ---
  const handleAiParse = async (e) => {
    e.preventDefault();
    if(!aiPrompt) return;
    setAiLoading(true);
    try {
      const res = await api.post(`/api/groups/${id}/mintsense`, { text: aiPrompt });
      
      // FIX: Force "Add Expense" mode and reset splits
      setEditingExpense(null); 
      setSplitType("EQUAL");
      setCustomSplits({});

      // Populate form with AI results
      setDesc(res.data.description);
      setAmount(res.data.amount);
      setPayer(res.data.payer);
      setCategory(res.data.category);
      setAiPrompt(""); 
      
      const formElement = document.getElementById("expenseForm");
      if(formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      setHighlightAdd(true);
      setTimeout(() => setHighlightAdd(false), 3000);

    } catch (err) { alert("AI could not understand that. Try: 'Pizza 500 by Alice'"); }
    finally { setAiLoading(false); }
  };

  // --- ACTIONS ---
  const updateGroupName = async () => { try { await api.put(`/api/groups/${id}`, { name: groupName }); setEditingGroup(false); fetchData(); } catch (err) { alert("Failed"); } };
  const addMember = async (e) => { e.preventDefault(); try { await api.post(`/api/groups/${id}/members`, { name: e.target.name.value }); setShowMemberForm(false); fetchData(); } catch (err) { alert(err.response?.data?.error); } };
  const removeMember = async (mid) => { if(window.confirm("Remove member?")) { try { await api.delete(`/api/groups/${id}/members/${mid}`); fetchData(); } catch(e) { alert(e.response?.data?.error); } } };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        // FIX: Included 'payer' in the update payload
        await api.put(`/api/groups/expenses/${editingExpense}`, { 
          description: desc, 
          amount: parseFloat(amount), 
          category,
          payer 
        });
        setEditingExpense(null);
      } else {
        const splitsArray = Object.keys(customSplits).map(uid => ({ user: uid, value: customSplits[uid] }));
        await api.post(`/api/groups/${id}/expenses`, { description: desc, amount: parseFloat(amount), splitType, splits: splitsArray, payer, category });
      }
      setDesc(""); setAmount(""); setCustomSplits({}); setCategory("General"); setHighlightAdd(false);
      fetchData();
    } catch (err) { alert(err.response?.data?.error); }
  };

  const startEditExpense = (exp) => {
    setEditingExpense(exp._id); 
    setDesc(exp.description); 
    setAmount(exp.amount); 
    setCategory(exp.category || "General");
    // FIX: Set the payer state to the expense's current payer
    setPayer(exp.payer); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteExpense = async (eid) => { if(window.confirm("Delete?")) { await api.delete(`/api/groups/expenses/${eid}`); fetchData(); } };
  const deleteGroup = async () => { if(window.confirm("Delete Group?")) { await api.delete(`/api/groups/${id}`); navigate('/'); } };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">Loading group details...</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">Group Not Found</div>;

  const myMemberId = data.group.members.find(m => m.isAdmin)?._id || data.group.members[0]?._id;
  const myBalance = data.balances[myMemberId] || 0;
  const totalGroupSpend = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  const contributions = {};
  data.group.members.forEach(m => contributions[m._id] = 0);
  data.expenses.forEach(e => { if (contributions[e.payer] !== undefined) contributions[e.payer] += e.amount; });

  const filteredExpenses = data.expenses.filter(e => {
    const matchesText = e.description.toLowerCase().includes(search.toLowerCase());
    const matchesUser = filterUser === "ALL" || e.payer === filterUser;
    const matchesAmount = !filterMinAmount || e.amount >= parseFloat(filterMinAmount);
    
    const expDate = new Date(e.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if(start) start.setHours(0,0,0,0);
    if(end) end.setHours(23,59,59,999);

    const matchesDate = (!start || expDate >= start) && (!end || expDate <= end);

    return matchesText && matchesUser && matchesDate && matchesAmount;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* --- HEADER --- */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
              {editingGroup ? (
                <div className="flex gap-2 items-center">
                  <input 
                    className="border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md text-xl font-bold text-slate-800" 
                    value={groupName} 
                    onChange={e=>setGroupName(e.target.value)}
                    autoFocus
                  />
                  <button onClick={updateGroupName} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors">Save</button>
                </div>
              ) : (
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                  {data.group.name} 
                  <button onClick={()=>setEditingGroup(true)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                </h1>
              )}
            </div>
            <p className="text-slate-500 mt-2 text-sm flex items-center gap-2">
              <span className="bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 font-medium">{data.group.members.length} Members</span>
              <span>•</span>
              <span>Created {new Date(data.group.createdAt).toLocaleDateString()}</span>
            </p>
          </div>
          <button 
            onClick={deleteGroup} 
            className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-semibold border border-transparent hover:border-red-100 transition-all"
          >
            Delete Group
          </button>
        </div>

        {/* --- STATS CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider relative z-10">Total Spend</p>
            <p className="text-4xl font-extrabold text-slate-800 mt-2 relative z-10">₹{totalGroupSpend.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider relative z-10">You Paid</p>
            <p className="text-4xl font-extrabold text-slate-800 mt-2 relative z-10">₹{contributions[myMemberId]?.toLocaleString() || 0}</p>
          </div>
          <div className={`p-6 rounded-2xl shadow-sm border relative overflow-hidden ${myBalance >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
            <p className={`text-sm font-semibold uppercase tracking-wider ${myBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>Your Position</p>
            <p className={`text-4xl font-extrabold mt-2 ${myBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {myBalance >= 0 ? `+₹${myBalance.toFixed(2)}` : `-₹${Math.abs(myBalance).toFixed(2)}`}
            </p>
            <p className="text-xs mt-1 opacity-75 font-medium">{myBalance >= 0 ? "You are owed" : "You owe"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* --- LEFT COLUMN (4/12) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* AI CARD */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-white opacity-10 rounded-full blur-xl"></div>
              <h3 className="font-bold text-lg flex items-center gap-2 mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                MintSense AI
              </h3>
              <p className="text-indigo-100 text-sm mb-4">Type naturally like "Pizza 500 by Alice" to auto-fill details.</p>
              <form onSubmit={handleAiParse} className="relative">
                <input 
                  className="w-full pl-4 pr-12 py-3 rounded-xl bg-white/10 border border-white/20 placeholder-indigo-200 text-white text-sm focus:outline-none focus:bg-white/20 transition-all" 
                  placeholder="Describe expense..." 
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                />
                <button className="absolute right-1 top-1 bottom-1 bg-white text-indigo-600 px-3 rounded-lg font-bold text-xs hover:bg-indigo-50 transition-colors shadow-sm">
                  {aiLoading ? "..." : "GO"}
                </button>
              </form>
            </div>

            {/* MEMBERS LIST */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 text-xl">Members</h3>
                <button onClick={() => setShowMemberForm(!showMemberForm)} className="text-indigo-600 text-sm font-semibold hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                  <span className="text-lg">+</span> Add
                </button>
              </div>
              
              {showMemberForm && (
                <form onSubmit={addMember} className="flex gap-2 mb-6 animate-fadeIn">
                  <input 
                    name="name" 
                    placeholder="Enter name" 
                    className="flex-1 border-slate-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500" 
                    autoFocus 
                  />
                  <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Save</button>
                </form>
              )}

              <ul className="space-y-4">
                {data.group.members.map(m => (
                  <li key={m._id} className="flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white ${m.avatarColor || "bg-slate-400"}`}>
                        {getInitials(m.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">{m.name}</p>
                        {m.isAdmin && <p className="text-xs text-slate-400">Admin</p>}
                      </div>
                    </div>
                    {!m.isAdmin && (
                      <button onClick={()=>removeMember(m._id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* EXPENSE FORM */}
            <div id="expenseForm" className={`bg-white p-6 rounded-2xl shadow-sm border transition-all duration-300 ${highlightAdd ? "border-green-400 ring-4 ring-green-50 shadow-xl" : "border-slate-100"}`}>
              <h3 className="font-bold text-slate-800 text-xl mb-6 flex items-center gap-2">
                <span className="bg-green-100 text-green-700 p-1.5 rounded-lg text-sm">₹</span>
                {editingExpense ? "Edit Expense" : "Add Expense"}
              </h3>
              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Description</label>
                  <input 
                    className="w-full border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm py-2.5" 
                    placeholder="e.g. Friday Dinner" 
                    value={desc} 
                    onChange={e=>setDesc(e.target.value)} 
                    required 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Amount</label>
                    <input 
                      type="number" 
                      className="w-full border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm py-2.5" 
                      placeholder="0.00" 
                      value={amount} 
                      onChange={e=>setAmount(e.target.value)} 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Paid By</label>
                    <select 
                      className="w-full border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm py-2.5" 
                      value={payer} 
                      onChange={e=>setPayer(e.target.value)} 
                      // FIX: Removed 'disabled' so you can change payer during edit
                    >
                      {data.group.members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                   <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Category</label>
                   <div className="grid grid-cols-3 gap-2">
                      {["General", "Food", "Travel", "Entertainment", "Utilities", "Shopping"].map(c => (
                        <button 
                          type="button"
                          key={c}
                          onClick={() => setCategory(c)}
                          className={`text-xs py-2 rounded-lg border font-medium transition-all ${category === c ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                        >
                          {c}
                        </button>
                      ))}
                   </div>
                </div>

                {!editingExpense && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex gap-2 mb-3">
                      {['EQUAL', 'EXACT', 'PERCENT'].map(t => (
                        <button type="button" key={t} onClick={()=>setSplitType(t)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${splitType===t?'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200':'text-slate-400 hover:text-slate-600'}`}>{t}</button>
                      ))}
                    </div>
                    {splitType !== 'EQUAL' && (
                      <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                        {data.group.members.map(m => (
                          <div key={m._id} className="flex justify-between items-center text-sm">
                            <span className="text-slate-600 truncate mr-2">{m.name}</span>
                            <input className="w-20 border-slate-200 rounded p-1 text-right text-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="0" onChange={e => setCustomSplits({...customSplits, [m._id]: e.target.value})} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-3 pt-2">
                   <button className={`flex-1 py-3 rounded-xl font-bold text-white shadow-md transition-all active:scale-95 ${highlightAdd ? "bg-green-500 hover:bg-green-600" : "bg-indigo-600 hover:bg-indigo-700"}`}>
                     {editingExpense ? "Update Expense" : (highlightAdd ? "Confirm & Add" : "Add Expense")}
                   </button>
                   {editingExpense && (
                     <button type="button" onClick={()=>{setEditingExpense(null); setDesc(""); setAmount(""); setCategory("General");}} className="px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                       Cancel
                     </button>
                   )}
                </div>
              </form>
            </div>
          </div>

          {/* --- RIGHT COLUMN (8/12) --- */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* SPENDING & SETTLEMENTS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* SPENDING SHARES */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-4 text-xl">Spending Shares</h3>
                <div className="space-y-4">
                  {data.group.members.map(m => {
                    const paid = contributions[m._id] || 0;
                    const percent = totalGroupSpend > 0 ? (paid / totalGroupSpend) * 100 : 0;
                    return (
                      <div key={m._id}>
                        <div className="flex justify-between text-xs mb-1.5 font-medium">
                          <span className="text-slate-700">{m.name}</span>
                          <span className="text-slate-500">{percent.toFixed(1)}% (₹{paid})</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div className={`h-2 rounded-full transition-all duration-500 ${m.avatarColor?.replace('bg-', 'bg-') || 'bg-blue-500'}`} style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* SETTLEMENT PLAN */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                <h3 className="font-bold text-slate-800 mb-4 text-xl">How to Settle Up</h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar max-h-60">
                  {data.settlements.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                      <svg className="w-10 h-10 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <p className="text-sm">Everyone is settled up!</p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {data.settlements.map((s, i) => {
                         const fromName = data.group.members.find(m => m._id === s.from)?.name;
                         const toName = data.group.members.find(m => m._id === s.to)?.name;
                         return (
                           <li key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm">
                             <span className="font-bold text-slate-700">{fromName}</span>
                             <div className="flex flex-col items-center px-2">
                               <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pays</span>
                               <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                             </div>
                             <div className="text-right">
                               <span className="font-bold text-slate-700 block">{toName}</span>
                               <span className="text-green-600 font-bold">₹{s.amount}</span>
                             </div>
                           </li>
                         )
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* HISTORY SECTION */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h3 className="font-bold text-slate-800 text-xl">Transaction History</h3>
                  <div className="flex items-center gap-2">
                     <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                       {filteredExpenses.length} Records
                     </span>
                  </div>
                </div>

                {/* FILTERS TOOLBAR */}
                <div className="flex flex-col gap-4">
                  {/* Row 1: Search and User Filter */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
                      <div className="relative">
                        <svg className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input
                          placeholder="Search transactions..."
                          className="w-full pl-10 pr-4 py-2 border-slate-200 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                          onChange={e => setSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Filter by Member</label>
                      <select
                        className="w-full border-slate-200 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 py-2"
                        onChange={e => setFilterUser(e.target.value)}
                      >
                        <option value="ALL">All Members</option>
                        {data.group.members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Date Range and Amount Filter */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
                      <input
                        type="date"
                        className="w-full border-slate-200 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 py-2"
                        onChange={e => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
                      <input
                        type="date"
                        className="w-full border-slate-200 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 py-2"
                        onChange={e => setEndDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Min Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400">₹</span>
                        <input
                          type="number"
                          placeholder="0"
                          className="w-full pl-8 pr-4 py-2 border-slate-200 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                          onChange={e => setFilterMinAmount(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-h-[500px] overflow-y-auto">
                {filteredExpenses.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="inline-block p-4 rounded-full bg-slate-50 mb-3">
                      <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                    <p className="text-slate-400 font-medium">No transactions found.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-10 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Description</th>
                        <th className="px-6 py-3">Payer</th>
                        <th className="px-6 py-3 text-right">Amount</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredExpenses.map(exp => (
                        <tr key={exp._id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-slate-700">
                              {new Date(exp.date).toLocaleDateString(undefined, {day: 'numeric', month: 'short'})}
                            </div>
                            <div className="text-xs text-slate-400">
                              {new Date(exp.date).getFullYear()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-slate-900">{exp.description}</div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 mt-1">
                              {exp.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                               <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold mr-2">
                                 {getInitials(exp.payerName)}
                               </div>
                               <span className="text-sm text-slate-600">{exp.payerName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-bold text-slate-800">₹{exp.amount.toLocaleString()}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={()=>startEditExpense(exp)} className="text-indigo-600 hover:text-indigo-900 font-semibold">Edit</button>
                              <button onClick={()=>deleteExpense(exp._id)} className="text-red-400 hover:text-red-600 font-semibold">Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
