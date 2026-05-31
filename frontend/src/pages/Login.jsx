import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FootballLogo from "../components/FootballLogo";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { homeForRole } from "../utils/auth";

export default function Login() {
  const [credentials, setCredentials] = useState({ user_id: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthed, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthed) navigate(homeForRole(role), { replace: true });
  }, [isAuthed, role, navigate]);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!credentials.user_id.trim() || !credentials.password.trim()) throw new Error("Enter user ID and password.");
      const data = await login({ user_id: credentials.user_id.trim(), password: credentials.password });
      navigate(homeForRole(data.role));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center px-4 text-white"
      style={{ backgroundImage: "url('/images/bg-with-lines.png')" }}
    >
      <div className="absolute inset-0 bg-black/10" />
      <Toast message={error} tone="error" onClose={() => setError("")} />
      <form onSubmit={submit} noValidate className="glass relative z-10 w-full max-w-md rounded-[32px] p-8 text-center">
        <FootballLogo compact className="mx-auto mb-8" />
        <h1 className="text-3xl font-black">Admin Login</h1>
        <label className="mt-8 block text-left text-sm font-bold">User ID</label>
        <input
          className="input mt-2"
          value={credentials.user_id}
          onChange={(event) => setCredentials((current) => ({ ...current, user_id: event.target.value }))}
          placeholder="Enter user ID"
        />
        <label className="mt-5 block text-left text-sm font-bold">Password</label>
        <input
          className="input mt-2"
          value={credentials.password}
          onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
          placeholder="Enter password"
          type="password"
        />
        <button className="btn-primary mt-6 w-full" disabled={loading}>{loading ? "Checking..." : "Login"}</button>
      </form>
    </div>
  );
}
