
import { useEffect, useState, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useSearchParams, Link } from "react-router-dom";
import { hasPermission } from "./utils/permissionHelper.js";

import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";
import "./App.css";

import Navbar from "./components/Navbar.jsx";

import Home from "./pages/Home.jsx";
import Chapters from "./pages/Chapters.jsx";
import ChapterReader from "./pages/ChapterReader.jsx";
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import Profile from "./pages/Profile.jsx";
import Admin from "./pages/Admin.jsx";
import ShlokManagement from "./pages/ShlokManagement.jsx";
import StoryVideoCreator from "./pages/StoryVideoCreator.jsx";

import ForgotPassword from "./pages/ForgotPassword";

import FavouriteShlokas from "./pages/FavouriteShlokas.jsx";

import QuizManagement from "./pages/QuizManagement.jsx";

import Quiz from "./pages/Quiz.jsx";

import QuizCategory from "./pages/QuizCategory.jsx";

import History from "./pages/History.jsx";

import QuizResult from "./pages/QuizResult";
import LifeGuidance from "./pages/LifeGuidance.jsx";
import ReadingTracker from "./pages/ReadingTracker.jsx";
import QuizAchievements from "./pages/QuizAchievements.jsx";
import GitaAIAssistant from "./components/GitaAIAssistant.jsx";
import FeedbackModal from "./components/FeedbackModal.jsx";
import InstallPwaBanner from "./components/InstallPwaBanner.jsx";
import AppNotificationPrompt from "./components/AppNotificationPrompt.jsx";
import MobileLanguageModal from "./components/MobileLanguageModal.jsx";
import AppSplashScreen from "./components/AppSplashScreen.jsx";
import About from "./pages/About.jsx";
import MoreMenu from "./pages/MoreMenu.jsx";
import { trackVisit } from "./utils/visitorTracker.js";
import { autoSyncOfflineChaptersQuietly } from "./utils/offlineStorage.js";

// =====================================================
import { isTokenExpired, getValidToken } from "./utils/authHelper.js";
import { useLanguage } from "./context/LanguageContext.jsx";

// =====================================================
// PROTECTED ROUTE COMPONENT
// =====================================================

function ProtectedRoute({ children, message, messageHi, messageEn }) {
  const { user, token, expireSession, logout } = useAuth();
  const { isHindi, isEnglish, txt } = useLanguage();
  const location = useLocation();

  const isExpired = isTokenExpired(token);
  if (!user || !token || isExpired) {
    if (isExpired && (token || user)) {
      if (typeof expireSession === "function") {
        expireSession();
      } else {
        logout();
      }
    }
    const targetPath = location.pathname + location.search;
    let redirectMessage = message;
    if (isEnglish) {
      if (messageEn) {
        redirectMessage = messageEn;
      } else if (message) {
        if (message.includes("જીવન માર્ગદર્શન")) redirectMessage = "Login is required to access Life Guidance.";
        else if (message.includes("વાંચન પ્રગતિ")) redirectMessage = "Login is required to view Reading Progress.";
        else if (message.includes("Profile")) redirectMessage = "Login is required to view your Profile.";
        else if (message.includes("મનપસંદ શ્લોક")) redirectMessage = "Login is required to view Favourite Shlokas.";
        else if (message.includes("Quiz રમવા")) redirectMessage = "Login is required to play Quiz.";
        else if (message.includes("History")) redirectMessage = "Login is required to view your History.";
        else if (message.includes("Quiz Results")) redirectMessage = "Login is required to view Quiz Results.";
        else if (message.includes("ક્વિઝ સિદ્ધિઓ")) redirectMessage = "Login is required to view Quiz Achievements.";
        else redirectMessage = "Login is required to access this page.";
      } else {
        redirectMessage = "Login is required to access this page.";
      }
    } else if (isHindi) {
      if (messageHi) {
        redirectMessage = messageHi;
      } else if (message) {
        if (message.includes("જીવન માર્ગદર્શન")) redirectMessage = "जीवन मार्गदर्शन पाने के लिए Login करना आवश्यक है।";
        else if (message.includes("વાંચન પ્રગતિ")) redirectMessage = "पठन प्रगति देखने के लिए Login करना आवश्यक है।";
        else if (message.includes("Profile")) redirectMessage = "अपनी Profile देखने के लिए Login करना आवश्यक है।";
        else if (message.includes("મનપસંદ શ્લોક")) redirectMessage = "पसंदीदा श्लोक देखने के लिए Login करना आवश्यक है।";
        else if (message.includes("Quiz રમવા")) redirectMessage = "Quiz खेलने के लिए Login करना आवश्यक है।";
        else if (message.includes("History")) redirectMessage = "अपनी History देखने के लिए Login करना आवश्यक है।";
        else if (message.includes("Quiz Results")) redirectMessage = "Quiz Results देखने के लिए Login करना आवश्यक है।";
        else if (message.includes("ક્વિઝ સિદ્ધિઓ")) redirectMessage = "क्विज़ उपलब्धियां देखने के लिए Login करना आवश्यक है।";
        else redirectMessage = "इस पृष्ठ का उपयोग करने के लिए Login करना आवश्यक है।";
      } else {
        redirectMessage = "इस पृष्ठ का उपयोग करने के लिए Login करना आवश्यक है।";
      }
    } else if (!redirectMessage) {
      redirectMessage = "આ પેજનો ઉપયોગ કરવા માટે Login કરવું જરૂરી છે.";
    }

    try {
      sessionStorage.setItem(
        "authRedirect",
        JSON.stringify({
          from: targetPath,
          message: redirectMessage,
        })
      );
    } catch (e) {}

    return (
      <Navigate
        to="/login"
        state={{
          from: targetPath,
          message: redirectMessage,
        }}
        replace
      />
    );
  }

  return children;
}

