import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FootballLogo from "../components/FootballLogo";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { homeForRole } from "../utils/auth";

export default function Login() {
  const [adminCode, setAdminCode] = useState("");
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
      if (!adminCode.trim()) throw new Error("Enter admin code.");
      const data = await login({ admin_code: adminCode.trim() });
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
      style={{ backgroundImage: "url('/soccer-field.webp')" }}
    >
      <div className="absolute inset-0 bg-black/45" />
      <Toast message={error} tone="error" onClose={() => setError("")} />
      <form onSubmit={submit} noValidate className="glass relative z-10 w-full max-w-md rounded-[32px] p-8 text-center">
        <FootballLogo compact className="mx-auto mb-8" />
        <h1 className="text-3xl font-black">Admin Login</h1>
        <label className="mt-8 block text-left text-sm font-bold">Admin code</label>
        <input
          className="input mt-2"
          value={adminCode}
          onChange={(event) => setAdminCode(event.target.value)}
          placeholder="Enter admin code"
          type="password"
        />
        <button className="btn-primary mt-6 w-full" disabled={loading}>{loading ? "Checking..." : "Login"}</button>
      </form>
    </div>
  );
}
