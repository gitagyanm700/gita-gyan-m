// ==========================================================================
// AUTH & TOKEN HELPER UTILITIES
// Automatically detects and handles expired or malformed JWT tokens
// ==========================================================================

export function isTokenExpired(token) {
  if (!token || typeof token !== "string") return true;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    if (!parsed || !parsed.exp) return false;
    // Buffer of 15 seconds
    return Date.now() >= parsed.exp * 1000 - 15000;
  } catch {
    return true;
  }
}

export function clearAuthSession() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new CustomEvent("auth-token-expired"));
  } catch (e) {
    console.error("Error clearing auth session:", e);
  }
}

export function getValidToken() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    if (isTokenExpired(token)) {
      console.warn("Stored token has expired. Clearing session.");
      clearAuthSession();
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function handleAuth401(navigate = null, fromPath = "/") {
  clearAuthSession();
  const isHi = typeof localStorage !== "undefined" && localStorage.getItem("gita_language") === "hi";
  if (typeof navigate === "function") {
    navigate("/login", {
      replace: true,
      state: {
        from: fromPath,
        message: isHi
          ? "आपका सत्र (Session) समाप्त हो गया है। कृपया पुनः लॉगिन करें।"
          : "તમારું સત્ર (Session) સમાપ્ત થઈ ગયું છે. કૃપા કરીને ફરી Login કરો.",
      },
    });
  }
}

