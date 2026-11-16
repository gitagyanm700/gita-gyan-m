import { getValidToken, handleAuth401 } from "../utils/authHelper.js";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, RefreshCw, ArrowLeft, BookOpen, ChevronRight, ClipboardList, CheckCircle2, XCircle, SkipForward, Clock, PlayCircle, Award } from "lucide-react";
import SudarshanShimmerLoader from "../components/SudarshanShimmerLoader.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import "./QuizResult.css";

const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const API_URL = isLocal
  ? "http://localhost:5000/api/quiz"
  : "https://bhagavad-gita-backend-jy1a.onrender.com/api/quiz";

function QuizResult() {
  const { isHindi, isEnglish, isGujarati, txt } = useLanguage();
  // =====================================================
  // STATE
  // =====================================================

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Which quiz result is currently expanded
  const [expandedResult, setExpandedResult] = useState(null);

  const navigate = useNavigate();

  // =====================================================
  // CHAPTER NAMES
  // =====================================================

  const chapterNames = {
    1: "અર્જુનવિષાદ યોગ",
    2: "સાંખ્ય યોગ",
    3: "કર્મ યોગ",
    4: "જ્ઞાનકર્મસંન્યાસ યોગ",
    5: "કર્મસંન્યાસ યોગ",
    6: "આત્મસંયમ યોગ",
    7: "જ્ઞાનવિજ્ઞાન યોગ",
    8: "અક્ષરબ્રહ્મ યોગ",
    9: "રાજવિદ્યા રાજગુહ્ય યોગ",
    10: "વિભૂતિ યોગ",
    11: "વિશ્વરૂપદર્શન યોગ",
    12: "ભક્તિ યોગ",
    13: "ક્ષેત્રક્ષેત્રજ્ઞ વિભાગ યોગ",
    14: "ગુણત્રયવિભાગ યોગ",
    15: "પુરુષોત્તમ યોગ",
    16: "દૈવાસુરસંપદ્વિભાગ યોગ",
    17: "શ્રદ્ધાત્રયવિભાગ યોગ",
    18: "મોક્ષસંન્યાસ યોગ",
  };

  const chapterNamesHi = {
    1: "अर्जुनविषाद योग",
    2: "सांख्य योग",
    3: "कर्म योग",
    4: "ज्ञानकर्मसंन्यास योग",
    5: "कर्मसंन्यास योग",
    6: "आत्मसंयम योग",
    7: "ज्ञानविज्ञान योग",
    8: "अक्षरब्रह्म योग",
    9: "राजविद्या राजगुह्य योग",
    10: "विभूति योग",
    11: "विश्वरूपदर्शन योग",
    12: "भक्ति योग",
    13: "क्षेत्र-क्षेत्रज्ञ विभाग योग",
    14: "गुणत्रयविभाग योग",
    15: "पुरुषोत्तम योग",
    16: "दैवासुरसम्पद्विभाग योग",
    17: "श्रद्धात्रयविभाग योग",
    18: "मोक्षसंन्यास योग",
  };

  const chapterNamesEn = {
    1: "Arjuna Vishada Yoga",
    2: "Sankhya Yoga",
    3: "Karma Yoga",
    4: "Jnana Karma Sanyasa Yoga",
    5: "Karma Sanyasa Yoga",
    6: "Dhyana Yoga",
    7: "Jnana Vijnana Yoga",
    8: "Aksara Brahma Yoga",
    9: "Raja Vidya Raja Guhya Yoga",
    10: "Vibhuti Yoga",
    11: "Visvarupa Darsana Yoga",
    12: "Bhakti Yoga",
    13: "Ksetra Ksetrajna Vibhaga Yoga",
    14: "Gunatraya Vibhaga Yoga",
    15: "Purusottama Yoga",
    16: "Daivasura Sampad Vibhaga Yoga",
    17: "Sraddhatraya Vibhaga Yoga",
    18: "Moksa Sanyasa Yoga",
  };

  // =====================================================
  // FETCH RESULTS
  // =====================================================

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        setError("");

        const token = getValidToken();

        // -------------------------------------------------
        // LOGIN CHECK
        // -------------------------------------------------

        if (!token) {
          handleAuth401(navigate, "/quiz-results");
          return;
        }

        const resultURL = `${API_URL}/results`;

        console.log(
          "📡 Fetching Quiz Results:",
          resultURL
        );

        // -------------------------------------------------
        // API REQUEST
        // -------------------------------------------------

        const response = await fetch(resultURL, {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        // -------------------------------------------------
        // RESPONSE
        // -------------------------------------------------

        let data = {};

        try {
          data = await response.json();
        } catch (jsonError) {
          console.error(
            "❌ JSON Parse Error:",
            jsonError
          );
        }

        console.log(
          "📊 Quiz Result Response:",
          data
        );

        // -------------------------------------------------
        // SERVER ERROR
        // -------------------------------------------------

        if (!response.ok) {
          if (response.status === 401 || (data.message && data.message.toLowerCase().includes("token"))) {
            handleAuth401(navigate, "/quiz-results");
            return;
          }
          throw new Error(
            data.message ||
              `Server Error: ${response.status}`
          );
        }

        // -------------------------------------------------
        // SET RESULTS
        // -------------------------------------------------

        if (Array.isArray(data.results)) {
          /*
            Backend માં જેટલા અલગ Quiz attempts
            save થયેલા હશે, એટલા બધા records
            અલગ અલગ result તરીકે રહેશે.
          */

          const individualResults =
            data.results.map(
              (result, index) => ({
                ...result,

                __historyKey:
                  result._id ||
                  result.id ||
                  `${result.createdAt || "result"}-${index}`,
              })
            );

          setResults(individualResults);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error(
          "❌ Fetch Quiz Results Error:",
          err
        );

        setError(
          err.message ||
            txt("Quiz result load કરવામાં error આવ્યો.", "Quiz परिणाम लोड करने में त्रुटि आई।", "Error loading quiz results.")
        );
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [navigate]);

  // =====================================================
  // PERCENTAGE
  // =====================================================

  const getPercentage = (
    correctAnswers,
    totalQuestions
  ) => {
    if (
      !totalQuestions ||
      totalQuestions <= 0
    ) {
      return 0;
    }

    return Math.round(
      (correctAnswers / totalQuestions) * 100
    );
  };

  // =====================================================
  // RESULT MESSAGE
  // =====================================================

  const getResultMessage = (percentage) => {
    if (percentage >= 90) {
      return txt("અદ્ભુત! ખૂબ જ સરસ પ્રદર્શન!", "अद्भुत! बहुत ही उत्तम प्रदर्शन!", "Spectacular! Outstanding performance!");
    }

    if (percentage >= 75) {
      return txt("ખૂબ સરસ! તમારું પ્રદર્શન ઉત્તમ છે.", "बहुत बढ़िया! आपका प्रदर्शन उत्तम है।", "Great job! Your performance is commendable.");
    }

    if (percentage >= 50) {
      return txt("સારું પ્રદર્શન! વધુ અભ્યાસ કરો.", "अच्छा प्रदर्शन! और अभ्यास करें।", "Good performance! Keep studying and practicing.");
    }

    return txt("વધુ મહેનત કરો અને ફરી પ્રયાસ કરો.", "और मेहनत करें तथा पुनः प्रयास करें।", "Review the chapters and try again.");
  };

  // =====================================================
  // EXTRACT CHAPTER NUMBER
  // =====================================================

  const getChapterNumber = (result) => {
    if (!result) return null;

    if (result.chapterNumber !== undefined && result.chapterNumber !== null) {
      const parsed = Number(result.chapterNumber);
      if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 18) {
        return parsed;
      }
    }

    if (typeof result.category === "string") {
      const cat = result.category.trim().toLowerCase();
      if (cat.startsWith("chapter-") || cat.startsWith("chapter_")) {
        const parsed = Number(cat.replace(/^chapter[-_]/, ""));
        if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 18) {
          return parsed;
        }
      }
      const directNum = Number(cat);
      if (Number.isInteger(directNum) && directNum >= 1 && directNum <= 18) {
        return directNum;
      }
    }

    return null;
  };

  // =====================================================
  // QUIZ TARGET INFO
  // =====================================================

  const getQuizTargetInfo = (result) => {
    const chapterNumber = getChapterNumber(result);

    if (chapterNumber) {
      const chapterTitle = (isEnglish ? chapterNamesEn[chapterNumber] : isHindi ? chapterNamesHi[chapterNumber] : chapterNames[chapterNumber]) || "";
      const prefix = txt("અધ્યાય", "अध्याय", "Chapter");
      const shlokaLabel = txt("શ્લોક", "श्लोक", "Verse");

      let shlokaSuffix = "";
      let shlokaBadge = "";
      if (result.shlokaRange && result.shlokaRange !== "all") {
        const parts = String(result.shlokaRange).split("-");
        if (parts.length === 2 && parts[0] === parts[1]) {
          shlokaSuffix = ` • ${shlokaLabel} ${parts[0]}`;
          shlokaBadge = ` (${shlokaLabel} ${parts[0]})`;
        } else if (parts.length === 2) {
          shlokaSuffix = ` • ${shlokaLabel} ${parts[0]}-${parts[1]}`;
          shlokaBadge = ` (${shlokaLabel} ${parts[0]}-${parts[1]})`;
        } else {
          shlokaSuffix = ` • ${shlokaLabel} ${result.shlokaRange}`;
          shlokaBadge = ` (${shlokaLabel} ${result.shlokaRange})`;
        }
      }

      return {
        isChapter: true,
        chapterNumber,
        shortTitle: `${prefix} ${chapterNumber}${shlokaBadge}`,
        title: `${prefix} ${chapterNumber}: ${chapterTitle}${shlokaSuffix}`,
        badge: `${prefix} ${chapterNumber} • ${chapterTitle}${shlokaBadge}`,
        shortBadge: `${prefix} ${chapterNumber}${shlokaBadge}`,
        subtitle: txt(
          `શ્રીમદ્ ભગવદ્ ગીતા • અધ્યાય ${chapterNumber}${shlokaSuffix}`,
          `श्रीमद्भगवद्गीता • अध्याय ${chapterNumber}${shlokaSuffix}`,
          `Srimad Bhagavad Gita • Chapter ${chapterNumber}${shlokaSuffix}`
        ),
      };
    }

    if (result.category === "mahabharata") {
      return {
        isChapter: false,
        chapterNumber: null,
        shortTitle: txt("મહાભારત Quiz", "महाभारत Quiz", "Mahabharata Quiz"),
        title: txt("મહાભારત Quiz", "महाभारत Quiz", "Mahabharata Quiz"),
        badge: txt("મહાભારત વિશેષ ક્વિઝ", "महाभारत विशेष क्विज़", "Mahabharata Special Quiz"),
        shortBadge: txt("મહાભારત", "महाभारत", "Mahabharata"),
        subtitle: txt("મહાભારત વિશેષ જ્ઞાન કસોટી", "महाभारत विशेष ज्ञान परीक्षा", "Mahabharata Special Knowledge Quiz"),
      };
    }

    return {
      isChapter: false,
      chapterNumber: null,
      shortTitle: txt("ભગવદ્ ગીતા Quiz", "भगवद् गीता Quiz", "Bhagavad Gita Quiz"),
      title: txt("શ્રીમદ્ ભગવદ્ ગીતા Quiz", "श्रीमद् भगवद् गीता Quiz", "Srimad Bhagavad Gita Quiz"),
      badge: txt("સમગ્ર ભગવદ્ ગીતા", "सम्पूर्ण भगवद् गीता", "Comprehensive Bhagavad Gita"),
      shortBadge: txt("સમગ્ર ગીતા", "सम्पूर्ण गीता", "All Gita"),
      subtitle: txt("સંપૂર્ણ ભગવદ્ ગીતા સામાન્ય જ્ઞાન કસોટી", "सम्पूर्ण भगवद् गीता सामान्य ज्ञान परीक्षा", "Comprehensive Bhagavad Gita General Knowledge Quiz"),
    };
  };

  // =====================================================
  // CATEGORY NAME
  // =====================================================

  const getCategoryName = (result) => {
    const target = getQuizTargetInfo(result);
    return target.title;
  };

  // =====================================================
  // CHAPTER TEXT
  // =====================================================

  const getChapterText = (result) => {
    const target = getQuizTargetInfo(result);
    return target.badge;
  };

  // =====================================================
  // RETAKE QUIZ FROM HISTORY
  // =====================================================

  const handleRetakeFromHistory = (result) => {
    const chapterNumber = getChapterNumber(result);
    const params = new URLSearchParams();

    if (chapterNumber) {
      params.set("category", "chapter");
      params.set("chapter", String(chapterNumber));
      if (result.shlokaRange && result.shlokaRange !== "all") {
        params.set("shlokaRange", result.shlokaRange);
      }
    } else if (result.category === "mahabharata") {
      params.set("category", "mahabharata");
    } else {
      params.set("category", "all");
    }

    const count = Number(result.totalQuestions) || 10;
    params.set("count", String(count));

    try {
      // Clear completed guard for retaking
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.includes("quiz_completed") && (chapterNumber ? k.includes(String(chapterNumber)) : true)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch (e) {}

    navigate(`/quiz/play?${params.toString()}`);
  };

  // =====================================================
  // TOGGLE RESULT
  // =====================================================

  const toggleResult = (resultKey) => {
    setExpandedResult((previous) =>
      previous === resultKey
        ? null
        : resultKey
    );

    // Scroll slightly so expanded card is visible
    setTimeout(() => {
      if (expandedResult !== resultKey) {
        window.scrollBy({
          top: 120,
          behavior: "smooth",
        });
      }
    }, 100);
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="quiz-result-page">
        <SudarshanShimmerLoader
          type="simple"
          title={txt(
            "Quiz પરિણામ તૈયાર થઈ રહ્યું છે...",
            "क्विज परिणाम तैयार हो रहा है...",
            "Preparing quiz results..."
          )}
          subtitle={txt(
            "તમારી આધ્યાત્મિક પ્રગતિનું વિશ્લેષણ થઈ રહ્યું છે...",
            "आपकी आध्यात्मिक प्रगति का विश्लेषण हो रहा है...",
            "Analyzing your spiritual progress..."
          )}
        />
      </main>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    const isTokenIssue = error.toLowerCase().includes("token") || error.includes("401");
    const displayError = isTokenIssue
      ? txt(
          "અમાન્ય અથવા સમાપ્ત ટોકન (Invalid / Expired Token). કૃપા કરીને ફરીથી લોગિન કરો.",
          "अमान्य या समाप्त टोकन (Invalid / Expired Token)। कृपया पुनः लॉगिन करें।",
          "Invalid or expired token. Please login again."
        )
      : error;
    return (
      <main className="quiz-result-page">
        <section className="quiz-result-error">
          <div className="quiz-result-error-icon">
            <AlertCircle size={40} color="#ef4444" />
          </div>

          <h2>
            {txt("કંઈક સમસ્યા આવી", "कुछ समस्या आई", "Something went wrong")}
          </h2>

          <p>
            {displayError}
          </p>

          <div className="quiz-result-error-actions">
            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={15} className="btn-icon" /> {txt("ફરી પ્રયાસ કરો", "पुनः प्रयास करें", "Try Again")}
            </button>

            <button
              type="button"
              onClick={() => navigate("/quiz")}
            >
              <ArrowLeft size={15} className="btn-icon" /> {txt("Quiz પર પાછા જાઓ", "Quiz पर वापस जाएं", "Back to Quiz")}
            </button>

            {isTokenIssue && (
              <button
                type="button"
                className="quiz-result-login-btn"
                style={{ background: "#2563eb", color: "#ffffff" }}
                onClick={() => {
                  localStorage.removeItem("token");
                  navigate("/login");
                }}
              >
                {txt("લોગિન કરો", "लॉगिन करें", "Login")}
              </button>
            )}
          </div>
        </section>
      </main>
    );
  }

  // =====================================================
  // NO RESULTS
  // =====================================================

  if (results.length === 0) {
    return (
      <main className="quiz-result-page">

        <section className="quiz-result-header">

          <div className="quiz-result-om">
            ॐ
          </div>

          <p className="quiz-result-sacred-title">
            ॥ श्रीमद्भगवद्गीता ॥
          </p>

          <h1>
            Quiz Results
          </h1>

          <p>{txt("તમારા અત્યાર સુધીના Quiz Results", "आपके अब तक के Quiz Results", "Your quiz results so far")}</p>

        </section>

        <section className="quiz-result-empty">

          <div className="quiz-result-empty-icon">
            <BookOpen size={40} color="#2563eb" />
          </div>

          <h2>{txt("હજુ કોઈ Quiz Result નથી", "अभी कोई Quiz Result नहीं है", "No Quiz Results Yet")}</h2>

          <p>{txt("તમે હજુ સુધી કોઈ Quiz પૂર્ણ કરી નથી.", "आपने अभी तक कोई Quiz पूरी नहीं की है।", "You have not completed any quizzes yet.")}</p>

          <button
            type="button"
            onClick={() =>
              navigate("/quiz")
            }
          >
            <PlayCircle size={16} className="btn-icon" /> {txt("Quiz શરૂ કરો", "Quiz शुरू करें", "Start Quiz")}
          </button>

        </section>

      </main>
    );
  }

  // =====================================================
  // MAIN PAGE
  // =====================================================

  return (
    <main className="quiz-result-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <section className="quiz-result-header">

        <div className="quiz-result-om">
          ॐ
        </div>

        <p className="quiz-result-sacred-title">
          ॥ श्रीमद्भगवद्गीता ॥
        </p>

        <h1>
          Quiz Results
        </h1>
      </section>


      {/* =================================================
          ACTIONS
      ================================================= */}

      <div className="quiz-result-actions">
        <button
          type="button"
          className="quiz-result-achievements-btn"
          onClick={() =>
            navigate("/quiz-achievements")
          }
        >
          <Award size={18} className="btn-icon" />
          <span>{txt("ક્વિઝ સિદ્ધિઓ જુઓ", "क्विज़ उपलब्धियां देखें", "View Quiz Achievements")}</span>
        </button>
      </div>


      {/* =================================================
          QUIZ HISTORY GRID
      ================================================= */}

      <section className="quiz-history-grid">

        {results.map((result, index) => {

          // ------------------------------------------------
          // COMPLETION STATUS (TRUE OR FALSE)
          // ------------------------------------------------

          const isCompleted = result.completed !== false;

          // ------------------------------------------------
          // TOTAL, PLAYED & SKIPPED QUESTIONS
          // ------------------------------------------------

          const rawTotalQuestions = Number(result.totalQuestions || 0);
          const correctAnswers = Number(result.correctAnswers || 0);

          // Calculate answered / played count from answers array or (correct + wrong)
          const answeredCount =
            Array.isArray(result.answers) && result.answers.length > 0
              ? result.answers.filter(
                  (a) =>
                    a &&
                    a.selectedAnswer &&
                    String(a.selectedAnswer).trim() !== ""
                ).length
              : correctAnswers + Number(result.wrongAnswers || 0);

          // If incomplete and total was recorded as only the answered count (e.g. 2 instead of 10),
          // recover the actual quiz size (standard options: 10, 20, 30, etc., minimum 10)
          let totalQuestions = rawTotalQuestions;
          if (!isCompleted && (totalQuestions <= answeredCount || totalQuestions < 10)) {
            totalQuestions = Math.max(10, Math.ceil(Math.max(1, answeredCount) / 10) * 10);
          }

          const rawSkippedQuestions = Number(result.skippedQuestions || 0);
          const skippedQuestions = !isCompleted
            ? Math.max(0, totalQuestions - answeredCount)
            : rawSkippedQuestions;

          const calculatedWrong = Math.max(
            totalQuestions - correctAnswers - skippedQuestions,
            0
          );

          const wrongAnswers = Number.isFinite(Number(result.wrongAnswers))
            ? Number(result.wrongAnswers)
            : calculatedWrong;

          // ------------------------------------------------
          // PERCENTAGE
          // ------------------------------------------------

          const calculatedPercentage = getPercentage(
            correctAnswers,
            totalQuestions
          );

          let percentage = Number(result.percentage);

          if (!Number.isFinite(percentage) || !isCompleted) {
            percentage = calculatedPercentage;
          }

          percentage = Math.min(
            Math.max(
              percentage,
              0
            ),
            100
          );

          // ------------------------------------------------
          // TARGET & CATEGORY INFO
          // ------------------------------------------------

          const targetInfo =
            getQuizTargetInfo(result);

          const categoryName =
            targetInfo.title;

          const chapterText =
            targetInfo.badge;

          // ------------------------------------------------
          // UNIQUE KEY
          // ------------------------------------------------

          const resultKey =
            result.__historyKey ||
            result._id ||
            result.id ||
            `quiz-history-${index}`;

          // ------------------------------------------------
          // EXPANDED?
          // ------------------------------------------------

          const isExpanded =
            expandedResult === resultKey;

          // ------------------------------------------------
          // DATE
          // ------------------------------------------------

          let formattedDate = "";

          if (result.createdAt) {
            const date =
              new Date(
                result.createdAt
              );

            if (
              !Number.isNaN(
                date.getTime()
              )
            ) {
              formattedDate =
                date.toLocaleString(
                  "gu-IN",
                  {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                );
            }
          }

          return (
            <article
              className={`quiz-history-item ${isExpanded ? "quiz-history-expanded" : ""} ${!isCompleted ? "quiz-item-incomplete" : ""}`}
              key={resultKey}
            >

              {/* =================================================
                  SMALL QUIZ BUTTON
              ================================================= */}

              <button
                type="button"
                className="quiz-history-button"
                onClick={() =>
                  toggleResult(resultKey)
                }
                aria-expanded={isExpanded}
                aria-label={`${categoryName} result ${
                  isExpanded
                    ? txt("બંધ કરો", "बंद करें", "Close")
                    : txt("જુઓ", "देखें", "View")
                }`}
              >

                {/* ---------------------------------------------
                    QUIZ NUMBER
                --------------------------------------------- */}

                <div className="quiz-history-number">

                  <span>
                    QUIZ
                  </span>

                  <strong>
                    #{results.length - index}
                  </strong>

                </div>


                {/* ---------------------------------------------
                    QUIZ INFORMATION
                --------------------------------------------- */}

                <div className="quiz-history-info">

                  <div className="quiz-history-title-wrap">
                    <h3 className="quiz-history-title">
                      {targetInfo.shortTitle}
                    </h3>
                    {!isCompleted && (
                      <span className="quiz-history-status-badge incomplete">
                        <AlertCircle size={11} className="badge-icon" />
                        {txt("અધૂરી", "अधूरी", "Incomplete")}
                      </span>
                    )}
                  </div>

                  <p className="quiz-history-summary-line">
                    {!isCompleted ? (
                      <span className="quiz-history-incomplete-summary">
                        {txt(
                          `કુલ ${totalQuestions} માંથી ${answeredCount} રમેલા (${skippedQuestions} બાકી)`,
                          `कुल ${totalQuestions} में से ${answeredCount} खेले (${skippedQuestions} बाकी)`,
                          `Played ${answeredCount} of ${totalQuestions} (${skippedQuestions} left)`
                        )}
                      </span>
                    ) : (
                      <span className="quiz-history-completed-summary">
                        {txt(
                          `કુલ ${totalQuestions} પ્રશ્નો • ${correctAnswers} સાચા`,
                          `कुल ${totalQuestions} प्रश्न • ${correctAnswers} सही`,
                          `${totalQuestions} Questions • ${correctAnswers} Correct`
                        )}
                      </span>
                    )}
                  </p>

                  {formattedDate && (
                    <p className="quiz-history-date">
                      <Clock size={12} className="quiz-date-icon" />
                      {formattedDate}
                    </p>
                  )}

                </div>


                {/* ---------------------------------------------
                    PERCENTAGE CIRCLE
                --------------------------------------------- */}

                <div
                  className={`quiz-history-circle ${!isCompleted ? "incomplete" : ""}`}
                  style={{
                    "--score": `${percentage}%`,
                  }}
                >

                  <div className="quiz-history-circle-inner">

                    <strong>
                      {Math.round(
                        percentage
                      )}
                      %
                    </strong>

                    <span>
                      {!isCompleted ? txt("અધૂરી", "अधूरी", "INCOMPLETE") : "SCORE"}
                    </span>

                  </div>

                </div>


                {/* ---------------------------------------------
                    ARROW
                --------------------------------------------- */}

                <span
                  className={
                    isExpanded
                      ? "quiz-history-arrow open"
                      : "quiz-history-arrow"
                  }
                >
                  <ChevronRight size={18} />
                </span>

              </button>


              {/* =================================================
                  FULL RESULT CARD
                  ONLY WHEN CLICKED
              ================================================= */}

              {isExpanded && (
                <section className="quiz-result-card">

                  {/* =============================================
                      CARD HEADER
                  ============================================= */}

                  <div className="quiz-result-card-header">

                    <div className="quiz-result-card-info">

                      <div className="quiz-result-meta-row">
                        <span className="quiz-result-number">
                          Quiz #{results.length - index}
                        </span>
                        {!isCompleted ? (
                          <span className="quiz-status-pill incomplete">
                            <AlertCircle size={13} /> {txt("અધૂરી ક્વિઝ", "अधूरी क्विज़", "Incomplete Quiz")}
                          </span>
                        ) : (
                          <span className="quiz-status-pill completed">
                            <CheckCircle2 size={13} /> {txt("પૂર્ણ ક્વિઝ", "पूर्ण क्विज़", "Completed")}
                          </span>
                        )}
                      </div>

                      <h2 className="quiz-result-title">
                        {targetInfo.title}
                      </h2>

                      <div className="quiz-result-chapter-desc">
                        {formattedDate && (
                          <span className="quiz-result-timestamp">
                            <Clock size={12} /> {formattedDate}
                          </span>
                        )}
                      </div>

                    </div>


                    {/* =========================================
                        BIG SCORE
                    ========================================= */}

                    <div className="quiz-result-percentage">

                      <strong>
                        {Math.round(
                          percentage
                        )}
                        %
                      </strong>

                      <span>
                        SCORE
                      </span>

                    </div>

                  </div>


                  {/* =============================================
                      MESSAGE
                  ============================================= */}

                  <div className={`quiz-result-message ${!isCompleted ? "incomplete-message" : ""}`}>

                    {!isCompleted
                      ? txt(
                          `આ ક્વિઝ અધૂરી મૂકવામાં આવી હતી. કુલ ${totalQuestions} માંથી ${answeredCount} પ્રશ્નો રમેલા હતા અને ${skippedQuestions} પ્રશ્નો બાકી રહ્યા હતા. તમે તેને ફરીથી શરૂ કરી શકો છો.`,
                          `यह क्विज़ अधूरी छोड़ दी गई थी। कुल ${totalQuestions} में से ${answeredCount} प्रश्न खेले गए थे और ${skippedQuestions} प्रश्न बाकी रह गए थे। आप इसे पुनः शुरू कर सकते हैं।`,
                          `This quiz was left incomplete. ${answeredCount} of ${totalQuestions} questions were played and ${skippedQuestions} questions remained. You can retake it anytime.`
                        )
                      : getResultMessage(percentage)}

                  </div>


                  {/* =============================================
                      STATS
                  ============================================= */}

                  <div className="quiz-result-stats">

                    {/* TOTAL */}

                    <div className="quiz-result-stat total">

                      <span className="quiz-result-stat-icon">
                        <ClipboardList size={20} />
                      </span>

                      <div>

                        <strong>
                          {totalQuestions}
                        </strong>

                        <span>{txt("કુલ પ્રશ્નો", "कुल प्रश्न", "Total Questions")}</span>

                      </div>

                    </div>


                    {/* ANSWERED / PLAYED */}

                    {!isCompleted && (
                      <div className="quiz-result-stat answered">

                        <span className="quiz-result-stat-icon">
                          <CheckCircle2 size={20} />
                        </span>

                        <div>

                          <strong>
                            {answeredCount}
                          </strong>

                          <span>{txt("રમેલા પ્રશ્નો", "खेले गए प्रश्न", "Questions Played")}</span>

                        </div>

                      </div>
                    )}


                    {/* CORRECT */}

                    <div className="quiz-result-stat correct">

                      <span className="quiz-result-stat-icon">
                        <CheckCircle2 size={20} />
                      </span>

                      <div>

                        <strong>
                          {correctAnswers}
                        </strong>

                        <span>{txt("સાચા જવાબ", "सही उत्तर", "Correct Answers")}</span>

                      </div>

                    </div>


                    {/* WRONG */}

                    <div className="quiz-result-stat wrong">

                      <span className="quiz-result-stat-icon">
                        <XCircle size={20} />
                      </span>

                      <div>

                        <strong>
                          {wrongAnswers}
                        </strong>

                        <span>{txt("ખોટા જવાબ", "गलत उत्तर", "Wrong Answers")}</span>

                      </div>

                    </div>


                    {/* SKIPPED */}

                    {skippedQuestions > 0 && (
                      <div className={`quiz-result-stat skipped ${!isCompleted ? "remaining" : ""}`}>

                        <span className="quiz-result-stat-icon">
                          <SkipForward size={20} />
                        </span>

                        <div>

                          <strong>
                            {skippedQuestions}
                          </strong>

                          <span>
                            {!isCompleted
                              ? txt("બાકી પ્રશ્નો", "बाकी प्रश्न", "Remaining Questions")
                              : txt("છોડેલા પ્રશ્નો", "छोड़े गए प्रश्न", "Skipped Questions")}
                          </span>

                        </div>

                      </div>
                    )}

                  </div>


                  {/* =============================================
                      PROGRESS
                  ============================================= */}

                  <div className="quiz-result-progress-section">

                    <div className="quiz-result-progress-info">

                      <span>{txt("તમારો Score", "आपका Score", "Your Score")}</span>

                      <strong>
                        {correctAnswers} /{" "}
                        {totalQuestions}
                      </strong>

                    </div>

                    <div className="quiz-result-progress">

                      <div
                        className="quiz-result-progress-fill"
                        style={{
                          width: `${percentage}%`,
                        }}
                      />

                    </div>

                  </div>


                  {/* =============================================
                      DATE & RETAKE ACTION
                  ============================================= */}

                  <div className="quiz-history-card-footer">
                    {formattedDate && (
                      <div className="quiz-result-date">
                        <Clock size={13} className="btn-icon" /> {formattedDate}
                      </div>
                    )}

                    <button
                      type="button"
                      className="quiz-history-retake-btn"
                      onClick={() => handleRetakeFromHistory(result)}
                    >
                      <PlayCircle size={15} className="btn-icon" />
                      <span>
                        {!isCompleted
                          ? txt("આ ક્વિઝ ફરી શરૂ કરો", "यह क्विज़ पुनः शुरू करें", "Retake This Quiz")
                          : txt("આ Quiz ફરીથી આપો", "यह Quiz पुनः दें", "Retake This Quiz")}
                      </span>
                    </button>
                  </div>

                </section>
              )}

            </article>
          );
        })}

      </section>


    </main>
  );
}

export default QuizResult;