import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ff_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const responseData = error.response?.data || {};
    const message = responseData.message || "Network error. Please try again.";
    if (responseData.code === "SESSION_EXPIRED") {
      ["ff_token", "ff_role", "ff_participant", "ff_mr"].forEach((key) => localStorage.removeItem(key));
    }
    const normalizedError = new Error(message);
    normalizedError.code = responseData.code;
    normalizedError.status = error.response?.status;
    return Promise.reject(normalizedError);
  },
);

export default api;