// =====================================================
// ADMIN ROUTE COMPONENT
// =====================================================

function AdminRoute({ children, permission }) {
  const { user, token, expireSession, logout } = useAuth();
  const { isHindi, isEnglish, txt } = useLanguage();
  const location = useLocation();

  const isExpired = isTokenExpired(token);
  if (!user || !token || isExpired) {
    if (isExpired && (token || user)) {
      if (typeof expireSession === "function") {
        expireSession();
      } else {
        logout();
      }
    }
    const targetPath = location.pathname + location.search;
    const redirectMessage = txt(
      "Admin પેનલનો ઉપયોગ કરવા માટે Login કરવું જરૂરી છે.",
      "एडमिन पैनल का उपयोग करने के लिए लॉगिन आवश्यक है।",
      "Login is required to access the Admin Panel."
    );

    try {
      sessionStorage.setItem(
        "authRedirect",
        JSON.stringify({
          from: targetPath,
          message: redirectMessage,
        })
      );
    } catch (e) {}

    return (
      <Navigate
        to="/login"
        state={{
          from: targetPath,
          message: redirectMessage,
        }}
        replace
      />
    );
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  if (permission && !hasPermission(user, permission)) {
    return (
      <div
        style={{
          minHeight: "75vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #fee2e2",
            borderRadius: "24px",
            padding: "40px 32px",
            maxWidth: "480px",
            width: "100%",
            boxShadow: "0 14px 34px rgba(220, 38, 38, 0.08)",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              background: "#fef2f2",
              color: "#dc2626",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px auto",
              fontSize: "30px",
            }}
          >
            🔒
          </div>
          <h2
            style={{
              fontSize: "1.35rem",
              fontWeight: "700",
              color: "#1e293b",
              marginBottom: "10px",
            }}
          >
            {txt("ઍક્સેસ પ્રતિબંધિત છે", "पहुंच प्रतिबंधित है", "Access Restricted")}
          </h2>
          <p
            style={{
              color: "#64748b",
              fontSize: "0.95rem",
              lineHeight: "1.6",
              marginBottom: "24px",
            }}
          >
            {txt(
              "તમારી પાસે આ વિભાગનો ઉપયોગ કરવાની પરમિશન નથી. જો તમારે આ અધિકાર જોઈતો હોય તો મુખ્ય સુપર એડમિનનો સંપર્ક કરો.",
              "आपके पास इस अनुभाग का उपयोग करने की अनुमति नहीं है। मुख्य सुपर एडमिन से संपर्क करें।",
              "You do not have permission to access this section. Please contact the Super Admin."
            )}
          </p>
          <Link
            to="/admin"
            style={{
              display: "inline-block",
              background: "linear-gradient(135deg, #175bb5, #114285)",
              color: "#ffffff",
              padding: "12px 28px",
              borderRadius: "12px",
              fontWeight: "600",
              textDecoration: "none",
              fontSize: "0.95rem",
              boxShadow: "0 4px 14px rgba(23, 91, 181, 0.3)",
            }}
          >
            {txt("મુખ્ય Admin Panel પર પાછા જાઓ", "मुख्य एडमिन पैनल पर लौटें", "Return to Admin Panel")}
          </Link>
        </div>
      </div>
    );
  }

  return children;
}

// =====================================================
// STARTUP AUTH REDIRECTOR (LOGIN STEP IN STARTUP FLOW)
// =====================================================

function StartupAuthRedirector() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    const handleNotificationDone = () => {
      const token = getValidToken();

      // 1. If already logged in, skip login page and proceed to rating step directly
      if (user || token) {
        window.dispatchEvent(new CustomEvent("gita-login-prompt-done"));
        return;
      }

      // 2. If already skipped in this browser/app session, skip to rating step directly
      const sessionSkipped =
        sessionStorage.getItem("gita_login_prompt_skipped_session") === "true";
      if (sessionSkipped) {
        window.dispatchEvent(new CustomEvent("gita-login-prompt-done"));
        return;
      }

      // 3. If currently on auth page (/login, /register, /forgot-password), don't re-navigate
      const currentPath = location.pathname;
      if (
        currentPath === "/login" ||
        currentPath === "/register" ||
        currentPath === "/forgot-password"
      ) {
        return;
      }

      // 4. User is NOT logged in and hasn't skipped this session:
      // Navigate directly to the actual Login page!
      navigate("/login", { state: { fromStartup: true } });
    };

    window.addEventListener("gita-notification-prompt-done", handleNotificationDone);
    return () => {
      window.removeEventListener("gita-notification-prompt-done", handleNotificationDone);
    };
  }, [user, location.pathname, navigate]);

  return null;
}

