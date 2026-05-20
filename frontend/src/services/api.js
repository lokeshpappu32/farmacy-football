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
    const message = error.response?.data?.message || "Network error. Please try again.";
    return Promise.reject(new Error(message));
  },
);

export default api;
