import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, BookOpen, Trophy, Heart, Menu } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import "./MobileBottomNav.css";

export default function MobileBottomNav({
  handleProtectedNavigation,
  handleNormalNavigation,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { txt } = useLanguage();

  useEffect(() => {
    document.body.classList.add("has-mobile-bottom-nav");
    return () => {
      document.body.classList.remove("has-mobile-bottom-nav");
    };
  }, []);

  const pathname = location.pathname;

  // When inside ChapterReader (/chapter/:chapterNumber), hide general 5-tab bottom nav
  // because ChapterReader renders its own specialized 4-button action bar!
  if (pathname.startsWith("/chapter/")) {
    return null;
  }

  // Active state checkers
  const isHomeActive = pathname === "/";
  const isChaptersActive =
    pathname === "/chapters" || pathname.startsWith("/chapter/");
  const isQuizActive =
    pathname === "/quiz" ||
    pathname === "/quiz-category" ||
    pathname.startsWith("/quiz/");
  const isFavoritesActive = pathname === "/favorites";
  const isMoreActive =
    pathname === "/more" ||
    pathname === "/profile" ||
    pathname === "/about" ||
    pathname === "/about-us" ||
    pathname === "/guidance" ||
    pathname === "/jivan-margdarshan" ||
    pathname === "/history" ||
    pathname === "/reading-tracker" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/");

  const onHomeClick = () => {
    if (handleNormalNavigation) handleNormalNavigation();
    navigate("/");
  };

  const onChaptersClick = () => {
    if (handleNormalNavigation) handleNormalNavigation();
    navigate("/chapters");
  };

  const onQuizClick = () => {
    if (handleProtectedNavigation) {
      handleProtectedNavigation(
        "/quiz-category",
        txt(
          "Quiz રમવા માટે Login કરવું જરૂરી છે.",
          "Quiz खेलने के लिए Login करना आवश्यक है।",
          "Login is required to play the Quiz."
        )
      );
    } else {
      navigate("/quiz-category");
    }
  };

  const onFavoritesClick = () => {
    if (handleProtectedNavigation) {
      handleProtectedNavigation(
        "/favorites",
        txt(
          "મનપસંદ શ્લોક જોવા માટે Login કરવું જરૂરી છે.",
          "पसंदीदा श्लोक देखने के लिए Login करना आवश्यक है।",
          "Login is required to view favorite shlokas."
        )
      );
    } else {
      navigate("/favorites");
    }
  };

  const onMoreClick = () => {
    if (handleNormalNavigation) handleNormalNavigation();
    navigate("/more");
  };

  return (
    <nav
      className={`mobile-bottom-nav ${isHomeActive ? "is-home-bottom-nav" : "is-subpage-bottom-nav"}`}
      aria-label="Mobile Bottom Navigation"
    >
      {/* 1. HOME */}
      <button
        type="button"
        className={`mobile-tab-btn ${isHomeActive ? "active" : ""}`}
        onClick={onHomeClick}
        aria-label={txt("હોમ", "होम", "Home")}
      >
        <div className="tab-icon-wrapper">
          <Home size={21} strokeWidth={isHomeActive ? 2.4 : 1.9} />
        </div>
        <span className="tab-label">{txt("હોમ", "होम", "Home")}</span>
      </button>

      {/* 2. 18 CHAPTERS */}
      <button
        type="button"
        className={`mobile-tab-btn ${isChaptersActive ? "active" : ""}`}
        onClick={onChaptersClick}
        aria-label={txt("અધ્યાય", "अध्याय", "Chapters")}
      >
        <div className="tab-icon-wrapper">
          <BookOpen size={21} strokeWidth={isChaptersActive ? 2.4 : 1.9} />
        </div>
        <span className="tab-label">{txt("અધ્યાય", "अध्याय", "Chapters")}</span>
      </button>

      {/* 3. QUIZ */}
      <button
        type="button"
        className={`mobile-tab-btn ${isQuizActive ? "active" : ""}`}
        onClick={onQuizClick}
        aria-label={txt("ક્વિઝ", "क्विज़", "Quiz")}
      >
        <div className="tab-icon-wrapper">
          <Trophy size={21} strokeWidth={isQuizActive ? 2.4 : 1.9} />
        </div>
        <span className="tab-label">{txt("ક્વિઝ", "क्विज़", "Quiz")}</span>
      </button>

      {/* 4. FAVORITES / PASANDGI (PROFESSIONAL HEART ICON) */}
      <button
        type="button"
        className={`mobile-tab-btn ${isFavoritesActive ? "active" : ""}`}
        onClick={onFavoritesClick}
        aria-label={txt("પસંદગી", "पसंदीदा", "Favorites")}
      >
        <div className="tab-icon-wrapper">
          <Heart
            size={21}
            strokeWidth={isFavoritesActive ? 2.4 : 1.9}
            fill={isFavoritesActive ? "#f59e0b" : "none"}
          />
        </div>
        <span className="tab-label">{txt("પસંદગી", "पसंदीदा", "Favorites")}</span>
      </button>

      {/* 5. VADHU / MORE (DEDICATED HUB PAGE) */}
      <button
        type="button"
        className={`mobile-tab-btn ${isMoreActive ? "active" : ""}`}
        onClick={onMoreClick}
        aria-label={txt("વધુ", "अधिक", "More")}
      >
        <div className="tab-icon-wrapper">
          <Menu size={21} strokeWidth={isMoreActive ? 2.4 : 1.9} />
        </div>
        <span className="tab-label">{txt("વધુ", "अधिक", "More")}</span>
      </button>
    </nav>
  );
}
