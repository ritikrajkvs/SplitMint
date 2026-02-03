import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

export default function GroupDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // This is the call that was failing with 404
        const res = await api.get(`/api/groups/${id}`);
        setData(res.data);
      } catch (err) {
        console.error("Fetch Error:", err);
        setError(err.response?.data?.error || "Failed to load group. Server disconnected.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <div className="p-10 text-center text-xl">Loading Group Data...</div>;
  if (error) return <div className="p-10 text-center text-red-600 font-bold text-xl">{error}</div>;
  if (!data) return <div className="p-10 text-center">Group Not Found</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">{data.group.name}</h1>
      <p className="text-gray-600 mb-8">{data.group.members.length} Members</p>
      
      {/* Debug View to prove data is loaded */}
      <div className="bg-green-50 p-4 rounded border border-green-200">
        <h3 className="font-bold text-green-800">✅ Connection Successful</h3>
        <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(data.group, null, 2)}</pre>
      </div>
    </div>
  );
}
