import { createContext, useContext, useMemo, useState } from "react";
import api from "../services/api";
import { rememberSelectedCountry } from "../utils/language";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const storedRole = localStorage.getItem("ff_role");
  const storedToken = localStorage.getItem("ff_token");
  const hasSupportedRole = ["admin", "super_admin", "participant", "hetero_rep"].includes(storedRole);
  if (storedRole && !hasSupportedRole) {
    ["ff_token", "ff_role", "ff_participant", "ff_mr"].forEach((key) => localStorage.removeItem(key));
  }
  const [token, setToken] = useState(hasSupportedRole ? storedToken : null);
  const [role, setRole] = useState(hasSupportedRole ? storedRole : null);
  const [participant, setParticipant] = useState(() => {
    const raw = localStorage.getItem("ff_participant");
    return raw ? JSON.parse(raw) : null;
  });
  const persist = (data) => {
    localStorage.setItem("ff_token", data.token);
    localStorage.setItem("ff_role", data.role);
    setToken(data.token);
    setRole(data.role);
    if (data.participant) {
      localStorage.setItem("ff_participant", JSON.stringify(data.participant));
      setParticipant(data.participant);
      rememberSelectedCountry(data.participant.country);
    }
  };

  const login = async (payload) => {
    const body = typeof payload === "string" ? { mobile_number: payload } : payload;
    const { data } = await api.post("/login", body);
    persist(data);
    return data;
  };

  const userLogin = async (payload) => {
    const { data } = await api.post("/participant-login", payload);
    persist(data);
    return data;
  };

  const enroll = async (payload) => {
    const { data } = await api.post("/enroll", payload);
    persist(data);
    return data;
  };

  const logout = () => {
    ["ff_token", "ff_role", "ff_participant"].forEach((key) => localStorage.removeItem(key));
    setToken(null);
    setRole(null);
    setParticipant(null);
  };

  const value = useMemo(
    () => ({ token, role, participant, isAuthed: Boolean(token), isAdmin: role === "admin", login, userLogin, enroll, logout }),
    [token, role, participant],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
