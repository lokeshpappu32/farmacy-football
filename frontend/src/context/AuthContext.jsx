import { createContext, useContext, useMemo, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("ff_token"));
  const [role, setRole] = useState(localStorage.getItem("ff_role"));
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
    }
  };

  const login = async (payload) => {
    const body = typeof payload === "string" ? { mobile_number: payload } : payload;
    const { data } = await api.post("/login", body);
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
    () => ({ token, role, participant, isAuthed: Boolean(token), isAdmin: role === "admin", login, enroll, logout }),
    [token, role, participant],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