// =====================================================
// MOBILE BOTTOM NAVIGATION TABS FOR HORIZONTAL SWIPE
// =====================================================

const MAIN_MOBILE_TABS = [
  { path: "/", label: "home" },
  { path: "/chapters", label: "chapters" },
  {
    path: "/quiz-category",
    aliases: ["/quiz", "/quiz-category"],
    label: "quiz",
    requiresAuth: true,
    authMessage: {
      gu: "Quiz રમવા માટે Login કરવું જરૂરી છે.",
      hi: "Quiz खेलने के लिए Login करना आवश्यक है।",
      en: "Login is required to play the Quiz.",
    },
  },
  {
    path: "/favorites",
    label: "favorites",
    requiresAuth: true,
    authMessage: {
      gu: "મનપસંદ શ્લોક જોવા માટે Login કરવું જરૂરી છે.",
      hi: "पसंदीदा श्लोक देखने के लिए Login करना आवश्यक है।",
      en: "Login is required to view favorite shlokas.",
    },
  },
  { path: "/more", label: "more" },
];

function getMobileTabIndex(pathname) {
  if (
    pathname.startsWith("/chapter/") ||
    pathname.startsWith("/quiz/play") ||
    pathname.startsWith("/admin") ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password"
  ) {
    return -1;
  }

  return MAIN_MOBILE_TABS.findIndex((tab) => {
    if (tab.aliases) return tab.aliases.includes(pathname);
    return tab.path === pathname;
  });
}

