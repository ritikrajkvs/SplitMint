import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";

export default function GroupDetail() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        setLoading(true); // Start loading
        const res = await api.get(`/api/groups/${id}`);
        setGroup(res.data);
      } catch (err) {
        console.error("Failed to fetch group", err);
        setError("Failed to load group. Please try again.");
      } finally {
        setLoading(false); // FIX: Stop loading whether it succeeds OR fails
      }
    };

    fetchGroup();
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading Group Details...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!group) return <div className="p-8 text-center">Group not found</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">{group.name}</h1>
      <div className="bg-white p-6 rounded shadow">
        <h2 className="text-xl font-semibold mb-4">Members</h2>
        <ul className="list-disc pl-5">
          {group.members.map((member) => (
            <li key={member._id || member} className="text-gray-700">
              {member.name || "Unknown Member"}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
