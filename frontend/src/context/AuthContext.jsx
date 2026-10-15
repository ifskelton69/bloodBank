import { createContext, useEffect, useState } from "react";
import { getCurrentAdmin, loginAdmin, logoutAdmin } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    try {
      const saved = localStorage.getItem("vitaldrop_admin_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("vitaldrop_admin_token") || null);
  const [loading, setLoading] = useState(true);

  // Validate session on mount if token exists
  useEffect(() => {
    let active = true;

    async function checkAuth() {
      const savedToken = localStorage.getItem("vitaldrop_admin_token");
      if (!savedToken) {
        if (active) setLoading(false);
        return;
      }

      try {
        const res = await getCurrentAdmin();
        if (active && res.data?.admin) {
          setAdmin(res.data.admin);
          localStorage.setItem("vitaldrop_admin_user", JSON.stringify(res.data.admin));
        }
      } catch (err) {
        if (active) {
          console.warn("Session verification failed or expired:", err.message);
          localStorage.removeItem("vitaldrop_admin_token");
          localStorage.removeItem("vitaldrop_admin_user");
          setAdmin(null);
          setToken(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    checkAuth();

    const handleGlobalLogout = () => {
      setAdmin(null);
      setToken(null);
    };

    window.addEventListener("vitaldrop_logout", handleGlobalLogout);

    return () => {
      active = false;
      window.removeEventListener("vitaldrop_logout", handleGlobalLogout);
    };
  }, []);

  const login = async (email, password) => {
    const res = await loginAdmin({ email, password });
    const { token: authToken, admin: adminData } = res.data;

    localStorage.setItem("vitaldrop_admin_token", authToken);
    localStorage.setItem("vitaldrop_admin_user", JSON.stringify(adminData));
    setToken(authToken);
    setAdmin(adminData);

    return adminData;
  };

  const logout = async () => {
    try {
      await logoutAdmin();
    } catch (err) {
      console.warn("Logout request failed:", err);
    } finally {
      localStorage.removeItem("vitaldrop_admin_token");
      localStorage.removeItem("vitaldrop_admin_user");
      setAdmin(null);
      setToken(null);
    }
  };

  const value = {
    admin,
    token,
    isAuthenticated: Boolean(admin && token),
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
