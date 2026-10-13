import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Activity } from "lucide-react";

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setGoogleAuthSession, getDashboardRoute } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    const role = searchParams.get("role") || "user";
    const name = searchParams.get("name") || "Google User";

    if (token) {
      setGoogleAuthSession(token, role, name);
      const target = getDashboardRoute(role);
      navigate(target, { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [searchParams, navigate, setGoogleAuthSession, getDashboardRoute]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-0.5 animate-spin">
        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
          <Activity className="w-7 h-7 text-blue-400" />
        </div>
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
        Authenticating with Google...
      </p>
    </div>
  );
}
