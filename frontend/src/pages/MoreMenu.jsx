import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Compass,
  Trophy,
  Clock,
  Star,
  ShieldCheck,
  Globe,
  Download,
  Bell,
  Info,
  LogOut,
  LogIn,
  UserPlus,
  ChevronRight,
  Sparkles,
  CircleUser,
  Check,
  BookOpen,
  Video,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { hasPermission } from "../utils/permissionHelper.js";
import {
  promptInstallApp,
  isRunningInStandaloneApp,
} from "../utils/pwaManager.js";
import {
  isAppNotificationEnabled,
  unsubscribeAppNotifications,
  enableAppNotifications,
} from "../utils/appPushNotification.js";
import "./MoreMenu.css";

export default function MoreMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { language, setLanguage, txt } = useLanguage();

  const isStandalone = isRunningInStandaloneApp();
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const enabled = await isAppNotificationEnabled();
        if (mounted) setNotifEnabled(enabled);
      } catch (e) {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleProtectedNavigation = (targetPath, requiredMessage) => {
    if (user) {
      navigate(targetPath);
    } else {
      sessionStorage.setItem(
        "authRedirect",
        JSON.stringify({
          from: targetPath,
          message: requiredMessage,
        })
      );
      navigate("/login", {
        state: {
          from: targetPath,
          message: requiredMessage,
        },
      });
    }
  };

  const handleLogout = () => {
    const confirmed = window.confirm(
      txt(
        "શું તમે ખરેખર Logout કરવા માંગો છો?",
        "क्या आप वाकई Logout करना चाहते हैं?",
        "Are you sure you want to Logout?"
      )
    );
    if (!confirmed) return;
    logout();
    navigate("/");
  };

  const handleToggleNotification = async () => {
    if (notifLoading) return;
    setNotifLoading(true);
    try {
      if (notifEnabled) {
        const res = await unsubscribeAppNotifications();
        if (res.success) setNotifEnabled(false);
      } else {
        const res = await enableAppNotifications();
        if (res.success) setNotifEnabled(true);
      }
    } catch (e) {
    } finally {
      setNotifLoading(false);
    }
  };

  const handleOpenAiAssistant = () => {
    window.dispatchEvent(new CustomEvent("open-gita-ai-assistant"));
  };

  const handleOpenFeedback = () => {
    window.dispatchEvent(new CustomEvent("open-feedback-modal"));
  };

  const handleInstallApp = async () => {
    const res = await promptInstallApp();
    if (res?.alreadyInstalled) {
      alert(res.message);
      return;
    }
    if (!res?.success) {
      window.dispatchEvent(new CustomEvent("open-pwa-install-banner"));
    }
  };

  return (
    <div className="more-menu-page">
      <div className="more-menu-container">
        {/* ================= USER PROFILE CARD ================= */}
        <div className="more-profile-card">
          <div className="more-profile-avatar-wrap">
            {user ? (
              <div className="more-avatar-circle">
                {(user.name || "U").charAt(0).toUpperCase()}
              </div>
            ) : (
              <div className="more-avatar-guest">
                <CircleUser size={44} />
              </div>
            )}
          </div>

          <div className="more-profile-info">
            <h2 className="more-profile-name">
              {user ? user.name || txt("ભક્ત", "भक्त", "Devotee") : txt("અતિથિ ભક્ત", "अतिथि भक्त", "Guest Devotee")}
            </h2>
            <p className="more-profile-subtitle">
              {user ? user.email : txt("ગીતા પ્રેમી - દૈવી જ્ઞાનની યાત્રા", "गीता प्रेमी - दिव्य ज्ञान की यात्रा", "Gita Devotee - Divine Wisdom")}
            </p>
            {user && (
              <span className={`more-role-badge ${user.role === "admin" ? "admin" : "user"}`}>
                {user.role === "admin" ? txt("એડમિન", "व्यवस्थापक (Admin)", "Admin") : txt("ભક્ત", "भक्त", "Devotee")}
              </span>
            )}
          </div>

          {user ? (
            <button
              type="button"
              className="more-profile-action-btn"
              onClick={() => navigate("/profile")}
            >
              <span>{txt("પ્રોફાઇલ", "प्रोफ़ाइल", "Profile")}</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <div className="more-guest-actions">
              <button
                type="button"
                className="more-login-btn"
                onClick={() => navigate("/login")}
              >
                <LogIn size={15} />
                <span>{txt("લૉગિન", "लॉगिन", "Login")}</span>
              </button>
              <button
                type="button"
                className="more-register-btn"
                onClick={() => navigate("/register")}
              >
                <UserPlus size={15} />
                <span>{txt("સાઇન અપ", "साइन अप", "Sign Up")}</span>
              </button>
            </div>
          )}
        </div>

        {/* ================= SECTION 1: PREFERENCES & SETTINGS ================= */}
        <div className="more-section">
          <h3 className="more-section-title">
            {txt("પસંદગીઓ અને સેટિંગ્સ", "प्राथमिकताएं और सेटिंग्स", "Preferences & Settings")}
          </h3>

          <div className="more-card-list">
            {/* LANGUAGE SELECTOR */}
            <div className="more-setting-row">
              <div className="setting-left">
                <div className="more-item-icon">
                  <Globe size={20} />
                </div>
                <div className="more-item-text">
                  <strong>{txt("ભાષા", "भाषा", "Language")}</strong>
                </div>
              </div>
              <div className="more-lang-pills">
                <button
                  type="button"
                  className={`lang-pill ${language === "gu" ? "active" : ""}`}
                  onClick={() => setLanguage("gu")}
                >
                  ગુજરાતી
                </button>
                <button
                  type="button"
                  className={`lang-pill ${language === "hi" ? "active" : ""}`}
                  onClick={() => setLanguage("hi")}
                >
                  हिन्दी
                </button>
                <button
                  type="button"
                  className={`lang-pill ${language === "en" ? "active" : ""}`}
                  onClick={() => setLanguage("en")}
                >
                  EN
                </button>
              </div>
            </div>

            {/* APP NOTIFICATIONS (STANDALONE ONLY) */}
            {isStandalone && (
              <div className="more-setting-row" onClick={handleToggleNotification}>
                <div className="setting-left">
                  <div className="more-item-icon">
                    <Bell size={20} />
                  </div>
                  <div className="more-item-text">
                    <strong>{txt("નોટિફિકેશન", "सूचनाएं", "Notifications")}</strong>
                  </div>
                </div>
                <div className={`more-switch-pill ${notifEnabled ? "on" : "off"}`}>
                  {notifEnabled ? "ON" : "OFF"}
                </div>
              </div>
            )}

            {/* INSTALL APP (IF NOT STANDALONE) */}
            {!isStandalone && (
              <div className="more-item-row" onClick={handleInstallApp}>
                <div className="more-item-icon">
                  <Download size={20} />
                </div>
                <div className="more-item-text">
                  <strong>{txt("એપ ઇન્સ્ટોલ કરો", "ऐप इंस्टॉल करें", "Install App")}</strong>
                </div>
                <ChevronRight size={18} className="more-row-arrow" />
              </div>
            )}
          </div>
        </div>

        {/* ================= SECTION 2: SPECIAL STUDY FEATURES (EXCLUDING 4 BOTTOM TABS) ================= */}
        <div className="more-section">
          <h3 className="more-section-title">
            {txt("વિશેષ અધ્યયન સુવિધાઓ", "विशेष अध्ययन सुविधाएं", "Special Features")}
          </h3>

          <div className="more-card-list">
            {/* LIFE GUIDANCE */}
            <div
              className="more-item-row"
              onClick={() =>
                handleProtectedNavigation(
                  "/guidance",
                  txt(
                    "જીવન માર્ગદર્શન મેળવવા માટે Login કરવું જરૂરી છે.",
                    "जीवन मार्गदर्शन पाने के लिए Login करना आवश्यक है।",
                    "Login is required to access Life Guidance."
                  )
                )
              }
            >
              <div className="more-item-icon">
                <Compass size={20} />
              </div>
              <div className="more-item-text">
                <strong>{txt("જીવન માર્ગદર્શન", "जीवन मार्गदर्शन", "Life Guidance")}</strong>
              </div>
              <ChevronRight size={18} className="more-row-arrow" />
            </div>

            {/* READING TRACKER */}
            <div
              className="more-item-row"
              onClick={() =>
                handleProtectedNavigation(
                  "/reading-tracker",
                  txt(
                    "વાંચન પ્રગતિ જોવા માટે Login કરવું જરૂરી છે.",
                    "पठन प्रगति देखने के लिए Login करना आवश्यक है।",
                    "Login is required to view Reading Tracker."
                  )
                )
              }
            >
              <div className="more-item-icon">
                <Trophy size={20} />
              </div>
              <div className="more-item-text">
                <strong>{txt("વાંચન પ્રગતિ (Tracker)", "पठन प्रगति (Tracker)", "Reading Tracker")}</strong>
              </div>
              <ChevronRight size={18} className="more-row-arrow" />
            </div>

            {/* QUIZ HISTORY */}
            <div
              className="more-item-row"
              onClick={() =>
                handleProtectedNavigation(
                  "/quiz-results",
                  txt(
                    "તમારો ક્વિઝ ઇતિહાસ જોવા માટે Login કરવું જરૂરી છે.",
                    "अपना क्विज़ इतिहास देखने के लिए Login करना आवश्यक है।",
                    "Login is required to view Quiz History."
                  )
                )
              }
            >
              <div className="more-item-icon">
                <Clock size={20} />
              </div>
              <div className="more-item-text">
                <strong>{txt("ક્વિઝ ઇતિહાસ", "क्विज़ इतिहास", "Quiz History")}</strong>
              </div>
              <ChevronRight size={18} className="more-row-arrow" />
            </div>

            {/* ACHIEVEMENTS */}
            <div
              className="more-item-row"
              onClick={() =>
                handleProtectedNavigation(
                  "/quiz-achievements",
                  txt(
                    "સિદ્ધિઓ જોવા માટે Login કરવું જરૂરી છે.",
                    "उपलब्धियां देखने के लिए Login करना आवश्यक है।",
                    "Login is required to view achievements."
                  )
                )
              }
            >
              <div className="more-item-icon">
                <Star size={20} />
              </div>
              <div className="more-item-text">
                <strong>{txt("સિદ્ધિઓ અને બેજ", "उपलब्धियां और बैज", "Achievements & Badges")}</strong>
              </div>
              <ChevronRight size={18} className="more-row-arrow" />
            </div>

            {/* GITA AI ASSISTANT */}
            <div className="more-item-row" onClick={handleOpenAiAssistant}>
              <div className="more-item-icon">
                <Sparkles size={20} />
              </div>
              <div className="more-item-text">
                <strong>{txt("ગીતા AI સહાયક", "गीता AI सहायक", "Gita AI Assistant")}</strong>
              </div>
              <ChevronRight size={18} className="more-row-arrow" />
            </div>
          </div>
        </div>

        {/* ================= SECTION 3: ADMIN PANEL (IF ADMIN) ================= */}
        {user?.role === "admin" && (
          <div className="more-section">
            <h3 className="more-section-title admin-title">
              {txt("એડમિન પેનલ (Admin)", "व्यवस्थापक (Admin)", "Admin Panel")}
            </h3>

            <div className="more-card-list">
              <div className="more-item-row" onClick={() => navigate("/admin")}>
                <div className="more-item-icon">
                  <ShieldCheck size={20} />
                </div>
                <div className="more-item-text">
                  <strong>{txt("એડમિન ડેશબોર્ડ", "व्यवस्थापक डैशबोर्ड", "Admin Dashboard")}</strong>
                </div>
                <ChevronRight size={18} className="more-row-arrow" />
              </div>

              <div className="more-item-row" onClick={() => navigate("/admin/shloks")}>
                <div className="more-item-icon">
                  <BookOpen size={20} />
                </div>
                <div className="more-item-text">
                  <strong>{txt("શ્લોક વ્યવસ્થાપન", "श्लोक प्रबंधन", "Shlok Management")}</strong>
                </div>
                <ChevronRight size={18} className="more-row-arrow" />
              </div>

              <div className="more-item-row" onClick={() => navigate("/admin/quiz")}>
                <div className="more-item-icon">
                  <Trophy size={20} />
                </div>
                <div className="more-item-text">
                  <strong>{txt("ક્વિઝ વ્યવસ્થાપન", "क्विज़ प्रबंधन", "Quiz Management")}</strong>
                </div>
                <ChevronRight size={18} className="more-row-arrow" />
              </div>

              <div className="more-item-row" onClick={() => navigate("/admin/video-creator")}>
                <div className="more-item-icon">
                  <Video size={20} />
                </div>
                <div className="more-item-text">
                  <strong>{txt("સ્ટોરી વિડીયો સ્ટુડિયો", "स्टोरी वीडियो स्टूडियो", "Story Video Studio")}</strong>
                </div>
                <ChevronRight size={18} className="more-row-arrow" />
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 4: GENERAL & FEEDBACK ================= */}
        <div className="more-section">
          <h3 className="more-section-title">
            {txt("સામાન્ય", "सामान्य", "General")}
          </h3>

          <div className="more-card-list">
            {/* FEEDBACK & RATING */}
            <div className="more-item-row" onClick={handleOpenFeedback}>
              <div className="more-item-icon">
                <Star size={20} />
              </div>
              <div className="more-item-text">
                <strong>{txt("અભિપ્રાય અને રેટિંગ", "प्रतिक्रिया और रेटिंग", "Feedback & Rating")}</strong>
              </div>
              <ChevronRight size={18} className="more-row-arrow" />
            </div>

            {/* ABOUT US */}
            <div className="more-item-row" onClick={() => navigate("/about")}>
              <div className="more-item-icon">
                <Info size={20} />
              </div>
              <div className="more-item-text">
                <strong>{txt("એપ્લિકેશન વિશે", "ऐप के बारे में", "About Application")}</strong>
              </div>
              <ChevronRight size={18} className="more-row-arrow" />
            </div>
          </div>
        </div>

        {/* ================= SECTION 5: ACCOUNT LOGOUT ================= */}
        {user && (
          <div className="more-section logout-section">
            <button
              type="button"
              className="more-logout-btn"
              onClick={handleLogout}
            >
              <LogOut size={18} />
              <span>{txt("લૉગઆઉટ કરો (Logout)", "लॉगआउट करें (Logout)", "Log Out")}</span>
            </button>
          </div>
        )}

        <div className="more-footer-sanskrit">
          ॥ श्रीमद्भगवद्गीता ॥
        </div>
      </div>
    </div>
  );
}
