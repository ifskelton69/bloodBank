import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Request interceptor to attach bearer token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("vitaldrop_admin_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle global errors and 401s
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    // If 401 Unauthorized on non-login route, clear session token
    if (status === 401 && !url.includes("/auth/login")) {
      localStorage.removeItem("vitaldrop_admin_token");
      localStorage.removeItem("vitaldrop_admin_user");
      window.dispatchEvent(new Event("vitaldrop_logout"));
    }

    console.error(
      "API Error:",
      error.response?.data || error.message
    );
    return Promise.reject(error);
  }
);

export default axiosInstance;
