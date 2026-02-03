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

  const [editingGroup, setEditingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");

  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [payer, setPayer] = useState("");
  const [category, setCategory] = useState("General");

  const [search, setSearch] = useState("");
  const [filterUser, setFilterUser] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterMinAmount, setFilterMinAmount] = useState("");

  const fetchData = async () => {
    try {
      const res = await api.get(`/api/groups/${id}`);
      setData(res.data);
      setGroupName(res.data.group.name);
      if (!payer && res.data.group.members.length > 0)
        setPayer(res.data.group.members[0]._id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!data) return <div className="p-10 text-center">Group not found</div>;

  const filteredExpenses = data.expenses.filter(e => {
    const expenseDate = new Date(e.date);
    return (
      e.description.toLowerCase().includes(search.toLowerCase()) &&
      (filterUser === "ALL" || e.payer === filterUser) &&
      (!startDate || expenseDate >= new Date(startDate)) &&
      (!endDate || expenseDate <= new Date(endDate)) &&
      (!filterMinAmount || e.amount >= Number(filterMinAmount))
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* HEADER */}
        <div className="bg-white rounded-xl shadow p-6 flex justify-between items-center">
          {editingGroup ? (
            <div className="flex gap-3">
              <input
                className="border px-3 py-2 rounded-lg text-xl font-semibold"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
              />
              <button
                onClick={async () => {
                  await api.put(`/api/groups/${id}`, { name: groupName });
                  setEditingGroup(false);
                  fetchData();
                }}
                className="bg-green-600 text-white px-4 rounded-lg font-semibold"
              >
                Save
              </button>
            </div>
          ) : (
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              {data.group.name}
              <button
                onClick={() => setEditingGroup(true)}
                className="text-gray-400 hover:text-blue-500 text-lg"
              >
                ✎
              </button>
            </h1>
          )}
          <button
            onClick={async () => {
              if (window.confirm("Delete Group?")) {
                await api.delete(`/api/groups/${id}`);
                navigate("/");
              }
            }}
            className="text-red-600 font-semibold hover:bg-red-50 px-4 py-2 rounded-lg"
          >
            Delete Group
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Total Spend", value: data.expenses.reduce((s, e) => s + e.amount, 0) },
            { label: "Members", value: data.group.members.length },
            { label: "Transactions", value: data.expenses.length }
          ].map((s, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow">
              <p className="text-sm text-gray-500 font-semibold">{s.label}</p>
              <p className="text-3xl font-bold mt-2">₹{s.value}</p>
            </div>
          ))}
        </div>

        {/* HISTORY */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-5 border-b bg-gray-50">
            <h3 className="font-bold text-gray-800 mb-4">Transaction History</h3>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <input
                placeholder="Search..."
                className="border p-2 rounded-lg md:col-span-2"
                onChange={e => setSearch(e.target.value)}
              />

              <select
                className="border p-2 rounded-lg"
                onChange={e => setFilterUser(e.target.value)}
              >
                <option value="ALL">All Users</option>
                {data.group.members.map(m => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>

              <input
                type="date"
                className="border p-2 rounded-lg"
                onChange={e => setStartDate(e.target.value)}
              />

              <input
                type="date"
                className="border p-2 rounded-lg"
                onChange={e => setEndDate(e.target.value)}
              />

              <input
                type="number"
                placeholder="Min ₹"
                className="border p-2 rounded-lg"
                onChange={e => setFilterMinAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="divide-y max-h-[420px] overflow-y-auto">
            {filteredExpenses.length === 0 && (
              <p className="text-center py-8 text-gray-400">No transactions found</p>
            )}

            {filteredExpenses.map(exp => (
              <div
                key={exp._id}
                className="flex justify-between items-center p-4 hover:bg-gray-50 transition"
              >
                <div>
                  <p className="font-semibold text-gray-800">
                    {exp.description}
                    <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {exp.category}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(exp.date).toLocaleDateString()} • {exp.payerName}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-bold text-lg">₹{exp.amount}</span>
                  <button className="text-blue-500 font-semibold hover:underline">
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
