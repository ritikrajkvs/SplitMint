import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { AuthContext } from "../context/AuthContext";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Modern Color Palette for Charts
const CHART_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#22c55e", "#14b8a6"];

export default function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [chartMode, setChartMode] = useState("MEMBER");
  const [groupName, setGroupName] = useState("");
  
  // Form State
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState(""); 
  const [category, setCategory] = useState("General");
  const [splitType, setSplitType] = useState("EQUAL");
  const [customSplits, setCustomSplits] = useState({});

  // AI & Search State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [highlightAdd, setHighlightAdd] = useState(false);
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
  const handleAiParse = async (e) => {
    e.preventDefault();
    if(!aiPrompt) return;
    setAiLoading(true);
    try {
      const res = await api.post(`/api/groups/${id}/mintsense`, { text: aiPrompt });
      setDesc(res.data.description);
      setAmount(res.data.amount);
      setPayer(res.data.payer);
      setCategory(res.data.category);
      setAiPrompt(""); 
      document.getElementById("expenseForm").scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightAdd(true);
      setTimeout(() => setHighlightAdd(false), 2000);
    } catch (err) { alert("AI couldn't understand. Try 'Dinner 200 by Alice'"); }
    finally { setAiLoading(false); }
  };

  const updateGroupName = async () => { try { await api.put(`/api/groups/${id}`, { name: groupName }); setEditingGroup(false); fetchData(); } catch (err) { alert("Failed"); } };
  const addMember = async (e) => { e.preventDefault(); try { await api.post(`/api/groups/${id}/members`, { name: e.target.name.value }); setShowMemberForm(false); fetchData(); } catch (err) { alert(err.response?.data?.error); } };
  const removeMember = async (mid) => { if(window.confirm("Remove?")) { try { await api.delete(`/api/groups/${id}/members/${mid}`); fetchData(); } catch(e) { alert(e.response?.data?.error); } } };
  
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { description: desc, amount: parseFloat(amount), category };
      if (editingExpense) {
        await api.put(`/api/groups/expenses/${editingExpense}`, payload);
        setEditingExpense(null);
      } else {
        const splitsArray = Object.keys(customSplits).map(uid => ({ user: uid, value: customSplits[uid] }));
        await api.post(`/api/groups/${id}/expenses`, { ...payload, splitType, splits: splitsArray, payer });
      }
      setDesc(""); setAmount(""); setCustomSplits({}); setCategory("General"); setHighlightAdd(false);
      fetchData();
    } catch (err) { alert(err.response?.data?.error); }
  };

  const startEditExpense = (exp) => { setEditingExpense(exp._id); setDesc(exp.description); setAmount(exp.amount); setCategory(exp.category || "General"); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const deleteExpense = async (eid) => { if(window.confirm("Delete?")) { await api.delete(`/api/groups/expenses/${eid}`); fetchData(); } };
  const deleteGroup = async () => { if(window.confirm("Delete Group?")) { await api.delete(`/api/groups/${id}`); navigate('/'); } };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-red-500">Group Not Found</div>;

  // --- CALCS ---
  const myMemberId = data.group.members.find(m => m.isAdmin)?._id || data.group.members[0]?._id;
  const myBalance = data.balances[myMemberId] || 0;
  const totalGroupSpend = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  
  const contributions = {};
  data.group.members.forEach(m => contributions[m._id] = 0);
  data.expenses.forEach(e => { if (contributions[e.payer] !== undefined) contributions[e.payer] += e.amount; });
  
  const memberChartData = data.group.members.map(m => ({ name: m.name, value: contributions[m._id] })).filter(d => d.value > 0);
  const categoryStats = {};
  data.expenses.forEach(e => { const cat = e.category || "General"; categoryStats[cat] = (categoryStats[cat] || 0) + e.amount; });
  const categoryChartData = Object.keys(categoryStats).map(k => ({ name: k, value: categoryStats[k] }));

  const filteredExpenses = data.expenses.filter(e => {
    const matchesText = e.description.toLowerCase().includes(search.toLowerCase());
    const matchesUser = filterUser === "ALL" || e.payer === filterUser;
    const matchesDate = !filterDate || e.date.startsWith(filterDate);
    const matchesAmount = !filterMinAmount || e.amount >= parseFloat(filterMinAmount);
    return matchesText && matchesUser && matchesDate && matchesAmount;
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800 pb-20">
      
      {/* 1. TOP NAVIGATION */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-indigo-600 transition">← Back</button>
            <div className="h-6 w-px bg-gray-300 hidden md:block"></div>
            {editingGroup ? (
              <div className="flex gap-2">
                <input className="border border-indigo-300 p-1 px-2 rounded text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500" value={groupName} onChange={e=>setGroupName(e.target.value)}/>
                <button onClick={updateGroupName} className="text-white bg-green-500 px-3 rounded font-bold hover:bg-green-600">✓</button>
              </div>
            ) : (
              <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 cursor-pointer hover:text-indigo-600 transition" onClick={()=>setEditingGroup(true)}>
                {data.group.name} 
                <span className="text-gray-300 text-sm font-normal">✎</span>
              </h1>
            )}
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right hidden md:block">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">My Balance</p>
              <p className={`text-xl font-bold ${myBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {myBalance >= 0 ? `+₹${myBalance.toFixed(0)}` : `-₹${Math.abs(myBalance).toFixed(0)}`}
              </p>
            </div>
            <button onClick={deleteGroup} className="text-rose-500 text-sm font-medium hover:bg-rose-50 px-3 py-2 rounded transition">Settings</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* 2. MINTSENSE AI COMMAND BAR */}
        <div className="mb-10 bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-600"></div>
          <div className="p-1 bg-gradient-to-r from-indigo-50 to-purple-50">
            <form onSubmit={handleAiParse} className="relative flex items-center">
              <div className="absolute left-4 text-indigo-500">✨</div>
              <input 
                className="w-full py-4 pl-12 pr-32 bg-transparent text-gray-800 placeholder-indigo-300 focus:outline-none text-lg font-medium" 
                placeholder="Ask MintSense: 'Lunch 450 paid by Bob'..." 
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
              />
              <button className="absolute right-2 bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md transition-all transform hover:scale-105">
                {aiLoading ? "Thinking..." : "Parse"}
              </button>
            </form>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* 3. LEFT SIDEBAR (Members & Form) - Span 4 */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Expense Input Form */}
            <div id="expenseForm" className={`bg-white p-6 rounded-2xl shadow-sm border transition-all duration-500 ${highlightAdd ? "border-indigo-400 ring-4 ring-indigo-50 shadow-xl" : "border-gray-200"}`}>
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-gray-800 text-lg">{editingExpense ? "Edit Transaction" : "Add Expense"}</h3>
                {highlightAdd && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold animate-pulse">Auto-Filled!</span>}
              </div>
              
              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
                  <input className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition outline-none" placeholder="What was it for?" value={desc} onChange={e=>setDesc(e.target.value)} required />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400">₹</span>
                      <input className="w-full p-3 pl-7 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono" type="number" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)} required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Paid By</label>
                    <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm" value={payer} onChange={e=>setPayer(e.target.value)} disabled={!!editingExpense}>
                      {data.group.members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Category</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {["General", "Food", "Travel", "Entertainment", "Utilities", "Shopping"].map(c => (
                      <button type="button" key={c} onClick={()=>setCategory(c)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${category===c ? "bg-indigo-600 text-white border-indigo-600 shadow-md" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {!editingExpense && (
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-gray-500 uppercase">Split Method</span>
                      <div className="flex bg-white rounded p-0.5 border border-gray-200 shadow-sm">
                        {['EQUAL', 'EXACT', 'PERCENT'].map(t => (
                          <button type="button" key={t} onClick={()=>setSplitType(t)} className={`px-2 py-1 text-[10px] font-bold rounded ${splitType===t?'bg-indigo-100 text-indigo-700':'text-gray-400 hover:text-gray-600'}`}>{t}</button>
                        ))}
                      </div>
                    </div>
                    {splitType !== 'EQUAL' && (
                      <div className="space-y-2 mt-2">
                        {data.group.members.map(m => (
                          <div key={m._id} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">{m.name}</span>
                            <input className="w-20 p-1 text-right border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none text-xs" placeholder="0" onChange={e => setCustomSplits({...customSplits, [m._id]: e.target.value})} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button className={`flex-1 py-3 rounded-xl font-bold shadow-lg transition-all transform active:scale-95 ${highlightAdd ? "bg-emerald-500 hover:bg-emerald-600 text-white ring-4 ring-emerald-200" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}>
                    {editingExpense ? "Update Transaction" : "Save Expense"}
                  </button>
                  {editingExpense && <button type="button" onClick={()=>{setEditingExpense(null); setDesc(""); setAmount("");}} className="px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50">Cancel</button>}
                </div>
              </form>
            </div>

            {/* Members Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">Members ({data.group.members.length})</h3>
                <button onClick={() => setShowMemberForm(!showMemberForm)} className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg text-xs font-bold transition">+ Add New</button>
              </div>
              
              {showMemberForm && (
                <form onSubmit={addMember} className="flex gap-2 mb-4 animate-fadeIn">
                  <input name="name" placeholder="Enter Name" className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" autoFocus />
                  <button className="bg-indigo-600 text-white px-4 rounded-lg text-sm font-bold shadow-sm">Add</button>
                </form>
              )}

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                {data.group.members.map(m => (
                  <div key={m._id} className="flex items-center justify-between group p-2 hover:bg-gray-50 rounded-lg transition">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${m.avatarColor || "bg-gray-400"}`}>{getInitials(m.name)}</div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{m.name} {m.isAdmin && <span className="text-[10px] text-gray-400 font-normal">(Admin)</span>}</p>
                      </div>
                    </div>
                    {!m.isAdmin && <button onClick={()=>removeMember(m._id)} className="text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition px-2">✕</button>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. MAIN CONTENT AREA (Analytics & Feed) - Span 8 */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* VISUALIZATION CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Chart Card */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-80 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800">Analytics</h3>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={()=>setChartMode("MEMBER")} className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${chartMode==="MEMBER" ? "bg-white shadow-sm text-indigo-600" : "text-gray-500"}`}>People</button>
                    <button onClick={()=>setChartMode("CATEGORY")} className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${chartMode==="CATEGORY" ? "bg-white shadow-sm text-indigo-600" : "text-gray-500"}`}>Category</button>
                  </div>
                </div>
                <div className="flex-1 w-full min-h-0">
                  {(chartMode === "MEMBER" ? memberChartData : categoryChartData).length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartMode === "MEMBER" ? memberChartData : categoryChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {(chartMode === "MEMBER" ? memberChartData : categoryChartData).map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend iconSize={8} wrapperStyle={{fontSize: '12px'}} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">No data available</div>}
                </div>
              </div>

              {/* Settlement Plan */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-80 flex flex-col">
                <h3 className="font-bold text-gray-800 mb-4">Settlement Plan</h3>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                  {data.settlements.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                      <span className="text-4xl mb-2">🎉</span>
                      <p className="text-sm">Everyone is settled up!</p>
                    </div>
                  ) : (
                    data.settlements.map((s, i) => {
                       const fromName = data.group.members.find(m => m._id === s.from)?.name;
                       const toName = data.group.members.find(m => m._id === s.to)?.name;
                       return (
                         <div key={i} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                           <div className="flex items-center gap-2">
                             <span className="font-bold text-rose-600 truncate max-w-[80px]">{fromName}</span>
                             <span className="text-gray-400 text-xs">pays</span>
                             <span className="font-bold text-emerald-600 truncate max-w-[80px]">{toName}</span>
                           </div>
                           <span className="font-mono font-bold text-gray-800 bg-white px-2 py-1 rounded shadow-sm">₹{s.amount}</span>
                         </div>
                       )
                    })
                  )}
                </div>
              </div>
            </div>

            {/* TRANSACTION FEED */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                <h3 className="font-bold text-gray-800">Transactions</h3>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                   <input placeholder="Search..." className="border border-gray-300 p-1.5 px-3 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-32" onChange={e => setSearch(e.target.value)} />
                   <select className="border border-gray-300 p-1.5 rounded-lg text-sm bg-white" onChange={e => setFilterUser(e.target.value)}>
                     <option value="ALL">All Users</option>
                     {data.group.members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                   </select>
                   <input type="number" placeholder="Min ₹" className="border border-gray-300 p-1.5 px-3 rounded-lg text-sm w-24" onChange={e => setFilterMinAmount(e.target.value)} />
                </div>
              </div>
              
              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {filteredExpenses.length === 0 ? <div className="p-10 text-center text-gray-400">No transactions match your filters.</div> : filteredExpenses.map(exp => (
                  <div key={exp._id} className="p-4 hover:bg-indigo-50/30 transition flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-100 h-12 w-12 rounded-xl flex flex-col items-center justify-center text-gray-500 border border-gray-200">
                         <span className="text-[10px] font-bold uppercase">{new Date(exp.date).toLocaleString('default', { month: 'short' })}</span>
                         <span className="text-lg font-bold leading-none">{new Date(exp.date).getDate()}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-800">{exp.description}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">{exp.category}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          <span className="font-semibold text-gray-700">{exp.payerName}</span> paid this
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-gray-900 text-lg">₹{exp.amount}</span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={()=>startEditExpense(exp)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg">✎</button>
                        <button onClick={()=>deleteExpense(exp._id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
