import React, { createContext, useContext, useState, useEffect } from "react";
import apiClient, { BACKEND_BASE_URL, setApiAuthToken } from "../api/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Requirement: Store JWT token in React state (not localStorage)
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync Axios header whenever token state changes
  useEffect(() => {
    setApiAuthToken(token);
  }, [token]);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      const { access_token, user: userData } = response.data;
      setApiAuthToken(access_token);
      setToken(access_token);
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      const msg = err.response?.data?.detail || "Login failed. Please verify your credentials.";
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (fullName, email, password, role, extraFields = {}) => {
    setIsLoading(true);
    try {
      const payload = {
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        ...extraFields,
      };
      const response = await apiClient.post("/auth/register", payload);

      const data = response.data;

      // Contractor pending response — no JWT token returned
      if (data.status === "pending") {
        return {
          success: true,
          pending: true,
          user: { role: "contractor", is_approved: false, email: data.user_email || email },
          message: data.message,
        };
      }

      // Regular user/admin response — JWT token returned
      const { access_token, user: userData } = data;
      setApiAuthToken(access_token);
      setToken(access_token);
      setUser(userData);
      return { success: true, pending: false, user: userData };
    } catch (err) {
      const msg = err.response?.data?.detail || "Registration failed. Please check form fields.";
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = (data) => {
    setUser((prev) => (prev ? { ...prev, ...data } : data));
  };


  const loginWithGoogle = (role = "user") => {
    window.location.href = `${BACKEND_BASE_URL}/auth/google?role=${encodeURIComponent(role)}`;
  };

  const setGoogleAuthSession = (authToken, role, name) => {
    setApiAuthToken(authToken);
    setToken(authToken);
    setUser({
      email: "",
      full_name: decodeURIComponent(name || "Google User"),
      role: role || "user",
      is_active: true,
    });
  };

  const logout = () => {
    setApiAuthToken(null);
    setToken(null);
    setUser(null);
  };

  const getDashboardRoute = (role) => {
    if (role === "admin") return "/admin/dashboard";
    if (role === "contractor") return "/contractor/dashboard";
    return "/upload";
  };

  const value = {
    token,
    user,
    isLoading,
    isAuthenticated: !!token,
    isUser: user?.role === "user",
    isContractor: user?.role === "contractor",
    isAdmin: user?.role === "admin",
    login,
    register,
    updateUser,
    loginWithGoogle,
    setGoogleAuthSession,
    logout,
    getDashboardRoute,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
