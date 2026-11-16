import { getValidToken, handleAuth401, clearAuthSession } from "../utils/authHelper.js";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { ArrowLeft, Star, Loader2, BookOpen, AlertCircle, RefreshCw, Trophy, Lightbulb, ChevronLeft, ChevronRight, Award, ClipboardList } from "lucide-react";
import SudarshanShimmerLoader from "../components/SudarshanShimmerLoader.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import "./Quiz.css";


function Quiz() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isHindi, isEnglish, isGujarati, txt } = useLanguage();

  // =====================================================
  // STATE
  // =====================================================

  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] =
    useState(0);

  const [selectedAnswer, setSelectedAnswer] =
    useState("");

  const [answers, setAnswers] =
    useState([]);

  const [score, setScore] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [retryCount, setRetryCount] =
    useState(0);

  const [quizCompleted, setQuizCompleted] =
    useState(false);

  const [startTime, setStartTime] =
    useState(Date.now());

  const [earnedBadges, setEarnedBadges] =
    useState([]);

  const hasSubmittedRef = useRef(false);
  const quizStateRef = useRef({});

  // =====================================================
  // URL PARAMETERS
  // =====================================================

  const categoryParam =
    searchParams.get("category") || location.state?.category;

  const chapterParam =
    searchParams.get("chapter") || (location.state?.chapterNumber ? String(location.state.chapterNumber) : null);

  const shlokaRangeParam =
    searchParams.get("shlokaRange") || location.state?.shlokaRange;

  // IMPORTANT:
  // QuizCategory.jsx માંથી પસંદ કરેલો count
  const countParam =
    searchParams.get("count");

  const questionCount =
    Number(countParam) || 10;

  // Active quiz session key for refresh persistence
  const sessionKey = `gita_active_quiz_${categoryParam || "all"}_${chapterParam || ""}_${shlokaRangeParam || "all"}_${questionCount}`;

  // =====================================================
  // API (WITH RESILIENT MULTI-ENDPOINT FALLBACK)
  // =====================================================

  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const isLocalHost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  const isLanIp =
    /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

  const apiCandidates = useMemo(() => {
    if (isLocalHost) {
      return [
        "http://localhost:5000/api/quiz",
        `http://${hostname}:5000/api/quiz`,
        "https://bhagavad-gita-backend-jy1a.onrender.com/api/quiz",
      ];
    }
    if (isLanIp) {
      return [
        `http://${hostname}:5000/api/quiz`,
        "https://bhagavad-gita-backend-jy1a.onrender.com/api/quiz",
        "http://localhost:5000/api/quiz",
      ];
    }
    return [
      "https://bhagavad-gita-backend-jy1a.onrender.com/api/quiz",
      "http://localhost:5000/api/quiz",
    ];
  }, [hostname, isLocalHost, isLanIp]);

  const API_URL = apiCandidates[0];

  // =====================================================
  // TOKEN
  // =====================================================

  const getToken = () => {
    return getValidToken();
  };

  // =====================================================
  // SHUFFLE QUESTIONS
  // =====================================================

  const shuffleQuestions = (items) => {
    const shuffled = [...items];

    for (
      let i = shuffled.length - 1;
      i > 0;
      i--
    ) {
      const j =
        Math.floor(
          Math.random() * (i + 1)
        );

      [
        shuffled[i],
        shuffled[j],
      ] = [
        shuffled[j],
        shuffled[i],
      ];
    }

    return shuffled;
  };

  // =====================================================
  // SHUFFLE QUESTION OPTIONS (A, B, C, D)
  // =====================================================
  // દરેક પ્રશ્નના વિકલ્પો (A, B, C, D) નો ક્રમ આડાઅવળો (random) થઈ જશે
  // જેથી દર વખતે વિકલ્પો અલગ સ્થાને આવે પણ સાચો જવાબ યોગ્ય રીતે ચકાસાય.

  const shuffleQuestionOptions = (q) => {
    if (!q || !Array.isArray(q.options) || q.options.length < 2) {
      return q;
    }

    const indices = q.options.map((_, i) => i);

    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const newOptions = indices.map((i) => q.options[i]);

    const newOptionsHi =
      Array.isArray(q.optionsHi) && q.optionsHi.length === q.options.length
        ? indices.map((i) => q.optionsHi[i])
        : q.optionsHi;

    const newOptionsEn =
      Array.isArray(q.optionsEn) && q.optionsEn.length === q.options.length
        ? indices.map((i) => q.optionsEn[i])
        : q.optionsEn;

    return {
      ...q,
      options: newOptions,
      optionsHi: newOptionsHi,
      optionsEn: newOptionsEn,
    };
  };

  // =====================================================
  // FETCH QUESTIONS
  // =====================================================

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        setError("");

        // =================================================
        // PREVENT RETURNING TO ALREADY COMPLETED QUIZ VIA BACK BUTTON
        // If user navigates Back into a completed quiz, DO NOT show it!
        // Immediately redirect them away.
        // =================================================
        const isAlreadyCompleted =
          sessionStorage.getItem(`gita_quiz_completed_${sessionKey}`) === "true";

        if (isAlreadyCompleted) {
          const isFromReader =
            searchParams.get("from") === "reader" ||
            Boolean(location.state?.fromShlokaReader) ||
            Boolean(shlokaRangeParam && shlokaRangeParam !== "all");

          const ch =
            chapterParam ||
            (categoryParam && categoryParam.startsWith("chapter-")
              ? categoryParam.replace("chapter-", "")
              : "1");

          const targetShloka =
            searchParams.get("shlokaNumber") ||
            searchParams.get("shloka") ||
            location.state?.shlokaNumber ||
            (shlokaRangeParam && shlokaRangeParam !== "all"
              ? shlokaRangeParam.split("-")[1] || shlokaRangeParam.split("-")[0]
              : "1");

          if (isFromReader && ch) {
            navigate(`/chapter/${ch}?shloka=${targetShloka}`, { replace: true });
          } else {
            navigate("/quiz-results", { replace: true });
          }
          return;
        }

        // =================================================
        // RESTORE SAVED QUIZ SESSION ON PAGE REFRESH
        // =================================================
        try {
          const savedRaw = sessionStorage.getItem(sessionKey);
          if (savedRaw) {
            const saved = JSON.parse(savedRaw);
            if (
              saved &&
              Array.isArray(saved.questions) &&
              saved.questions.length > 0
            ) {
              setQuestions(saved.questions);
              setCurrentQuestion(
                typeof saved.currentQuestion === "number"
                  ? saved.currentQuestion
                  : 0
              );
              setSelectedAnswer(saved.selectedAnswer || "");
              setAnswers(Array.isArray(saved.answers) ? saved.answers : []);
              setScore(typeof saved.score === "number" ? saved.score : 0);
              setStartTime(saved.startTime || Date.now());
              setQuizCompleted(Boolean(saved.quizCompleted));
              setEarnedBadges(
                Array.isArray(saved.earnedBadges) ? saved.earnedBadges : []
              );
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn("Failed to restore saved quiz session:", e);
        }

        setQuestions([]);
        setCurrentQuestion(0);
        setSelectedAnswer("");
        setAnswers([]);
        setScore(0);
        setQuizCompleted(false);
        setStartTime(Date.now());
        setEarnedBadges([]);

        // =================================================
        // AUTH
        // =================================================

        const token = getToken();

        if (!token) {
          navigate("/login");
          return;
        }

        // =================================================
        // VALIDATE QUESTION COUNT
        // =================================================

        if (
          !Number.isInteger(questionCount) ||
          questionCount < 1
        ) {
          setError(
            txt("Quiz question count યોગ્ય નથી.", "Quiz प्रश्न संख्या उचित नहीं है।", "Invalid quiz question count.")
          );

          return;
        }

        // =================================================
        // QUIZ TYPE
        // =================================================

        const selectedChapter =
          Number(chapterParam) ||
          (categoryParam && categoryParam.startsWith("chapter-")
            ? Number(categoryParam.replace("chapter-", ""))
            : null);

        const isChapterQuiz =
          (categoryParam === "chapter" ||
            (categoryParam && categoryParam.startsWith("chapter-"))) &&
          selectedChapter >= 1 &&
          selectedChapter <= 18;

        const isAllQuiz =
          categoryParam === "all" ||
          categoryParam === "all-chapters";

        const isMahabharataQuiz =
          categoryParam === "mahabharata";

        // =================================================
        // VALIDATE CATEGORY
        // =================================================

        if (
          !isChapterQuiz &&
          !isAllQuiz &&
          !isMahabharataQuiz
        ) {
          setError(
            txt("Quiz category યોગ્ય રીતે પસંદ કરવામાં આવી નથી.", "Quiz श्रेणी उचित रूप से नहीं चुनी गई है।", "Quiz category is not properly selected.")
          );

          return;
        }

        // =================================================
        // API URL
        // =================================================

        let url =
          `${API_URL}/questions`;

        const queryParams =
          new URLSearchParams();

        // =================================================
        // CHAPTER QUIZ
        // =================================================

        if (isChapterQuiz) {
          queryParams.set(
            "category",
            `chapter-${selectedChapter}`
          );

          queryParams.set(
            "chapter",
            String(selectedChapter)
          );

          if (shlokaRangeParam && shlokaRangeParam !== "all") {
            queryParams.set("shlokaRange", shlokaRangeParam);
          }
        }

        // =================================================
        // MAHABHARATA QUIZ
        // =================================================

        else if (isMahabharataQuiz) {
          queryParams.set(
            "category",
            "mahabharata"
          );
        }

        // =================================================
        // ALL CHAPTERS QUIZ
        // =================================================

        else if (isAllQuiz) {
          // All category માટે
          // category parameter જરૂરી નથી.
        }

        // =================================================
        // IMPORTANT:
        // SEND SELECTED QUESTION COUNT
        // =================================================

        queryParams.set(
          "limit",
          String(questionCount)
        );

        // =================================================
        // CREATE URL
        // =================================================

        const queryString =
          queryParams.toString();

        if (queryString) {
          url += `?${queryString}`;
        }

        console.log(
          "Quiz API URL:",
          url
        );

        console.log(
          "Selected Question Count:",
          questionCount
        );

        // =================================================
        // API REQUEST (WITH MULTI-ENDPOINT FALLBACK)
        // =================================================

        let response = null;
        let data = null;
        let lastError = null;

        for (const candidateBase of apiCandidates) {
          const candidateUrl = queryString
            ? `${candidateBase}/questions?${queryString}`
            : `${candidateBase}/questions`;

          try {
            console.log("Trying Quiz API endpoint:", candidateUrl);
            const res = await fetch(candidateUrl, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });

            if (res.ok) {
              const resJson = await res.json();
              response = res;
              data = resJson;
              console.log("Quiz API Response from", candidateBase, ":", data);
              break; // Successfully got an HTTP 200 response
            } else if (res.status === 401) {
              response = res;
              data = await res.json().catch(() => null);
              break; // Handle auth expired
            } else {
              console.warn(`Quiz endpoint ${candidateBase} returned status ${res.status}`);
              lastError = new Error(`HTTP ${res.status}`);
            }
          } catch (netErr) {
            console.warn(`Connection failed for ${candidateBase}:`, netErr.message);
            lastError = netErr;
          }
        }

        if (!response) {
          throw new Error(
            txt(
              "સર્વર સાથે કનેક્શન થઈ શક્યું નથી. કૃપા કરીને ફરી પ્રયાસ કરો.",
              "सर्वर से कनेक्ट नहीं हो सका। कृपया पुनः प्रयास करें।",
              "Could not connect to server. Please try again."
            )
          );
        }

        if (!response.ok) {
          if (response.status === 401) {
            handleAuth401(navigate, "/quiz/play");
            return;
          }
          throw new Error(
            data?.message ||
              txt("Quiz questions load થઈ શક્યા નથી.", "Quiz प्रश्न लोड नहीं हो सके।", "Could not load quiz questions.")
          );
        }

        // =================================================
        // GET QUESTIONS
        // =================================================

        let fetchedQuestions =
          Array.isArray(
            data.questions
          )
            ? data.questions
            : [];

        // =================================================
        // CHAPTER FILTER
        // =================================================

        if (isChapterQuiz) {
          fetchedQuestions =
            fetchedQuestions.filter(
              (item) =>
                Number(
                  item.chapterNumber
                ) === selectedChapter
            );

          if (shlokaRangeParam && shlokaRangeParam !== "all") {
            const parts = shlokaRangeParam.split("-");
            const from = parseInt(parts[0], 10);
            const to = parts[1] !== undefined ? parseInt(parts[1], 10) : from;
            if (!isNaN(from) && !isNaN(to)) {
              fetchedQuestions = fetchedQuestions.filter((item) => {
                const sNum = Number(item.shlokaNumber);
                return !isNaN(sNum) && sNum >= from && sNum <= to;
              });
            }
          }
        }

        // =================================================
        // ALL CHAPTER FILTER
        // =================================================

        if (isAllQuiz) {
          fetchedQuestions =
            fetchedQuestions.filter(
              (item) => {
                const chapter =
                  Number(
                    item.chapterNumber
                  );

                return (
                  chapter >= 1 &&
                  chapter <= 18
                );
              }
            );
        }

        // =================================================
        // MAHABHARATA FILTER
        // =================================================

        if (isMahabharataQuiz) {
          fetchedQuestions =
            fetchedQuestions.filter(
              (item) =>
                String(
                  item.category || ""
                )
                  .trim()
                  .toLowerCase() ===
                "mahabharata"
            );
        }

        // =================================================
        // SHUFFLE QUESTIONS & OPTIONS (A, B, C, D)
        // =================================================

        fetchedQuestions =
          shuffleQuestions(
            fetchedQuestions
          ).map(shuffleQuestionOptions);

        // =================================================
        // IMPORTANT:
        // EXACT QUESTION COUNT
        // =================================================

        fetchedQuestions =
          fetchedQuestions.slice(
            0,
            questionCount
          );

        console.log(
          "Final Questions Count:",
          fetchedQuestions.length
        );

        // =================================================
        // NO QUESTIONS
        // =================================================

        if (
          fetchedQuestions.length === 0
        ) {
          let noQuestionsMsg = "";
          if (isChapterQuiz && shlokaRangeParam && shlokaRangeParam !== "all") {
            const cleanRange = String(shlokaRangeParam).replace(/^(\d+)-\1$/, "$1");
            noQuestionsMsg = txt(
              `અધ્યાય ${selectedChapter}, શ્લોક ${cleanRange} માટે હાલમાં કોઈ quiz question ઉપલબ્ધ નથી.`,
              `अध्याय ${selectedChapter}, श्लोक ${cleanRange} के लिए वर्तमान में कोई quiz question उपलब्ध नहीं है।`,
              `Currently no quiz questions available for Chapter ${selectedChapter}, Shloka ${cleanRange}.`
            );
          } else if (isChapterQuiz) {
            noQuestionsMsg = txt(
              `અધ્યાય ${selectedChapter} માટે હાલમાં કોઈ quiz question ઉપલબ્ધ નથી.`,
              `अध्याय ${selectedChapter} के लिए वर्तमान में कोई quiz question उपलब्ध नहीं है।`,
              `Currently no quiz questions available for Chapter ${selectedChapter}.`
            );
          } else {
            noQuestionsMsg = txt(
              "આ category માટે હાલમાં કોઈ quiz question ઉપલબ્ધ નથી.",
              "इस category के लिए वर्तमान में कोई quiz question उपलब्ध नहीं है।",
              "Currently no quiz questions available for this category."
            );
          }
          setError(noQuestionsMsg);

          return;
        }

        // =================================================
        // IF REQUESTED COUNT NOT AVAILABLE
        // =================================================

        if (
          fetchedQuestions.length <
          questionCount
        ) {
          console.warn(
            `Requested ${questionCount} questions, but only ${fetchedQuestions.length} available.`
          );
        }

        // =================================================
        // DEBUG
        // =================================================

        console.log(
          "First Question:",
          fetchedQuestions[0]
        );

        console.log(
          "Correct Answer:",
          fetchedQuestions[0]
            ?.correctAnswer
        );

        // =================================================
        // SET QUESTIONS
        // =================================================

        setQuestions(
          fetchedQuestions
        );

        setCurrentQuestion(0);
        setSelectedAnswer("");
        setAnswers([]);
        setScore(0);
        setQuizCompleted(false);

      } catch (err) {
        console.error(
          "Fetch Quiz Questions Error:",
          err
        );

        const isNetworkErr =
          !err.message ||
          err.message === "Failed to fetch" ||
          err.message.includes("NetworkError") ||
          err.message.includes("Failed to fetch");

        setError(
          isNetworkErr
            ? txt(
                "સર્વર સાથે કનેક્શન થઈ શક્યું નથી. કૃપા કરીને તમારું ઇન્ટરનેટ કનેક્શન ચકાસો અને ફરી પ્રયાસ કરો.",
                "सर्वर से कनेक्ट नहीं हो सका। कृपया अपना इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।",
                "Could not connect to server. Please check your connection and try again."
              )
            : err.message
        );

      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();

  }, [
    categoryParam,
    chapterParam,
    shlokaRangeParam,
    questionCount,
    sessionKey,
    retryCount,
    navigate,
  ]);

  // =====================================================
  // PERSIST ACTIVE QUIZ PROGRESS ON ANSWERS / QUESTION CHANGE
  // =====================================================

  useEffect(() => {
    if (!questions || questions.length === 0) return;

    try {
      const stateToSave = {
        questions,
        currentQuestion,
        selectedAnswer,
        answers,
        score,
        startTime,
        quizCompleted,
        earnedBadges,
      };
      sessionStorage.setItem(sessionKey, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn("Failed to persist quiz session:", e);
    }
  }, [
    questions,
    currentQuestion,
    selectedAnswer,
    answers,
    score,
    startTime,
    quizCompleted,
    earnedBadges,
    sessionKey,
  ]);

  // Synchronize state ref for unmount and exit handlers
  useEffect(() => {
    quizStateRef.current = {
      questions,
      currentQuestion,
      selectedAnswer,
      answers,
      score,
      startTime,
      quizCompleted,
      question,
      sessionKey,
      categoryParam,
      chapterParam,
      shlokaRangeParam,
    };
  });

  // =====================================================
  // CURRENT QUESTION
  // =====================================================

  const question =
    questions[currentQuestion];

  // =====================================================
  // OPTIONS
  // =====================================================

  const getOptions = () => {
    if (!question) {
      return [];
    }

    if (
      isEnglish &&
      Array.isArray(question.optionsEn) &&
      question.optionsEn.length === 4 &&
      question.optionsEn.every((opt) => opt && String(opt).trim())
    ) {
      return question.optionsEn;
    }

    if (
      isHindi &&
      Array.isArray(question.optionsHi) &&
      question.optionsHi.length === 4 &&
      question.optionsHi.every((opt) => opt && String(opt).trim())
    ) {
      return question.optionsHi;
    }

    if (
      Array.isArray(
        question.options
      )
    ) {
      return question.options;
    }

    return [];
  };

  // =====================================================
  // NORMALIZE ANSWER
  // =====================================================

  const normalizeAnswer = (value) => {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(
        /\s+/g,
        " "
      );
  };

  // =====================================================
  // CHECK IF OPTION IS CORRECT
  // =====================================================

  const checkIfOptionIsCorrect = (optText, optIndex = -1) => {
    if (!question) return false;

    const activeCorrectAnswer =
      (isEnglish && question.correctAnswerEn) ||
      (isHindi && question.correctAnswerHi) ||
      question.correctAnswer ||
      "";

    if (
      normalizeAnswer(optText) === normalizeAnswer(activeCorrectAnswer) ||
      normalizeAnswer(optText) === normalizeAnswer(question.correctAnswer) ||
      (question.correctAnswerHi &&
        normalizeAnswer(optText) === normalizeAnswer(question.correctAnswerHi)) ||
      (question.correctAnswerEn &&
        normalizeAnswer(optText) === normalizeAnswer(question.correctAnswerEn))
    ) {
      return true;
    }

    // Index check if options are translated
    if (
      isEnglish &&
      Array.isArray(question.optionsEn) &&
      question.optionsEn.length === 4 &&
      Array.isArray(question.options) &&
      question.options.length === 4
    ) {
      const selectedIdx =
        optIndex !== -1
          ? optIndex
          : question.optionsEn.findIndex(
              (opt) => normalizeAnswer(opt) === normalizeAnswer(optText)
            );
      const correctIdx = question.options.findIndex(
        (opt) => normalizeAnswer(opt) === normalizeAnswer(question.correctAnswer)
      );
      if (selectedIdx !== -1 && selectedIdx === correctIdx) {
        return true;
      }
    } else if (
      isHindi &&
      Array.isArray(question.optionsHi) &&
      question.optionsHi.length === 4 &&
      Array.isArray(question.options) &&
      question.options.length === 4
    ) {
      const selectedIdx =
        optIndex !== -1
          ? optIndex
          : question.optionsHi.findIndex(
              (opt) => normalizeAnswer(opt) === normalizeAnswer(optText)
            );
      const correctIdx = question.options.findIndex(
        (opt) => normalizeAnswer(opt) === normalizeAnswer(question.correctAnswer)
      );
      if (selectedIdx !== -1 && selectedIdx === correctIdx) {
        return true;
      }
    }

    return false;
  };

  // =====================================================
  // ANSWER
  // =====================================================

  const handleAnswer = (
    answer
  ) => {
    if (!question) {
      return;
    }

    if (selectedAnswer) {
      return;
    }

    const activeCorrectAnswer =
      (isEnglish && question.correctAnswerEn) ||
      (isHindi && question.correctAnswerHi) ||
      question.correctAnswer ||
      "";

    const correctAnswer =
      String(question.correctAnswer || activeCorrectAnswer || "").trim();

    const isCorrect = checkIfOptionIsCorrect(answer);

    // =================================================
    // SELECT ANSWER
    // =================================================

    setSelectedAnswer(
      answer
    );

    // =================================================
    // SAVE ANSWER
    // =================================================

    setAnswers(
      (previous) => {
        const alreadyAnswered =
          previous.some(
            (item) =>
              String(
                item.questionId
              ) ===
              String(
                question._id
              )
          );

        if (
          alreadyAnswered
        ) {
          return previous;
        }

        return [
          ...previous,

          {
            questionId:
              question._id,

            selectedAnswer:
              answer,

            correctAnswer:
              correctAnswer,

            isCorrect,
          },
        ];
      }
    );

    // =================================================
    // SCORE
    // =================================================

    if (isCorrect) {
      setScore(
        (previous) =>
          previous + 1
      );
    }
  };

  // =====================================================
  // NEXT QUESTION
  // =====================================================

  const handleNext = () => {
    if (!selectedAnswer) {
      return;
    }

    if (
      currentQuestion <
      questions.length - 1
    ) {
      setCurrentQuestion(
        (previous) =>
          previous + 1
      );

      setSelectedAnswer("");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    // Last question
    finishQuiz();
  };

  // =====================================================
  // PREVIOUS QUESTION
  // =====================================================

  const handlePrevious = () => {
    if (
      currentQuestion === 0
    ) {
      return;
    }

    const previousIndex =
      currentQuestion - 1;

    setCurrentQuestion(
      previousIndex
    );

    const previousAnswer =
      answers.find(
        (item) =>
          String(
            item.questionId
          ) ===
          String(
            questions[
              previousIndex
            ]?._id
          )
      );

    if (previousAnswer) {
      setSelectedAnswer(
        previousAnswer.selectedAnswer
      );
    } else {
      setSelectedAnswer("");
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // FINISH QUIZ
  // =====================================================

  const finishQuiz = async () => {
    try {
      hasSubmittedRef.current = true;
      setSubmitting(true);
      setError("");

      const token = getToken();

      // =================================================
      // COPY EXISTING ANSWERS
      // =================================================

      let finalAnswers = [
        ...answers,
      ];

      // =================================================
      // CURRENT QUESTION ANSWER
      // =================================================

      if (
        question &&
        selectedAnswer
      ) {
        const existingIndex =
          finalAnswers.findIndex(
            (item) =>
              String(
                item.questionId || item._id
              ) ===
              String(
                question._id
              )
          );

        const currentAnswer = {
          questionId:
            question._id,

          selectedAnswer:
            selectedAnswer,

          correctAnswer:
            String(question.correctAnswer || "").trim(),

          isCorrect: checkIfOptionIsCorrect(selectedAnswer),
        };

        if (
          existingIndex === -1
        ) {
          finalAnswers.push(currentAnswer);
        } else {
          finalAnswers[existingIndex] = currentAnswer;
        }
      }

      // =================================================
      // REMOVE DUPLICATES
      // =================================================

      const uniqueAnswersMap = new Map();
      finalAnswers.forEach((item) => {
        const qId = item.questionId || item._id;
        if (qId) {
          uniqueAnswersMap.set(String(qId), item);
        }
      });

      finalAnswers = Array.from(uniqueAnswersMap.values());

      // =================================================
      // FINAL SCORE (LOCAL CALCULATION)
      // =================================================

      const finalScore = finalAnswers.filter(
        (item) => item.isCorrect === true
      ).length;

      // =================================================
      // CATEGORY
      // =================================================

      let resultCategory = "all";
      let resultChapter = null;

      if (
        categoryParam === "chapter" ||
        (categoryParam && categoryParam.startsWith("chapter-"))
      ) {
        const ch = chapterParam || (categoryParam.startsWith("chapter-") ? categoryParam.replace("chapter-", "") : "1");
        resultCategory = `chapter-${ch}`;
        resultChapter = Number(ch) || 1;
      } else if (categoryParam === "mahabharata") {
        resultCategory = "mahabharata";
      }

      // =================================================
      // SUBMIT DATA
      // =================================================

      const durationSeconds = Math.max(
        1,
        Math.round((Date.now() - (startTime || Date.now())) / 1000)
      );

      const submitData = {
        category: resultCategory,
        chapter: resultChapter,
        shlokaRange:
          (categoryParam === "chapter" || (categoryParam && categoryParam.startsWith("chapter-"))) && shlokaRangeParam
            ? shlokaRangeParam
            : "",
        answers: finalAnswers
          .filter((item) => item && (item.questionId || item._id))
          .map((item) => ({
            questionId: item.questionId || item._id,
            selectedAnswer: String(item.selectedAnswer || "").trim(),
          })),
        timeTaken: durationSeconds,
      };

      console.log("Quiz Submit Data:", submitData);

      // =================================================
      // SUBMIT TO BACKEND (RESILIENT)
      // =================================================

      let finalResultScore = finalScore;

      if (token) {
        try {
          let response = null;
          let data = null;
          for (const candidateBase of apiCandidates) {
            try {
              const res = await fetch(`${candidateBase}/submit`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(submitData),
              });
              response = res;
              if (res.ok) {
                data = await res.json();
                break;
              }
            } catch (err) {
              console.warn(`Submit failed on ${candidateBase}:`, err.message);
            }
          }

          if (response && response.ok && data) {
            console.log("Quiz Submit Success:", data);
            const backendScore = Number(data.result?.score);
            if (Number.isFinite(backendScore)) {
              finalResultScore = backendScore;
            }
          } else if (response && response.status === 401) {
            clearAuthSession();
          }
        } catch (apiErr) {
          console.warn("Quiz submit network/API error (using local scoring):", apiErr);
        }
      }

      // =================================================
      // SET FINAL DATA & BADGES
      // =================================================

      setScore(finalResultScore);
      setAnswers(finalAnswers);

      const finalPercentage = Math.round(
        (finalResultScore / (questions.length || 1)) * 100
      );

      const triggered = [];

      if (finalPercentage === 100) {
        triggered.push({
          name: txt("અર્જુન દ્રષ્ટિ", "अर्जुन दृष्टि", "Arjuna's Vision"),
          desc: txt("૧૦૦% પરફેક્ટ સ્કોર મેળવવા બદલ કાઉન્ટ વધ્યો!", "100% परफेक्ट स्कोर प्राप्त करने पर काउंट बढ़ा!", "Count increased for achieving 100% perfect score!"),
        });
      }

      const allowedHalfTime = Math.max(15, questions.length * 15);
      if (finalPercentage >= 80 && durationSeconds <= allowedHalfTime) {
        triggered.push({
          name: txt("ચપળ મતિ", "तीक्ष्ण मति", "Swift Mind"),
          desc: txt("અડધા સમયમાં ૮૦%+ સ્કોર સાથે ઝડપી વિજય!", "आधे समय में 80%+ स्कोर के साथ त्वरित विजय!", "Fast victory with 80%+ score in half the allowed time!"),
        });
      }

      if (categoryParam === "chapter" && finalPercentage >= 90) {
        triggered.push({
          name: txt("વિજયી પંથ", "विजयी पथ", "Victorious Path"),
          desc: txt(`અધ્યાય ${chapterParam || ""} ની ક્વિઝમાં ૯૦%+ ગુણ પ્રાપ્ત કર્યા!`, `अध्याय ${chapterParam || ""} की क्विज़ में 90%+ अंक प्राप्त किए!`, `Scored 90%+ in Chapter ${chapterParam || ""} Quiz!`),
        });
      }

      if (categoryParam === "mahabharata" && finalPercentage >= 85) {
        triggered.push({
          name: txt("મહાભારત મહારથી", "महाभारत महारथी", "Mahabharata Maharathi"),
          desc: txt("મહાભારત ક્વિઝમાં ૮૫%+ સ્કોર સાથે વિજય!", "महाभारत क्विज़ में 85%+ स्कोर के साथ विजय!", "Victory with 85%+ score in Mahabharata Quiz!"),
        });
      }

      const currentHour = new Date().getHours();
      const currentMin = new Date().getMinutes();
      const timeInMins = currentHour * 60 + currentMin;
      if (finalPercentage >= 80 && timeInMins >= 300 && timeInMins <= 510) {
        triggered.push({
          name: txt("બ્રહ્મ મુહૂર્ત સાધક", "ब्रह्म मुहूर्त साधक", "Brahma Muhurta Seeker"),
          desc: txt("સવારના પાવન સમયે ૮૦%+ સ્કોર પ્રાપ્ત!", "सुबह के पावन समय में 80%+ स्कोर प्राप्त!", "Achieved 80%+ score during sacred morning hours!"),
        });
      }

      setEarnedBadges(triggered);

      // =================================================
      // COMPLETE QUIZ & LOCK SESSION TO PREVENT RE-ENTRY
      // =================================================

      setQuizCompleted(true);
      try {
        sessionStorage.setItem(`gita_quiz_completed_${sessionKey}`, "true");
        sessionStorage.removeItem(sessionKey);
      } catch (e) {}

    } catch (err) {
      console.error("Submit Quiz Error:", err);
      // Fallback: still show quiz results rather than locking user out
      setQuizCompleted(true);
      try {
        sessionStorage.setItem(`gita_quiz_completed_${sessionKey}`, "true");
        sessionStorage.removeItem(sessionKey);
      } catch (e) {}
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // DETECT PAGE RELOAD (F5) TO PREVENT FALSE INCOMPLETE
  // =====================================================

  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        sessionStorage.setItem("gita_is_page_reloading", "true");
      } catch (e) {}
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    try {
      sessionStorage.removeItem("gita_is_page_reloading");
    } catch (e) {}

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // =====================================================
  // SAVE INCOMPLETE QUIZ
  // =====================================================

  const saveIncompleteQuiz = () => {
    const state = quizStateRef.current;
    if (state.quizCompleted || hasSubmittedRef.current) return;
    if (!state.questions || state.questions.length === 0) return;

    hasSubmittedRef.current = true;

    let finalAnswers = [...(state.answers || [])];

    if (state.question && state.selectedAnswer) {
      const existingIndex = finalAnswers.findIndex(
        (item) => String(item.questionId || item._id) === String(state.question._id)
      );

      const currentAnswer = {
        questionId: state.question._id,
        selectedAnswer: state.selectedAnswer,
        correctAnswer: String(state.question.correctAnswer || "").trim(),
        isCorrect: checkIfOptionIsCorrect(state.selectedAnswer),
      };

      if (existingIndex === -1) {
        finalAnswers.push(currentAnswer);
      } else {
        finalAnswers[existingIndex] = currentAnswer;
      }
    }

    const uniqueAnswersMap = new Map();
    finalAnswers.forEach((item) => {
      const qId = item.questionId || item._id;
      if (qId) {
        uniqueAnswersMap.set(String(qId), item);
      }
    });

    finalAnswers = Array.from(uniqueAnswersMap.values());

    let resultCategory = "all";
    let resultChapter = null;

    if (
      categoryParam === "chapter" ||
      (categoryParam && categoryParam.startsWith("chapter-"))
    ) {
      const ch =
        chapterParam ||
        (categoryParam.startsWith("chapter-")
          ? categoryParam.replace("chapter-", "")
          : "1");
      resultCategory = `chapter-${ch}`;
      resultChapter = Number(ch) || 1;
    } else if (categoryParam === "mahabharata") {
      resultCategory = "mahabharata";
    }

    const durationSeconds = Math.max(
      1,
      Math.round((Date.now() - (state.startTime || Date.now())) / 1000)
    );

    // Build full quiz answers array including all questions from the quiz
    // Questions answered have their chosen answer; unanswered ones have selectedAnswer: "" (skipped)
    const fullQuizAnswers = (state.questions || []).map((q) => {
      const answeredItem = finalAnswers.find(
        (item) => String(item.questionId || item._id) === String(q._id)
      );
      if (answeredItem && answeredItem.selectedAnswer) {
        return {
          questionId: q._id,
          selectedAnswer: String(answeredItem.selectedAnswer).trim(),
        };
      }
      return {
        questionId: q._id,
        selectedAnswer: "",
      };
    });

    const submitData = {
      category: resultCategory,
      chapter: resultChapter,
      shlokaRange:
        (categoryParam === "chapter" || (categoryParam && categoryParam.startsWith("chapter-"))) && shlokaRangeParam
          ? shlokaRangeParam
          : "",
      answers: fullQuizAnswers,
      totalQuestions: state.questions.length,
      timeTaken: durationSeconds,
      completed: false,
    };

    const token = getToken();
    if (!token) return;

    try {
      fetch(`${API_URL}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
        keepalive: true,
      }).catch((err) => {
        console.warn("Failed to record incomplete quiz:", err);
      });
    } catch (e) {
      console.warn("Exception recording incomplete quiz:", e);
    }
  };

  // =====================================================
  // SPA NAVIGATION UNMOUNT LISTENER
  // =====================================================

  useEffect(() => {
    return () => {
      let isReloading = false;
      try {
        isReloading = sessionStorage.getItem("gita_is_page_reloading") === "true";
      } catch (e) {}

      const state = quizStateRef.current;
      if (
        !isReloading &&
        !hasSubmittedRef.current &&
        !state.quizCompleted &&
        state.questions &&
        state.questions.length > 0
      ) {
        saveIncompleteQuiz();
        try {
          sessionStorage.removeItem(state.sessionKey);
        } catch (e) {}
      }
    };
  }, []);

  // =====================================================
  // RETRY
  // =====================================================

  const retryQuiz = () => {
    try {
      sessionStorage.removeItem(sessionKey);
      sessionStorage.removeItem(`gita_quiz_completed_${sessionKey}`);
    } catch (e) {}
    setError("");
    setLoading(true);
    setRetryCount((prev) => prev + 1);
  };

  // =====================================================
  // EXIT
  // =====================================================

  const exitQuiz = () => {
    if (!quizCompleted && questions && questions.length > 0 && !hasSubmittedRef.current) {
      saveIncompleteQuiz();
    }
    try {
      sessionStorage.removeItem(sessionKey);
    } catch (e) {}

    const isFromReader =
      searchParams.get("from") === "reader" ||
      Boolean(location.state?.fromShlokaReader) ||
      Boolean(shlokaRangeParam && shlokaRangeParam !== "all");

    const ch =
      chapterParam ||
      (categoryParam && categoryParam.startsWith("chapter-")
        ? categoryParam.replace("chapter-", "")
        : "1");

    const targetShloka =
      searchParams.get("shlokaNumber") ||
      searchParams.get("shloka") ||
      location.state?.shlokaNumber ||
      (shlokaRangeParam && shlokaRangeParam !== "all"
        ? shlokaRangeParam.split("-")[1] || shlokaRangeParam.split("-")[0]
        : "1");

    if (isFromReader && ch) {
      const returnUrl = `/chapter/${ch}?shloka=${targetShloka}`;
      // When launched from shloka reader, navigate(-1) pops the quiz cleanly from history:
      // 1. User returns to the exact shloka they started from (e.g. Shloka 5)
      // 2. From that shloka, pressing back directly returns to the page before reading (e.g. /chapters)
      if (location.state?.fromShlokaReader && window.history.length > 1) {
        navigate(-1);
      } else {
        navigate(returnUrl, { replace: true });
      }
    } else {
      navigate("/quiz", { replace: true });
    }
  };

  // =====================================================
  // PREVENT BACK NAVIGATION INTO COMPLETED QUIZ (BFCACHE & POPSTATE)
  // =====================================================
  useEffect(() => {
    const handlePageShow = (e) => {
      if (e.persisted || sessionStorage.getItem(`gita_quiz_completed_${sessionKey}`) === "true") {
        if (sessionStorage.getItem(`gita_quiz_completed_${sessionKey}`) === "true") {
          const isFromReader =
            searchParams.get("from") === "reader" ||
            Boolean(location.state?.fromShlokaReader) ||
            Boolean(shlokaRangeParam && shlokaRangeParam !== "all");

          const ch =
            chapterParam ||
            (categoryParam && categoryParam.startsWith("chapter-")
              ? categoryParam.replace("chapter-", "")
              : "1");

          const targetShloka =
            searchParams.get("shlokaNumber") ||
            searchParams.get("shloka") ||
            location.state?.shlokaNumber ||
            (shlokaRangeParam && shlokaRangeParam !== "all"
              ? shlokaRangeParam.split("-")[1] || shlokaRangeParam.split("-")[0]
              : "1");

          if (isFromReader && ch) {
            navigate(`/chapter/${ch}?shloka=${targetShloka}`, { replace: true });
          } else {
            navigate("/quiz-results", { replace: true });
          }
        }
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [sessionKey, searchParams, location.state, shlokaRangeParam, chapterParam, categoryParam, navigate]);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="quiz-page">
        <SudarshanShimmerLoader
          type="quiz"
          title={txt(
            "ગીતા જ્ઞાન ક્વિઝ લોડ થઈ રહી છે...",
            "गीता ज्ञान प्रश्नोत्तरी लोड हो रही है...",
            "Loading Gita Knowledge Quiz..."
          )}
          subtitle={txt(
            "પ્રશ્નો અને આધ્યાત્મિક વિકલ્પો તૈયાર થઈ રહ્યા છે...",
            "प्रश्न और आध्यात्मिक विकल्प तैयार हो रहे हैं...",
            "Preparing questions and spiritual options..."
          )}
        />
      </main>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <main className="quiz-page">

        <div className="quiz-error">

          <div className="quiz-error-icon">
            <AlertCircle size={40} color="#ef4444" />
          </div>

          <h2>{txt("કંઈક સમસ્યા આવી", "कुछ समस्या आई", "Something went wrong")}</h2>

          <p>
            {error}
          </p>

          <div className="quiz-error-actions">

            <button
              type="button"
              onClick={retryQuiz}
            >
              <RefreshCw size={15} className="btn-icon" /> {txt("ફરી પ્રયાસ કરો", "पुनः प्रयास करें", "Try Again")}
            </button>

            <button
              type="button"
              onClick={exitQuiz}
            >
              <ArrowLeft size={15} className="btn-icon" /> {
                (searchParams.get("from") === "reader" || location.state?.fromShlokaReader || (shlokaRangeParam && shlokaRangeParam !== "all"))
                  ? txt("શ્લોક પર પાછા જાઓ", "श्लोक पर वापस जाएं", "Back to Shloka")
                  : txt("ક્વિઝ શ્રેણીઓ", "क्विज़ श्रेणियां", "Quiz Categories")
              }
            </button>

          </div>

        </div>

      </main>
    );
  }

  // =====================================================
  // NO QUESTIONS
  // =====================================================

  if (
    questions.length === 0
  ) {
    return (
      <main className="quiz-page">

        <div className="quiz-empty">

          <div className="quiz-empty-icon">
            <BookOpen size={40} color="#2563eb" />
          </div>

          <h2>{txt("Quiz ઉપલબ્ધ નથી", "Quiz उपलब्ध नहीं है", "Quiz Not Available")}</h2>

          <p>{txt("આ category માટે હાલમાં કોઈ question ઉપલબ્ધ નથી.", "इस category के लिए वर्तमान में कोई question उपलब्ध नहीं है।", "No questions currently available for this category.")}</p>

          <button
            type="button"
            onClick={exitQuiz}
          >
            <ArrowLeft size={15} className="btn-icon" /> {txt("ક્વિઝ શ્રેણીઓ", "क्विज़ श्रेणियां", "Quiz Categories")}
          </button>

        </div>

      </main>
    );
  }

  // =====================================================
  // QUIZ COMPLETED
  // =====================================================

  if (quizCompleted) {

    const percentage =
      Math.round(
        (score /
          questions.length) *
          100
      );

    const correctCount =
      answers.filter(
        (item) =>
          item.isCorrect ===
          true
      ).length;

    const wrongCount =
      answers.filter(
        (item) =>
          item.isCorrect ===
            false &&
          item.selectedAnswer
      ).length;

    const unansweredCount =
      Math.max(
        0,
        questions.length -
          answers.length
      );

    // =================================================
    // RESULT MESSAGE
    // =================================================

    let resultMessage = "";
    let resultSuggestion = "";

    if (percentage === 100) {
      resultMessage = txt(
        "અદ્ભુત! 🎉 તમે બધા પ્રશ્નોના સાચા જવાબ આપ્યા.",
        "अद्भुत! 🎉 आपने सभी प्रश्नों के सही उत्तर दिए।",
        "Spectacular! 🎉 You answered all questions correctly."
      );
      resultSuggestion = txt(
        "તમારી તૈયારી ખૂબ જ સરસ છે! આ જ રીતે આગળ વધતા રહો. 🌟",
        "आपकी तैयारी अत्यंत उत्तम है! इसी तरह आगे बढ़ते रहें। 🌟",
        "Your understanding is excellent! Keep moving forward like this. 🌟"
      );
    } else if (percentage >= 80) {
      resultMessage = txt(
        "ખૂબ સરસ! 👏 તમે ખૂબ સારું પ્રદર્શન કર્યું.",
        "बहुत बढ़िया! 👏 आपने बहुत अच्छा प्रदर्शन किया।",
        "Great job! 👏 You performed very well."
      );
      resultSuggestion = txt(
        "થોડી વધુ પ્રેક્ટિસથી તમે 100% મેળવી શકો છો. 💪",
        "थोड़े और अभ्यास से आप 100% प्राप्त कर सकते हैं। 💪",
        "With a little more practice, you can score 100%. 💪"
      );
    } else if (percentage >= 60) {
      resultMessage = txt(
        "સારું પ્રદર્શન! 👍",
        "अच्छा प्रदर्शन! 👍",
        "Good performance! 👍"
      );
      resultSuggestion = txt(
        "થોડી વધુ પ્રેક્ટિસ કરો અને તમારા સ્કોરને વધુ સારો બનાવો. 📖",
        "थोड़ा और अभ्यास करें और अपने स्कोर को और बेहतर बनाएं। 📖",
        "Practice a bit more to improve your score. 📖"
      );
    } else if (percentage >= 40) {
      resultMessage = txt(
        "સારો પ્રયાસ! 😊",
        "अच्छा प्रयास! 😊",
        "Good effort! 😊"
      );
      resultSuggestion = txt(
        "જે પ્રશ્નોમાં ભૂલ થઈ છે તેનો ફરી અભ્યાસ કરો અને ફરી Quiz આપો. 📚",
        "जिन प्रश्नों में भूल हुई है उनका पुनः अध्ययन करें और फिर से Quiz दें। 📚",
        "Review the questions you missed and try the quiz again. 📚"
      );
    } else {
      resultMessage = txt(
        "ચિંતા ન કરો! 😊 તમે Quiz પૂર્ણ કરી છે.",
        "चिंता न करें! 😊 आपने Quiz पूर्ण कर ली है।",
        "Don't worry! 😊 You completed the quiz."
      );
      resultSuggestion = txt(
        "વધુ ખોટા જવાબ આવ્યા છે. ફરીથી અભ્યાસ કરો અને ફરી Quiz આપો. 💪📖",
        "अधिक गलत उत्तर हुए हैं। पुनः अध्ययन करें और फिर से Quiz दें। 💪📖",
        "Keep practicing and review the chapters to improve. 💪📖"
      );
    }

    return (
      <main className="quiz-page quiz-result-page">

        <section className="quiz-complete-card">

          <div className="quiz-complete-icon">
            <Trophy size={48} color="#2563eb" />
          </div>

          <h1 className="quiz-result-title">{txt("Quiz પૂર્ણ થયું!", "Quiz पूर्ण हुआ!", "Quiz Completed!")}</h1>

          <p className="quiz-result-message">
            {resultMessage}
          </p>

          <p className="quiz-result-suggestion">
            {resultSuggestion}
          </p>

          <div
            className="quiz-percentage-circle"
            style={{
              "--percentage":
                `${percentage}%`,
            }}
          >
            <span>
              {percentage}%
            </span>
          </div>

          <div className="quiz-score-count">
            {score} / {questions.length}
          </div>

          <div className="quiz-result-summary">

            <div className="quiz-result-item quiz-result-correct">

              <strong>
                {correctCount}
              </strong>

              <span>{txt("સાચા", "सही", "Correct")}</span>

            </div>

            <div className="quiz-result-item quiz-result-wrong">

              <strong>
                {wrongCount}
              </strong>

              <span>{txt("ખોટા", "गलत", "Wrong")}</span>

            </div>

            <div className="quiz-result-item quiz-result-unanswered">

              <strong>
                {unansweredCount}
              </strong>

              <span>{txt("છોડેલા", "छोड़े गए", "Skipped")}</span>

            </div>

          </div>

          {/* =================================================
              EARNED BADGES CELEBRATION BANNER
          ================================================= */}

          {earnedBadges.length > 0 && (
            <div className="quiz-earned-badges-banner">
              <div className="quiz-earned-badges-header">
                <Award size={18} />
                <span>{txt("નવી સિદ્ધિ / બેજ અપડેટ!", "नई उपलब्धि / बैज अपडेट!", "New Achievement / Badge Update!")}</span>
              </div>
              <div className="quiz-earned-badges-list">
                {earnedBadges.map((b, idx) => (
                  <div key={idx} className="quiz-earned-badge-chip">
                    <strong>{b.name}:</strong> <span>{b.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="quiz-complete-actions">

            <button
              type="button"
              onClick={retryQuiz}
            >
              <RefreshCw size={15} className="btn-icon" /> {txt("ફરી Quiz આપો", "पुनः Quiz दें", "Retake Quiz")}
            </button>

            <button
              type="button"
              className="quiz-results-history-btn"
              onClick={() => navigate("/quiz-results", { replace: true })}
            >
              <ClipboardList size={15} className="btn-icon" /> {txt("ક્વિઝ ઇતિહાસ જુઓ", "क्विज़ इतिहास देखें", "View Quiz History")}
            </button>

            <button
              type="button"
              className="quiz-achievements-btn"
              onClick={() => navigate("/quiz-achievements", { replace: true })}
            >
              <Award size={15} className="btn-icon" /> {txt("ક્વિઝ સિદ્ધિઓ જુઓ", "क्विज़ उपलब्धियां देखें", "View Quiz Achievements")}
            </button>

            {(searchParams.get("from") === "reader" || location.state?.fromShlokaReader || (shlokaRangeParam && shlokaRangeParam !== "all")) ? (
              <button
                type="button"
                onClick={exitQuiz}
              >
                <BookOpen size={15} className="btn-icon" /> {txt("શ્લોક પર પાછા જાઓ", "श्लोक पर वापस जाएं", "Back to Shloka")}
              </button>
            ) : (
              <button
                type="button"
                onClick={exitQuiz}
              >
                <BookOpen size={15} className="btn-icon" /> {txt("ક્વિઝ શ્રેણીઓ", "क्विज़ श्रेणियां", "Quiz Categories")}
              </button>
            )}

          </div>

        </section>

      </main>
    );
  }

  // =====================================================
  // PROGRESS
  // =====================================================

  const progress =
    ((currentQuestion + 1) /
      questions.length) *
    100;


  // =====================================================
  // QUIZ TITLE
  // =====================================================

  let quizTitle =
    txt("બધા અધ્યાયો", "सभी अध्याय", "All Chapters");

  if (
    (categoryParam === "chapter" || (categoryParam && categoryParam.startsWith("chapter-"))) &&
    (chapterParam || (categoryParam && categoryParam.startsWith("chapter-")))
  ) {
    const chNum = chapterParam || categoryParam.replace("chapter-", "");
    const cleanRange = shlokaRangeParam
      ? String(shlokaRangeParam).replace(/^(\d+)-\1$/, "$1")
      : "";
    const rangeSuffix =
      shlokaRangeParam && shlokaRangeParam !== "all"
        ? ` (${txt("શ્લોક", "श्लोक", "Verse")} ${cleanRange})`
        : "";
    quizTitle = `${txt(`અધ્યાય ${chNum}`, `अध्याय ${chNum}`, `Chapter ${chNum}`)}${rangeSuffix}`;
  }

  if (
    categoryParam ===
    "mahabharata"
  ) {
    quizTitle =
      txt("મહાભારત ક્વિઝ", "महाभारत क्विज़", "Mahabharata Quiz");
  }

  // =====================================================
  // RENDER QUIZ
  // =====================================================

  return (
    <main className="quiz-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <section className="quiz-header">

        <div className="quiz-header-left">

          <button
            type="button"
            className="quiz-back-btn"
            onClick={exitQuiz}
          >
            <ArrowLeft size={20} />
          </button>

          <div>

            <span>{txt("ભગવદ્ ગીતા Quiz", "भगवद् गीता Quiz", "Bhagavad Gita Quiz")}</span>

            <h1>
              {quizTitle}
            </h1>

          </div>

        </div>

        <div className="quiz-score-badge">
          <Star size={14} className="btn-icon" fill="#2563eb" color="#2563eb" /> {score}
        </div>

      </section>

      {/* =================================================
          PROGRESS
      ================================================= */}

      <section className="quiz-progress-section">

        <div className="quiz-progress-info">

          <span>{txt("પ્રશ્ન", "प्रश्न", "Question")}{" "}
            {currentQuestion + 1}
            {" / "}
            {questions.length}
          </span>

          <span>
            {Math.round(
              progress
            )}
            %
          </span>

        </div>

        <div className="quiz-progress-bar">

          <div
            className="quiz-progress-fill"
            style={{
              width:
                `${progress}%`,
            }}
          />

        </div>

      </section>

      {/* =================================================
          QUESTION CARD
      ================================================= */}

      <section className="quiz-question-card">

        <div className="quiz-question-number">
          <span>{txt("પ્રશ્ન", "प्रश्न", "Question")} {currentQuestion + 1}</span>
          {question.shlokaNumber && (
            <span style={{ marginLeft: "8px", fontSize: "0.88em", opacity: 0.85, fontWeight: "500" }}>
              ({txt("શ્લોક", "श्लोक", "Verse")} {question.shlokaNumber})
            </span>
          )}
        </div>

        <h2 className="quiz-question-text">

          {(isEnglish && (question.questionEn || question.questionTextEn)) || (isHindi && (question.questionHi || question.questionTextHi)) || question.question || question.questionText || txt("Question ઉપલબ્ધ નથી.", "प्रश्न उपलब्ध नहीं है।", "Question not available.")}

        </h2>

        {/* =================================================
            OPTIONS
        ================================================= */}

        {(() => {
          const currentOptions = getOptions();
          const hasLongOption = currentOptions.some((opt) => {
            const optText =
              typeof opt === "string"
                ? opt
                : opt?.text || opt?.label || opt?.value || "";
            return optText.length > 35;
          });

          return (
            <div
              className={`quiz-options ${
                hasLongOption ? "single-column" : "two-column"
              }`}
            >
              {currentOptions.map((option, index) => {
                const optionText =
                  typeof option === "string"
                    ? option
                    : option?.text ||
                      option?.label ||
                      option?.value ||
                      "";

                const isSelected =
                  normalizeAnswer(selectedAnswer) ===
                  normalizeAnswer(optionText);

                const isCorrect = checkIfOptionIsCorrect(
                  optionText,
                  index
                );

                let optionClass = "quiz-option";

                // =================================================
                // AFTER ANSWER
                // =================================================

                if (selectedAnswer) {
                  if (isCorrect) {
                    optionClass += " correct";
                  }

                  if (isSelected && !isCorrect) {
                    optionClass += " wrong";
                  }

                  if (isSelected) {
                    optionClass += " selected";
                  }
                }

                return (
                  <button
                    key={index}
                    type="button"
                    className={optionClass}
                    onClick={() => handleAnswer(optionText)}
                    disabled={
                      Boolean(selectedAnswer) || submitting
                    }
                  >
                    <span className="quiz-option-letter">
                      {String.fromCharCode(65 + index)}
                    </span>

                    <span className="quiz-option-text">
                      {optionText}
                    </span>

                    {selectedAnswer && isCorrect && (
                      <span className="quiz-option-icon">
                        ✓
                      </span>
                    )}

                    {selectedAnswer &&
                      isSelected &&
                      !isCorrect && (
                        <span className="quiz-option-icon">
                          ✕
                        </span>
                      )}
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* =================================================
            EXPLANATION
        ================================================= */}

        {selectedAnswer && (
          <div className="quiz-explanation">

            <div className="quiz-explanation-title">
              <Lightbulb size={15} className="btn-icon" /> {txt("સમજણ", "व्याख्या", "Explanation")}
            </div>

            <div className="quiz-explanation-text">
              {(isEnglish && question.explanationEn) || (isHindi && question.explanationHi) || question.explanation || question.explanationText || txt("આ પ્રશ્ન માટે કોઈ સમજણ ઉપલબ્ધ નથી.", "इस प्रश्न के लिए कोई व्याख्या उपलब्ध नहीं है।", "No explanation available for this question.")}
            </div>

          </div>
        )}

        {/* =================================================
            NAVIGATION
        ================================================= */}

        <div className="quiz-navigation">

          <button
            type="button"
            className="quiz-prev-btn"
            onClick={
              handlePrevious
            }
            disabled={
              currentQuestion ===
                0 ||
              submitting
            }
          >
            <ChevronLeft size={16} className="btn-icon" /> {txt("પાછલો પ્રશ્ન", "पिछला प्रश्न", "Previous Question")}
          </button>

          <button
            type="button"
            className="quiz-next-btn"
            onClick={
              handleNext
            }
            disabled={
              !selectedAnswer ||
              submitting
            }
          >

            {submitting
              ? <><Loader2 size={15} className="spinner btn-icon" /> {txt("Result save થઈ રહ્યું છે...", "Result save हो रहा है...", "Saving result...")}</>
              : currentQuestion ===
                questions.length - 1
              ? <><Trophy size={15} className="btn-icon" /> {txt("Quiz પૂર્ણ કરો", "Quiz पूर्ण करें", "Complete Quiz")}</>
              : <>{txt("આગળનો પ્રશ્ન", "अगला प्रश्न", "Next Question")} <ChevronRight size={16} /></>}

          </button>

        </div>

      </section>

    </main>
  );
}

export default Quiz;