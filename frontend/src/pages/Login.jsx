import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import AppFooter from "../components/AppFooter";
import FootballLogo from "../components/FootballLogo";
import Toast from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { homeForRole } from "../utils/auth";

export default function Login() {
  const [credentials, setCredentials] = useState({ user_id: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
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
      className="relative flex min-h-screen flex-col bg-cover bg-center text-white"
      style={{ backgroundImage: "url('/images/bg-with-lines.png')" }}
    >
      <div className="absolute inset-0 bg-black/10" />
      <Toast message={error} tone="error" onClose={() => setError("")} />
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <form onSubmit={submit} noValidate className="glass w-full max-w-md rounded-[32px] p-8 text-center">
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
          <div className="relative mt-2">
            <input
              className="input pr-12"
              value={credentials.password}
              onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
              placeholder="Enter password"
              type={showPassword ? "text" : "password"}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-xl text-white/75 transition hover:bg-white/10 hover:text-gold"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
          <button className="btn-primary mt-6 w-full" disabled={loading}>{loading ? "Checking..." : "Login"}</button>
        </form>
      </div>
      <AppFooter />
    </div>
  );
}
