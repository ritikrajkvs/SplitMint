import { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import { AuthContext } from "../context/AuthContext";

export default function GroupDetail() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Forms State
  const [memberEmail, setMemberEmail] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  // 1. Fetch Data
  const fetchData = async () => {
    try {
      const res = await api.get(`/api/groups/${id}`);
      setGroup(res.data.group);
      setExpenses(res.data.expenses);
      calculateBalances(res.data.group.members, res.data.expenses);
    } catch (err) {
      setError("Failed to load group. " + (err.response?.data?.error || ""));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  // 2. Calculate Balances (Who owes what)
  const calculateBalances = (members, expenseList) => {
    const bal = {};
    members.forEach(m => bal[m._id] = 0);

    expenseList.forEach(exp => {
      // Payer gets positive balance (they paid)
      const payerId = exp.payer._id || exp.payer;
      if (bal[payerId] !== undefined) bal[payerId] += exp.amount;

      // Splitters get negative balance (they owe)
      exp.splits.forEach(split => {
        if (bal[split.user] !== undefined) bal[split.user] -= split.amount;
      });
    });
    setBalances(bal);
  };

  // 3. Actions
  const addMember = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/groups/${id}/members`, { email: memberEmail });
      setMemberEmail("");
      fetchData(); // Refresh data
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add member");
    }
  };

  const addExpense = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/groups/${id}/expenses`, { 
        description: expenseDesc, 
        amount: parseFloat(expenseAmount) 
      });
      setExpenseDesc("");
      setExpenseAmount("");
      fetchData(); // Refresh data
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add expense");
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold">{group?.name}</h1>
        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
          {group?.members.length} / 4 Members
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Actions */}
        <div className="space-y-6">
          {/* Add Member Card */}
          <div className="bg-white p-6 rounded shadow border">
            <h3 className="font-bold mb-4">Add Member</h3>
            <form onSubmit={addMember} className="flex gap-2">
              <input 
                className="border p-2 rounded w-full text-sm"
                placeholder="User Email"
                value={memberEmail}
                onChange={e => setMemberEmail(e.target.value)}
              />
              <button className="bg-blue-600 text-white px-3 rounded text-sm hover:bg-blue-700">Add</button>
            </form>
            <p className="text-xs text-gray-500 mt-2">Maximum 4 members allowed.</p>
          </div>

          {/* Add Expense Card */}
          <div className="bg-white p-6 rounded shadow border">
            <h3 className="font-bold mb-4">Add Expense</h3>
            <form onSubmit={addExpense} className="space-y-3">
              <input 
                className="border p-2 rounded w-full text-sm"
                placeholder="Description (e.g., Dinner)"
                value={expenseDesc}
                onChange={e => setExpenseDesc(e.target.value)}
              />
              <input 
                className="border p-2 rounded w-full text-sm"
                type="number"
                placeholder="Amount (₹)"
                value={expenseAmount}
                onChange={e => setExpenseAmount(e.target.value)}
              />
              <button className="bg-green-600 text-white w-full py-2 rounded text-sm font-bold hover:bg-green-700">
                Split Equally & Save
              </button>
            </form>
          </div>

          {/* Balances Card */}
          <div className="bg-white p-6 rounded shadow border">
            <h3 className="font-bold mb-4">Balances</h3>
            <ul className="space-y-2">
              {group?.members.map(m => {
                const bal = balances[m._id] || 0;
                return (
                  <li key={m._id} className="flex justify-between items-center text-sm">
                    <span>{m.name}</span>
                    <span className={bal >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                      {bal >= 0 ? `Gets ₹${bal.toFixed(0)}` : `Owes ₹${Math.abs(bal).toFixed(0)}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* RIGHT COLUMN: Expense List */}
        <div className="md:col-span-2">
          <h2 className="text-xl font-bold mb-4">Transactions</h2>
          <div className="bg-white rounded shadow border overflow-hidden">
            {expenses.length === 0 ? (
              <p className="p-8 text-center text-gray-500">No expenses yet.</p>
            ) : (
              expenses.map(exp => (
                <div key={exp._id} className="p-4 border-b last:border-0 hover:bg-gray-50 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{exp.description}</p>
                    <p className="text-xs text-gray-500">
                      Paid by <span className="font-bold">{exp.payer?.name}</span> • {new Date(exp.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">₹{exp.amount}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