function AnimatedRoutes() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isHindi, isEnglish } = useLanguage();
  const [tabSlideDirection, setTabSlideDirection] = useState(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0, isHorizontal: null, tabIndex: -1 });
  const wrapperRef = useRef(null);

  const isHome = location.pathname === "/";

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    trackVisit(location.pathname);
  }, [location.pathname, user]);

  useEffect(() => {
    if (!tabSlideDirection) return;
    const timer = setTimeout(() => {
      setTabSlideDirection(null);
    }, 400);
    return () => clearTimeout(timer);
  }, [tabSlideDirection]);

  useEffect(() => {
    // Quietly pre-cache chapters in the background for 100% offline reliability
    const timer = setTimeout(() => {
      autoSyncOfflineChaptersQuietly();
    }, 3500);

    const handleOnline = () => {
      autoSyncOfflineChaptersQuietly();
    };
    window.addEventListener("online", handleOnline);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", handleOnline);
    };
  }, [user]);

  // =====================================================
  // MOBILE TOUCH SWIPE NAVIGATION (MAIN BOTTOM NAV TABS)
  // =====================================================
  const navigateToTab = (targetIndex, direction) => {
    const targetTab = MAIN_MOBILE_TABS[targetIndex];
    if (!targetTab) return;

    setTabSlideDirection(direction);

    if (targetTab.requiresAuth && !user) {
      const localizedMsg = isEnglish
        ? targetTab.authMessage.en
        : isHindi
        ? targetTab.authMessage.hi
        : targetTab.authMessage.gu;

      sessionStorage.setItem(
        "authRedirect",
        JSON.stringify({
          from: targetTab.path,
          message: localizedMsg,
        })
      );

      navigate("/login", {
        state: {
          from: targetTab.path,
          message: localizedMsg,
        },
      });
      return;
    }

    navigate(targetTab.path);
  };

  const handleTouchStart = (e) => {
    if (typeof window !== "undefined" && window.innerWidth > 768) return;
    if (!e.touches || e.touches.length !== 1) return;
    const currentTabIndex = getMobileTabIndex(location.pathname);
    if (currentTabIndex === -1) return;

    // Ignore swipe on interactive widgets, inputs, audio players, etc.
    if (
      e.target.closest(
        "input, select, textarea, audio, video, .audio-player, .shlok-card, .no-swipe, .gita-ai-btn, .modal-backdrop, .dialog"
      )
    ) {
      return;
    }

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      isHorizontal: null,
      tabIndex: currentTabIndex,
    };

    if (wrapperRef.current) {
      wrapperRef.current.style.transition = "none";
    }
  };

  const handleTouchMove = (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    if (touchStartRef.current.tabIndex === -1) return;

    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;

    // Detect gesture direction after 9px
    if (touchStartRef.current.isHorizontal === null) {
      if (Math.abs(diffX) > 9 || Math.abs(diffY) > 9) {
        touchStartRef.current.isHorizontal = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    // If scrolling vertically, let native scroll happen freely
    if (!touchStartRef.current.isHorizontal) {
      return;
    }

    // Apply dampened horizontal drag for tactile feel
    const currentIdx = touchStartRef.current.tabIndex;
    let clampedOffset = diffX * 0.38;

    if (currentIdx === 0 && diffX > 0) {
      // Bounded bounce when swiping right on Home
      clampedOffset = Math.min(25, diffX * 0.15);
    } else if (currentIdx === MAIN_MOBILE_TABS.length - 1 && diffX < 0) {
      // Bounded bounce when swiping left on More
      clampedOffset = Math.max(-25, diffX * 0.15);
    } else {
      clampedOffset = Math.max(-65, Math.min(65, clampedOffset));
    }

    if (wrapperRef.current) {
      wrapperRef.current.style.transform = `translateX(${clampedOffset}px)`;
    }
  };

  const handleTouchEnd = (e) => {
    const isHorizontal = touchStartRef.current.isHorizontal;
    const currentIdx = touchStartRef.current.tabIndex;
    const touch = e.changedTouches ? e.changedTouches[0] : null;
    const diffX = touch ? touch.clientX - touchStartRef.current.x : 0;
    const diffY = touch ? touch.clientY - touchStartRef.current.y : 0;
    const elapsed = Date.now() - touchStartRef.current.time;

    if (wrapperRef.current) {
      wrapperRef.current.style.transition = "transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)";
      wrapperRef.current.style.transform = "translateX(0px)";
    }

    touchStartRef.current = {
      x: 0,
      y: 0,
      time: 0,
      isHorizontal: null,
      tabIndex: -1,
    };

    if (!isHorizontal || currentIdx === -1) return;

    // Threshold: 45px or quick flick (> 25px in < 260ms)
    const isFlick = Math.abs(diffX) > 25 && elapsed < 260;
    const isDistance = Math.abs(diffX) >= 45 && Math.abs(diffX) > Math.abs(diffY) * 1.2;

    if (isFlick || isDistance) {
      if (diffX < 0) {
        // Swiped Left -> Go to Next Tab
        if (currentIdx < MAIN_MOBILE_TABS.length - 1) {
          navigateToTab(currentIdx + 1, "next");
        }
      } else {
        // Swiped Right -> Go to Previous Tab
        if (currentIdx > 0) {
          navigateToTab(currentIdx - 1, "prev");
        }
      }
    }
  };

  return (
    <>
      {isHome && <div className="home-fixed-bg" aria-hidden="true" />}
      <div key={`glow-${location.pathname}`} className="page-transition-glow" />
      <div
        key={location.pathname}
        ref={wrapperRef}
        className={`page-transition-wrapper ${
          tabSlideDirection === "next"
            ? "tab-slide-next"
            : tabSlideDirection === "prev"
            ? "tab-slide-prev"
            : ""
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onAnimationEnd={() => setTabSlideDirection(null)}
      >
        <Routes location={location}>

            {/* =================================================
                HOME
            ================================================= */}

            <Route
              path="/"
              element={<Home />}
            />

            {/* =================================================
                ABOUT US (અમારા વિશે)
            ================================================= */}

            <Route
              path="/about"
              element={<About />}
            />

            <Route
              path="/about-us"
              element={<About />}
            />

            {/* =================================================
                MORE MENU (વધુ સુવિધાઓ - NATIVE HUB)
            ================================================= */}

            <Route
              path="/more"
              element={<MoreMenu />}
            />


            {/* =================================================
                18 CHAPTERS
            ================================================= */}

            <Route
              path="/chapters"
              element={<Chapters />}
            />


            {/* =================================================
                LIFE GUIDANCE (PROTECTED)
            ================================================= */}

            <Route
              path="/guidance"
              element={
                <ProtectedRoute message="જીવન માર્ગદર્શન મેળવવા માટે Login કરવું જરૂરી છે.">
                  <LifeGuidance />
                </ProtectedRoute>
              }
            />

            <Route
              path="/jivan-margdarshan"
              element={
                <ProtectedRoute message="જીવન માર્ગદર્શન મેળવવા માટે Login કરવું જરૂરી છે.">
                  <LifeGuidance />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                READING TRACKER & GAMIFICATION (PROTECTED)
            ================================================= */}

            <Route
              path="/reading-tracker"
              element={
                <ProtectedRoute message="વાંચન પ્રગતિ જોવા માટે Login કરવું જરૂરી છે.">
                  <ReadingTracker />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                CHAPTER READER
            ================================================= */}

            <Route
              path="/chapter/:chapterNumber"
              element={<ChapterReader />}
            />


            {/* =================================================
                AUTHENTICATION
            ================================================= */}

            <Route
              path="/register"
              element={<Register />}
            />

            <Route
              path="/login"
              element={<Login />}
            />

            <Route
              path="/forgot-password"
              element={<ForgotPassword />}
            />


            {/* =================================================
                PROFILE (PROTECTED)
            ================================================= */}

            <Route
              path="/profile"
              element={
                <ProtectedRoute message="તમારી Profile જોવા માટે Login કરવું જરૂરી છે.">
                  <Profile />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                FAVOURITE SHLOKAS (PROTECTED)
            ================================================= */}

            <Route
              path="/favorites"
              element={
                <ProtectedRoute message="મનપસંદ શ્લોક જોવા માટે Login કરવું જરૂરી છે.">
                  <FavouriteShlokas />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                ADMIN DASHBOARD (ADMIN PROTECTED)
            ================================================= */}

            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />


            {/* =================================================
                ADMIN → SHLOK MANAGEMENT (ADMIN PROTECTED)
            ================================================= */}

            <Route
              path="/admin/shloks"
              element={
                <AdminRoute permission={["add_shloks", "edit_shloks", "delete_shloks", "manage_shloks", "download_audio", "generate_shlok_video"]}>
                  <ShlokManagement />
                </AdminRoute>
              }
            />


            {/* =================================================
                ADMIN → QUIZ MANAGEMENT (ADMIN PROTECTED)
            ================================================= */}

            <Route
              path="/admin/quiz"
              element={
                <AdminRoute permission={["add_quiz", "edit_quiz", "delete_quiz", "share_quiz", "manage_quiz"]}>
                  <QuizManagement />
                </AdminRoute>
              }
            />


            {/* =================================================
                ADMIN → STORY VIDEO STUDIO (ADMIN PROTECTED)
            ================================================= */}

            <Route
              path="/admin/video-creator"
              element={
                <AdminRoute permission={["manage_video_studio"]}>
                  <StoryVideoCreator />
                </AdminRoute>
              }
            />


            {/* =================================================
                QUIZ CATEGORY SELECTION (PROTECTED)
            ================================================= */}

            <Route
              path="/quiz"
              element={
                <ProtectedRoute message="Quiz રમવા માટે Login કરવું જરૂરી છે.">
                  <QuizCategory />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                QUIZ PLAY (PROTECTED)
            ================================================= */}

            <Route
              path="/quiz/play"
              element={
                <ProtectedRoute message="Quiz રમવા માટે Login કરવું જરૂરી છે.">
                  <Quiz />
                </ProtectedRoute>
              }
            />


            {/* =================================================
                QUIZ CATEGORY (PROTECTED)
            ================================================= */}

            <Route
              path="/quiz-category"
              element={
                <ProtectedRoute message="Quiz રમવા માટે Login કરવું જરૂરી છે.">
                  <QuizCategory />
                </ProtectedRoute>
              }
            />

            {/* =================================================
                QUIZ HISTORY (PROTECTED)
            ================================================= */}

            <Route
              path="/history"
              element={
                <ProtectedRoute message="તમારી History જોવા માટે Login કરવું જરૂરી છે.">
                  <History />
                </ProtectedRoute>
              }
            />

            {/* =================================================
                QUIZ RESULTS (PROTECTED)
            ================================================= */}

            <Route
              path="/quiz-results"
              element={
                <ProtectedRoute message="Quiz Results જોવા માટે Login કરવું જરૂરી છે.">
                  <QuizResult />
                </ProtectedRoute>
              }
            />

            {/* =================================================
                QUIZ ACHIEVEMENTS (PROTECTED)
            ================================================= */}

            <Route
              path="/quiz-achievements"
              element={
                <ProtectedRoute message="ક્વિઝ સિદ્ધિઓ જોવા માટે Login કરવું જરૂરી છે.">
                  <QuizAchievements />
                </ProtectedRoute>
              }
            />

          </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            {/* =================================================
                APP OPENING SPLASH SCREEN & LOGO MORPH ANIMATION
            ================================================= */}
            <AppSplashScreen />
            <Navbar />
            <StartupAuthRedirector />
            <AnimatedRoutes />
            {/* =================================================
                FEEDBACK & STAR RATING (FLOATING BOTTOM-LEFT WIDGET)
            ================================================= */}
            <FeedbackModal />
            {/* =================================================
                GITA AI ASSISTANT (FLOATING BOTTOM-RIGHT WIDGET)
            ================================================= */}
            <GitaAIAssistant />
            {/* =================================================
                PWA INSTALL BANNER / PROMPT
            ================================================= */}
            <InstallPwaBanner />
            {/* =================================================
                5x DAILY NOTIFICATIONS PROMPT (APP ONLY)
            ================================================= */}
            <AppNotificationPrompt />
            {/* =================================================
                LANGUAGE SELECTION PROMPT (ALL DEVICES)
            ================================================= */}
            <MobileLanguageModal />
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;

