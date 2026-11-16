import React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, Moon, Sun } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import "./MobileTopHeader.css";

export default function MobileTopHeader({ onOpenSearch }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { txt } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const pathname = location.pathname;
  const isHome = pathname === "/";

  // Compute dynamic title per screen matching reference design
  const getDynamicTitle = () => {
    if (pathname === "/") {
      return txt("ભગવદ્ ગીતા", "भगवद् गीता", "Bhagavad Gita");
    }

    if (pathname === "/chapters") {
      return txt("અધ્યાયોની યાદી", "अध्यायों की सूची", "Chapters List");
    }

    if (pathname.startsWith("/chapter/")) {
      const parts = pathname.split("/");
      const chNum = parts[2];
      const shlokaParam = searchParams.get("shloka");
      if (chNum && shlokaParam) {
        return txt(
          `અધ્યાય ${chNum} - શ્લોક ${shlokaParam}`,
          `अध्याय ${chNum} - श्लोक ${shlokaParam}`,
          `Chapter ${chNum} - Shloka ${shlokaParam}`
        );
      }
      if (chNum) {
        return txt(`અધ્યાય ${chNum}`, `अध्याय ${chNum}`, `Chapter ${chNum}`);
      }
      return txt("અધ્યાય", "अध्याय", "Chapter");
    }

    if (
      pathname === "/quiz" ||
      pathname === "/quiz-category" ||
      pathname.startsWith("/quiz/")
    ) {
      return txt("ક્વિઝ", "क्विज़", "Quiz");
    }

    if (pathname === "/favorites") {
      return txt("મનપસંદ શ્લોક", "पसंदीदा श्लोक", "Favorite Shlokas");
    }

    if (pathname === "/more") {
      return txt("વધુ", "अधिक", "More");
    }

    if (pathname === "/profile") {
      return txt("મારો પ્રોફાઇલ", "मेरा प्रोफ़ाइल", "My Profile");
    }

    if (pathname === "/guidance" || pathname === "/jivan-margdarshan") {
      return txt("જીવન માર્ગદર્શન", "जीवन मार्गदर्शन", "Life Guidance");
    }

    if (pathname === "/reading-tracker") {
      return txt("વાંચન પ્રગતિ", "पठन प्रगति", "Reading Tracker");
    }

    if (pathname === "/history") {
      return txt("ઇતિહાસ", "इतिहास", "History");
    }

    if (pathname === "/quiz-achievements" || pathname === "/quiz-results") {
      return txt("ક્વિઝ સિદ્ધિઓ", "क्विज़ उपलब्धियाँ", "Quiz Achievements");
    }

    if (pathname === "/about" || pathname === "/about-us") {
      return txt("એપ્લિકેશન વિશે", "ऐप के बारे में", "About App");
    }

    if (pathname.startsWith("/admin")) {
      return txt("એડમિન પેનલ", "व्यवस्थापक (Admin)", "Admin Panel");
    }

    if (pathname === "/login") {
      return txt("લૉગિન", "लॉगिन", "Login");
    }

    if (pathname === "/register") {
      return txt("નવું એકાઉન્ટ", "नया खाता", "Register");
    }

    if (pathname === "/forgot-password") {
      return txt("પાસવર્ડ રીસેટ", "पासवर्ड रीसेट", "Reset Password");
    }

    return txt("ભગવદ્ ગીતા", "भगवद् गीता", "Bhagavad Gita");
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <>
      <header
        className={`mobile-top-header ${isHome ? "is-home-header" : "is-subpage-header"}`}
        role="banner"
      >
        {isHome ? (
          /* ================= HOME HEADER ================= */
          <div className="mobile-header-home-content">
            <div
              className="mobile-header-brand"
              onClick={() => navigate("/chapters")}
              role="button"
              tabIndex={0}
              title={txt("18 અધ્યાય", "18 अध्याय", "18 Chapters")}
              aria-label={txt("18 અધ્યાય", "18 अध्याय", "18 Chapters")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  navigate("/chapters");
                }
              }}
            >
              <div className="mobile-logo-circle">
                <img
                  src="/icons/logo-circle.png"
                  alt={txt("ભગવદ્ ગીતા", "भगवद् गीता", "Bhagavad Gita")}
                  className="mobile-header-logo-img"
                />
              </div>
              <span className="mobile-header-app-title">
                {txt("ભગવદ્ ગીતા", "भगवद् गीता", "Bhagavad Gita")}
              </span>
            </div>

            <div className="mobile-header-actions">
              <button
                type="button"
                className="mobile-header-action-btn theme-trigger"
                onClick={toggleTheme}
                title={
                  theme === "light"
                    ? txt("ડાર્ક મોડ", "डार्क मोड", "Dark Mode")
                    : txt("લાઇટ મોડ", "लाइट मोड", "Light Mode")
                }
                aria-label={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {theme === "light" ? (
                  <Moon size={19} strokeWidth={2} />
                ) : (
                  <Sun size={19} strokeWidth={2} />
                )}
              </button>

              <button
                type="button"
                className="mobile-header-action-btn search-trigger"
                onClick={onOpenSearch}
                title={txt("શ્લોક શોધો", "श्लोक खोजें", "Search Shlokas")}
                aria-label="Search"
              >
                <Search size={20} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        ) : (
          /* ================= SUBPAGE HEADER ================= */
          <div className="mobile-header-subpage-content">
            <button
              type="button"
              className="mobile-header-action-btn back-trigger"
              onClick={handleBack}
              title={txt("પાછળ જાઓ", "पीछे जाएं", "Go Back")}
              aria-label="Go Back"
            >
              <ArrowLeft size={21} strokeWidth={2.4} />
            </button>

            <h1 className="mobile-header-screen-title" title={getDynamicTitle()}>
              {getDynamicTitle()}
            </h1>

            <div className="mobile-header-actions">
              <button
                type="button"
                className="mobile-header-action-btn theme-trigger"
                onClick={toggleTheme}
                title={
                  theme === "light"
                    ? txt("ડાર્ક મોડ", "डार्क मोड", "Dark Mode")
                    : txt("લાઇટ મોડ", "लाइट मोड", "Light Mode")
                }
                aria-label={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {theme === "light" ? (
                  <Moon size={19} strokeWidth={2} />
                ) : (
                  <Sun size={19} strokeWidth={2} />
                )}
              </button>

              <button
                type="button"
                className="mobile-header-action-btn search-trigger"
                onClick={onOpenSearch}
                title={txt("શ્લોક શોધો", "श्लोक खोजें", "Search Shlokas")}
                aria-label="Search"
              >
                <Search size={20} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
