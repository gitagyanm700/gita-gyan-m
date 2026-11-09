import { getValidToken } from "../utils/authHelper.js";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import {
  Shield,
  Crown,
  LogOut,
  BookOpen,
  BrainCircuit,
  Users,
  FileText,
  Search,
  Lock,
  Trash2,
  ArrowRight,
  Eye,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Activity,
  RefreshCw,
  Calendar,
  TrendingUp,
  UserPlus,
  UserCheck,
  Star,
  MessageSquare,
  X,
  Sparkles,
  Clock,
  Bell,
  Download,
  Zap,
  CheckCircle2,
  XCircle,
  UserMinus,
  CheckSquare,
  Square,
  Key,
} from "lucide-react";
import {
  isSuperAdminUser,
  hasPermission,
  ALL_PERMISSIONS,
  getPermissionLabel,
} from "../utils/permissionHelper.js";
import "./Admin.css";

function formatTimeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "હમણાં જ";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} મિ. પહેલાં`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} કલાક પહેલાં`;
  const days = Math.floor(hours / 24);
  return `${days} દિવસ પહેલાં`;
}

function Admin() {
  const { isHindi, isEnglish, isGujarati, txt } = useLanguage();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  // Visitor tracking stats state
  const [visitorStats, setVisitorStats] = useState(null);
  const [loadingVisitors, setLoadingVisitors] = useState(true);
  const [refreshingVisitors, setRefreshingVisitors] = useState(false);

  // App Installation & Analytics state
  const [appStats, setAppStats] = useState(null);
  const [loadingAppStats, setLoadingAppStats] = useState(true);
  const [refreshingAppStats, setRefreshingAppStats] = useState(false);

  // User feedback and ratings state
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [refreshingFeedbacks, setRefreshingFeedbacks] = useState(false);
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState("all");
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [deletingFeedbackId, setDeletingFeedbackId] = useState(null);
  const [activeFeedbackModal, setActiveFeedbackModal] = useState(null);

  // Active analytics popup modal: 'web' | 'app' | null
  const [activeAnalyticsModal, setActiveAnalyticsModal] = useState(null);

  // Lock background scroll and handle Escape key when analytics modal is open
  useEffect(() => {
    if (!activeAnalyticsModal) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveAnalyticsModal(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeAnalyticsModal]);

  const navigate = useNavigate();

  const { user: loggedInUser, logout } = useAuth();

  const isSuperAdmin = isSuperAdminUser(loggedInUser);
  const canAccessShlokAdmin =
    hasPermission(loggedInUser, "add_shloks") ||
    hasPermission(loggedInUser, "edit_shloks") ||
    hasPermission(loggedInUser, "delete_shloks") ||
    hasPermission(loggedInUser, "manage_shloks");
  const canAccessQuizAdmin =
    hasPermission(loggedInUser, "add_quiz") ||
    hasPermission(loggedInUser, "edit_quiz") ||
    hasPermission(loggedInUser, "delete_quiz") ||
    hasPermission(loggedInUser, "share_quiz") ||
    hasPermission(loggedInUser, "manage_quiz");
  const canViewAnalytics = hasPermission(loggedInUser, "view_analytics");
  const canManageFeedbacks = hasPermission(loggedInUser, "manage_feedbacks");
  const canDeleteFeedbacks = hasPermission(loggedInUser, "delete_feedbacks");
  const canManageUsers = hasPermission(loggedInUser, "manage_users");
  const canDeleteUsers = hasPermission(loggedInUser, "delete_users");
  const canManageAdmins = isSuperAdmin || hasPermission(loggedInUser, "manage_admins");

  // Sub-admins with manage_admins can ONLY grant permissions they possess themselves!
  // Options they do not possess are hidden completely.
  const availablePermissions = isSuperAdmin
    ? ALL_PERMISSIONS
    : ALL_PERMISSIONS.filter(
        (p) =>
          Array.isArray(loggedInUser?.permissions) &&
          loggedInUser.permissions.includes(p.id)
      );

  // Admin Role & Permissions modal state
  const [permissionModalUser, setPermissionModalUser] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [roleToastMessage, setRoleToastMessage] = useState("");

  // Dismiss role toast automatically after 4.5 seconds
  useEffect(() => {
    if (!roleToastMessage) return;
    const timer = setTimeout(() => setRoleToastMessage(""), 4500);
    return () => clearTimeout(timer);
  }, [roleToastMessage]);

  const openPermissionModal = (targetUser) => {
    setPermissionModalUser(targetUser);
    const userAllowed = availablePermissions.map((p) => p.id);

    if (Array.isArray(targetUser.permissions) && targetUser.permissions.length > 0) {
      // Only keep permissions that the current admin is allowed to grant
      setSelectedPermissions(
        targetUser.permissions.filter((p) => userAllowed.includes(p))
      );
    } else {
      // Default: select available safe permissions that this admin owns
      const defaultSafe = [
        "add_shloks",
        "edit_shloks",
        "add_quiz",
        "edit_quiz",
        "share_quiz",
        "view_analytics",
        "manage_feedbacks",
        "manage_users",
      ];
      setSelectedPermissions(
        defaultSafe.filter((p) => userAllowed.includes(p))
      );
    }
  };

  const togglePermission = (permId) => {
    if (!availablePermissions.some((p) => p.id === permId)) return;
    setSelectedPermissions((prev) =>
      prev.includes(permId)
        ? prev.filter((p) => p !== permId)
        : [...prev, permId]
    );
  };

  const handleSelectAllPermissions = () => {
    if (selectedPermissions.length === availablePermissions.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(availablePermissions.map((p) => p.id));
    }
  };

  const handleSavePermissions = async () => {
    if (!permissionModalUser) return;
    setSavingPermissions(true);
    const token = getValidToken();

    try {
      const isLocal =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");

      const urls = isLocal
        ? [
            `http://localhost:5000/api/admin/users/${permissionModalUser._id}/role`,
            `https://bhagavad-gita-backend-jy1a.onrender.com/api/admin/users/${permissionModalUser._id}/role`,
          ]
        : [
            `https://bhagavad-gita-backend-jy1a.onrender.com/api/admin/users/${permissionModalUser._id}/role`,
          ];

      let success = false;
      let resData = null;
      let lastErrorMessage = "";

      for (const url of urls) {
        try {
          const res = await fetch(url, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              role: "admin",
              permissions: selectedPermissions,
            }),
          });

          if (res.status === 404) {
            lastErrorMessage = txt(
              "Render backend પર નવો કોડ હજુ deploy થઈ રહ્યો છે. કૃપા કરીને 2 મિનિટ પછી ફરી પ્રયાસ કરો.",
              "Render backend पर नया कोड अभी डिप्लॉय हो रहा है। कृपया 2 मिनट बाद पुनः प्रयास करें।",
              "Backend deployment in progress on Render. Please try again in 2 minutes."
            );
            continue;
          }

          let data = null;
          try {
            data = await res.json();
          } catch {
            data = null;
          }

          if (res.ok && data?.success) {
            success = true;
            resData = data;
            break;
          } else {
            lastErrorMessage = data?.message || `Server responded with status ${res.status}`;
          }
        } catch (netErr) {
          lastErrorMessage = netErr.message;
        }
      }

      if (success) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === permissionModalUser._id
              ? {
                  ...u,
                  role: "admin",
                  permissions: selectedPermissions,
                }
              : u
          )
        );
        setRoleToastMessage(
          txt(
            `${permissionModalUser.name} ને Admin બનાવવામાં આવ્યા અને પરમિશન્સ સેટ થઈ ગઈ ✅`,
            `${permissionModalUser.name} को Admin बनाया गया और अनुमतियां सेट हो गईं ✅`,
            `${permissionModalUser.name} has been granted Admin access with custom permissions ✅`
          )
        );
        setPermissionModalUser(null);
      } else {
        alert(lastErrorMessage || resData?.message || "Error saving permissions.");
      }
    } catch (err) {
      console.error("Error saving permissions:", err);
      alert(err.message || "Error saving permissions.");
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleRevokeAdmin = async (targetUser) => {
    if (!targetUser) return;
    const confirmMsg = txt(
      `શું તમે ખરેખર "${targetUser.name}" પાસેથી Admin અધિકારો પાછા લઈને સામાન્ય User બનાવવા માંગો છો?`,
      `क्या आप वाकई "${targetUser.name}" से Admin अधिकार वापस लेकर सामान्य User बनाना चाहते हैं?`,
      `Are you sure you want to revoke Admin rights from "${targetUser.name}" and make them a regular user?`
    );

    if (!window.confirm(confirmMsg)) return;

    const token = getValidToken();
    try {
      const isLocal =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");

      const urls = isLocal
        ? [
            `http://localhost:5000/api/admin/users/${targetUser._id}/role`,
            `https://bhagavad-gita-backend-jy1a.onrender.com/api/admin/users/${targetUser._id}/role`,
          ]
        : [
            `https://bhagavad-gita-backend-jy1a.onrender.com/api/admin/users/${targetUser._id}/role`,
          ];

      let success = false;
      let resData = null;
      let lastErrorMessage = "";

      for (const url of urls) {
        try {
          const res = await fetch(url, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              role: "user",
              permissions: [],
            }),
          });

          if (res.status === 404) {
            lastErrorMessage = txt(
              "Render backend પર નવો કોડ હજુ deploy થઈ રહ્યો છે. કૃપા કરીને 2 મિનિટ પછી ફરી પ્રયાસ કરો.",
              "Render backend पर नया कोड अभी डिप्लॉय हो रहा है। कृपया 2 मिनट बाद पुनः प्रयास करें।",
              "Backend deployment in progress on Render. Please try again in 2 minutes."
            );
            continue;
          }

          let data = null;
          try {
            data = await res.json();
          } catch {
            data = null;
          }

          if (res.ok && data?.success) {
            success = true;
            resData = data;
            break;
          } else {
            lastErrorMessage = data?.message || `Server responded with status ${res.status}`;
          }
        } catch (netErr) {
          lastErrorMessage = netErr.message;
        }
      }

      if (success) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === targetUser._id
              ? {
                  ...u,
                  role: "user",
                  permissions: [],
                }
              : u
          )
        );
        setRoleToastMessage(
          txt(
            `${targetUser.name} હવે સામાન્ય User બની ગયા છે.`,
            `${targetUser.name} अब सामान्य User बन गए हैं।`,
            `${targetUser.name} has been changed to a regular User.`
          )
        );
      } else {
        alert(lastErrorMessage || resData?.message || "Error revoking admin access.");
      }
    } catch (err) {
      console.error("Error revoking admin:", err);
      alert(err.message || "Error revoking admin access.");
    }
  };

  const fetchAppStats = async (isManual = false) => {
    const token = getValidToken();
    if (!token) return;

    if (isManual) setRefreshingAppStats(true);
    else setLoadingAppStats(true);

    try {
      const isLocal =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");

      const urls = isLocal
        ? [
            "http://localhost:5000/api/app-analytics/stats",
            "https://bhagavad-gita-backend-jy1a.onrender.com/api/app-analytics/stats",
          ]
        : ["https://bhagavad-gita-backend-jy1a.onrender.com/api/app-analytics/stats"];

      let fetchedData = null;
      for (const url of urls) {
        try {
          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.stats) {
              fetchedData = data.stats;
              break;
            }
          }
        } catch {
          // try next url
        }
      }

      if (fetchedData) {
        setAppStats(fetchedData);
      }
    } catch (error) {
      console.error("Error fetching app stats:", error);
    } finally {
      setLoadingAppStats(false);
      setRefreshingAppStats(false);
    }
  };

  const fetchVisitorStats = async (isManual = false) => {
    const token = getValidToken();
    if (!token) return;

    if (isManual) setRefreshingVisitors(true);
    else setLoadingVisitors(true);

    try {
      const isLocal =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");

      const urls = isLocal
        ? [
            "http://localhost:5000/api/visitors/stats",
            "https://bhagavad-gita-backend-jy1a.onrender.com/api/visitors/stats",
          ]
        : ["https://bhagavad-gita-backend-jy1a.onrender.com/api/visitors/stats"];

      let fetchedData = null;
      for (const url of urls) {
        try {
          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.stats) {
              fetchedData = data.stats;
              break;
            }
          }
        } catch {
          // try next url
        }
      }

      if (fetchedData) {
        setVisitorStats(fetchedData);
      }
    } catch (error) {
      console.error("Error fetching visitor stats:", error);
    } finally {
      setLoadingVisitors(false);
      setRefreshingVisitors(false);
    }
  };

  const fetchUsers = async () => {
    const token = getValidToken();

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const response = await fetch(
        "https://bhagavad-gita-backend-jy1a.onrender.com/api/admin/users",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Access denied.");
        setLoading(false);
        return;
      }

      setUsers(data.users || []);
      setMessage("");
      setLoading(false);
    } catch (error) {
      console.error(error);
      setMessage(
        "Server સાથે connection થઈ શક્યું નથી."
      );
      setLoading(false);
    }
  };

  const fetchFeedbacks = async (isRefresh = false) => {
    const token = getValidToken();
    if (!token) return;

    if (isRefresh) setRefreshingFeedbacks(true);
    else setLoadingFeedbacks(true);

    try {
      const isLocal =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");

      const urls = isLocal
        ? [
            "http://localhost:5000/api/feedback/admin?limit=150",
            "https://bhagavad-gita-backend-jy1a.onrender.com/api/feedback/admin?limit=150",
          ]
        : ["https://bhagavad-gita-backend-jy1a.onrender.com/api/feedback/admin?limit=150"];

      let fetched = null;
      for (const url of urls) {
        try {
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
              fetched = data.data;
              break;
            }
          }
        } catch {
          // try next
        }
      }

      if (fetched) {
        setFeedbacks(fetched.feedbacks || []);
        setFeedbackSummary(fetched.summary || null);
      }
    } catch (err) {
      console.error("Error fetching feedbacks:", err);
    } finally {
      setLoadingFeedbacks(false);
      setRefreshingFeedbacks(false);
    }
  };

  const handleDeleteFeedback = async (id, userName) => {
    if (!canDeleteFeedbacks) {
      alert(
        txt(
          "તમારી પાસે પ્રતિસાદ ડિલીટ કરવાની પરમિશન નથી. મુખ્ય એડમિનનો સંપર્ક કરો.",
          "आपके पास फ़ीडबैक डिलीट करने की अनुमति नहीं है। मुख्य एडमिन से संपर्क करें।",
          "You do not have permission to delete feedback. Contact Super Admin."
        )
      );
      return;
    }

    const confirmed = window.confirm(
      `શું તમે ${userName || "આ"} ભક્ત/યુઝરનો પ્રતિસાદ ડિલીટ કરવા માંગો છો?`
    );
    if (!confirmed) return;

    setDeletingFeedbackId(id);
    const token = getValidToken();

    try {
      const isLocal =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");

      const urls = isLocal
        ? [
            `http://localhost:5000/api/feedback/${id}`,
            `https://bhagavad-gita-backend-jy1a.onrender.com/api/feedback/${id}`,
          ]
        : [`https://bhagavad-gita-backend-jy1a.onrender.com/api/feedback/${id}`];

      for (const url of urls) {
        try {
          const res = await fetch(url, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json().catch(() => null);
            if (data?.summary) {
              setFeedbackSummary(data.summary);
            }
            setFeedbacks((prev) => prev.filter((f) => f._id !== id));
            // Background sync for complete consistency
            fetchFeedbacks(true);
            break;
          }
        } catch {
          // try next
        }
      }
    } catch (err) {
      console.error("Error deleting feedback:", err);
    } finally {
      setDeletingFeedbackId(null);
    }
  };

  useEffect(() => {
    if (canManageUsers) {
      fetchUsers();
    } else {
      setLoading(false);
    }

    if (canViewAnalytics) {
      fetchVisitorStats();
      fetchAppStats();
    } else {
      setLoadingVisitors(false);
      setLoadingAppStats(false);
    }

    if (canManageFeedbacks) {
      fetchFeedbacks();
    } else {
      setLoadingFeedbacks(false);
    }
  }, [canManageUsers, canViewAnalytics, canManageFeedbacks]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveAnalyticsModal(null);
        setActiveFeedbackModal(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // =====================================================
  // ADMIN LOGOUT
  // =====================================================

  const handleAdminLogout = () => {
    const confirmed = window.confirm(
      "શું તમે ખરેખર Logout કરવા માંગો છો?"
    );

    if (!confirmed) {
      return;
    }

    logout();

    navigate("/");
  };

  // =====================================================
  // DELETE USER
  // =====================================================

  const deleteUser = async (userId, userName) => {
    if (!canDeleteUsers) {
      alert(
        txt(
          "તમારી પાસે યુઝર ડિલીટ કરવાની પરમિશન નથી. મુખ્ય એડમિનનો સંપર્ક કરો.",
          "आपके पास उपयोगकर्ता डिलीट करने की अनुमति नहीं है। मुख्य एडमिन से संपर्क करें।",
          "You do not have permission to delete users. Contact Super Admin."
        )
      );
      return;
    }

    const confirmed = window.confirm(
      `શું તમે "${userName}" ને ખરેખર delete કરવા માંગો છો?`
    );

    if (!confirmed) {
      return;
    }

    const token = getValidToken();

    try {
      setDeletingId(userId);

      const response = await fetch(
        `https://bhagavad-gita-backend-jy1a.onrender.com/api/admin/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            "User delete થઈ શક્યો નથી."
        );

        setDeletingId(null);
        return;
      }

      setUsers((currentUsers) =>
        currentUsers.filter(
          (user) => user._id !== userId
        )
      );

      setDeletingId(null);

      alert(
        "User successfully deleted."
      );
    } catch (error) {
      console.error(error);

      alert(
        "Server સાથે connection થઈ શક્યું નથી."
      );

      setDeletingId(null);
    }
  };

  // =====================================================
  // SEARCH + ADMIN ALWAYS #1
  // =====================================================

  const getSuperAdminRank = (user) => {
    const email = (user?.email || "").toLowerCase().trim();
    if (email === "gitagyanm700@gmail.com") return 1;
    if (email === "aambaliyamanav@gmail.com") return 2;
    if (isSuperAdminUser(user)) return 3;
    return 99;
  };

  const filteredUsers = users
    .filter((user) => {
      const searchText =
        search.toLowerCase();

      return (
        (user.name || "")
          .toLowerCase()
          .includes(searchText) ||
        (user.email || "")
          .toLowerCase()
          .includes(searchText) ||
        (user.mobile || "")
          .toLowerCase()
          .includes(searchText) ||
        (user.birthDate || "")
          .toLowerCase()
          .includes(searchText) ||
        (user.state || "")
          .toLowerCase()
          .includes(searchText) ||
        (user.city || "")
          .toLowerCase()
          .includes(searchText) ||
        (user.role || "")
          .toLowerCase()
          .includes(searchText)
      );
    })
    .sort((a, b) => {
      const rankA = getSuperAdminRank(a);
      const rankB = getSuperAdminRank(b);

      // 1. Super Admins always come first in fixed order (#1 gitagyanm700, #2 aambaliyamanav)
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // 2. Sub-admins come next before regular users
      const isSubAdminA = a.role === "admin" && rankA === 99;
      const isSubAdminB = b.role === "admin" && rankB === 99;

      if (isSubAdminA && !isSubAdminB) return -1;
      if (!isSubAdminA && isSubAdminB) return 1;

      // 3. Within sub-admins OR within regular users, sort alphabetically A-Z by name
      const nameA = (a.name || "").trim().toLowerCase();
      const nameB = (b.name || "").trim().toLowerCase();
      return nameA.localeCompare(nameB, "gu", { sensitivity: "base" });
    });

  return (
    <main className="admin-page">

      <div className="admin-container">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="admin-header">

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <h1>
                <Shield className="btn-icon" size={28} /> Admin Dashboard
              </h1>
              {isSuperAdmin && (
                <span className="admin-header-super-badge" title="મુખ્ય સુપર એડમિન એકાઉન્ટ">
                  👑 Super Admin
                </span>
              )}
            </div>
          </div>

          <div className="admin-header-actions">
            <button
              className="admin-logout-btn"
              onClick={handleAdminLogout}
            >
              <LogOut className="btn-icon" size={18} /> Logout
            </button>
          </div>
        </div>


        {/* =================================================
            ADMIN MANAGEMENT CARDS
        ================================================= */}

        {!loading && !message && (canAccessShlokAdmin || canAccessQuizAdmin) && (
          <div className="admin-management">

            {/* =================================================
                SHLOK MANAGEMENT
            ================================================= */}

            {canAccessShlokAdmin && (
              <Link
                to="/admin/shloks"
                className="management-card shlok-management-card"
              >
                <div className="management-icon">
                  <BookOpen size={48} color="#175bb5" strokeWidth={1.5} />
                </div>
                <div className="management-content">
                  <h2>Manage Shlokas</h2>
                </div>
                <div className="management-arrow"><ArrowRight size={22} className="management-arrow-icon" /></div>
              </Link>
            )}

            {/* =================================================
                QUIZ MANAGEMENT
            ================================================= */}

            {canAccessQuizAdmin && (
              <Link
                to="/admin/quiz"
                className="management-card quiz-management-card"
              >
                <div className="management-icon">
                  <BrainCircuit size={48} color="#175bb5" strokeWidth={1.5} />
                </div>
                <div className="management-content">
                  <h2>Manage Quiz</h2>
                </div>
                <div className="management-arrow"><ArrowRight size={22} className="management-arrow-icon" /></div>
              </Link>
            )}

          </div>
        )}


        {/* =================================================
            STATISTICS
        ================================================= */}

        {!loading && !message && canViewAnalytics && (
          <div className="admin-stats">

            <div className="stat-card">

              <div className="stat-icon">
                <Users size={32} color="#175bb5" strokeWidth={1.5} />
              </div>

              <div>
                <h2>
                  {users.length}
                </h2>

                <p>
                  Total Users
                </p>
              </div>

            </div>


            <div className="stat-card">

              <div className="stat-icon">
                <BookOpen size={32} color="#175bb5" strokeWidth={1.5} />
              </div>

              <div>
                <h2>
                  18
                </h2>

                <p>
                  Chapters
                </p>
              </div>

            </div>


            <div className="stat-card">

              <div className="stat-icon">
                <FileText size={32} color="#175bb5" strokeWidth={1.5} />
              </div>

              <div>
                <h2>
                  700
                </h2>

                <p>
                  Shlokas
                </p>
              </div>

            </div>


            <div className="stat-card">

              <div className="stat-icon">
                <Star size={32} color="#f59e0b" fill="#f59e0b" strokeWidth={1.5} />
              </div>

              <div>
                <h2>
                  {feedbackSummary && feedbackSummary.totalRatings > 0
                    ? `${Number(feedbackSummary.averageRating).toFixed(1)} ★`
                    : "0.0 ★"}
                </h2>

                <p>
                  Avg Rating ({feedbackSummary?.totalRatings ?? 0})
                </p>
              </div>

            </div>

          </div>
        )}

        {/* =================================================
            ANALYTICS HUB: 2 BUTTONS (WEB & APP POPUPS)
            Opens detailed analytics in centered popups
        ================================================= */}
        {/* =================================================
            ANALYTICS HUB: 2 BUTTONS (WEB & APP POPUPS)
            Opens detailed analytics in centered popups
        ================================================= */}
        <section className="feedback-section-box analytics-hub-section-box" aria-label="Analytics Hub">
          <div className="feedback-section-header analytics-hub-section-header">
            <div className="visitor-title-wrap">
              <div className="visitor-header-icon-box" style={{ background: "rgba(37, 99, 235, 0.12)", color: "#2563eb" }}>
                <Activity size={24} className="visitor-activity-icon" />
              </div>
              <div>
                <h2>એનાલિટિક્સ અને યુઝર રિપોર્ટ્સ (Analytics & Reports)</h2>
              </div>
            </div>
          </div>

          <div className="analytics-hub-buttons-grid">
            {/* BUTTON 1: WEBSITE ANALYTICS POPUP */}
            <button
              type="button"
              className="management-card analytics-hub-card-btn"
              onClick={() => setActiveAnalyticsModal("web")}
            >
              <div className="management-icon">
                <Globe size={40} color="#175bb5" strokeWidth={1.6} />
              </div>
              <div className="management-content">
                <h2>વેબસાઇટ મુલાકાતીઓ</h2>
                <p>
                  {visitorStats?.totalVisits !== undefined
                    ? `${visitorStats.totalVisits.toLocaleString()} મુલાકાતો`
                    : "ડેટા જુઓ"}
                </p>
              </div>
              <div className="management-arrow">
                <ArrowRight size={22} className="management-arrow-icon" />
              </div>
            </button>

            {/* BUTTON 2: APP ANALYTICS POPUP */}
            <button
              type="button"
              className="management-card analytics-hub-card-btn"
              onClick={() => setActiveAnalyticsModal("app")}
            >
              <div className="management-icon">
                <Smartphone size={40} color="#175bb5" strokeWidth={1.6} />
              </div>
              <div className="management-content">
                <h2>એપ ઇન્સ્ટોલેશન</h2>
                <p>
                  {appStats?.totalInstalls !== undefined
                    ? `${appStats.totalInstalls.toLocaleString()} ઇન્સ્ટોલ્સ`
                    : "ડેટા જુઓ"}
                </p>
              </div>
              <div className="management-arrow">
                <ArrowRight size={22} className="management-arrow-icon" />
              </div>
            </button>
          </div>
        </section>

        {/* =================================================
            WEBSITE ANALYTICS POPUP MODAL (CENTERED POPUP)
        ================================================= */}
        {activeAnalyticsModal === "web" && typeof document !== "undefined" && createPortal(
          <div
            className="admin-modal-overlay"
            onClick={() => setActiveAnalyticsModal(null)}
          >
            <div
              className="admin-modal-content analytics-detail-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="admin-modal-header analytics-modal-header">
                <div className="visitor-title-wrap">
                  <div className="visitor-header-icon-box">
                    <Globe size={24} className="visitor-activity-icon" />
                  </div>
                  <div>
                    <h2>વેબસાઇટ મુલાકાતીઓ (Website Visitors)</h2>
                  </div>
                </div>

                <div className="analytics-modal-header-actions">
                  <button
                    type="button"
                    className="visitor-refresh-btn"
                    onClick={() => fetchVisitorStats(true)}
                    disabled={refreshingVisitors || loadingVisitors}
                    title="વિઝિટર ડેટા રિફ્રેશ કરો"
                  >
                    <RefreshCw
                      size={16}
                      className={refreshingVisitors ? "spinning-icon" : ""}
                    />
                    <span>{refreshingVisitors ? "રિફ્રેશિંગ..." : "રિફ્રેશ"}</span>
                  </button>

                  <button
                    type="button"
                    className="admin-modal-close-btn"
                    onClick={() => setActiveAnalyticsModal(null)}
                    title="બંધ કરો"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="admin-modal-body analytics-modal-body">

          {loadingVisitors ? (
            <div className="visitor-loading-state">
              <p>{txt("મુલાકાતીઓની માહિતી લોડ થઈ રહી છે...", "आगंतुकों की जानकारी लोड हो रही है...", "Loading visitor statistics...")}</p>
            </div>
          ) : (
            <>
              {/* 5 VISITOR STAT CARDS */}
              <div className="visitor-stats-grid">
                {/* CARD 1: NEW / UNREGISTERED UNIQUE VISITORS (COUNTED ONLY ONCE) */}
                <div className="v-stat-card new-guest-card">
                  <div className="v-stat-icon-box amber-glow">
                    <UserPlus size={26} />
                  </div>
                  <div className="v-stat-content">
                    <h3>
                      {visitorStats?.uniqueUnregisteredVisitors !== undefined
                        ? visitorStats.uniqueUnregisteredVisitors.toLocaleString()
                        : "0"}
                    </h3>
                    <p className="v-stat-label">નવા મુલાકાતીઓ (ગેસ્ટ)</p>
                  </div>
                </div>

                {/* CARD 2: TOTAL ALL VISITS (EVERY HIT COUNTED) */}
                <div className="v-stat-card total-visits-card">
                  <div className="v-stat-icon-box blue-glow">
                    <Eye size={26} />
                  </div>
                  <div className="v-stat-content">
                    <h3>
                      {visitorStats?.totalVisits !== undefined
                        ? visitorStats.totalVisits.toLocaleString()
                        : "0"}
                    </h3>
                    <p className="v-stat-label">કુલ તમામ મુલાકાતો</p>
                  </div>
                </div>

                {/* CARD 3: TODAY'S UNIQUE GUEST VISITORS */}
                <div className="v-stat-card today-guest-card">
                  <div className="v-stat-icon-box gold-glow">
                    <TrendingUp size={26} />
                  </div>
                  <div className="v-stat-content">
                    <h3>
                      {visitorStats?.todayUniqueUnregisteredVisitors !== undefined
                        ? visitorStats.todayUniqueUnregisteredVisitors.toLocaleString()
                        : "0"}
                    </h3>
                    <p className="v-stat-label">આજના નવા મુલાકાતીઓ</p>
                  </div>
                </div>

                {/* CARD 4: TODAY'S TOTAL VISITS */}
                <div className="v-stat-card today-visits-card">
                  <div className="v-stat-icon-box green-glow">
                    <Calendar size={26} />
                  </div>
                  <div className="v-stat-content">
                    <h3>
                      {visitorStats?.todayVisits !== undefined
                        ? visitorStats.todayVisits.toLocaleString()
                        : "0"}
                    </h3>
                    <p className="v-stat-label">આજની કુલ મુલાકાતો</p>
                  </div>
                </div>

                {/* CARD 5: REGISTERED ACTIVE VISITORS */}
                <div className="v-stat-card registered-visitors-card">
                  <div className="v-stat-icon-box purple-glow">
                    <UserCheck size={26} />
                  </div>
                  <div className="v-stat-content">
                    <h3>
                      {(visitorStats?.registeredVisits !== undefined
                        ? visitorStats.registeredVisits
                        : visitorStats?.uniqueRegisteredVisitors !== undefined
                        ? visitorStats.uniqueRegisteredVisitors
                        : 0
                      ).toLocaleString()}
                    </h3>
                    <p className="v-stat-label">નોંધાયેલા મુલાકાતીઓ</p>
                  </div>
                </div>
              </div>

              {/* DETAILED ANALYTICS GRID */}
              <div className="visitor-details-grid">
                {/* DEVICE BREAKDOWN */}
                <div className="v-detail-card device-card">
                  <div className="v-card-header">
                    <h4>
                      <Smartphone size={20} /> ડિવાઇસ વિતરણ (Devices)
                    </h4>
                  </div>
                  <div className="v-device-bars">
                    {(() => {
                      const total =
                        (visitorStats?.deviceStats?.Mobile || 0) +
                        (visitorStats?.deviceStats?.Desktop || 0) +
                        (visitorStats?.deviceStats?.Tablet || 0) || 1;
                      const mobPct = Math.round(
                        ((visitorStats?.deviceStats?.Mobile || 0) / total) * 100
                      );
                      const deskPct = Math.round(
                        ((visitorStats?.deviceStats?.Desktop || 0) / total) * 100
                      );
                      const tabPct = Math.round(
                        ((visitorStats?.deviceStats?.Tablet || 0) / total) * 100
                      );

                      return (
                        <>
                          <div className="device-bar-row">
                            <div className="device-bar-label">
                              <span className="device-label-text">
                                <Smartphone size={16} /> મોબાઈલ (Mobile)
                              </span>
                              <strong>
                                {visitorStats?.deviceStats?.Mobile || 0} ({mobPct}%)
                              </strong>
                            </div>
                            <div className="device-progress-track">
                              <div
                                className="device-progress-fill mobile-fill"
                                style={{ width: `${mobPct}%` }}
                              />
                            </div>
                          </div>

                          <div className="device-bar-row">
                            <div className="device-bar-label">
                              <span className="device-label-text">
                                <Monitor size={16} /> ડેસ્કટોપ (Desktop)
                              </span>
                              <strong>
                                {visitorStats?.deviceStats?.Desktop || 0} ({deskPct}%)
                              </strong>
                            </div>
                            <div className="device-progress-track">
                              <div
                                className="device-progress-fill desktop-fill"
                                style={{ width: `${deskPct}%` }}
                              />
                            </div>
                          </div>

                          <div className="device-bar-row">
                            <div className="device-bar-label">
                              <span className="device-label-text">
                                <Tablet size={16} /> ટેબલેટ (Tablet)
                              </span>
                              <strong>
                                {visitorStats?.deviceStats?.Tablet || 0} ({tabPct}%)
                              </strong>
                            </div>
                            <div className="device-progress-track">
                              <div
                                className="device-progress-fill tablet-fill"
                                style={{ width: `${tabPct}%` }}
                              />
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* TOP VISITED PAGES */}
                <div className="v-detail-card pages-card">
                  <div className="v-card-header">
                    <h4>
                      <Globe size={20} /> મુખ્ય જોવાયેલા પેજ (Top Pages)
                    </h4>
                  </div>
                  <div className="v-pages-list">
                    {visitorStats?.topPages && visitorStats.topPages.length > 0 ? (
                      visitorStats.topPages.slice(0, 5).map((page, idx) => (
                        <div key={idx} className="v-page-row">
                          <span className="v-page-rank">{idx + 1}</span>
                          <span className="v-page-path" title={page._id}>
                            {page._id === "/" ? "Home (મુખ્ય પેજ)" : page._id}
                          </span>
                          <span className="v-page-count">{page.count} વિઝિટ</span>
                        </div>
                      ))
                    ) : (
                      <p className="v-empty-hint">હજી કોઈ ડેટા ઉપલબ્ધ નથી.</p>
                    )}
                  </div>
                </div>

                {/* BROWSERS & OS */}
                <div className="v-detail-card tech-card">
                  <div className="v-card-header">
                    <h4>
                      <Activity size={20} /> બ્રાઉઝર અને OS (Platforms)
                    </h4>
                  </div>
                  <div className="v-tech-group">
                    <p className="v-tech-label">બ્રાઉઝર્સ:</p>
                    <div className="v-pills-wrap">
                      {visitorStats?.browserStats && visitorStats.browserStats.length > 0 ? (
                        visitorStats.browserStats.map((b, idx) => (
                          <span key={idx} className="v-pill">
                            {b._id}: <strong>{b.count}</strong>
                          </span>
                        ))
                      ) : (
                        <span className="v-pill">કોઈ ડેટા નથી</span>
                      )}
                    </div>

                    <p className="v-tech-label" style={{ marginTop: "14px" }}>
                      ઓપરેટિંગ સિસ્ટમ:
                    </p>
                    <div className="v-pills-wrap">
                      {visitorStats?.osStats && visitorStats.osStats.length > 0 ? (
                        visitorStats.osStats.map((o, idx) => (
                          <span key={idx} className="v-pill os-pill">
                            {o._id}: <strong>{o.count}</strong>
                          </span>
                        ))
                      ) : (
                        <span className="v-pill">કોઈ ડેટા નથી</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* RECENT VISITOR ACTIVITY TABLE */}
              {visitorStats?.recentVisitors && visitorStats.recentVisitors.length > 0 && (
                <div className="v-recent-card">
                  <div className="v-card-header">
                    <h4>
                      <Eye size={20} /> તાજેતરની મુલાકાતી પ્રવૃત્તિ (Recent Activity)
                    </h4>
                    <span className="v-card-subhead">છેલ્લી {visitorStats.recentVisitors.length} વિઝિટ્સ</span>
                  </div>

                  <div className="v-table-wrapper">
                    <table className="v-table">
                      <thead>
                        <tr>
                          <th>પેજ (Page Path)</th>
                          <th>યુઝર પ્રકાર (User)</th>
                          <th>ડિવાઇસ (Device)</th>
                          <th>બ્રાઉઝર / OS</th>
                          <th>સમય (Time)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visitorStats.recentVisitors.map((v, i) => (
                          <tr key={i}>
                            <td className="v-table-path">
                              <code>{v.path}</code>
                            </td>
                            <td>
                              {v.isRegistered ? (
                                <span className="v-user-type-badge registered">
                                  <UserCheck size={13} /> રજીસ્ટર્ડ
                                </span>
                              ) : (
                                <span className="v-user-type-badge guest">
                                  <UserPlus size={13} /> નવો / ગેસ્ટ
                                </span>
                              )}
                            </td>
                            <td>
                              <span className={`v-device-badge ${v.device?.toLowerCase()}`}>
                                {v.device === "Mobile" ? (
                                  <Smartphone size={14} />
                                ) : v.device === "Tablet" ? (
                                  <Tablet size={14} />
                                ) : (
                                  <Monitor size={14} />
                                )}
                                {v.device || "Desktop"}
                              </span>
                            </td>
                            <td className="v-table-browser">
                              {v.browser} • {v.os}
                            </td>
                            <td className="v-table-time">
                              {formatTimeAgo(v.visitedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
              </div>

              <div className="admin-modal-footer analytics-modal-footer">
                <span className="analytics-modal-footer-hint">
                  લાઈવ ડેટા • છેલ્લી માહિતી: {new Date().toLocaleTimeString("gu-IN")}
                </span>
                <button
                  type="button"
                  className="admin-modal-close-action"
                  onClick={() => setActiveAnalyticsModal(null)}
                >
                  બંધ કરો
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* =================================================
            APP ANALYTICS POPUP MODAL (CENTERED POPUP)
        ================================================= */}
        {activeAnalyticsModal === "app" && typeof document !== "undefined" && createPortal(
          <div
            className="admin-modal-overlay"
            onClick={() => setActiveAnalyticsModal(null)}
          >
            <div
              className="admin-modal-content analytics-detail-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="admin-modal-header analytics-modal-header">
                <div className="visitor-title-wrap">
                  <div className="visitor-header-icon-box app-header-icon-box">
                    <Smartphone size={24} className="visitor-activity-icon" />
                  </div>
                  <div>
                    <h2>એપ ઇન્સ્ટોલેશન અને વપરાશકર્તા એનાલિટિક્સ (App Analytics)</h2>
                  </div>
                </div>

                <div className="analytics-modal-header-actions">
                  <button
                    type="button"
                    className="visitor-refresh-btn"
                    onClick={() => fetchAppStats(true)}
                    disabled={refreshingAppStats || loadingAppStats}
                    title="એપ એનાલિટિક્સ રિફ્રેશ કરો"
                  >
                    <RefreshCw
                      size={16}
                      className={refreshingAppStats ? "spinning-icon" : ""}
                    />
                    <span>{refreshingAppStats ? "રિફ્રેશિંગ..." : "રિફ્રેશ"}</span>
                  </button>

                  <button
                    type="button"
                    className="admin-modal-close-btn"
                    onClick={() => setActiveAnalyticsModal(null)}
                    title="બંધ કરો"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="admin-modal-body analytics-modal-body">

          {loadingAppStats && !appStats ? (
            <div className="v-loading-box">
              <RefreshCw size={24} className="spinning-icon" />
              <p>{txt("એપ ઇન્સ્ટોલેશન ડેટા લોડ થઈ રહ્યો છે...", "ऐप इंस्टॉलेशन डेटा लोड हो रहा है...", "Loading app installation data...")}</p>
            </div>
          ) : (
            <>
              {/* TOP 5 APP STATS CARDS */}
              <div className="visitor-stats-grid app-stat-cards-grid">
                {/* 1. TOTAL APP INSTALLS */}
                <div className="v-stat-card total-visits-card">
                  <div className="v-stat-icon-box blue-glow">
                    <Download size={24} />
                  </div>
                  <div className="v-stat-content">
                    <h3>{appStats?.totalInstalls || 0}</h3>
                    <p className="v-stat-label">કુલ સક્રિય એપ ઇન્સ્ટોલ</p>
                    <span className="v-stat-hint">
                      {appStats?.registeredInstalls || 0} રજીસ્ટર્ડ • {appStats?.guestInstalls || 0} ગેસ્ટ
                    </span>
                  </div>
                </div>

                {/* 2. TODAY'S NEW INSTALLS */}
                <div className="v-stat-card today-visits-card">
                  <div className="v-stat-icon-box green-glow">
                    <Sparkles size={24} />
                  </div>
                  <div className="v-stat-content">
                    <h3>{appStats?.todayInstalls || 0}</h3>
                    <p className="v-stat-label">આજના નવા ઇન્સ્ટોલ</p>
                    <span className="v-stat-hint">છેલ્લા 24 કલાકમાં</span>
                  </div>
                </div>

                {/* 3. TODAY'S ACTIVE USERS */}
                <div className="v-stat-card today-guest-card">
                  <div className="v-stat-icon-box gold-glow">
                    <Activity size={24} />
                  </div>
                  <div className="v-stat-content">
                    <h3>{appStats?.todayActive || 0}</h3>
                    <p className="v-stat-label">આજના સક્રિય એપ યુઝર્સ</p>
                    <span className="v-stat-hint">આજે એપ ખોલનાર ભક્તો</span>
                  </div>
                </div>

                {/* 4. NOTIFICATION SUBSCRIBERS */}
                <div className="v-stat-card registered-visitors-card">
                  <div className="v-stat-icon-box purple-glow">
                    <Bell size={24} />
                  </div>
                  <div className="v-stat-content">
                    <h3>{appStats?.notificationSubscribers || 0}</h3>
                    <p className="v-stat-label">નોટિફિકેશન સક્રિય</p>
                    <span className="v-stat-hint">એપ નોટિફિકેશન સબ્સ્ક્રાઇબર્સ</span>
                  </div>
                </div>

                {/* 5. TOTAL APP OPENS */}
                <div className="v-stat-card new-guest-card">
                  <div className="v-stat-icon-box amber-glow">
                    <Zap size={24} />
                  </div>
                  <div className="v-stat-content">
                    <h3>{appStats?.totalOpens || 0}</h3>
                    <p className="v-stat-label">કુલ એપ ઓપનિંગ્સ</p>
                    <span className="v-stat-hint">એપ લોન્ચ કાઉન્ટ</span>
                  </div>
                </div>
              </div>

              {/* PLATFORM BREAKDOWN & DETAILED INFO */}
              <div className="v-details-grid">
                {/* PLATFORMS */}
                <div className="v-detail-card devices-card">
                  <div className="v-card-header">
                    <h4>
                      <Smartphone size={20} /> ઓપરેટિંગ સિસ્ટમ (Platforms)
                    </h4>
                    <span className="v-card-subhead">ઇન્સ્ટોલ ડિવાઇસ પ્રકાર</span>
                  </div>
                  <div className="v-device-bars">
                    {(() => {
                      const total = appStats?.totalInstalls || 1;
                      const platforms = appStats?.platformStats || {};
                      const android = platforms["Android"] || 0;
                      const ios = platforms["iOS"] || 0;
                      const windows = platforms["Windows"] || 0;
                      const other = Object.entries(platforms)
                        .filter(([k]) => !["Android", "iOS", "Windows"].includes(k))
                        .reduce((sum, [, v]) => sum + v, 0);

                      const androidPct = Math.round((android / total) * 100);
                      const iosPct = Math.round((ios / total) * 100);
                      const winPct = Math.round((windows / total) * 100);
                      const otherPct = Math.round((other / total) * 100);

                      return (
                        <>
                          <div className="device-bar-row">
                            <div className="device-bar-label">
                              <span className="device-label-text">
                                <Smartphone size={16} /> એન્ડ્રોઇડ (Android)
                              </span>
                              <strong>{android} ({androidPct}%)</strong>
                            </div>
                            <div className="device-progress-track">
                              <div
                                className="device-progress-fill mobile-fill"
                                style={{ width: `${androidPct}%` }}
                              />
                            </div>
                          </div>

                          <div className="device-bar-row">
                            <div className="device-bar-label">
                              <span className="device-label-text">
                                <Smartphone size={16} /> એપલ (iOS / iPhone)
                              </span>
                              <strong>{ios} ({iosPct}%)</strong>
                            </div>
                            <div className="device-progress-track">
                              <div
                                className="device-progress-fill desktop-fill"
                                style={{ width: `${iosPct}%` }}
                              />
                            </div>
                          </div>

                          <div className="device-bar-row">
                            <div className="device-bar-label">
                              <span className="device-label-text">
                                <Monitor size={16} /> વિન્ડોઝ પીસી (Windows)
                              </span>
                              <strong>{windows} ({winPct}%)</strong>
                            </div>
                            <div className="device-progress-track">
                              <div
                                className="device-progress-fill tablet-fill"
                                style={{ width: `${winPct}%` }}
                              />
                            </div>
                          </div>

                          {other > 0 && (
                            <div className="device-bar-row">
                              <div className="device-bar-label">
                                <span className="device-label-text">
                                  <Globe size={16} /> અન્ય (macOS / Linux)
                                </span>
                                <strong>{other} ({otherPct}%)</strong>
                              </div>
                              <div className="device-progress-track">
                                <div
                                  className="device-progress-fill"
                                  style={{
                                    width: `${otherPct}%`,
                                    background: "#f59e0b",
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* USER SEGMENTS */}
                <div className="v-detail-card pages-card">
                  <div className="v-card-header">
                    <h4>
                      <Users size={20} /> યુઝર સેગમેન્ટ (Install Distribution)
                    </h4>
                  </div>
                  <div className="v-pages-list">
                    <div className="v-page-row">
                      <span className="v-page-rank" style={{ background: "#10b981" }}>1</span>
                      <span className="v-page-path">રજીસ્ટર્ડ ભક્તો (Registered Users)</span>
                      <span className="v-page-count" style={{ background: "#dcfce7", color: "#15803d" }}>
                        {appStats?.registeredInstalls || 0}
                      </span>
                    </div>
                    <div className="v-page-row">
                      <span className="v-page-rank" style={{ background: "#6366f1" }}>2</span>
                      <span className="v-page-path">અતિથિ ભક્તો (Guest / Direct Installs)</span>
                      <span className="v-page-count" style={{ background: "#ede9fe", color: "#6d28d9" }}>
                        {appStats?.guestInstalls || 0}
                      </span>
                    </div>
                    <div className="v-page-row">
                      <span className="v-page-rank" style={{ background: "#f59e0b" }}>3</span>
                      <span className="v-page-path">દૈનિક નોટિફિકેશન સબસ્ક્રાઇબર્સ</span>
                      <span className="v-page-count" style={{ background: "#fef3c7", color: "#b45309" }}>
                        {appStats?.notificationSubscribers || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* BROWSERS USED */}
                <div className="v-detail-card tech-card">
                  <div className="v-card-header">
                    <h4>
                      <Globe size={20} /> ઇન્સ્ટોલેશન બ્રાઉઝર્સ (Browsers)
                    </h4>
                  </div>
                  <div className="v-tech-group">
                    <p className="v-tech-label">બ્રાઉઝર વિગતો:</p>
                    <div className="v-pills-wrap">
                      {appStats?.browserStats && Object.keys(appStats.browserStats).length > 0 ? (
                        Object.entries(appStats.browserStats).map(([bName, bCount], idx) => (
                          <span key={idx} className="v-pill">
                            {bName}: <strong>{bCount}</strong>
                          </span>
                        ))
                      ) : (
                        <span className="v-pill">કોઈ ડેટા નથી</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* RECENT APP INSTALLATIONS TABLE */}
              {appStats?.recentInstallations && appStats.recentInstallations.length > 0 && (
                <div className="v-recent-card">
                  <div className="v-card-header">
                    <h4>
                      <Smartphone size={20} /> તાજેતરના એપ ઇન્સ્ટોલેશન્સ અને વપરાશકર્તા (Recent App Users)
                    </h4>
                    <span className="v-card-subhead">
                      છેલ્લા {appStats.recentInstallations.length} ડિવાઇસ
                    </span>
                  </div>

                  <div className="v-table-wrapper">
                    <table className="v-table">
                      <thead>
                        <tr>
                          <th>ડિવાઇસ આઇડી / યુઝર</th>
                          <th>પ્લેટફોર્મ (OS)</th>
                          <th>બ્રાઉઝર</th>
                          <th>નોટિફિકેશન</th>
                          <th>ઓપન કાઉન્ટ</th>
                          <th>ઇન્સ્ટોલ તારીખ</th>
                          <th>છેલ્લે સક્રિય</th>
                        </tr>
                      </thead>
                      <tbody>
                        {appStats.recentInstallations.map((item, i) => (
                          <tr key={i}>
                            <td className="v-table-path">
                              <div>
                                {item.userName ? (
                                  <strong style={{ color: "#1e3a8a", display: "block" }}>
                                    {item.userName}
                                  </strong>
                                ) : (
                                  <span style={{ color: "#64748b", fontStyle: "italic" }}>
                                    ગેસ્ટ ભક્ત (Guest)
                                  </span>
                                )}
                                <code>{item.deviceId ? `${item.deviceId.substring(0, 16)}...` : "ID"}</code>
                              </div>
                            </td>
                            <td>
                              <span className={`v-device-badge ${item.platform?.toLowerCase() || "mobile"}`}>
                                {item.platform === "Windows" ? (
                                  <Monitor size={14} />
                                ) : (
                                  <Smartphone size={14} />
                                )}
                                {item.platform || "Android"}
                              </span>
                            </td>
                            <td className="v-table-browser">
                              {item.browser || "Chrome"}
                            </td>
                            <td>
                              {item.hasNotificationEnabled ? (
                                <span className="v-user-type-badge registered" style={{ background: "#dcfce7", color: "#15803d" }}>
                                  <CheckCircle2 size={13} /> ચાલુ (5x/દિન)
                                </span>
                              ) : (
                                <span className="v-user-type-badge guest" style={{ background: "#f1f5f9", color: "#64748b" }}>
                                  <XCircle size={13} /> બંધ (OFF)
                                </span>
                              )}
                            </td>
                            <td style={{ fontWeight: 700, color: "#1e3a8a" }}>
                              {item.openCount || 1} વાર
                            </td>
                            <td className="v-table-time">
                              {item.installedAt
                                ? new Date(item.installedAt).toLocaleDateString("gu-IN")
                                : "-"}
                            </td>
                            <td className="v-table-time">
                              {formatTimeAgo(item.lastOpenedAt || item.installedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

              <div className="admin-modal-footer analytics-modal-footer">
                <span className="analytics-modal-footer-hint">
                  લાઈવ ડેટા • છેલ્લી માહિતી: {new Date().toLocaleTimeString("gu-IN")}
                </span>
                <button
                  type="button"
                  className="admin-modal-close-action"
                  onClick={() => setActiveAnalyticsModal(null)}
                >
                  બંધ કરો
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* =================================================
            USER FEEDBACKS & STAR RATINGS SECTION
        ================================================= */}
        {canManageFeedbacks && (
        <section className="feedback-section-box" aria-label="User Feedbacks">
          <div className="section-header feedback-section-header">
            <div className="visitor-title-wrap">
              <div className="visitor-header-icon-box" style={{ background: "rgba(245, 158, 11, 0.12)", color: "#d97706" }}>
                <Star size={24} fill="#f59e0b" color="#f59e0b" />
              </div>
              <div>
                <h2>પ્રતિસાદ અને સ્ટાર રેટિંગ્સ</h2>
                <span className="v-header-sub">
                  કુલ {feedbackSummary?.totalFeedbacks ?? feedbacks.length} ભક્તો દ્વારા પ્રતિસાદ નોંધાયા છે
                </span>
              </div>
            </div>

            <button
              type="button"
              className="visitor-refresh-btn"
              onClick={() => fetchFeedbacks(true)}
              disabled={refreshingFeedbacks || loadingFeedbacks}
              title="ફીડબેક રિફ્રેશ કરો"
            >
              <RefreshCw
                size={16}
                className={refreshingFeedbacks ? "spinning-icon" : ""}
              />
              <span>{refreshingFeedbacks ? "રિફ્રેશિંગ..." : "રિફ્રેશ"}</span>
            </button>
          </div>

          {loadingFeedbacks ? (
            <div className="v-loading-state">
              <RefreshCw size={28} className="spinning-icon" />
              <p>{txt("ફીડબેક અને રેટિંગ્સ લોડ થઈ રહ્યા છે...", "प्रतिक्रिया और रेटिंग लोड हो रही हैं...", "Loading feedback and ratings...")}</p>
            </div>
          ) : (
            <>
              {/* FILTER CONTROLS */}
              <div className="admin-feedback-filter-bar">
                <div className="admin-feedback-filter-group">
                  <span className="admin-feedback-filter-label">રેટિંગ:</span>
                  <div className="admin-feedback-pills">
                    {["all", "5", "4", "3", "2", "1"].map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`admin-feedback-pill ${feedbackRatingFilter === r ? "active" : ""}`}
                        onClick={() => setFeedbackRatingFilter(r)}
                      >
                        {r === "all" ? "બધા" : `${r} ★`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="admin-feedback-search-wrap">
                  <input
                    type="text"
                    placeholder="નામ કે મેસેજ શોધો..."
                    value={feedbackSearch}
                    onChange={(e) => setFeedbackSearch(e.target.value)}
                    className="user-search admin-feedback-search-input"
                  />
                </div>
              </div>

              {/* FEEDBACK LIST */}
              {(() => {
                const filtered = feedbacks.filter((fb) => {
                  if (feedbackRatingFilter !== "all" && fb.rating !== Number(feedbackRatingFilter)) {
                    return false;
                  }
                  if (feedbackSearch.trim()) {
                    const q = feedbackSearch.toLowerCase().trim();
                    const matchName = fb.name?.toLowerCase().includes(q);
                    const matchMsg = fb.message?.toLowerCase().includes(q);
                    const matchEmail = fb.email?.toLowerCase().includes(q);
                    if (!matchName && !matchMsg && !matchEmail) return false;
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="v-empty-card" style={{ padding: "40px 20px", textAlign: "center" }}>
                      <MessageSquare size={36} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
                      <p style={{ color: "#64748b", margin: 0, fontWeight: 600 }}>
                        પસંદ કરેલ ફિલ્ટર મુજબ કોઈ પ્રતિસાદ મળ્યો નથી.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="admin-feedbacks-grid">
                    {filtered.map((fb) => (
                      <div
                        key={fb._id}
                        className={`admin-feedback-compact-card ${fb.isLatestUserFeedback ? "is-latest" : "is-older"}`}
                        onClick={() => setActiveFeedbackModal(fb)}
                        role="button"
                        tabIndex={0}
                        title={fb.isLatestUserFeedback ? "સંપૂર્ણ વિગત અને સંદેશ જોવા માટે ક્લિક કરો (તાજેતરનો નવો પ્રતિસાદ)" : "સંપૂર્ણ વિગત અને સંદેશ જોવા માટે ક્લિક કરો (અગાઉનો જૂનો પ્રતિસાદ)"}
                      >
                        <div className="admin-fb-compact-top">
                          <div className="admin-fb-compact-user">
                            <div className="admin-fb-avatar-sm">
                              {(fb.name || "U").charAt(0).toUpperCase()}
                            </div>
                            <div className="admin-fb-compact-names">
                              <h4 className="admin-fb-compact-name" title={fb.name}>
                                {fb.name}
                              </h4>
                              <div className="admin-fb-badge-group">
                                <span className={`admin-fb-compact-badge ${fb.userId ? "registered" : "guest"}`}>
                                  {fb.userId ? "રજીસ્ટર્ડ" : "અતિથિ"}
                                </span>
                                {fb.isLatestUserFeedback ? (
                                  <span className="admin-fb-status-pill latest" title="તાજેતરનો (સૌથી નવો) પ્રતિસાદ">નવો</span>
                                ) : (
                                  <span className="admin-fb-status-pill older" title="અગાઉનો (જૂનો) પ્રતિસાદ">જૂનો</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {canDeleteFeedbacks && (
                            <button
                              type="button"
                              className="admin-fb-compact-del-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFeedback(fb._id, fb.name);
                              }}
                              disabled={deletingFeedbackId === fb._id}
                              title="આ પ્રતિસાદ ડિલીટ કરો"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        <div className="admin-fb-compact-mid">
                          <div className="admin-fb-compact-stars">
                            {fb.previousRating ? (
                              <div className="admin-fb-rating-transition" title={`અગાઉનું રેટિંગ: ${fb.previousRating}★ ➔ નવું રેટિંગ: ${fb.rating}★`}>
                                <span className="rating-prev-num">{fb.previousRating}★</span>
                                <span className="rating-arrow-icon">➔</span>
                                <span className="rating-curr-num">{fb.rating}★</span>
                              </div>
                            ) : (
                              <>
                                <Star size={13} fill="#f59e0b" color="#f59e0b" />
                                <span>{fb.rating}.0</span>
                              </>
                            )}
                          </div>

                          <span className="admin-fb-compact-time">
                            {formatTimeAgo(fb.createdAt)}
                          </span>
                        </div>

                        <div className="admin-fb-compact-bottom">
                          <span className="admin-fb-compact-btn">
                            <Eye size={13} />
                            <span>સંદેશ જુઓ</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </>
          )}
        </section>
        )}

        {/* =================================================
            FEEDBACK DETAIL VIEW MODAL (PORTAL DIRECTLY TO BODY)
        ================================================= */}
        {activeFeedbackModal && typeof document !== "undefined" && createPortal(
          <div
            className="admin-modal-overlay"
            onClick={() => setActiveFeedbackModal(null)}
          >
            <div
              className="admin-modal-content feedback-detail-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="admin-modal-header">
                <div className="admin-modal-user-info">
                  <div className="admin-fb-avatar">
                    {(activeFeedbackModal.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="admin-modal-user-name">
                      {activeFeedbackModal.name}
                      <span className={`admin-fb-badge ${activeFeedbackModal.userId ? "registered" : "guest"}`}>
                        {activeFeedbackModal.userId ? "રજીસ્ટર્ડ યુઝર" : "અતિથિ"}
                      </span>
                    </h3>
                    {activeFeedbackModal.email && (
                      <span className="admin-modal-user-email">
                        {activeFeedbackModal.email}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => setActiveFeedbackModal(null)}
                  title="બંધ કરો"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="admin-modal-body">
                {/* 1. LATEST VS OLDER STATUS BANNER */}
                <div
                  className={`admin-fb-status-banner ${
                    activeFeedbackModal.isLatestUserFeedback ? "is-latest" : "is-older"
                  }`}
                >
                  {activeFeedbackModal.isLatestUserFeedback ? (
                    <>
                      <Sparkles size={18} className="status-banner-icon" />
                      <div>
                        <strong>નવો પ્રતિસાદ (તાજેતરનો)</strong>
                        <p>આ યુઝરનો સૌથી નવો / તાજેતરનો પ્રતિસાદ છે.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Clock size={18} className="status-banner-icon" />
                      <div>
                        <strong>અગાઉનો પ્રતિસાદ (જૂનો)</strong>
                        <p>આ યુઝરનો જૂનો પ્રતિસાદ છે (યુઝરે ત્યારબાદ નવો પ્રતિસાદ અથવા રેટિંગ આપેલ છે).</p>
                      </div>
                    </>
                  )}
                </div>

                {/* 2. RATING SECTION: OLD RATING VS NEW RATING OR SINGLE RATING */}
                {activeFeedbackModal.previousRating ? (
                  <div className="admin-fb-rating-compare-card">
                    <div className="compare-rating-side old-rating">
                      <span className="compare-label">અગાઉનું (જૂનું) રેટિંગ</span>
                      <div className="compare-star-row">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            size={16}
                            fill={i <= activeFeedbackModal.previousRating ? "#f59e0b" : "none"}
                            color="#f59e0b"
                          />
                        ))}
                        <span className="compare-score">{activeFeedbackModal.previousRating}.0 ★</span>
                      </div>
                    </div>

                    <div className="compare-rating-arrow" title="રેટિંગ બદલાયું">
                      ➔
                    </div>

                    <div className="compare-rating-side new-rating">
                      <span className="compare-label">અપડેટેડ (નવું) રેટિંગ</span>
                      <div className="compare-star-row">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            size={16}
                            fill={i <= activeFeedbackModal.rating ? "#f59e0b" : "none"}
                            color="#f59e0b"
                          />
                        ))}
                        <span className="compare-score">{activeFeedbackModal.rating}.0 ★</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="admin-modal-meta-row">
                    <div className="admin-fb-stars">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          size={18}
                          fill={i <= activeFeedbackModal.rating ? "#f59e0b" : "none"}
                          color="#f59e0b"
                        />
                      ))}
                      <span className="admin-fb-rating-num" style={{ fontSize: "1rem" }}>
                        {activeFeedbackModal.rating}.0
                      </span>
                    </div>

                    <span className="admin-fb-first-rating-badge">
                      પ્રથમ રેટિંગ
                    </span>
                  </div>
                )}

                {/* 3. TIME META */}
                <div className="admin-modal-meta-row" style={{ marginTop: "4px" }}>
                  <span className="admin-fb-date">
                    તારીખ/સમય: {formatTimeAgo(activeFeedbackModal.createdAt)}
                    {activeFeedbackModal.createdAt && (
                      <span style={{ opacity: 0.75, marginLeft: "6px" }}>
                        ({new Date(activeFeedbackModal.createdAt).toLocaleDateString("gu-IN")})
                      </span>
                    )}
                  </span>
                </div>

                {/* 4. MESSAGES: BOTH OLD AND NEW SUGGESTIONS/MESSAGES */}
                {activeFeedbackModal.previousMessage && activeFeedbackModal.previousMessage !== activeFeedbackModal.message ? (
                  <div className="admin-modal-messages-comparison">
                    {/* OLD SUGGESTION / MESSAGE */}
                    <div className="admin-modal-message-box old-message">
                      <h4 className="admin-modal-message-title old-title">
                        <Clock size={16} /> અગાઉનું (જૂનું) સૂચન / સંદેશ:
                      </h4>
                      <p>{activeFeedbackModal.previousMessage}</p>
                    </div>

                    {/* NEW / UPDATED SUGGESTION / MESSAGE */}
                    <div className="admin-modal-message-box new-message">
                      <h4 className="admin-modal-message-title new-title">
                        <Sparkles size={16} /> અપડેટેડ (નવું) સૂચન / સંદેશ:
                      </h4>
                      <p>{activeFeedbackModal.message}</p>
                    </div>
                  </div>
                ) : (
                  <div className="admin-modal-message-box">
                    <h4 className="admin-modal-message-title">
                      <MessageSquare size={16} /> પ્રતિસાદ / સૂચન સંદેશ (ફરજિયાત):
                    </h4>
                    <p>{activeFeedbackModal.message}</p>
                  </div>
                )}
              </div>

              <div className="admin-modal-footer">
                {canDeleteFeedbacks && (
                <button
                  type="button"
                  className="admin-modal-del-btn"
                  onClick={() => {
                    handleDeleteFeedback(activeFeedbackModal._id, activeFeedbackModal.name);
                    setActiveFeedbackModal(null);
                  }}
                  disabled={deletingFeedbackId === activeFeedbackModal._id}
                >
                  <Trash2 size={16} />
                  <span>
                    {deletingFeedbackId === activeFeedbackModal._id
                      ? txt("ડિલીટ થઈ રહ્યું છે...", "डिलीट हो रहा है...", "Deleting...")
                      : txt("પ્રતિસાદ ડિલીટ કરો", "प्रतिक्रिया डिलीट करें", "Delete Feedback")}
                  </span>
                </button>
                )}

                <button
                  type="button"
                  className="admin-modal-close-action"
                  onClick={() => setActiveFeedbackModal(null)}
                >
                  બંધ કરો
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* =================================================
            USERS
        ================================================= */}

        {canManageUsers && (
        <div className="users-section">

          <div className="section-header">

            <div>

              <h2>
                Registered Users
              </h2>

              <span>
                {users.length} Users
              </span>

            </div>


            <input
              type="text"
              placeholder="Search user..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="user-search"
            />

          </div>


          {/* =================================================
              LOADING
          ================================================= */}

          {loading && (
            <p className="status-message">
              Loading users...
            </p>
          )}


          {/* =================================================
              ERROR
          ================================================= */}

          {message && (
            <p className="status-message error">
              {message}
            </p>
          )}


          {/* =================================================
              USERS TABLE
          ================================================= */}

          {!loading &&
            !message &&
            filteredUsers.length > 0 && (

              <div className="users-table-wrapper">

                <table className="users-table">

                  <thead>

                    <tr>

                      <th>#</th>

                      <th>Name</th>

                      <th>Mobile</th>

                      <th>Email</th>

                      <th>Birth Date</th>

                      <th>State</th>

                      <th>City / Village</th>

                      <th>Role</th>

                      <th>મુલાકાતો</th>

                      <th>Joined</th>

                      <th>Action</th>

                    </tr>

                  </thead>


                  <tbody>

                    {filteredUsers.map((user, index) => {
                      const isSuper = isSuperAdminUser(user);
                      const isSubAdmin = user.role === "admin" && !isSuper;
                      const isMainSuper = (user.email || "").toLowerCase() === "gitagyanm700@gmail.com";
                      const isCoSuper = (user.email || "").toLowerCase() === "aambaliyamanav@gmail.com";

                      return (
                        <tr
                          key={user._id}
                          className={`user-row ${
                            isSuper
                              ? "user-row-super-admin"
                              : isSubAdmin
                              ? "user-row-admin"
                              : "user-row-regular"
                          }`}
                        >
                          <td className="user-index-cell">
                            {isSuper ? (
                              <span className="super-admin-index-pill" title={isMainSuper ? "મુખ્ય સુપર એડમિન (#1)" : "સુપર એડમિન (#2)"}>
                                <Crown size={12} className="super-admin-crown-icon" />
                                {index + 1}
                              </span>
                            ) : isSubAdmin ? (
                              <span className="admin-user-index-pill" title="એડમિન">
                                {index + 1}
                              </span>
                            ) : (
                              <span className="regular-user-index-pill">
                                {index + 1}
                              </span>
                            )}
                          </td>

                          <td className="user-name">
                            <div className="user-name-wrapper">
                              <span>{user.name}</span>
                              {isSuper && (
                                <span className="super-admin-name-tag" title="મુખ્ય સંચાલક (Owner)">
                                  👑 {isMainSuper ? "Master Owner" : "Co-Owner"}
                                </span>
                              )}
                            </div>
                          </td>


                          <td>
                            {user.mobile || "-"}
                          </td>


                          <td>
                            {user.email}
                          </td>


                          <td>

                            {user.birthDate
                              ? new Date(
                                  user.birthDate
                                ).toLocaleDateString(
                                  "en-IN"
                                )
                              : "-"}

                          </td>


                          <td>
                            <span className="user-location-badge">
                              {user.state || "Gujarat"}
                            </span>
                          </td>


                          <td className="user-city-cell">
                            {user.city || "-"}
                          </td>


                          <td>
                            {isSuper ? (
                              <div className="super-admin-role-box">
                                <span className="role super-admin-role" title="સર્વોચ્ચ સુપર એડમિન (Super Admin)">
                                  👑 Super Admin
                                </span>
                                <span className="super-admin-sub-tag">
                                  {isMainSuper ? "સર્વોચ્ચ સંચાલક" : "સહ-સંચાલક"}
                                </span>
                              </div>
                            ) : user.role === "admin" ? (
                              <div className="admin-role-badge-group">
                                <span className="role admin-role">
                                  🛡️ Admin
                                </span>
                                <span
                                  className="admin-perm-pill"
                                  title={
                                    Array.isArray(user.permissions) && user.permissions.length > 0
                                      ? user.permissions
                                          .map((p) => getPermissionLabel(p, isHindi ? "hi" : isEnglish ? "en" : "gu"))
                                          .join(", ")
                                      : "બધા અધિકારો"
                                  }
                                >
                                  {user.permissions?.length || 0} {txt("પરમિશન", "अनुमति", "perms")}
                                </span>
                              </div>
                            ) : (
                              <span className="role user-role">
                                {user.role}
                              </span>
                            )}
                          </td>


                          <td>

                            <span className="user-visits-badge" title={`આ યુઝરે રજીસ્ટર કર્યા પછી કુલ ${user.visitCount || 0} વખત મુલાકાત લીધી છે`}>
                              <Eye size={13} className="user-visits-icon" />
                              {user.visitCount || 0}
                            </span>

                          </td>


                          <td>

                            {user.createdAt
                              ? new Date(
                                  user.createdAt
                                ).toLocaleDateString(
                                  "en-IN"
                                )
                              : "-"}

                          </td>


                          <td>
                            {isSuper ? (
                              <span className="protected-user super-admin-protected-badge" title="મુખ્ય ઓનર - સુરક્ષિત એકાઉન્ટ">
                                <Lock className="btn-icon" size={14} /> Owner
                              </span>
                            ) : (user._id === loggedInUser?._id || user._id === loggedInUser?.id) ? (
                              <span className="protected-user" style={{ color: "#3b82f6" }}>
                                <Shield className="btn-icon" size={14} /> {txt("તમે (You)", "आप (You)", "You")}
                              </span>
                            ) : (
                              <div className="user-action-buttons">
                                {canManageAdmins && (
                                  <>
                                    {user.role === "admin" ? (
                                      <>
                                        <button
                                          type="button"
                                          className="user-action-btn edit-perm-btn"
                                          onClick={() => openPermissionModal(user)}
                                          title={txt("પરમિશન્સ બદલો", "अनुमतियाँ बदलें", "Edit Permissions")}
                                        >
                                          <Shield size={13} />
                                          <span>{txt("પરમિશન", "अनुमति", "Perms")}</span>
                                        </button>

                                        <button
                                          type="button"
                                          className="user-action-btn revoke-admin-btn"
                                          onClick={() => handleRevokeAdmin(user)}
                                          title={txt("Admin હટાવો / User બનાવો", "Admin हटाएं / User बनाएं", "Make User")}
                                        >
                                          <UserMinus size={13} />
                                          <span>{txt("User", "User", "User")}</span>
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        className="user-action-btn make-admin-btn"
                                        onClick={() => openPermissionModal(user)}
                                        title={txt("આ યુઝરને Admin બનાવો", "इस यूजर को Admin बनाएं", "Make Admin")}
                                      >
                                        <Shield size={13} />
                                        <span>{txt("Admin બનાવો", "Admin बनाएं", "Make Admin")}</span>
                                      </button>
                                    )}
                                  </>
                                )}

                                {canDeleteUsers && user.role !== "admin" && (
                                  <button
                                    className="delete-user-btn"
                                    onClick={() => deleteUser(user._id, user.name)}
                                    disabled={deletingId === user._id}
                                    title={txt("યુઝર ડિલીટ કરો", "उपयोगकर्ता हटाएं", "Delete User")}
                                  >
                                    {deletingId === user._id ? (
                                      "..."
                                    ) : (
                                      <span><Trash2 className="btn-icon" size={14} /> Delete</span>
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                        </tr>
                      );
                    })}

                  </tbody>

                </table>

              </div>

            )}


          {/* =================================================
              NO USERS
          ================================================= */}

          {!loading &&
            !message &&
            filteredUsers.length === 0 && (

              <p className="status-message">
                કોઈ user મળ્યો નથી.
              </p>

            )}

        </div>
        )}

        {/* =================================================
            ADMIN ROLE & PERMISSIONS MODAL (PORTAL)
        ================================================= */}
        {permissionModalUser && typeof document !== "undefined" && createPortal(
          <div
            className="admin-modal-overlay"
            onClick={() => !savingPermissions && setPermissionModalUser(null)}
          >
            <div
              className="admin-modal-content admin-permissions-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="admin-modal-header">
                <div className="admin-perm-modal-title-area">
                  <div className="admin-perm-icon-bubble">
                    <Shield size={24} color="#175bb5" />
                  </div>
                  <div>
                    <h3 className="admin-modal-user-name">
                      {permissionModalUser.role === "admin"
                        ? txt("એડમિન પરમિશન્સ સંપાદિત કરો", "एडमिन अनुमतियां संपादित करें", "Edit Admin Permissions")
                        : txt("નવા Admin બનાવો & પરમિશન્સ આપો", "नया Admin बनाएं और अनुमतियां दें", "Make Admin & Grant Permissions")}
                    </h3>
                    <span className="admin-modal-user-email">
                      {permissionModalUser.name} ({permissionModalUser.email})
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="admin-modal-close-btn"
                  onClick={() => !savingPermissions && setPermissionModalUser(null)}
                  title="બંધ કરો"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="admin-modal-body admin-perm-modal-body">
                <div className="admin-perm-selection-bar">
                  <div className="admin-perm-count-chip">
                    {txt(
                      `${selectedPermissions.length} / ${availablePermissions.length} પરમિશન પસંદ કરેલ છે`,
                      `${selectedPermissions.length} / ${availablePermissions.length} अनुमतियां चुनी गईं`,
                      `${selectedPermissions.length} of ${availablePermissions.length} permissions granted`
                    )}
                  </div>
                  <button
                    type="button"
                    className="admin-perm-select-all-btn"
                    onClick={handleSelectAllPermissions}
                  >
                    {selectedPermissions.length === availablePermissions.length
                      ? txt("બધી હટાવો (Deselect All)", "सभी हटाएं (Deselect All)", "Deselect All")
                      : txt("બધી પસંદ કરો (Select All)", "सभी चुनें (Select All)", "Select All")}
                  </button>
                </div>

                <p className="admin-perm-help-text">
                  {txt(
                    "આ યુઝરને એડમિન પેનલમાં જે સુવિધાઓની મંજૂરી આપવી હોય તેની સામેના બોક્સ પર ટીક કરો:",
                    "इस उपयोगकर्ता को एडमिन पैनल में जिन सुविधाओं की अनुमति देनी हो उन्हें चुनें:",
                    "Select the features and privileges this administrator should have access to:"
                  )}
                </p>

                <div className="admin-perm-grid">
                  {availablePermissions.map((perm) => {
                    const isChecked = selectedPermissions.includes(perm.id);
                    return (
                      <div
                        key={perm.id}
                        className={`admin-perm-card ${isChecked ? "is-selected" : ""} ${perm.isDanger ? "is-danger-card" : ""}`}
                        onClick={() => togglePermission(perm.id)}
                      >
                        <div className="admin-perm-card-check">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                          />
                        </div>
                        <div className="admin-perm-card-content">
                          <div className="admin-perm-card-title">
                            {isHindi ? perm.nameHi : isEnglish ? perm.nameEn : perm.nameGu}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="admin-modal-footer admin-perm-modal-footer">
                <button
                  type="button"
                  className="admin-perm-cancel-btn"
                  disabled={savingPermissions}
                  onClick={() => setPermissionModalUser(null)}
                >
                  {txt("રદ કરો", "रद्द करें", "Cancel")}
                </button>

                <button
                  type="button"
                  className="admin-perm-save-btn"
                  disabled={savingPermissions || selectedPermissions.length === 0}
                  onClick={handleSavePermissions}
                >
                  {savingPermissions ? (
                    <>
                      <RefreshCw size={16} className="spin-icon" /> {txt("સેવ થઈ રહ્યું છે...", "सेव हो रहा है...", "Saving...")}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> {txt("પરમિશન સેવ કરો", "अनुमति सेव करें", "Save Permissions")}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* =================================================
            ROLE CHANGE TOAST NOTIFICATION
        ================================================= */}
        {roleToastMessage && (
          <div className="admin-role-toast">
            <Sparkles size={18} className="toast-sparkle-icon" />
            <span>{roleToastMessage}</span>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => setRoleToastMessage("")}
            >
              ×
            </button>
          </div>
        )}

      </div>

    </main>
  );
}

export default Admin;