
import { createContext, useContext, useState, useEffect } from "react";
import { isTokenExpired } from "../utils/authHelper.js";
import { clearAudioCache } from "../utils/audioCache.js";
import { clearAllOfflineChapters } from "../utils/offlineStorage.js";

// =====================================================
// AUTH CONTEXT
// =====================================================

const AuthContext = createContext();

// =====================================================
// AUTH PROVIDER
// =====================================================

export function AuthProvider({ children }) {
  // Get saved token from localStorage (validate against expiry)
  const [token, setToken] = useState(() => {
    try {
      const savedToken = localStorage.getItem("token");
      if (savedToken && isTokenExpired(savedToken)) {
        console.warn("Stored JWT token has expired. Clearing session.");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return null;
      }
      return savedToken || null;
    } catch {
      return null;
    }
  });

  // Get saved user from localStorage (only if token is valid)
  const [user, setUser] = useState(() => {
    try {
      const savedToken = localStorage.getItem("token");
      if (!savedToken || isTokenExpired(savedToken)) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return null;
      }

      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.error("User data error:", error);
      return null;
    }
  });

  // ===================================================
  // REFRESH PROFILE FROM SERVER (PERMISSIONS SYNC)
  // ===================================================

  const refreshProfile = async () => {
    try {
      const savedToken = localStorage.getItem("token");
      if (!savedToken || isTokenExpired(savedToken)) return null;

      const isLocal =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");

      const endpoints = isLocal
        ? [
            "http://localhost:5000/api/auth/profile",
            "https://bhagavad-gita-backend-jy1a.onrender.com/api/auth/profile",
          ]
        : ["https://bhagavad-gita-backend-jy1a.onrender.com/api/auth/profile"];

      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, {
            headers: {
              Authorization: `Bearer ${savedToken}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.user) {
              localStorage.setItem("user", JSON.stringify(data.user));
              setUser(data.user);
              return data.user;
            }
          }
        } catch {
          // try next
        }
      }
    } catch (err) {
      console.warn("Could not refresh profile:", err);
    }
    return null;
  };

  useEffect(() => {
    if (token && !isTokenExpired(token)) {
      refreshProfile();
    }
  }, [token]);

  // ===================================================
  // SESSION EXPIRATION (Preserves offline downloads)
  // ===================================================

  const expireSession = () => {
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      sessionStorage.removeItem("authRedirect");
    } catch (e) {}
    setUser(null);
    setToken(null);
  };

  // ===================================================
  // LISTEN FOR GLOBAL AUTH EXPIRATION
  // ===================================================

  useEffect(() => {
    const handleExpiredEvent = () => {
      expireSession();
    };

    window.addEventListener("auth-token-expired", handleExpiredEvent);
    return () => window.removeEventListener("auth-token-expired", handleExpiredEvent);
  }, []);

  // ===================================================
  // LOGIN
  // ===================================================

  const login = (userData, userToken) => {
    const previousUserId = localStorage.getItem("gita_registered_user_id");
    const currentUserId = userData?._id || userData?.email;

    if (previousUserId && currentUserId && previousUserId !== currentUserId) {
      // Switched to a different account: clean previous user's general local reading cache
      localStorage.removeItem("gita_continue_reading");
      localStorage.removeItem("gita_reading_progress_v2");
      localStorage.removeItem("gita_reading_tracker");
      for (let ch = 1; ch <= 18; ch++) {
        sessionStorage.removeItem(`gita_last_shloka_ch_${ch}`);
        localStorage.removeItem(`gita_last_shloka_ch_${ch}`);
      }
    }

    localStorage.setItem(
      "user",
      JSON.stringify(userData)
    );

    localStorage.setItem("token", userToken);

    if (userData && userData._id) {
      localStorage.setItem("gita_registered_user_id", userData._id);
    }

    setUser(userData);
    setToken(userToken);
  };

  // ===================================================
  // LOGOUT
  // ===================================================

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("gita_continue_reading");
    localStorage.removeItem("gita_reading_progress_v2");
    localStorage.removeItem("gita_reading_tracker");
    sessionStorage.removeItem("authRedirect");

    for (let ch = 1; ch <= 18; ch++) {
      sessionStorage.removeItem(`gita_last_shloka_ch_${ch}`);
      localStorage.removeItem(`gita_last_shloka_ch_${ch}`);
    }
    clearAllOfflineChapters();
    clearAudioCache();

    setUser(null);
    setToken(null);
  };

  // ===================================================
  // AUTH STATUS
  // ===================================================

  const isLoggedIn = !!token && !!user;

  // ===================================================
  // PROVIDER
  // ===================================================

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn,
        login,
        logout,
        expireSession,
        refreshProfile,
        setUser,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// =====================================================
// CUSTOM HOOK
// =====================================================

export function useAuth() {
  return useContext(AuthContext);
}

