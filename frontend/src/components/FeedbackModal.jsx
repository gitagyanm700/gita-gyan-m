import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Star,
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { getValidToken } from "../utils/authHelper.js";
import "./FeedbackModal.css";

const PROD_API_BASE = "https://bhagavad-gita-backend-jy1a.onrender.com";
const LOCAL_API_BASE = "http://localhost:5000";

const RATING_LABELS_GU = {
  1: "સુધારવાની જરૂર છે",
  2: "સામાન્ય",
  3: "સારું",
  4: "ઘણું સરસ",
  5: "અદ્ભુત અને દિવ્ય અનુભવ",
};

const RATING_LABELS_HI = {
  1: "सुधार की आवश्यकता है",
  2: "सामान्य",
  3: "अच्छा",
  4: "बहुत अच्छा",
  5: "अद्भुत और दिव्य अनुभव",
};

const RATING_LABELS_EN = {
  1: "Needs Improvement",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Wonderful & Divine Experience",
};

export default function FeedbackModal() {
  const location = useLocation();
  const { user } = useAuth();
  const { isHindi, isEnglish, isGujarati, txt } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [isAutoPrompt, setIsAutoPrompt] = useState(false);
  const [rating, setRating] = useState(5);
  const [existingRating, setExistingRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isLabelExpanded, setIsLabelExpanded] = useState(false);

  const [category] = useState("feedback");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [stats, setStats] = useState(null);

  // Pre-fetch website average rating stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  // WhatsApp-like pill expand & collapse animation:
  // Starts strictly AFTER Gita AI pill closes, and ONLY on the Home page when no modals are open!
  useEffect(() => {
    // If already shown in this session (e.g. on page refresh), DO NOT PLAY AGAIN!
    if (sessionStorage.getItem("gita_fab_rating_intro_shown") === "true") {
      setIsLabelExpanded(false);
      return;
    }

    if (location.pathname !== "/") {
      setIsLabelExpanded(false);
      return;
    }

    let expandTimer = null;
    let collapseTimer = null;
    let fallbackTimer = null;

    const runRatingPill = () => {
      // Re-check early constraints
      if (sessionStorage.getItem("gita_fab_rating_intro_shown") === "true") return;
      if (location.pathname !== "/") return;
      if (isOpen || document.querySelector(".feedback-modal-overlay")) return;

      sessionStorage.setItem("gita_fab_rating_intro_shown", "true");

      expandTimer = setTimeout(() => {
        setIsLabelExpanded(true);

        collapseTimer = setTimeout(() => {
          setIsLabelExpanded(false);
        }, 2500); // 2.5 seconds duration
      }, 250);
    };

    // Listen for AI pill finish event
    window.addEventListener("gita-ai-pill-closed", runRatingPill, { once: true });

    // Fallback: If AI pill already played or doesn't fire within 6s, run rating pill
    fallbackTimer = setTimeout(() => {
      if (
        sessionStorage.getItem("gita_fab_rating_intro_shown") !== "true" &&
        location.pathname === "/"
      ) {
        runRatingPill();
      }
    }, 5500);

    return () => {
      window.removeEventListener("gita-ai-pill-closed", runRatingPill);
      clearTimeout(expandTimer);
      clearTimeout(collapseTimer);
      clearTimeout(fallbackTimer);
      if (location.pathname !== "/") {
        setIsLabelExpanded(false);
      }
    };
  }, [location.pathname]);

  // Initialize name and email from logged-in user
  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name);
      if (user.email) setEmail(user.email);
    }
  }, [user]);

  // Fetch user's existing rating and lock status
  const fetchUserRating = async () => {
    const token = getValidToken();
    if (!token) {
      setHasRated(false);
      setExistingRating(0);
      setIsLocked(false);
      return;
    }

    const isLocal =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");

    const targets = isLocal
      ? [`${LOCAL_API_BASE}/api/feedback/my-rating`, `${PROD_API_BASE}/api/feedback/my-rating`]
      : [`${PROD_API_BASE}/api/feedback/my-rating`, `${LOCAL_API_BASE}/api/feedback/my-rating`];

    for (const url of targets) {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            if (data.hasRated) {
              setHasRated(true);
              setExistingRating(data.rating || 0);
              setRating(data.rating);
              setIsLocked(Boolean(data.isLocked || data.rating === 5));
              localStorage.setItem("gita_rating_submitted", "true");
            } else {
              setHasRated(false);
              setExistingRating(0);
              setIsLocked(false);
              setRating(5);
            }
            break;
          }
        }
      } catch {
        // try next
      }
    }
  };

  // Fetch feedback stats (Average Rating & Total Ratings)
  const fetchStats = async () => {
    const isLocal =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");

    const targets = isLocal
      ? [`${LOCAL_API_BASE}/api/feedback/stats`, `${PROD_API_BASE}/api/feedback/stats`]
      : [`${PROD_API_BASE}/api/feedback/stats`, `${LOCAL_API_BASE}/api/feedback/stats`];

    for (const url of targets) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.stats) {
            setStats(data.stats);
            break;
          }
        }
      } catch {
        // ignore
      }
    }
  };

  // Listen to manual open-feedback-modal event
  useEffect(() => {
    const handleOpenEvent = () => {
      setIsAutoPrompt(false);
      setIsOpen(true);
      setError("");
      fetchUserRating();
      fetchStats();
    };
    window.addEventListener("open-feedback-modal", handleOpenEvent);
    return () => {
      window.removeEventListener("open-feedback-modal", handleOpenEvent);
    };
  }, []);

  // Listen to sequential flow trigger: gita-login-prompt-done
  useEffect(() => {
    const handleAutoPrompt = () => {
      // 1. If rating already submitted, NEVER prompt again!
      const alreadyRated = localStorage.getItem("gita_rating_submitted") === "true";
      if (alreadyRated) return;

      // Do not auto-open if currently on auth pages (/login, /register, etc.)
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        if (path === "/login" || path === "/register" || path === "/forgot-password") {
          return;
        }
      }

      // 2. Check 2-Day Cooldown (48 hours)
      const skippedTime = localStorage.getItem("gita_rating_skipped_time");
      if (skippedTime) {
        const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
        if (Date.now() - Number(skippedTime) < TWO_DAYS_MS) {
          return;
        }
      }

      // 3. Gentle delay before displaying
      const timer = setTimeout(() => {
        setIsAutoPrompt(true);
        setIsOpen(true);
        setError("");
        fetchUserRating();
        fetchStats();
      }, 450);

      return () => clearTimeout(timer);
    };

    window.addEventListener("gita-login-prompt-done", handleAutoPrompt);
    return () => {
      window.removeEventListener("gita-login-prompt-done", handleAutoPrompt);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchUserRating();
      fetchStats();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!rating || rating < 1 || rating > 5) {
      setError(
        txt(
          "કૃપા કરીને ૧ થી ૫ વચ્ચે સ્ટાર રેટિંગ પસંદ કરો.",
          "कृपया 1 से 5 के बीच स्टार रेटिंग चुनें।",
          "Please select a star rating between 1 and 5."
        )
      );
      return;
    }

    setSubmitting(true);

    const isLocal =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");

    const targets = isLocal
      ? [`${LOCAL_API_BASE}/api/feedback`, `${PROD_API_BASE}/api/feedback`]
      : [`${PROD_API_BASE}/api/feedback`];

    const token = getValidToken();
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const payload = {
      rating: rating || 5,
      category: "feedback",
      name: name.trim() || (user?.name || txt("અનામી સાધક", "अनाम साधक", "Anonymous Seeker")),
      email: email.trim() || (user?.email || ""),
      message: message.trim(),
    };

    let success = false;
    let errorMsg = txt(
      "સર્વર સાથે જોડાણ થઈ શક્યું નથી. કૃપા કરીને ફરી પ્રયાસ કરો.",
      "सर्वर से संपर्क नहीं हो सका। कृपया पुनः प्रयास करें।",
      "Could not connect to the server. Please try again."
    );

    for (const url of targets) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          success = true;
          if (data.isLocked) {
            setIsLocked(true);
            setRating(5);
          }
          break;
        } else if (data.message) {
          errorMsg = data.message;
        }
      } catch {
        // try next
      }
    }

    setSubmitting(false);

    if (success) {
      setSubmitted(true);
      setMessage("");
      localStorage.setItem("gita_rating_submitted", "true");
      localStorage.removeItem("gita_rating_skipped_time");
      fetchUserRating();
      fetchStats();
    } else {
      setError(errorMsg);
    }
  };

  const handleClose = () => {
    // If closing/skipping before submitting or locking, set 2-day cooldown only if auto-prompted
    if (isAutoPrompt && !isLocked && !hasRated && !submitted) {
      localStorage.setItem("gita_rating_skipped_time", Date.now().toString());
    }
    setIsOpen(false);
    setTimeout(() => {
      setSubmitted(false);
      setError("");
      setIsAutoPrompt(false);
    }, 300);
    try {
      window.dispatchEvent(new CustomEvent("feedback-modal-closed"));
    } catch (e) {}
  };

  const activeRating = isLocked ? 5 : hoverRating || rating;
  const ratingLabels = isEnglish ? RATING_LABELS_EN : (isHindi ? RATING_LABELS_HI : RATING_LABELS_GU);

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        type="button"
        className={`feedback-fab-trigger ${isLabelExpanded ? "label-expanded" : ""}`}
        onClick={() => {
          setIsLabelExpanded(false);
          setIsAutoPrompt(false);
          setIsOpen(true);
          setError("");
          fetchUserRating();
          fetchStats();
        }}
        aria-label={txt("પ્રતિસાદ અને રેટિંગ આપો", "प्रतिक्रिया और रेटिंग दें", "Give feedback and rating")}
        title={txt("વેબસાઇટ માટે તમારો પ્રતિસાદ અને રેટિંગ આપો", "वेबसाइट के लिए अपनी प्रतिक्रिया और रेटिंग दें", "Give your feedback and rating for the website")}
      >
        <Star size={16} className="feedback-fab-star-icon" />
        <span className="feedback-fab-text">
          {txt("પ્રતિસાદ / રેટિંગ", "प्रतिक्रिया / रेटिंग", "Feedback / Rating")}
        </span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="feedback-modal-overlay" onClick={handleClose}>
          <div
            className="feedback-modal-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Close Button */}
            <button
              type="button"
              className="feedback-modal-close"
              onClick={handleClose}
              aria-label={txt("બંધ કરો", "बंद करें", "Close")}
            >
              <X size={18} />
            </button>

            {submitted ? (
              /* Success Confirmation */
              <div className="feedback-success-state">
                <div className="feedback-success-icon-box">
                  <CheckCircle2 size={42} strokeWidth={2.5} />
                </div>
                <h3 className="feedback-success-title">
                  {txt("ધન્યવાદ!", "धन्यवाद!", "Thank you!")}
                </h3>
                <p className="feedback-success-desc">
                  {txt(
                    "આપનો પ્રતિસાદ અને રેટિંગ સફળતાપૂર્વક નોંધાઈ ગયો છે. આપના અમૂલ્ય સાથ બદલ ખૂબ ખૂબ આભાર!",
                    "आपकी प्रतिक्रिया और रेटिंग सफलतापूर्वक दर्ज हो गई है। आपके अमूल्य सहयोग के लिए बहुत-बहुत धन्यवाद!",
                    "Your feedback and rating have been recorded successfully. Thank you so much for your invaluable support!"
                  )}
                </p>
                <button
                  type="button"
                  className="feedback-close-success-btn"
                  onClick={handleClose}
                >
                  {txt("બંધ કરો", "बंद करें", "Close")}
                </button>
              </div>
            ) : (
              /* Feedback Form */
              <>
                {/* 1. પ્રતિસાદ અને સ્ટાર રેટિંગ (Header Title) */}
                <div className="feedback-modal-header">
                  <h2 className="feedback-modal-title">
                    {txt("પ્રતિસાદ અને સ્ટાર રેટિંગ", "प्रतिक्रिया और स्टार रेटिंग", "Feedback & Star Rating")}
                  </h2>
                </div>

                {/* Website Average Rating Display */}
                <div className="feedback-avg-rating-badge">
                  <div className="feedback-avg-rating-left">
                    <span className="feedback-avg-rating-label">
                      {txt("સરેરાશ રેટિંગ", "औसत रेटिंग", "Average Rating")}
                    </span>
                    <div className="feedback-avg-rating-stars">
                      {[1, 2, 3, 4, 5].map((i) => {
                        const avg = stats?.averageRating || 5.0;
                        const isFilled = i <= Math.round(avg);
                        return (
                          <Star
                            key={i}
                            size={16}
                            className={isFilled ? "avg-star-filled" : "avg-star-empty"}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="feedback-avg-rating-right">
                    <span className="feedback-avg-number">
                      {stats && stats.averageRating > 0
                        ? stats.averageRating.toFixed(1)
                        : "5.0"}
                    </span>
                    <span className="feedback-avg-max">/ 5</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  {/* 2. Rating Box (રેટિંગ બોક્સ) */}
                  <div className="feedback-rating-section">
                    <div className="feedback-rating-header-row">
                      <label className="feedback-section-label">
                        {hasRated
                          ? txt("તમારું રેટિંગ", "आपकी रेटिंग", "Your Rating")
                          : txt("વેબસાઇટને સ્ટાર રેટિંગ આપો", "वेबसाइट को स्टार रेटिंग दें", "Rate this website")}
                      </label>
                    </div>

                    <div className="feedback-stars-row">
                      {[1, 2, 3, 4, 5].map((starNum) => (
                        <button
                          key={starNum}
                          type="button"
                          className="feedback-star-btn"
                          onMouseEnter={() => setHoverRating(starNum)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(starNum)}
                          aria-label={`${starNum} ${txt("સ્ટાર", "स्टार", "Star")}`}
                          title={`${starNum} ${txt("સ્ટાર", "स्टार", "Star")}`}
                        >
                          <Star
                            size={32}
                            strokeWidth={1.8}
                            className={`feedback-star-icon ${
                              starNum <= activeRating ? "filled" : "empty"
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    <div className="feedback-rating-descriptor">
                      {ratingLabels[activeRating] || ""}
                    </div>
                  </div>

                  {/* 3. આપનું નામ (Name) & 4. ઈમેઇલ (Email) */}
                  <div className="feedback-input-row">
                    <div className="feedback-field">
                      <label className="feedback-field-label">
                        {txt("આપનું નામ", "आपका नाम", "Your Name")}
                      </label>
                      <input
                        type="text"
                        className="feedback-text-input"
                        placeholder={txt("આપનું નામ", "आपका नाम", "Your Name")}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={50}
                      />
                    </div>
                    <div className="feedback-field">
                      <label className="feedback-field-label">
                        {txt("ઈમેઇલ", "ईमेल", "Email")}
                      </label>
                      <input
                        type="email"
                        className="feedback-text-input"
                        placeholder={txt("ઈમેઇલ", "ईमेल", "Email")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        maxLength={80}
                      />
                    </div>
                  </div>

                  {/* 5. આપનું સૂચન અથવા પ્રતિસાદ (Textarea, limit: 2000, no character counter) */}
                  <div className="feedback-textarea-wrap">
                    <label className="feedback-group-title">
                      {txt("આપનું સૂચન અથવા પ્રતિસાદ", "आपका सुझाव या प्रतिक्रिया", "Your Suggestion or Feedback")}
                    </label>
                    <textarea
                      className="feedback-textarea"
                      placeholder={txt(
                        "કોઈ નવું સૂચન, સુધારો કે આપનો પવિત્ર અનુભવ અહીં લખો...",
                        "कोई नया सुझाव, सुधार या अपना पवित्र अनुभव यहाँ लिखें...",
                        "Write any suggestion, improvement, or your sacred experience here..."
                      )}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={2000}
                      rows={4}
                    />
                  </div>

                  {/* Error Notification */}
                  {error && (
                    <div className="feedback-error-banner">
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Action Buttons: Submit & Skip */}
                  <div className="feedback-form-actions">
                    <button
                      type="submit"
                      className="feedback-submit-btn"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={18} className="feedback-spinning" />
                          <span>
                            {txt("સબમિટ થઈ રહ્યું છે...", "सबमिट हो रहा है...", "Submitting...")}
                          </span>
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          <span>
                            {hasRated
                              ? txt("રેટિંગ સબમિટ કરો", "रेटिंग सबमिट करें", "Submit Rating")
                              : txt("સબમિટ કરો", "सबमिट करें", "Submit")}
                          </span>
                        </>
                      )}
                    </button>

                    {isAutoPrompt && (
                      <button
                        type="button"
                        className="feedback-skip-btn"
                        onClick={handleClose}
                      >
                        Skip
                      </button>
                    )}
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
