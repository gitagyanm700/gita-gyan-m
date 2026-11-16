import { useEffect, useState, useRef } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  ChevronLeft,
  ChevronRight,
  Home,
  BookOpen,
  Heart,
  Brain,
  Clock,
  CircleUser,
  ShieldCheck,
  LogIn,
  UserPlus,
  LogOut,
  Moon,
  Sun,
  X,
  Menu,
  Compass,
  Star,
  Info,
  Download,
  Bell,
  Globe,
  Check,
} from "lucide-react";

import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import {
  promptInstallApp,
  isRunningInStandaloneApp,
  onInstallPromptChange,
} from "../utils/pwaManager.js";
import {
  isAppNotificationEnabled,
  unsubscribeAppNotifications,
  enableAppNotifications,
} from "../utils/appPushNotification.js";
import { trackAppInstallOrOpen } from "../utils/appAnalytics.js";
import MobileBottomNav from "./MobileBottomNav.jsx";
import MobileTopHeader from "./MobileTopHeader.jsx";
import SearchModal from "./SearchModal.jsx";

import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  // =====================================================
  // LANGUAGE CONTEXT
  // =====================================================

  const { language, setLanguage, toggleLanguage, isHindi, isEnglish, txt } = useLanguage();

  // 3-Language Menu State & Outside Click Handler
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // =====================================================
  // AUTH CONTEXT
  // =====================================================

  const { user, logout } = useAuth();

  // =====================================================
  // THEME CONTEXT
  // =====================================================

  const { theme, toggleTheme } = useTheme();

  // =====================================================
  // MENU
  // =====================================================

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  useEffect(() => {
    const handleOpenSearch = () => setSearchModalOpen(true);
    window.addEventListener("open-gita-search-modal", handleOpenSearch);
    return () => {
      window.removeEventListener("open-gita-search-modal", handleOpenSearch);
    };
  }, []);

  // =====================================================
  // SCROLL STATE
  // =====================================================

  const [scrolled, setScrolled] = useState(false);

  // =====================================================
  // PWA APP RUNTIME STATE (SHOW INSTALL IN BROWSER, NOTIF IN APP)
  // =====================================================

  const [isStandaloneApp, setIsStandaloneApp] = useState(() => isRunningInStandaloneApp());

  useEffect(() => {
    setIsStandaloneApp(isRunningInStandaloneApp());
    const unsubscribe = onInstallPromptChange((canInstall, isStandalone) => {
      setIsStandaloneApp(isStandalone);
    });
    return () => unsubscribe();
  }, []);

  // =====================================================
  // APP NOTIFICATIONS STATE (INSIDE INSTALLED APP)
  // =====================================================

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    if (isStandaloneApp) {
      setNotifEnabled(isAppNotificationEnabled());
    }
    const handleNotifStatus = (e) => {
      setNotifEnabled(Boolean(e.detail?.enabled));
    };
    window.addEventListener("app-notification-status-changed", handleNotifStatus);
    return () => {
      window.removeEventListener("app-notification-status-changed", handleNotifStatus);
    };
  }, [isStandaloneApp]);

  const handleToggleNotification = async () => {
    if (notifLoading) return;
    setNotifLoading(true);
    try {
      if (notifEnabled) {
        await unsubscribeAppNotifications();
        setNotifEnabled(false);
        trackAppInstallOrOpen(false);
      } else {
        const res = await enableAppNotifications(user);
        if (res.success) {
          setNotifEnabled(true);
          trackAppInstallOrOpen(false);
        }
      }
    } finally {
      setNotifLoading(false);
    }
  };

  // =====================================================
  // NAVIGATION HISTORY (PERSISTED IN SESSIONSTORAGE)
  // =====================================================

  const [navHistory, setNavHistory] = useState(() => {
    const currentPath =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : location.pathname + location.search;

    if (typeof window !== "undefined") {
      try {
        const savedStack = sessionStorage.getItem("gita_nav_history_stack");
        const savedIndex = sessionStorage.getItem("gita_nav_history_index");

        if (savedStack && savedIndex !== null) {
          const parsedStack = JSON.parse(savedStack);
          const parsedIndex = parseInt(savedIndex, 10);

          if (
            Array.isArray(parsedStack) &&
            parsedStack.length > 0 &&
            !isNaN(parsedIndex) &&
            parsedIndex >= 0 &&
            parsedIndex < parsedStack.length
          ) {
            // If the refreshed page matches the path at savedIndex, restore perfectly
            if (parsedStack[parsedIndex] === currentPath) {
              return {
                stack: parsedStack,
                index: parsedIndex,
              };
            }

            // If the refreshed page exists in the stack, locate it
            const matchingIndex = parsedStack.lastIndexOf(currentPath);
            if (matchingIndex >= 0) {
              return {
                stack: parsedStack,
                index: matchingIndex,
              };
            }

            // If a different URL was navigated to on reload, append to the stack
            const newStack = [
              ...parsedStack.slice(0, parsedIndex + 1),
              currentPath,
            ];
            return {
              stack: newStack,
              index: newStack.length - 1,
            };
          }
        }
      } catch (e) {}
    }

    return {
      stack: [currentPath],
      index: 0,
    };
  });

  const isNavigatingRef = useRef(false);

  // Sync navHistory changes to sessionStorage so page refresh never loses back/forward state
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          "gita_nav_history_stack",
          JSON.stringify(navHistory.stack)
        );
        sessionStorage.setItem(
          "gita_nav_history_index",
          navHistory.index.toString()
        );
      } catch (e) {}
    }
  }, [navHistory]);

  // Helper to check if a route requires login
  const isProtectedPath = (path) => {
    const cleanPath = path.split("?")[0];
    const protectedPrefixes = [
      "/quiz",
      "/quiz-category",
      "/favorites",
      "/history",
      "/profile",
      "/admin",
      "/guidance",
      "/jivan-margdarshan",
      "/reading-tracker",
    ];
    if (
      protectedPrefixes.some(
        (prefix) => cleanPath === prefix || cleanPath.startsWith(prefix + "/")
      )
    ) {
      return true;
    }

    // Check if chapter shloka > 5
    if (cleanPath.startsWith("/chapter/")) {
      const queryPart = path.includes("?") ? path.split("?")[1] : "";
      const params = new URLSearchParams(queryPart);
      const shlokaNum = Number(params.get("shloka"));
      if (shlokaNum > 5) {
        return true;
      }
    }

    return false;
  };

  // =====================================================
  // CURRENT PAGE NAME
  // =====================================================

  const getPageTitle = () => {
    const path = location.pathname;

    // HOME
    if (path === "/") {
      return txt("હોમ", "होम", "Home");
    }

    // ABOUT US
    if (path === "/about" || path === "/about-us") {
      return txt("અમારા વિશે", "हमारे बारे में", "About Us");
    }

    // CHAPTERS
    if (path === "/chapters") {
      return txt("18 અધ્યાય", "18 अध्याय", "18 Chapters");
    }

    // LIFE GUIDANCE
    if (path === "/guidance" || path === "/jivan-margdarshan") {
      return txt("જીવન માર્ગદર્શન", "जीवन मार्गदर्शन", "Life Guidance");
    }

    // READING TRACKER
    if (path === "/reading-tracker") {
      return txt("વાંચન પ્રગતિ", "पठन प्रगति", "Reading Tracker");
    }

    // CHAPTER READER
    if (path.startsWith("/chapter/")) {
      const chapterNumber =
        path.split("/")[2];

      if (chapterNumber) {
        return txt(`અધ્યાય ${chapterNumber}`, `अध्याय ${chapterNumber}`, `Chapter ${chapterNumber}`);
      }

      return txt("અધ્યાય", "अध्याय", "Chapter");
    }

    // FAVORITES
    if (path === "/favorites") {
      return txt("મનપસંદ શ્લોક", "पसंदीदा श्लोक", "Favorite Shlokas");
    }

    // QUIZ CATEGORY
    if (path === "/quiz-category") {
      return txt("ક્વિઝ", "क्विज़", "Quiz");
    }

    // QUIZ
    if (path === "/quiz") {
      return txt("ક્વિઝ", "क्विज़", "Quiz");
    }

    // QUIZ RESULT
    if (path.startsWith("/quiz-result")) {
      return txt("ક્વિઝ પરિણામ", "क्विज़ परिणाम", "Quiz Result");
    }

    // HISTORY
    if (path === "/history") {
      return txt("ઇતિહાસ", "इतिहास", "History");
    }

    // PROFILE
    if (path === "/profile") {
      return txt("પ્રોફાઇલ", "प्रोफ़ाइल", "Profile");
    }

    // LOGIN
    if (path === "/login") {
      return txt("લોગિન", "लॉगिन", "Login");
    }

    // REGISTER
    if (path === "/register") {
      return txt("રજીસ્ટર", "रजिस्टर", "Register");
    }

    // ADMIN
    if (path === "/admin") {
      return txt("એડમિન પેનલ", "व्यवस्थापक (Admin)", "Admin Panel");
    }

    // ADMIN QUIZ
    if (path === "/admin/quiz") {
      return txt("ક્વિઝ વ્યવસ્થાપન", "क्विज़ प्रबंधन", "Quiz Management");
    }

    // ADMIN SHLOKS
    if (path === "/admin/shloks") {
      return txt("શ્લોક વ્યવસ્થાપન", "श्लोक प्रबंधन", "Shlok Management");
    }

    // DEFAULT
    return "";
  };

  // =====================================================
  // TRACK ROUTE CHANGE
  // =====================================================

  useEffect(() => {
    const currentPath =
      location.pathname + location.search;

    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      return;
    }

    setNavHistory((previous) => {
      const currentInStack =
        previous.stack[previous.index];

      // Same page - do not push duplicate
      if (currentInStack === currentPath) {
        return previous;
      }

      // Check if user navigated with browser native back/forward buttons
      if (previous.index > 0 && previous.stack[previous.index - 1] === currentPath) {
        return {
          ...previous,
          index: previous.index - 1,
        };
      }
      if (
        previous.index < previous.stack.length - 1 &&
        previous.stack[previous.index + 1] === currentPath
      ) {
        return {
          ...previous,
          index: previous.index + 1,
        };
      }

      const prevPath =
        previous.stack[previous.index]?.split("?")[0];

      // If user just logged in (previous was /login or /register and now user exists),
      // replace the /login entry so it does not linger in history
      if (user && (prevPath === "/login" || prevPath === "/register")) {
        const newStack = previous.stack.slice(0, previous.index);
        newStack.push(currentPath);
        return {
          stack: newStack,
          index: newStack.length - 1,
        };
      }

      // Back પછી નવી page ખોલે તો Forward history remove થશે
      const newStack = previous.stack.slice(
        0,
        previous.index + 1
      );

      newStack.push(currentPath);

      return {
        stack: newStack,
        index: newStack.length - 1,
      };
    });
  }, [
    location.pathname,
    location.search,
    user,
  ]);

  // =====================================================
  // CLOSE MENU ON PAGE CHANGE
  // =====================================================

  useEffect(() => {
    setMenuOpen(false);
  }, [
    location.pathname,
    location.search,
  ]);

  // =====================================================
  // SCROLL LISTENER — shrink navbar on scroll
  // =====================================================

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos =
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        window.scrollY ||
        0;
      setScrolled(scrollPos > 15);
    };

    window.addEventListener(
      "scroll",
      handleScroll,
      { passive: true }
    );
    document.addEventListener(
      "scroll",
      handleScroll,
      { passive: true }
    );

    // Check on mount too
    handleScroll();

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
      document.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

  // =====================================================
  // BACK
  // =====================================================

  const handleBack = () => {
    // 1. If currently on /login or /register, always return to the last accessible page
    if (location.pathname === "/login" || location.pathname === "/register") {
      let targetIndex = -1;
      for (let i = navHistory.index - 1; i >= 0; i--) {
        const path = navHistory.stack[i];
        const cleanPath = path.split("?")[0];
        // Skip login/register and skip protected routes if user is not logged in
        if (
          cleanPath !== "/login" &&
          cleanPath !== "/register" &&
          (!isProtectedPath(cleanPath) || user)
        ) {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex >= 0) {
        const targetPath = navHistory.stack[targetIndex];
        isNavigatingRef.current = true;
        setNavHistory((prev) => ({
          ...prev,
          index: targetIndex,
        }));
        navigate(targetPath);
        return;
      }

      // Fallback if no accessible page in stack
      navigate("/");
      return;
    }

    // 2. Normal back navigation
    if (navHistory.index <= 0) {
      return;
    }

    let targetIndex = navHistory.index - 1;
    while (targetIndex >= 0) {
      const cleanPath = navHistory.stack[targetIndex].split("?")[0];
      // If user is logged in, NEVER go back to /login or /register!
      if (user && (cleanPath === "/login" || cleanPath === "/register")) {
        targetIndex--;
        continue;
      }
      // If user is logged out, skip protected routes and login
      if (!user && (isProtectedPath(cleanPath) || cleanPath === "/login")) {
        targetIndex--;
        continue;
      }
      break;
    }

    if (targetIndex >= 0) {
      const targetPath = navHistory.stack[targetIndex];
      isNavigatingRef.current = true;
      setNavHistory((prev) => ({
        ...prev,
        index: targetIndex,
      }));
      navigate(targetPath);
    } else {
      navigate("/");
    }
  };

  // =====================================================
  // FORWARD
  // =====================================================

  const handleForward = () => {
    if (
      navHistory.index >=
      navHistory.stack.length - 1
    ) {
      return;
    }

    const newIndex =
      navHistory.index + 1;
    const targetPath =
      navHistory.stack[newIndex];

    isNavigatingRef.current = true;
    setNavHistory((prev) => ({
      ...prev,
      index: newIndex,
    }));

    navigate(targetPath);
  };

  // =====================================================
  // BUTTON STATUS
  // =====================================================

  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";

  // On Login/Register page, always enable back button so user is never stuck
  const canGoBack =
    isAuthPage || navHistory.index > 0;

  const canGoForward =
    !isAuthPage &&
    navHistory.index <
      navHistory.stack.length - 1;

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    const confirmed =
      window.confirm(
        txt(
          "શું તમે ખરેખર Logout કરવા માંગો છો?",
          "क्या आप वाकई Logout करना चाहते हैं?",
          "Are you sure you want to Logout?"
        )
      );

    if (!confirmed) {
      return;
    }

    setMenuOpen(false);

    logout();

    navigate("/");
  };

  // =====================================================
  // NORMAL NAVIGATION
  // =====================================================

  const handleNormalNavigation = () => {
    isNavigatingRef.current = false;
    setMenuOpen(false);
  };

  // =====================================================
  // GUIDANCE NAVIGATION
  // =====================================================

  const handleGuidanceNavigation = () => {
    isNavigatingRef.current = false;
    setMenuOpen(false);
    handleProtectedNavigation(
      "/guidance",
      txt(
        "જીવન માર્ગદર્શન મેળવવા માટે Login કરવું જરૂરી છે.",
        "जीवन मार्गदर्शन पाने के लिए Login करना आवश्यक है।",
        "Login is required to access Life Guidance."
      )
    );
  };

  // =====================================================
  // PROTECTED NAVIGATION (FOR LOGGED IN & LOGGED OUT)
  // =====================================================

  const handleProtectedNavigation = (targetPath, requiredMessage) => {
    isNavigatingRef.current = false;
    setMenuOpen(false);

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

  // =====================================================
  // DIRECT LOGIN (FROM NAVBAR - NO MESSAGE)
  // =====================================================

  const handleDirectLogin = () => {
    isNavigatingRef.current = false;
    setMenuOpen(false);

    // Clear any pending redirect or messages
    sessionStorage.removeItem("authRedirect");
    localStorage.removeItem("pendingChapter");
    localStorage.removeItem("pendingShloka");

    navigate("/login", {
      state: { fromMenu: true },
    });
  };

  // =====================================================
  // TOGGLE MENU
  // =====================================================

  const toggleMenu = () => {
    setMenuOpen(
      (previous) => !previous
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
      {/* =====================================================
          MOBILE TOP HEADER (NATIVE APP UI)
      ===================================================== */}
      <MobileTopHeader onOpenSearch={() => setSearchModalOpen(true)} />

      {/* =================================================
          NAVBAR
      ================================================= */}

      <nav className={`navbar${scrolled ? " scrolled" : ""}${location.pathname === "/" ? " navbar-home" : ""}`}>

        {/* =================================================
            BACK + FORWARD
        ================================================= */}

        <div className="history-buttons">

          {/* BACK */}

          <button
            type="button"
            className="history-btn back-btn"
            onClick={handleBack}
            disabled={!canGoBack}
            title={txt("પાછળ જાઓ", "पीछे जाएं", "Go Back")}
            aria-label={txt("પાછળ જાઓ", "पीछे जाएं", "Go Back")}
          >
            <ChevronLeft
              size={18}
              strokeWidth={2.2}
            />
          </button>

          {/* FORWARD */}

          <button
            type="button"
            className="history-btn forward-btn"
            onClick={handleForward}
            disabled={!canGoForward}
            title={txt("આગળ જાઓ", "आगे जाएं", "Go Forward")}
            aria-label={txt("આગળ જાઓ", "आगे जाएं", "Go Forward")}
          >
            <ChevronRight
              size={18}
              strokeWidth={2.2}
            />
          </button>

        </div>


        {/* =================================================
            LOGO
        ================================================= */}

        <Link
          to="/chapters"
          className="logo"
          onClick={handleNormalNavigation}
          title={txt("18 અધ્યાય", "18 अध्याय", "18 Chapters")}
          aria-label={txt("18 અધ્યાય", "18 अध्याय", "18 Chapters")}
        >
          <img
            id="navbar-gita-logo"
            src="/icons/logo-circle.png"
            alt={txt("ભગવદ્ ગીતા", "भगवद् गीता", "Bhagavad Gita")}
            className="logo-icon-img"
          />
          {txt("ભગવદ્ ગીતા", "भगवद् गीता", "Bhagavad Gita")}
        </Link>


        {/* =================================================
            RIGHT SIDE
            PAGE NAME + HAMBURGER
        ================================================= */}

        <div className="navbar-right">

          {/* LANGUAGE SELECTOR WITH 3-OPTION DROPDOWN */}
          <div className="nav-lang-container" ref={langMenuRef}>
            <button
              type="button"
              className={`nav-lang-toggle-btn ${langMenuOpen ? "active" : ""}`}
              onClick={() => setLangMenuOpen((prev) => !prev)}
              title={txt("ભાષા પસંદ કરો (ગુજરાતી / हिन्दी / English)", "भाषा चुनें (ગુજરાતી / हिन्दी / English)", "Select Language (ગુજરાતી / हिन्दी / English)")}
              aria-label="ભાષા બદલો / भाषा बदलें / Change Language"
              aria-expanded={langMenuOpen}
            >
              <Globe size={15} className="nav-lang-icon" />
              <span className="nav-lang-text">
                {language === "en" ? "English" : language === "hi" ? "हिन्दी" : "ગુજરાતી"}
              </span>
            </button>

            {langMenuOpen && (
              <div className="nav-lang-dropdown">
                <button
                  type="button"
                  className={`nav-lang-option ${language === "gu" ? "selected" : ""}`}
                  onClick={() => {
                    setLanguage("gu");
                    setLangMenuOpen(false);
                  }}
                >
                  <span className="lang-option-label">ગુજરાતી</span>
                  {language === "gu" && <Check size={14} className="lang-check" />}
                </button>
                <button
                  type="button"
                  className={`nav-lang-option ${language === "hi" ? "selected" : ""}`}
                  onClick={() => {
                    setLanguage("hi");
                    setLangMenuOpen(false);
                  }}
                >
                  <span className="lang-option-label">हिन्दी</span>
                  {language === "hi" && <Check size={14} className="lang-check" />}
                </button>
                <button
                  type="button"
                  className={`nav-lang-option ${language === "en" ? "selected" : ""}`}
                  onClick={() => {
                    setLanguage("en");
                    setLangMenuOpen(false);
                  }}
                >
                  <span className="lang-option-label">English</span>
                  {language === "en" && <Check size={14} className="lang-check" />}
                </button>
              </div>
            )}
          </div>

          {/* CURRENT PAGE NAME */}

          <span className="current-page-title">
            {getPageTitle()}
          </span>

          {/* HAMBURGER */}

          <button
            type="button"
            className={
              menuOpen
                ? "hamburger-btn active"
                : "hamburger-btn"
            }
            onClick={toggleMenu}
            aria-label={
              menuOpen
                ? txt("મેનુ બંધ કરો", "मेनू बंद करें", "Close Menu")
                : txt("મેનુ ખોલો", "मेनू खोलें", "Open Menu")
            }
            aria-expanded={menuOpen}
            title={
              menuOpen
                ? txt("મેનુ બંધ કરો", "मेनू बंद करें", "Close Menu")
                : txt("મેનુ ખોલો", "मेनू खोलें", "Open Menu")
            }
          >
            {menuOpen
              ? <X size={20} strokeWidth={2.2} />
              : <Menu size={20} strokeWidth={2.2} />
            }
          </button>

        </div>

      </nav>


      {/* =====================================================
          NAVBAR SPACE

          Navbar fixed હોવાથી page navbarની પાછળ
          ન જાય તે માટે આ જગ્યા reserve કરશે.
      ===================================================== */}

      <div
        className="navbar-spacer"
        aria-hidden="true"
      />


      {/* =====================================================
          OVERLAY
      ===================================================== */}

      {menuOpen && (
        <div
          className="navbar-menu-overlay"
          onClick={() =>
            setMenuOpen(false)
          }
        />
      )}


      {/* =====================================================
          SIDE MENU
      ===================================================== */}

      <aside
        className={
          menuOpen
            ? "navbar-side-menu open"
            : "navbar-side-menu"
        }
      >

        {/* =================================================
            MENU HEADER
        ================================================= */}

        <div className="side-menu-header">

          <div className="side-menu-title">

            <div className="side-menu-logo">
              <img
                src="/icons/icon-192x192.png"
                alt={txt("ભગવદ્ ગીતા", "भगवद् गीता", "Bhagavad Gita")}
                className="side-menu-logo-img"
              />
            </div>

            <div>

              <h2>
                {txt("ભગવદ્ ગીતા", "भगवद् गीता", "Bhagavad Gita")}
              </h2>

              <span>
                {user
                  ? `${user.name} • ${
                      user.role === "admin"
                        ? txt("એડમિનિસ્ટ્રેટર", "प्रशासक (Admin)", "Administrator")
                        : txt("લૉગ-ઇન સભ્ય", "लॉग-इन सदस्य", "Logged in user")
                    }`
                  : txt("નેવિગેશન મેનુ", "नेविगेशन मेनू", "Navigation Menu")}
              </span>

            </div>

          </div>


          {/* HEADER ACTIONS: THEME TOGGLE & CLOSE */}
          <div className="side-menu-header-actions">
            <button
              type="button"
              className="side-menu-theme-btn"
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
              title={theme === "light" ? txt("ડાર્ક મોડ", "ડાર્ક મોડ", "Dark Mode") : txt("લાઇટ મોડ", "લાઈટ મોડ", "Light Mode")}
            >
              {theme === "light" ? (
                <Moon size={19} strokeWidth={2} />
              ) : (
                <Sun size={19} strokeWidth={2} />
              )}
            </button>

            <button
              type="button"
              className="side-menu-close"
              onClick={() =>
                setMenuOpen(false)
              }
              aria-label={txt("મેનુ બંધ કરો", "मेनू बंद करें", "Close Menu")}
              title={txt("બંધ કરો", "बंद करें", "Close")}
            >
              <X size={20} strokeWidth={2.2} />
            </button>
          </div>

        </div>


        {/* =================================================
            MENU CONTENT
        ================================================= */}

        <div className="side-menu-content">

          {/* =================================================
              1. LANGUAGE SWITCH (3 OPTIONS)
          ================================================= */}

          <div className="side-menu-lang-group">
            <div className="side-menu-lang-header">
              <span className="theme-left">
                <span className="theme-icon">
                  <Globe size={18} strokeWidth={1.8} />
                </span>

                <span className="side-menu-text">
                  <strong>
                    {txt("ભાષા પસંદ કરો", "भाषा चुनें", "Choose Language")}
                  </strong>
                </span>
              </span>
            </div>

            <div className="side-lang-segmented-bar">
              <button
                type="button"
                className={`side-lang-seg-btn ${language === "gu" ? "active" : ""}`}
                onClick={() => {
                  setLanguage("gu");
                  setMenuOpen(false);
                }}
              >
                ગુજરાતી
              </button>
              <button
                type="button"
                className={`side-lang-seg-btn ${language === "hi" ? "active" : ""}`}
                onClick={() => {
                  setLanguage("hi");
                  setMenuOpen(false);
                }}
              >
                हिन्दी
              </button>
              <button
                type="button"
                className={`side-lang-seg-btn ${language === "en" ? "active" : ""}`}
                onClick={() => {
                  setLanguage("en");
                  setMenuOpen(false);
                }}
              >
                English
              </button>
            </div>
          </div>


          {/* =================================================
              2. HOME
          ================================================= */}

          <Link
            to="/"
            className="side-menu-item"
            onClick={
              handleNormalNavigation
            }
          >

            <span className="side-menu-icon">
              <Home size={20} strokeWidth={1.8} />
            </span>

            <span className="side-menu-text">
              <strong>
                {txt("હોમ", "होम", "Home")}
              </strong>
            </span>

            <span className="side-menu-arrow">
              <ChevronRight size={18} strokeWidth={2} />
            </span>

          </Link>


          {/* =================================================
              3. 18 CHAPTERS
          ================================================= */}

          <Link
            to="/chapters"
            className="side-menu-item"
            onClick={
              handleNormalNavigation
            }
          >

            <span className="side-menu-icon">
              <BookOpen size={20} strokeWidth={1.8} />
            </span>

            <span className="side-menu-text">
              <strong>
                {txt("18 અધ્યાય", "18 अध्याय", "18 Chapters")}
              </strong>
            </span>

            <span className="side-menu-arrow">
              <ChevronRight size={18} strokeWidth={2} />
            </span>

          </Link>


          {/* =================================================
              4. ADMIN PANEL (Only for Admin)
          ================================================= */}

          {user?.role === "admin" && (
            <Link
              to="/admin"
              className="side-menu-item admin-menu-item"
              onClick={
                handleNormalNavigation
              }
            >
              <span className="side-menu-icon">
                <ShieldCheck size={20} strokeWidth={1.8} />
              </span>

              <span className="side-menu-text">
                <strong>
                  {txt("એડમિન પેનલ", "व्यवस्थापक (Admin)", "Admin Panel")}
                </strong>
              </span>

              <span className="side-menu-arrow">
                <ChevronRight size={18} strokeWidth={2} />
              </span>
            </Link>
          )}


          {/* =================================================
              5. FAVOURITES
          ================================================= */}

          <button
            type="button"
            className="side-menu-item side-menu-button"
            onClick={() =>
              handleProtectedNavigation(
                "/favorites",
                txt(
                  "મનપસંદ શ્લોક જોવા માટે Login કરવું જરૂરી છે.",
                  "पसंदीदा श्लोक देखने के लिए Login करना आवश्यक है।",
                  "Login is required to view favorite shlokas."
                )
              )
            }
          >
            <span className="side-menu-icon">
              <Heart size={20} strokeWidth={1.8} />
            </span>

            <span className="side-menu-text">
              <strong>
                {txt("મનપસંદ શ્લોક", "पसंदीदा श्लोक", "Favorite Shlokas")}
              </strong>
            </span>

            <span className="side-menu-arrow">
              <ChevronRight size={18} strokeWidth={2} />
            </span>
          </button>


          {/* =================================================
              6. LIFE GUIDANCE
          ================================================= */}

          <button
            type="button"
            className="side-menu-item side-menu-button"
            onClick={handleGuidanceNavigation}
          >
            <span className="side-menu-icon">
              <Compass size={20} strokeWidth={1.8} />
            </span>

            <span className="side-menu-text">
              <strong>
                {txt("જીવન માર્ગદર્શન", "जीवन मार्गदर्शन", "Life Guidance")}
              </strong>
            </span>

            <span className="side-menu-arrow">
              <ChevronRight size={18} strokeWidth={2} />
            </span>
          </button>


          {/* =================================================
              7. QUIZ
          ================================================= */}

          <button
            type="button"
            className="side-menu-item side-menu-button"
            onClick={() =>
              handleProtectedNavigation(
                "/quiz-category",
                txt(
                  "Quiz રમવા માટે Login કરવું જરૂરી છે.",
                  "Quiz खेलने के लिए Login करना आवश्यक है।",
                  "Login is required to play the Quiz."
                )
              )
            }
          >
            <span className="side-menu-icon">
              <Brain size={20} strokeWidth={1.8} />
            </span>

            <span className="side-menu-text">
              <strong>
                {txt("ક્વિઝ (Quiz)", "क्विज़ (Quiz)", "Gita Quiz")}
              </strong>
            </span>

            <span className="side-menu-arrow">
              <ChevronRight size={18} strokeWidth={2} />
            </span>
          </button>


          {/* =================================================
              8. FEEDBACK & RATING
          ================================================= */}

          <button
            type="button"
            className="side-menu-item side-menu-button"
            onClick={() => {
              setMenuOpen(false);
              window.dispatchEvent(
                new CustomEvent("open-feedback-modal", {
                  detail: { fromMenu: true },
                })
              );
            }}
          >
            <span className="side-menu-icon" style={{ color: "#f59e0b" }}>
              <Star size={20} strokeWidth={1.8} fill="#f59e0b" />
            </span>

            <span className="side-menu-text">
              <strong>
                {txt("પ્રતિસાદ અને રેટિંગ", "प्रतिक्रिया और रेटिंग", "Feedback & Rating")}
              </strong>
            </span>

            <span className="side-menu-arrow">
              <ChevronRight size={18} strokeWidth={2} />
            </span>
          </button>


          {/* =================================================
              9. INSTALL APP (PWA)
          ================================================= */}

          {!isStandaloneApp && (
            <button
              type="button"
              className="side-menu-item side-menu-button install-app-menu-btn"
              onClick={async () => {
                setMenuOpen(false);
                const res = await promptInstallApp();
                if (res.alreadyInstalled) {
                  alert(res.message);
                  return;
                }
                if (!res.success) {
                  // If not native prompt or iOS, open the install banner/guide modal
                  window.dispatchEvent(new CustomEvent("open-pwa-install-banner"));
                }
              }}
            >
              <span className="side-menu-icon" style={{ color: "#10b981" }}>
                <Download size={20} strokeWidth={1.8} />
              </span>

              <span className="side-menu-text">
                <strong>
                  {txt("એપ ઇન્સ્ટોલ કરો (Install App)", "ऐप इंस्टॉल करें (Install App)", "Install App")}
                </strong>
              </span>

              <span className="side-menu-arrow">
                <ChevronRight size={18} strokeWidth={2} />
              </span>
            </button>
          )}

          {/* Standalone Notification Toggle (Inside App Only) */}
          {isStandaloneApp && (
            <button
              type="button"
              className="side-menu-theme side-menu-notif-btn"
              onClick={handleToggleNotification}
              disabled={notifLoading}
              aria-label="Toggle App Notifications"
            >
              <span className="theme-left">
                <span
                  className="theme-icon"
                  style={{
                    background: notifEnabled
                      ? "rgba(16, 185, 129, 0.15)"
                      : "rgba(148, 163, 184, 0.15)",
                    color: notifEnabled ? "#10b981" : "#64748b",
                  }}
                >
                  <Bell size={18} strokeWidth={1.8} />
                </span>

                <span className="side-menu-text">
                  <strong>
                    {notifEnabled
                      ? txt("નોટિફિકેશન (ચાલુ)", "सूचना (चालू)", "Notifications (On)")
                      : txt("નોટિફિકેશન (બંધ)", "सूचना (बंद)", "Notifications (Off)")}
                  </strong>
                </span>
              </span>

              <span className={`theme-switch ${notifEnabled ? "active-notif" : ""}`}>
                <span
                  className={`theme-switch-dot ${notifEnabled ? "active-notif" : ""}`}
                />
              </span>
            </button>
          )}


          {/* =================================================
              10. ABOUT US (અમારા વિશે)
          ================================================= */}

          <Link
            to="/about"
            className="side-menu-item"
            onClick={handleNormalNavigation}
          >
            <span className="side-menu-icon" style={{ color: "#0284c7" }}>
              <Info size={20} strokeWidth={1.8} />
            </span>

            <span className="side-menu-text">
              <strong>
                {txt("અમારા વિશે (About Us)", "हमारे बारे में (About Us)", "About Us")}
              </strong>
            </span>

            <span className="side-menu-arrow">
              <ChevronRight size={18} strokeWidth={2} />
            </span>
          </Link>


          {/* =================================================
              11. HISTORY
          ================================================= */}

          <button
            type="button"
            className="side-menu-item side-menu-button"
            onClick={() =>
              handleProtectedNavigation(
                "/history",
                txt(
                  "તમારી History જોવા માટે Login કરવું જરૂરી છે.",
                  "अपनी History देखने के लिए Login करना आवश्यक है।",
                  "Login is required to view your reading history."
                )
              )
            }
          >
            <span className="side-menu-icon">
              <Clock size={20} strokeWidth={1.8} />
            </span>

            <span className="side-menu-text">
              <strong>
                {txt("ઇતિહાસ (History)", "इतिहास (History)", "Reading History")}
              </strong>
            </span>

            <span className="side-menu-arrow">
              <ChevronRight size={18} strokeWidth={2} />
            </span>
          </button>


          {/* =================================================
              12. PROFILE
          ================================================= */}

          <button
            type="button"
            className="side-menu-item side-menu-button"
            onClick={() =>
              handleProtectedNavigation(
                "/profile",
                txt(
                  "તમારી Profile જોવા માટે Login કરવું જરૂરી છે.",
                  "अपनी Profile देखने के लिए Login करना आवश्यक है।",
                  "Login is required to view your profile."
                )
              )
            }
          >
            <span className="side-menu-icon">
              <CircleUser size={20} strokeWidth={1.8} />
            </span>

            <span className="side-menu-text">
              <strong>
                {txt("પ્રોફાઇલ (Profile)", "प्रोफ़ाइल (Profile)", "My Profile")}
              </strong>
            </span>

            <span className="side-menu-arrow">
              <ChevronRight size={18} strokeWidth={2} />
            </span>
          </button>


          {/* =================================================
              LOGIN & REGISTER (For Guest Users)
          ================================================= */}

          {!user && (
            <button
              type="button"
              className="side-menu-item side-menu-button"
              onClick={handleDirectLogin}
            >
              <span className="side-menu-icon">
                <LogIn size={20} strokeWidth={1.8} />
              </span>

              <span className="side-menu-text">
                <strong>
                  {txt("લોગિન", "लॉगिन", "Login")}
                </strong>
              </span>

              <span className="side-menu-arrow">
                <ChevronRight size={18} strokeWidth={2} />
              </span>
            </button>
          )}

          {!user && (
            <Link
              to="/register"
              className="side-menu-item"
              onClick={
                handleNormalNavigation
              }
            >

              <span className="side-menu-icon">
                <UserPlus size={20} strokeWidth={1.8} />
              </span>

              <span className="side-menu-text">
                <strong>
                  {txt("રજીસ્ટર", "रजिस्टर", "Register")}
                </strong>
              </span>

              <span className="side-menu-arrow">
                <ChevronRight size={18} strokeWidth={2} />
              </span>

            </Link>
          )}


          {/* =================================================
              LOGOUT
          ================================================= */}

          {user && (
            <button
              type="button"
              className="side-menu-logout"
              onClick={handleLogout}
            >

              <span className="logout-icon">
                <LogOut size={18} strokeWidth={2} />
              </span>

              <span>
                {txt("લોગઆઉટ (Logout)", "लॉगआउट (Logout)", "Logout")}
              </span>

            </button>
          )}

        </div>

        {/* =================================================
            MENU FOOTER
        ================================================= */}

        <div className="side-menu-footer">
          <p>
            ॥ श्रीमद्भगवद्गीता ॥
          </p>
        </div>

      </aside>

      {/* =====================================================
          SEARCH POPUP MODAL (OPENED VIA TOP HEADER SEARCH ICON)
      ===================================================== */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />

      {/* =====================================================
          MOBILE BOTTOM NAVIGATION
      ===================================================== */}
      <MobileBottomNav
        handleProtectedNavigation={handleProtectedNavigation}
        handleNormalNavigation={handleNormalNavigation}
      />
    </>
  );
}

export default Navbar;