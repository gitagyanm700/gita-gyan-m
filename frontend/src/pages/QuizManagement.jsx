import { getValidToken } from "../utils/authHelper.js";
import { executeResilientQuizTranslation } from "../utils/aiTranslator.js";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ShareQuizQuestionModal from "../components/ShareQuizQuestionModal.jsx";
import {
  Share2,
  BrainCircuit,
  Save,
  Plus,
  BookOpen,
  RefreshCw,
  Search,
  Lightbulb,
  Trash2,
  Edit3,
  Loader2,
  ArrowLeft,
  Check,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  FileQuestion,
  List,
  Sparkles
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { hasPermission } from "../utils/permissionHelper.js";
import "./QuizManagement.css";

function QuizManagement() {
  const navigate = useNavigate();
  const { isHindi, isEnglish, isGujarati, txt } = useLanguage();
  const { user } = useAuth();
  const canAddQuiz = hasPermission(user, "add_quiz") || hasPermission(user, "manage_quiz");
  const canEditQuiz = hasPermission(user, "edit_quiz") || hasPermission(user, "manage_quiz");
  const canDeleteQuiz = hasPermission(user, "delete_quiz");
  const canShareQuiz = hasPermission(user, "share_quiz");
  // =====================================================
  // API
  // =====================================================

  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  const API_URL = isLocal
    ? "http://localhost:5000/api/quiz"
    : "https://bhagavad-gita-backend-jy1a.onrender.com/api/quiz";

  // =====================================================
  // STATE
  // =====================================================

  const [questions, setQuestions] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [editingId, setEditingId] =
    useState(null);

  // Active language tab: "gu" (Gujarati) or "hi" (Hindi)
  const [activeLangTab, setActiveLangTab] = useState("gu");
  const [translating, setTranslating] = useState(false);
  const [translatingLang, setTranslatingLang] = useState(null);
  const [translatingField, setTranslatingField] = useState(null);
  const [autoTranslateSuccess, setAutoTranslateSuccess] = useState("");
  const [deletingAll, setDeletingAll] = useState(false);

  // =====================================================
  // SHLOKA-RELATIVE QUESTION NUMBER CALCULATION
  // =====================================================
  // Computes sequential 1-based question number grouped by shloka
  // (e.g. Shloka 1 -> Q#1, Q#2...; Shloka 2 -> restarts at Q#1).
  // Applies retroactively to all questions in the database by creation order.
  // STRICTLY for Admin overview & Share Question Card (never shown to quiz users).
  const shlokaQuestionNumberMap = useMemo(() => {
    const map = new Map();
    const groups = {};

    (questions || []).forEach((q) => {
      const ch = q.chapterNumber ? `ch_${q.chapterNumber}` : `cat_${q.category || "general"}`;
      const shl = q.shlokaNumber ? `sh_${q.shlokaNumber}` : "general";
      const groupKey = `${ch}_${shl}`;

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(q);
    });

    Object.values(groups).forEach((groupList) => {
      groupList.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (timeA !== timeB) return timeA - timeB;
        return String(a._id || "").localeCompare(String(b._id || ""));
      });

      groupList.forEach((q, idx) => {
        map.set(String(q._id), idx + 1);
      });
    });

    return map;
  }, [questions]);

  // =====================================================
  // SHARE QUESTION MODAL STATE (ADMIN ONLY)
  // =====================================================

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedQuestionForShare, setSelectedQuestionForShare] = useState(null);

  const handleOpenShareQuestion = (question) => {
    if (!canShareQuiz) {
      alert(
        txt(
          "તમારી પાસે ક્વિઝ પ્રશ્ન શેર કરવાની પરમિશન નથી.",
          "आपके पास क्विज़ प्रश्न शेयर करने की अनुमति नहीं है।",
          "You do not have permission to share quiz questions."
        )
      );
      return;
    }
    const qNum = shlokaQuestionNumberMap.get(String(question._id)) || 1;
    setSelectedQuestionForShare({
      ...question,
      shlokaQuestionNumber: qNum
    });
    setShareModalOpen(true);
  };

  // =====================================================
  // EXPANDED QUESTION
  // =====================================================

  const [expandedQuestionId, setExpandedQuestionId] =
    useState(null);

  // =====================================================
  // QUESTION FILTER
  // =====================================================

  const [questionFilter, setQuestionFilter] =
    useState("all");

  const [shlokaFilter, setShlokaFilter] =
    useState("all");

  // =====================================================
  // FORM
  // =====================================================

  const [formData, setFormData] = useState(() => {
    let savedCategory = "all";
    let savedChapter = "";
    let savedShloka = "";
    try {
      savedCategory = localStorage.getItem("quiz_last_category") || "all";
      savedChapter =
        localStorage.getItem("quiz_last_chapterNumber") ||
        (savedCategory.startsWith("chapter-")
          ? savedCategory.replace("chapter-", "")
          : "");
      savedShloka = localStorage.getItem("quiz_last_shlokaNumber") || "";
    } catch (e) {
      // ignore localStorage restriction
    }

    return {
      category: savedCategory,
      chapterNumber: savedChapter,
      shlokaNumber: savedShloka,
      question: "",
      option1: "",
      option2: "",
      option3: "",
      option4: "",
      correctAnswer: "",
      explanation: "",
      // Hindi fields
      questionHi: "",
      option1Hi: "",
      option2Hi: "",
      option3Hi: "",
      option4Hi: "",
      correctAnswerHi: "",
      explanationHi: "",
      // English fields
      questionEn: "",
      option1En: "",
      option2En: "",
      option3En: "",
      option4En: "",
      correctAnswerEn: "",
      explanationEn: "",
    };
  });

  // =====================================================
  // PREVIEW NEXT QUESTION NUMBER IN FORM FOR SHLOKA
  // =====================================================
  const currentFormQNum = useMemo(() => {
    if (editingId) {
      return shlokaQuestionNumberMap.get(String(editingId)) || null;
    }
    if (!formData) return null;
    const ch = formData.chapterNumber ? `ch_${formData.chapterNumber}` : `cat_${formData.category || "general"}`;
    const shl = formData.shlokaNumber ? `sh_${formData.shlokaNumber}` : "general";
    const groupKey = `${ch}_${shl}`;
    let count = 0;
    (questions || []).forEach((q) => {
      if (!q) return;
      const qCh = q.chapterNumber ? `ch_${q.chapterNumber}` : `cat_${q.category || "general"}`;
      const qShl = q.shlokaNumber ? `sh_${q.shlokaNumber}` : "general";
      if (`${qCh}_${qShl}` === groupKey) count++;
    });
    return count + 1;
  }, [editingId, formData?.chapterNumber, formData?.shlokaNumber, formData?.category, questions, shlokaQuestionNumberMap]);

  // =====================================================
  // TOKEN
  // =====================================================

  const getToken = () => {
    return getValidToken();
  };

  // =====================================================
  // LOAD QUESTIONS
  // =====================================================

  const loadQuestions = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      const response = await fetch(
        `${API_URL}/admin/questions`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Questions load થઈ શક્યા નથી."
        );
      }

      setQuestions(
        data.questions || []
      );

    } catch (error) {
      console.error(
        "Load Quiz Questions Error:",
        error
      );

      setError(
        error.message ||
          "Questions load કરવામાં error આવ્યો."
      );

    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadQuestions();
  }, []);

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    if (name === "shlokaNumber") {
      try {
        localStorage.setItem("quiz_last_shlokaNumber", value);
      } catch (e) {
        // ignore
      }
    }

    setFormData(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );

    setError("");
    setSuccess("");
  };

  // =====================================================
  // CATEGORY CHANGE
  // =====================================================

  const handleCategoryChange = (event) => {
    const category = event.target.value;
    const chapterNumber = category.startsWith("chapter-")
      ? category.replace("chapter-", "")
      : "";

    try {
      localStorage.setItem("quiz_last_category", category);
      localStorage.setItem("quiz_last_chapterNumber", chapterNumber);
    } catch (e) {
      // ignore
    }

    setFormData(
      (previous) => ({
        ...previous,
        category,
        chapterNumber,
      })
    );

    setError("");
    setSuccess("");
  };

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = (preserveSelection = true) => {
    setFormData((previous) => {
      let category = "all";
      let chapterNumber = "";
      let shlokaNumber = "";

      if (preserveSelection) {
        category = previous.category || "all";
        chapterNumber = previous.chapterNumber || "";
        shlokaNumber = previous.shlokaNumber || "";
      } else {
        try {
          category = localStorage.getItem("quiz_last_category") || "all";
          chapterNumber =
            localStorage.getItem("quiz_last_chapterNumber") ||
            (category.startsWith("chapter-") ? category.replace("chapter-", "") : "");
          shlokaNumber = localStorage.getItem("quiz_last_shlokaNumber") || "";
        } catch (e) {
          // ignore
        }
      }

      return {
        category,
        chapterNumber,
        shlokaNumber,
        question: "",
        option1: "",
        option2: "",
        option3: "",
        option4: "",
        correctAnswer: "",
        explanation: "",
        questionHi: "",
        option1Hi: "",
        option2Hi: "",
        option3Hi: "",
        option4Hi: "",
        correctAnswerHi: "",
        explanationHi: "",
        questionEn: "",
        option1En: "",
        option2En: "",
        option3En: "",
        option4En: "",
        correctAnswerEn: "",
        explanationEn: "",
      };
    });

    setEditingId(null);
    setActiveLangTab("gu");
    setError("");
    setAutoTranslateSuccess("");
  };

  // =====================================================
  // EDIT QUESTION
  // =====================================================

  const handleEdit = (question) => {
    if (!canEditQuiz) {
      alert(
        txt(
          "તમારી પાસે ક્વિઝ પ્રશ્ન સુધારવાની (Edit) પરમિશન નથી.",
          "आपके पास क्विज़ प्रश्न संपादित करने (Edit) की अनुमति नहीं है।",
          "You do not have permission to edit quiz questions."
        )
      );
      return;
    }

    let category =
      question.category || "all";

    let chapterNumber =
      question.chapterNumber || "";

    // -------------------------------------------------
    // OLD DATA SUPPORT
    // -------------------------------------------------

    if (
      category.startsWith(
        "chapter-"
      )
    ) {
      chapterNumber =
        category.replace(
          "chapter-",
          ""
        );
    }

    setEditingId(
      question._id
    );

    setFormData({
      category,

      chapterNumber,

      shlokaNumber:
        question.shlokaNumber || "",

      question:
        question.question || "",

      option1:
        question.options?.[0] || "",

      option2:
        question.options?.[1] || "",

      option3:
        question.options?.[2] || "",

      option4:
        question.options?.[3] || "",

      correctAnswer:
        question.correctAnswer || "",

      explanation:
        question.explanation || "",

      // Hindi fields
      questionHi:
        question.questionHi || "",

      option1Hi:
        question.optionsHi?.[0] || "",

      option2Hi:
        question.optionsHi?.[1] || "",

      option3Hi:
        question.optionsHi?.[2] || "",

      option4Hi:
        question.optionsHi?.[3] || "",

      correctAnswerHi:
        question.correctAnswerHi || "",

      explanationHi:
        question.explanationHi || "",

      // English fields
      questionEn:
        question.questionEn || "",

      option1En:
        question.optionsEn?.[0] || "",

      option2En:
        question.optionsEn?.[1] || "",

      option3En:
        question.optionsEn?.[2] || "",

      option4En:
        question.optionsEn?.[3] || "",

      correctAnswerEn:
        question.correctAnswerEn || "",

      explanationEn:
        question.explanationEn || "",
    });

    setActiveLangTab("gu");
    setError("");
    setSuccess("");
    setAutoTranslateSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // AI AUTO-TRANSLATE (GUJARATI -> HINDI & ENGLISH)
  // =====================================================

  
  // =====================================================
  // SCROLL PRESERVATION & SECTION LANGUAGE SWITCHER
  // =====================================================
  const targetScrollInfoRef = useRef(null);

  const handleLangTabSwitch = (newLang, sectionKey, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (activeLangTab === newLang) return;

    const savedScrollY =
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      0;
    let sectionOffsetFromViewport = null;

    if (sectionKey) {
      const sectionEl = document.getElementById(`section-${sectionKey}`);
      if (sectionEl) {
        sectionOffsetFromViewport = sectionEl.getBoundingClientRect().top;
      }
    }

    targetScrollInfoRef.current = {
      sectionKey,
      sectionOffsetFromViewport,
      savedScrollY,
    };

    setActiveLangTab(newLang);
  };

  useLayoutEffect(() => {
    if (!targetScrollInfoRef.current) return;
    const { sectionKey, sectionOffsetFromViewport, savedScrollY } =
      targetScrollInfoRef.current;

    const restoreScroll = () => {
      if (sectionKey && sectionOffsetFromViewport !== null) {
        const newSectionEl = document.getElementById(`section-${sectionKey}`);
        if (newSectionEl) {
          const currentTop = newSectionEl.getBoundingClientRect().top;
          const delta = currentTop - sectionOffsetFromViewport;
          if (Math.abs(delta) > 0.5) {
            window.scrollBy({ top: delta, behavior: "instant" });
          }
          return;
        }
      }
      if (savedScrollY !== null && savedScrollY !== undefined) {
        window.scrollTo({ top: savedScrollY, behavior: "instant" });
      }
    };

    restoreScroll();
    const rafId = requestAnimationFrame(restoreScroll);
    const t1 = setTimeout(restoreScroll, 25);
    const t2 = setTimeout(restoreScroll, 75);
    const t3 = setTimeout(restoreScroll, 150);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [activeLangTab]);

  const renderLangTabs = (sectionKey = "quiz-question") => (
    <div className="section-lang-tabs">
      <button
        type="button"
        className={`section-lang-tab ${activeLangTab === "gu" ? "active" : ""}`}
        onClick={(e) => handleLangTabSwitch("gu", sectionKey, e)}
      >
        ગુજરાતી વિગત
      </button>
      <button
        type="button"
        className={`section-lang-tab ${activeLangTab === "hi" ? "active" : ""}`}
        onClick={(e) => handleLangTabSwitch("hi", sectionKey, e)}
      >
        હિન્દી વિગત
      </button>
      <button
        type="button"
        className={`section-lang-tab ${activeLangTab === "en" ? "active" : ""}`}
        onClick={(e) => handleLangTabSwitch("en", sectionKey, e)}
      >
        અંગ્રેજી વિગત
      </button>
    </div>
  );

  // =====================================================
  // FIELD SPECIFIC AI TRANSLATION (Question / Options / Explanation)
  // =====================================================
  const handleTranslateField = async (targetLang = "hi", field = "question") => {
    try {
      setTranslatingField(`${targetLang}-${field}`);
      setError("");
      setAutoTranslateSuccess("");

      if (field === "question") {
        if (!formData.question || !formData.question.trim()) {
          throw new Error("કૃપા કરીને પહેલાં ગુજરાતી પ્રશ્ન (Question) લખો જેથી AI તેનું અનુવાદ કરી શકે.");
        }
      } else if (field === "options") {
        const rawOptions = [
          formData.option1,
          formData.option2,
          formData.option3,
          formData.option4,
        ].map((o) => (o || "").trim());

        if (rawOptions.some((o) => !o)) {
          throw new Error("કૃપા કરીને પહેલાં ચારેય ગુજરાતી વિકલ્પો (Options 1 થી 4) ભરો જેથી AI તેનું અનુવાદ કરી શકે.");
        }
      } else if (field === "explanation") {
        if (!formData.explanation || !formData.explanation.trim()) {
          throw new Error("કૃપા કરીને પહેલાં ગુજરાતી સમજૂતી (Explanation) લખો જેથી AI તેનું અનુવાદ કરી શકે.");
        }
      }

      const token = getToken();
      const rawOptions = [
        formData.option1,
        formData.option2,
        formData.option3,
        formData.option4,
      ].map((o) => (o || "").trim());

      const translated = await executeResilientQuizTranslation({
        field,
        targetLang,
        category: formData.category,
        chapterNumber: formData.chapterNumber,
        question: formData.question,
        options: rawOptions,
        correctAnswer: formData.correctAnswer,
        explanation: formData.explanation,
        apiUrl: API_URL,
        token,
      });

      if (!translated) {
        throw new Error("ઓટો-અનુવાદ માહિતી પ્રાપ્ત થઈ શકી નથી.");
      }

      if (field === "question") {
        if (targetLang === "hi") {
          setFormData((prev) => ({
            ...prev,
            questionHi: translated.questionHi || prev.questionHi,
          }));
          setAutoTranslateSuccess("✨ પ્રશ્ન સફળતાપૂર્વક હિન્દીમાં AI દ્વારા અનુવાદિત થયો!");
        } else {
          setFormData((prev) => ({
            ...prev,
            questionEn: translated.questionEn || prev.questionEn,
          }));
          setAutoTranslateSuccess("✨ પ્રશ્ન સફળતાપૂર્વક અંગ્રેજીમાં AI દ્વારા અનુવાદિત થયો!");
        }
      } else if (field === "options") {
        if (targetLang === "hi") {
          setFormData((prev) => ({
            ...prev,
            option1Hi: translated.optionsHi?.[0] || prev.option1Hi,
            option2Hi: translated.optionsHi?.[1] || prev.option2Hi,
            option3Hi: translated.optionsHi?.[2] || prev.option3Hi,
            option4Hi: translated.optionsHi?.[3] || prev.option4Hi,
            correctAnswerHi: translated.correctAnswerHi || prev.correctAnswerHi,
          }));
          setAutoTranslateSuccess("✨ વિકલ્પો અને સાચો જવાબ સફળતાપૂર્વક હિન્દીમાં AI દ્વારા અનુવાદિત થયા!");
        } else {
          setFormData((prev) => ({
            ...prev,
            option1En: translated.optionsEn?.[0] || prev.option1En,
            option2En: translated.optionsEn?.[1] || prev.option2En,
            option3En: translated.optionsEn?.[2] || prev.option3En,
            option4En: translated.optionsEn?.[3] || prev.option4En,
            correctAnswerEn: translated.correctAnswerEn || prev.correctAnswerEn,
          }));
          setAutoTranslateSuccess("✨ વિકલ્પો અને સાચો જવાબ સફળતાપૂર્વક અંગ્રેજીમાં AI દ્વારા અનુવાદિત થયા!");
        }
      } else if (field === "explanation") {
        if (targetLang === "hi") {
          setFormData((prev) => ({
            ...prev,
            explanationHi: translated.explanationHi || prev.explanationHi,
          }));
          setAutoTranslateSuccess("✨ સમજૂતી સફળતાપૂર્વક હિન્દીમાં AI દ્વારા અનુવાદિત થઈ!");
        } else {
          setFormData((prev) => ({
            ...prev,
            explanationEn: translated.explanationEn || prev.explanationEn,
          }));
          setAutoTranslateSuccess("✨ સમજૂતી સફળતાપૂર્વક અંગ્રેજીમાં AI દ્વારા અનુવાદિત થઈ!");
        }
      }
    } catch (err) {
      console.error("Field translate error:", err);
      setError(err.message || "ઓટો-અનુવાદ કરવામાં error આવ્યો.");
    } finally {
      setTranslatingField(null);
    }
  };

  const handleAutoTranslate = async (targetLang = "hi") => {
    try {
      setTranslating(true);
      setTranslatingLang(targetLang);
      setError("");
      setAutoTranslateSuccess("");

      if (!formData.question || !formData.question.trim()) {
        throw new Error(
          targetLang === "hi"
            ? "કૃપા કરીને પહેલાં ગુજરાતી પ્રશ્ન (Question) લખો જેથી AI તેનું હિન્દીમાં ઓટો-અનુવાદ કરી શકે."
            : targetLang === "en"
            ? "કૃપા કરીને પહેલાં ગુજરાતી પ્રશ્ન (Question) લખો જેથી AI તેનું અંગ્રેજીમાં ઓટો-અનુવાદ કરી શકે."
            : "કૃપા કરીને પહેલાં ગુજરાતી પ્રશ્ન (Question) લખો જેથી AI તેનું હિન્દી અને અંગ્રેજીમાં ઓટો-અનુવાદ કરી શકે."
        );
      }

      const rawOptions = [
        formData.option1,
        formData.option2,
        formData.option3,
        formData.option4,
      ].map((o) => (o || "").trim());

      if (rawOptions.some((o) => !o)) {
        throw new Error(
          "કૃપા કરીને પહેલાં ચારેય ગુજરાતી વિકલ્પો (Options 1 થી 4) ભરો જેથી AI તેનું અનુવાદ કરી શકે."
        );
      }

      if (!formData.correctAnswer || !formData.correctAnswer.trim()) {
        throw new Error(
          "કૃપા કરીને પહેલાં સાચો જવાબ (Correct Answer) પસંદ કરો."
        );
      }

      const token = getToken();

      const translated = await executeResilientQuizTranslation({
        field: "all",
        targetLang: targetLang || "all",
        category: formData.category,
        chapterNumber: formData.chapterNumber,
        question: formData.question,
        options: rawOptions,
        correctAnswer: formData.correctAnswer,
        explanation: formData.explanation,
        apiUrl: API_URL,
        token,
      });

      if (!translated) {
        throw new Error(
          "ઓટો-અનુવાદ માહિતી પ્રાપ્ત થઈ શકી નથી."
        );
      }

      setFormData((prev) => ({
        ...prev,
        questionHi:
          translated.questionHi || prev.questionHi,
        option1Hi:
          translated.optionsHi?.[0] || prev.option1Hi,
        option2Hi:
          translated.optionsHi?.[1] || prev.option2Hi,
        option3Hi:
          translated.optionsHi?.[2] || prev.option3Hi,
        option4Hi:
          translated.optionsHi?.[3] || prev.option4Hi,
        correctAnswerHi:
          translated.correctAnswerHi || prev.correctAnswerHi,
        explanationHi:
          translated.explanationHi || prev.explanationHi,

        // English fields
        questionEn:
          translated.questionEn || prev.questionEn,
        option1En:
          translated.optionsEn?.[0] || prev.option1En,
        option2En:
          translated.optionsEn?.[1] || prev.option2En,
        option3En:
          translated.optionsEn?.[2] || prev.option3En,
        option4En:
          translated.optionsEn?.[3] || prev.option4En,
        correctAnswerEn:
          translated.correctAnswerEn || prev.correctAnswerEn,
        explanationEn:
          translated.explanationEn || prev.explanationEn,
      }));

      setAutoTranslateSuccess(
        targetLang === "hi"
          ? "✨ ગુજરાતી પ્રશ્ન અને વિકલ્પોનું હિન્દીમાં સફળતાપૂર્વક AI ઓટો-અનુવાદ થઈ ગયું!"
          : targetLang === "en"
          ? "✨ ગુજરાતી પ્રશ્ન અને વિકલ્પોનું અંગ્રેજીમાં સફળતાપૂર્વક AI ઓટો-અનુવાદ થઈ ગયું!"
          : "✨ ગુજરાતી પ્રશ્ન અને વિકલ્પોનું હિન્દી અને અંગ્રેજીમાં સફળતાપૂર્વક AI ઓટો-અનુવાદ થઈ ગયું!"
      );
      if (targetLang === "en") {
        setActiveLangTab("en");
      } else if (targetLang === "hi") {
        setActiveLangTab("hi");
      }
    } catch (err) {
      console.error("Auto translate error:", err);
      setError(
        err.message || "ઓટો-અનુવાદ કરવામાં error આવ્યો."
      );
    } finally {
      setTranslating(false);
      setTranslatingLang(null);
    }
  };

  // =====================================================
  // TOGGLE QUESTION
  // =====================================================

  const toggleQuestion = (id) => {
    setExpandedQuestionId(
      (previous) =>
        previous === id
          ? null
          : id
    );
  };

  // =====================================================
  // SUBMIT FORM
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (editingId && !canEditQuiz) {
      alert(
        txt(
          "તમારી પાસે ક્વિઝ પ્રશ્ન સુધારવાની (Edit) પરમિશન નથી.",
          "आपके पास क्विज़ प्रश्न संपादित करने (Edit) की अनुमति नहीं है।",
          "You do not have permission to edit quiz questions."
        )
      );
      return;
    }

    if (!editingId && !canAddQuiz) {
      alert(
        txt(
          "તમારી પાસે નવો ક્વિઝ પ્રશ્ન ઉમેરવાની (Add) પરમિશન નથી.",
          "आपके पास नया क्विज़ प्रश्न जोड़ने (Add) की अनुमति नहीं है।",
          "You do not have permission to add new quiz questions."
        )
      );
      return;
    }

    setError("");
    setSuccess("");

    // -------------------------------------------------
    // CATEGORY VALIDATION
    // -------------------------------------------------

    if (!formData.category) {
      setError(
        "Category પસંદ કરો."
      );
      return;
    }

    // -------------------------------------------------
    // CHAPTER VALIDATION
    // -------------------------------------------------

    if (
      formData.category.startsWith(
        "chapter-"
      )
    ) {
      if (
        !formData.chapterNumber
      ) {
        setError(
          "Chapter number જરૂરી છે."
        );
        return;
      }

      const chapter =
        Number(
          formData.chapterNumber
        );

      if (
        chapter < 1 ||
        chapter > 18
      ) {
        setError(
          "Chapter number 1 થી 18 વચ્ચે હોવો જોઈએ."
        );
        return;
      }

      if (
        !formData.shlokaNumber ||
        Number(formData.shlokaNumber) < 1
      ) {
        setError(
          "શ્લોક નંબર (Shloka Number) દાખલ કરવો ફરજિયાત છે."
        );
        return;
      }
    }

    // -------------------------------------------------
    // QUESTION VALIDATION
    // -------------------------------------------------

    if (
      !formData.question.trim()
    ) {
      setError(
        "Question લખો."
      );
      return;
    }

    // -------------------------------------------------
    // OPTIONS
    // -------------------------------------------------

    const options = [
      formData.option1,
      formData.option2,
      formData.option3,
      formData.option4,
    ].map((option) =>
      option.trim()
    );

    if (
      options.some(
        (option) => !option
      )
    ) {
      setError(
        "ચારેય options ભરવા જરૂરી છે."
      );
      return;
    }

    // -------------------------------------------------
    // CORRECT ANSWER
    // -------------------------------------------------

    if (
      !formData.correctAnswer.trim()
    ) {
      setError(
        "Correct answer પસંદ કરો."
      );
      return;
    }

    if (
      !options.includes(
        formData.correctAnswer.trim()
      )
    ) {
      setError(
        "Correct answer options માંથી જ હોવો જોઈએ."
      );
      return;
    }

    try {
      setSaving(true);

      const token = getToken();

      // =================================================
      // PREPARE CATEGORY + CHAPTER
      // =================================================

      let finalCategory =
        formData.category;

      let finalChapterNumber =
        null;

      // -------------------------------------------------
      // CHAPTER QUESTION
      // -------------------------------------------------

      if (
        formData.category.startsWith(
          "chapter-"
        )
      ) {
        finalChapterNumber =
          Number(
            formData.chapterNumber
          );

        finalCategory =
          `chapter-${finalChapterNumber}`;
      }

      // -------------------------------------------------
      // MAHABHARATA
      // -------------------------------------------------

      if (
        formData.category ===
        "mahabharata"
      ) {
        finalChapterNumber = null;
      }

      // -------------------------------------------------
      // ALL / GENERAL
      // -------------------------------------------------

      if (
        formData.category ===
        "all"
      ) {
        finalChapterNumber = null;
      }

      // =================================================
      // HINDI DATA PREPARATION
      // =================================================

      const rawOptionsHi = [
        formData.option1Hi,
        formData.option2Hi,
        formData.option3Hi,
        formData.option4Hi,
      ].map((opt) => String(opt || "").trim());

      let finalCorrectAnswerHi = formData.correctAnswerHi?.trim() || "";
      if (!finalCorrectAnswerHi && rawOptionsHi.some(Boolean)) {
        const correctIndex = options.findIndex(
          (opt) => opt.toLowerCase() === formData.correctAnswer.trim().toLowerCase()
        );
        if (correctIndex !== -1 && rawOptionsHi[correctIndex]) {
          finalCorrectAnswerHi = rawOptionsHi[correctIndex];
        }
      }

      // =================================================
      // ENGLISH DATA PREPARATION
      // =================================================

      const rawOptionsEn = [
        formData.option1En,
        formData.option2En,
        formData.option3En,
        formData.option4En,
      ].map((opt) => String(opt || "").trim());

      let finalCorrectAnswerEn = formData.correctAnswerEn?.trim() || "";
      if (!finalCorrectAnswerEn && rawOptionsEn.some(Boolean)) {
        const correctIndex = options.findIndex(
          (opt) => opt.toLowerCase() === formData.correctAnswer.trim().toLowerCase()
        );
        if (correctIndex !== -1 && rawOptionsEn[correctIndex]) {
          finalCorrectAnswerEn = rawOptionsEn[correctIndex];
        }
      }

      // =================================================
      // PAYLOAD
      // =================================================

      const payload = {
        category:
          finalCategory,

        chapterNumber:
          finalChapterNumber,

        shlokaNumber:
          formData.shlokaNumber && Number(formData.shlokaNumber) >= 1
            ? Number(formData.shlokaNumber)
            : null,

        question:
          formData.question.trim(),

        options,

        correctAnswer:
          formData.correctAnswer.trim(),

        explanation:
          formData.explanation.trim(),

        // Hindi fields
        questionHi:
          formData.questionHi?.trim() || "",

        optionsHi:
          rawOptionsHi,

        correctAnswerHi:
          finalCorrectAnswerHi,

        explanationHi:
          formData.explanationHi?.trim() || "",

        // English fields
        questionEn:
          formData.questionEn?.trim() || "",

        optionsEn:
          rawOptionsEn,

        correctAnswerEn:
          finalCorrectAnswerEn,

        explanationEn:
          formData.explanationEn?.trim() || "",
      };

      let response;

      // =================================================
      // UPDATE
      // =================================================

      if (editingId) {
        response = await fetch(
          `${API_URL}/admin/question/${editingId}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );
      }

      // =================================================
      // ADD
      // =================================================

      else {
        response = await fetch(
          `${API_URL}/admin/question`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Question save થઈ શક્યો નથી."
        );
      }

      setSuccess(
        data.message ||
          "Question successfully save થયો."
      );

      resetForm(true);

      await loadQuestions();

    } catch (error) {
      console.error(
        "Save Quiz Question Error:",
        error
      );

      setError(
        error.message ||
          "Question save કરવામાં error આવ્યો."
      );

    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // DELETE QUESTION
  // =====================================================

  const handleDelete = async (id) => {
    if (!canDeleteQuiz) {
      alert(
        txt(
          "તમારી પાસે ક્વિઝ પ્રશ્ન ડિલીટ કરવાની પરમિશન નથી. મુખ્ય એડમિનનો સંપર્ક કરો.",
          "आपके पास क्विज़ प्रश्न डिलीट करने की अनुमति नहीं है। मुख्य एडमिन से संपर्क करें।",
          "You do not have permission to delete quiz questions. Contact Super Admin."
        )
      );
      return;
    }

    const confirmed =
      window.confirm(
        "શું તમે ખરેખર આ quiz question delete કરવા માંગો છો?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const token = getToken();

      const response =
        await fetch(
          `${API_URL}/admin/question/${id}`,
          {
            method: "DELETE",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Question delete થઈ શક્યો નથી."
        );
      }

      setSuccess(
        data.message ||
          "Question delete થયો."
      );

      if (
        editingId === id
      ) {
        resetForm();
      }

      if (
        expandedQuestionId === id
      ) {
        setExpandedQuestionId(
          null
        );
      }

      await loadQuestions();

    } catch (error) {
      console.error(
        "Delete Quiz Question Error:",
        error
      );

      setError(
        error.message ||
          "Question delete કરવામાં error આવ્યો."
      );
    }
  };

  // =====================================================
  // GET FILTER LABEL
  // =====================================================

  const getFilterLabel = () => {
    if (questionFilter === "all") {
      return txt("બધા Questions", "सभी प्रश्न", "All Questions");
    }
    if (questionFilter === "mahabharata") {
      return txt("મહાભારત", "महाभारत", "Mahabharata");
    }
    if (questionFilter.startsWith("chapter-")) {
      const ch = questionFilter.replace("chapter-", "");
      return txt(`અધ્યાય ${ch}`, `अध्याय ${ch}`, `Chapter ${ch}`);
    }
    return questionFilter;
  };

  // =====================================================
  // DELETE ALL FILTERED QUESTIONS
  // =====================================================

  const handleDeleteFilteredQuestions = async () => {
    if (!canDeleteQuiz) {
      alert(
        txt(
          "તમારી પાસે ક્વિઝ પ્રશ્નો ડિલીટ કરવાની પરમિશન નથી. મુખ્ય એડમિનનો સંપર્ક કરો.",
          "आपके पास क्विज़ प्रश्न डिलीट करने की अनुमति नहीं है। मुख्य एडमिन से संपर्क करें।",
          "You do not have permission to delete quiz questions. Contact Super Admin."
        )
      );
      return;
    }

    if (filteredQuestions.length === 0) {
      alert(
        txt(
          "Delete કરવા માટે કોઈ પ્રશ્નો ઉપલબ્ધ નથી.",
          "Delete करने के लिए कोई प्रश्न उपलब्ध नहीं है।",
          "No questions available to delete."
        )
      );
      return;
    }

    const label = getFilterLabel();
    const count = filteredQuestions.length;

    const confirmMsg = txt(
      `શું તમે ખરેખર ${label} ના બધા (${count}) પ્રશ્નો Delete કરવા માંગો છો?\n\nઆ ક્રિયા પાછી નહીં ખેંચી શકાય!`,
      `क्या आप वाकई ${label} के सभी (${count}) प्रश्न Delete करना चाहते हैं?\n\nयह क्रिया वापस नहीं ली जा सकती!`,
      `Are you sure you want to delete all (${count}) questions of ${label}?\n\nThis action cannot be undone!`
    );

    const confirmed = window.confirm(confirmMsg);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingAll(true);
      setError("");
      setSuccess("");

      const token = getToken();
      const questionIds = filteredQuestions.map((q) => q._id);

      let deleted = false;
      let deletedCount = questionIds.length;

      // 1. Try bulk DELETE endpoint
      try {
        const response = await fetch(`${API_URL}/admin/questions/bulk`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            ids: questionIds,
            filter: questionFilter
          })
        });

        if (response.ok) {
          const data = await response.json();
          deleted = true;
          deletedCount = data.deletedCount ?? questionIds.length;
        }
      } catch (err) {
        console.warn("Bulk delete endpoint pending or failed, using fallback:", err);
      }

      // 2. Fallback to batch individual deletion if bulk endpoint is not yet live
      if (!deleted) {
        const batchSize = 10;
        for (let i = 0; i < questionIds.length; i += batchSize) {
          const batch = questionIds.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (id) => {
              const r = await fetch(`${API_URL}/admin/question/${id}`, {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${token}`
                }
              });
              if (!r.ok) {
                const errData = await r.json().catch(() => ({}));
                throw new Error(errData.message || "Question delete થઈ શક્યો નથી.");
              }
            })
          );
        }
      }

      // Remove deleted questions from state
      const idSet = new Set(questionIds);
      setQuestions((prev) => prev.filter((item) => !idSet.has(item._id)));

      if (editingId && idSet.has(editingId)) {
        resetForm();
      }
      setExpandedQuestionId(null);

      setSuccess(
        txt(
          `${label} ના બધા ${deletedCount} પ્રશ્નો સફળતાપૂર્વક Delete થયા.`,
          `${label} के सभी ${deletedCount} प्रश्न सफलतापूर्वक Delete हुए।`,
          `All ${deletedCount} questions of ${label} were successfully deleted.`
        )
      );

      // Reload fresh list to keep in sync with database
      await loadQuestions();

    } catch (err) {
      console.error("Delete Filtered Questions Error:", err);
      setError(
        err.message ||
          txt(
            "પ્રશ્નો delete કરવામાં error આવ્યો.",
            "प्रश्न delete करने में त्रुटि आई।",
            "Error deleting questions."
          )
      );
    } finally {
      setDeletingAll(false);
    }
  };

  // =====================================================
  // CATEGORY NAME
  // =====================================================

  const getCategoryName = (
    category,
    chapterNumber
  ) => {
    // -------------------------------------------------
    // CHAPTER
    // -------------------------------------------------

    if (
      category &&
      String(category).startsWith(
        "chapter-"
      )
    ) {
      const number =
        chapterNumber ||
        String(category).replace(
          "chapter-",
          ""
        );

      return `અધ્યાય ${number}`;
    }

    // -------------------------------------------------
    // MAHABHARATA
    // -------------------------------------------------

    if (
      category ===
      "mahabharata"
    ) {
      return "સમગ્ર મહાભારત";
    }

    // -------------------------------------------------
    // ALL / GENERAL
    // -------------------------------------------------

    if (
      category === "all"
    ) {
      return "All / General";
    }

    return category;
  };

  // =====================================================
  // FILTER QUESTIONS
  // =====================================================

  const filteredQuestions =
    questions.filter(
      (item) => {
        let matchesCategory = false;

        // ---------------------------------------------
        // ALL
        // ---------------------------------------------
        if (
          questionFilter ===
          "all"
        ) {
          matchesCategory = true;
        }

        // ---------------------------------------------
        // MAHABHARATA
        // ---------------------------------------------
        else if (
          questionFilter ===
          "mahabharata"
        ) {
          matchesCategory = (
            item.category ===
            "mahabharata"
          );
        }

        // ---------------------------------------------
        // CHAPTER
        // ---------------------------------------------
        else if (
          questionFilter.startsWith(
            "chapter-"
          )
        ) {
          const selectedChapter =
            Number(
              questionFilter.replace(
                "chapter-",
                ""
              )
            );

          const itemChapter =
            Number(
              item.chapterNumber
            );

          const itemCategory =
            String(
              item.category || ""
            );

          // New data
          if (
            itemChapter ===
            selectedChapter
          ) {
            matchesCategory = true;
          }

          // Old data support
          else if (
            itemCategory ===
            `chapter-${selectedChapter}`
          ) {
            matchesCategory = true;
          }
        }

        if (!matchesCategory) {
          return false;
        }

        // Shloka filter within chapter
        if (questionFilter.startsWith("chapter-") && shlokaFilter !== "all") {
          if (shlokaFilter === "none") {
            return !item.shlokaNumber;
          }
          return Number(item.shlokaNumber) === Number(shlokaFilter);
        }

        return true;
      }
    );

  // =====================================================
  // SHLOKA STATS FOR SELECTED CHAPTER
  // =====================================================

  const shlokaStats = (() => {
    if (!questionFilter.startsWith("chapter-")) return null;
    const selectedChapter = Number(questionFilter.replace("chapter-", ""));
    const chapterQuestions = questions.filter((item) => {
      const itemChapter = Number(item.chapterNumber);
      const itemCategory = String(item.category || "");
      return itemChapter === selectedChapter || itemCategory === `chapter-${selectedChapter}`;
    });

    const counts = {};
    let unassigned = 0;
    chapterQuestions.forEach((q) => {
      if (q.shlokaNumber && Number(q.shlokaNumber) >= 1) {
        counts[q.shlokaNumber] = (counts[q.shlokaNumber] || 0) + 1;
      } else {
        unassigned++;
      }
    });

    return { counts, unassigned, total: chapterQuestions.length };
  })();

  // =====================================================
  // FILTER CHANGE
  // =====================================================

  const handleQuestionFilterChange = (
    event
  ) => {
    const filter =
      event.target.value;

    setQuestionFilter(filter);
    setShlokaFilter("all");

    // Close opened question
    setExpandedQuestionId(null);
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="quiz-management-page">

        <div className="quiz-management-loading">
          <span>
            <Loader2 className="btn-icon animate-spin" size={20} />{" "}
            {txt("Quiz questions load થઈ રહ્યા છે...", "Quiz प्रश्न लोड हो रहे हैं...", "Loading quiz questions...")}
          </span>
        </div>

      </main>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <main className="quiz-management-page">

      {/* =================================================
          HEADER
      ================================================= */}

<section className="quiz-management-header">

  <div className="quiz-management-icon">
    <BrainCircuit size={34} color="#1d4ed8" strokeWidth={1.75} />
  </div>

  <div className="quiz-management-header-content">

    <h1>
      Quiz Management
    </h1>
  </div>

  <button
    type="button"
    className="quiz-dashboard-back-button"
    onClick={() => navigate("/admin")}
  >
    <ArrowLeft className="btn-icon" size={16} /> Admin Dashboard
  </button>

</section>


      {/* =================================================
          MESSAGE
      ================================================= */}

      {error && (
        <div className="quiz-management-error">
          <AlertCircle className="btn-icon" size={18} /> {error}
        </div>
      )}

      {success && (
        <div className="quiz-management-success">
          <CheckCircle2 className="btn-icon" size={18} /> {success}
        </div>
      )}


      {/* =================================================
          FORM
      ================================================= */}

      {!canAddQuiz && canEditQuiz && !editingId && (
        <div style={{ margin: "20px 0", padding: "16px", borderRadius: "14px", background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", textAlign: "center", fontWeight: "500" }}>
          ℹ️ {txt("પ્રશ્ન સુધારવા માટે નીચેની યાદીમાંથી કોઈપણ પ્રશ્ન પર 'Edit' બટન ક્લિક કરો.", "प्रश्न संपादित करने के लिए नीचे दी गई सूची में से किसी भी प्रश्न पर 'Edit' बटन क्लिक करें।", "Click 'Edit' on any question in the list below to edit it.")}
        </div>
      )}

      {(canAddQuiz || (canEditQuiz && editingId)) && (
      <section className="quiz-form-card">

        <div className="quiz-form-title">

          <h2>
            {editingId ? (
              <span>
                <Edit3 className="btn-icon" size={20} /> Quiz Question Edit કરો
                {shlokaQuestionNumberMap.get(String(editingId)) && (
                  <span className="quiz-q-num-badge-pill" title="આ પ્રશ્નનો ક્રમ">
                    Q#{shlokaQuestionNumberMap.get(String(editingId))}
                  </span>
                )}
              </span>
            ) : (
              <span>
                <Plus className="btn-icon" size={20} /> New Quiz Question Add કરો
                {currentFormQNum && (
                  <span className="quiz-q-num-badge-pill" title="આ શ્લોક માટે હવે ઉમેરાશે તે પ્રશ્ન ક્રમ">
                    {formData.shlokaNumber ? `શ્લોક ${formData.shlokaNumber} • પ્રશ્ન #${currentFormQNum}` : `આગામી પ્રશ્ન #${currentFormQNum}`}
                  </span>
                )}
              </span>
            )}
          </h2>

          {editingId && (
            <button
              type="button"
              className="quiz-cancel-button"
              onClick={resetForm}
            >
              Cancel Edit
            </button>
          )}

        </div>


        <form
          onSubmit={handleSubmit}
        >

          {/* =================================================
              CATEGORY, CHAPTER NUMBER & SHLOKA NUMBER (SINGLE ROW)
          ================================================= */}
          <div
            className={`quiz-category-row-grid ${
              formData.category.startsWith("chapter-") ? "has-chapter" : ""
            }`}
          >
            <div className="quiz-form-group" style={{ marginBottom: 0 }}>
              <label>
                Category
              </label>

              <select
                name="category"
                value={formData.category}
                onChange={handleCategoryChange}
              >
                <option value="all">
                  All / General
                </option>

                {Array.from(
                  { length: 18 },
                  (_, index) => (
                    <option
                      key={index + 1}
                      value={`chapter-${index + 1}`}
                    >
                      અધ્યાય {index + 1}
                    </option>
                  )
                )}

                <option value="mahabharata">
                  સમગ્ર મહાભારત
                </option>
              </select>
            </div>

            {formData.category.startsWith("chapter-") && (
              <>
                <div className="quiz-form-group" style={{ marginBottom: 0 }}>
                  <label>
                    Chapter Number (અધ્યાય નંબર)
                  </label>

                  <input
                    type="number"
                    name="chapterNumber"
                    value={formData.chapterNumber}
                    readOnly
                    tabIndex="-1"
                    className="read-only-chapter-input"
                    placeholder="1 થી 18"
                    title="Category પસંદ કરવાથી અધ્યાય નંબર આપોઆપ આવી જશે (બદલી શકાતો નથી)"
                    required
                  />
                </div>

                <div className="quiz-form-group" style={{ marginBottom: 0 }}>
                  <label>
                    શ્લોક નંબર (Shloka Number) <span style={{ color: "#ef4444" }}>*</span>
                  </label>

                  <input
                    type="number"
                    name="shlokaNumber"
                    value={formData.shlokaNumber || ""}
                    onChange={handleChange}
                    min="1"
                    placeholder="દા.ત. 1, 5, 12..."
                    required
                  />
                </div>
              </>
            )}
          </div>


          {/* =================================================
              AUTO TRANSLATE SUCCESS BANNER
          ================================================= */}
          {autoTranslateSuccess && (
            <div className="auto-translate-success-banner">
              <CheckCircle2 size={18} />
              <span>{autoTranslateSuccess}</span>
            </div>
          )}

          {/* =================================================
              CONTENT SECTIONS (QUESTION / OPTIONS / EXPLANATION WITH SEPARATE TABS)
          ================================================= */}
          {activeLangTab === "gu" && (
            <>
              {/* GUJARATI QUESTION */}
              <div className="quiz-form-group" id="section-quiz-question">
                <div className="form-group-header-with-btn">
                  <label style={{ margin: 0 }}>
                    <HelpCircle className="btn-icon" size={16} /> Question (ગુજરાતી પ્રશ્ન) <span style={{ color: "#e11d48" }}>*</span>
                  </label>
                  <div className="section-header-actions">
                    {renderLangTabs("quiz-question")}
                  </div>
                </div>
                <textarea
                  name="question"
                  value={formData.question}
                  onChange={handleChange}
                  placeholder="Quiz question લખો..."
                  rows="4"
                  required
                />
              </div>

              {/* GUJARATI OPTIONS & CORRECT ANSWER */}
              <div className="quiz-options-section-box" id="section-quiz-options">
                <div className="form-group-header-with-btn" style={{ marginBottom: "14px" }}>
                  <label style={{ margin: 0 }}>
                    <List className="btn-icon" size={16} /> Options & Correct Answer (ગુજરાતી વિકલ્પો અને સાચો જવાબ) <span style={{ color: "#e11d48" }}>*</span>
                  </label>
                  <div className="section-header-actions">
                    {renderLangTabs("quiz-options")}
                  </div>
                </div>

                <div className="quiz-options-grid-container">
                  {/* OPTION 1 */}
                  <div className="quiz-form-group">
                    <label>Option 1 (ગુજરાતી) <span style={{ color: "#e11d48" }}>*</span></label>
                    <input
                      type="text"
                      name="option1"
                      value={formData.option1}
                      onChange={handleChange}
                      placeholder="Option 1"
                      required
                    />
                  </div>

                  {/* OPTION 2 */}
                  <div className="quiz-form-group">
                    <label>Option 2 (ગુજરાતી) <span style={{ color: "#e11d48" }}>*</span></label>
                    <input
                      type="text"
                      name="option2"
                      value={formData.option2}
                      onChange={handleChange}
                      placeholder="Option 2"
                      required
                    />
                  </div>

                  {/* OPTION 3 */}
                  <div className="quiz-form-group">
                    <label>Option 3 (ગુજરાતી) <span style={{ color: "#e11d48" }}>*</span></label>
                    <input
                      type="text"
                      name="option3"
                      value={formData.option3}
                      onChange={handleChange}
                      placeholder="Option 3"
                      required
                    />
                  </div>

                  {/* OPTION 4 */}
                  <div className="quiz-form-group">
                    <label>Option 4 (ગુજરાતી) <span style={{ color: "#e11d48" }}>*</span></label>
                    <input
                      type="text"
                      name="option4"
                      value={formData.option4}
                      onChange={handleChange}
                      placeholder="Option 4"
                      required
                    />
                  </div>
                </div>

                {/* CORRECT ANSWER */}
                <div className="quiz-form-group" style={{ marginBottom: 0 }}>
                  <label>Correct Answer (સાચો જવાબ) <span style={{ color: "#e11d48" }}>*</span></label>
                  <select
                    name="correctAnswer"
                    value={formData.correctAnswer}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Correct Answer પસંદ કરો --</option>
                    {[
                      formData.option1,
                      formData.option2,
                      formData.option3,
                      formData.option4,
                    ]
                      .filter((option) => option && option.trim())
                      .map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* GUJARATI EXPLANATION */}
              <div className="quiz-form-group" id="section-quiz-explanation">
                <div className="form-group-header-with-btn">
                  <label style={{ margin: 0 }}>
                    <BookOpen className="btn-icon" size={16} /> Explanation (સમજણ / વ્યાખ્યા) <span>(Optional)</span>
                  </label>
                  <div className="section-header-actions">
                    {renderLangTabs("quiz-explanation")}
                  </div>
                </div>
                <textarea
                  name="explanation"
                  value={formData.explanation}
                  onChange={handleChange}
                  placeholder="Answer નું explanation લખો..."
                  rows="3"
                />
              </div>
            </>
          )}

          {activeLangTab === "hi" && (
            <>
              {/* HINDI QUESTION */}
              <div className="quiz-form-group" id="section-quiz-question">
                <div className="form-group-header-with-btn">
                  <label style={{ margin: 0 }}>
                    <HelpCircle className="btn-icon" size={16} /> Question (हिन्दी प्रश्न)
                  </label>
                  <div className="section-header-actions">
                    {renderLangTabs("quiz-question")}
                    <button
                      type="button"
                      className="field-ai-translate-btn hi-btn"
                      onClick={() => handleTranslateField("hi", "question")}
                      disabled={translatingField !== null}
                      title="માત્ર પ્રશ્નને AI દ્વારા હિન્દીમાં અનુવાદ કરો"
                    >
                      <Sparkles className={`btn-icon ${translatingField === "hi-question" ? "spinning" : ""}`} size={14} />
                      {translatingField === "hi-question" ? "અનુવાદ થઈ રહ્યો છે..." : "✨ પ્રશ્ન AI અનુવાદ"}
                    </button>
                  </div>
                </div>
                <textarea
                  name="questionHi"
                  value={formData.questionHi}
                  onChange={handleChange}
                  placeholder="हिन्दी में प्रश्न લખો અથવા ઉપર '✨ પ્રશ્ન AI અનુવાદ' બટન દબાવો..."
                  rows="4"
                />
              </div>

              {/* HINDI OPTIONS & CORRECT ANSWER */}
              <div className="quiz-options-section-box" id="section-quiz-options">
                <div className="form-group-header-with-btn" style={{ marginBottom: "14px" }}>
                  <label style={{ margin: 0 }}>
                    <List className="btn-icon" size={16} /> Options & Correct Answer (हिन्दी विकल्प और सही उत्तर)
                  </label>
                  <div className="section-header-actions">
                    {renderLangTabs("quiz-options")}
                    <button
                      type="button"
                      className="field-ai-translate-btn hi-btn"
                      onClick={() => handleTranslateField("hi", "options")}
                      disabled={translatingField !== null}
                      title="માત્ર વિકલ્પો અને સાચા જવાબને AI દ્વારા હિન્દીમાં અનુવાદ કરો"
                    >
                      <Sparkles className={`btn-icon ${translatingField === "hi-options" ? "spinning" : ""}`} size={14} />
                      {translatingField === "hi-options" ? "અનુવાદ થઈ રહ્યો છે..." : "✨ વિકલ્પો AI અનુવાદ"}
                    </button>
                  </div>
                </div>

                <div className="quiz-options-grid-container">
                  <div className="quiz-form-group">
                    <label>Option 1 (हिन्दी)</label>
                    <input
                      type="text"
                      name="option1Hi"
                      value={formData.option1Hi}
                      onChange={handleChange}
                      placeholder="हिन्दी Option 1"
                    />
                  </div>

                  <div className="quiz-form-group">
                    <label>Option 2 (हिन्दी)</label>
                    <input
                      type="text"
                      name="option2Hi"
                      value={formData.option2Hi}
                      onChange={handleChange}
                      placeholder="हिन्दी Option 2"
                    />
                  </div>

                  <div className="quiz-form-group">
                    <label>Option 3 (हिन्दी)</label>
                    <input
                      type="text"
                      name="option3Hi"
                      value={formData.option3Hi}
                      onChange={handleChange}
                      placeholder="हिन्दी Option 3"
                    />
                  </div>

                  <div className="quiz-form-group">
                    <label>Option 4 (हिन्दी)</label>
                    <input
                      type="text"
                      name="option4Hi"
                      value={formData.option4Hi}
                      onChange={handleChange}
                      placeholder="हिन्दी Option 4"
                    />
                  </div>
                </div>

                {/* HINDI CORRECT ANSWER */}
                <div className="quiz-form-group" style={{ marginBottom: 0 }}>
                  <label>Correct Answer (हिन्दी सही उत्तर)</label>
                  <select
                    name="correctAnswerHi"
                    value={formData.correctAnswerHi}
                    onChange={handleChange}
                  >
                    <option value="">-- हिन्दी Correct Answer પસંદ કરો --</option>
                    {[
                      formData.option1Hi,
                      formData.option2Hi,
                      formData.option3Hi,
                      formData.option4Hi,
                    ]
                      .filter((option) => option && option.trim())
                      .map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* HINDI EXPLANATION */}
              <div className="quiz-form-group" id="section-quiz-explanation">
                <div className="form-group-header-with-btn">
                  <label style={{ margin: 0 }}>
                    <BookOpen className="btn-icon" size={16} /> Explanation (हिन्दी व्याख्या) <span>(Optional)</span>
                  </label>
                  <div className="section-header-actions">
                    {renderLangTabs("quiz-explanation")}
                    <button
                      type="button"
                      className="field-ai-translate-btn hi-btn"
                      onClick={() => handleTranslateField("hi", "explanation")}
                      disabled={translatingField !== null}
                      title="માત્ર સમજૂતીને AI દ્વારા હિન્દીમાં અનુવાદ કરો"
                    >
                      <Sparkles className={`btn-icon ${translatingField === "hi-explanation" ? "spinning" : ""}`} size={14} />
                      {translatingField === "hi-explanation" ? "અનુવાદ થઈ રહ્યો છે..." : "✨ સમજૂતી AI અનુવાદ"}
                    </button>
                  </div>
                </div>
                <textarea
                  name="explanationHi"
                  value={formData.explanationHi}
                  onChange={handleChange}
                  placeholder="हिन्दी में व्याख्या લખો અથવા AI ઓટો-અનુવાદ વાપરો..."
                  rows="3"
                />
              </div>
            </>
          )}

          {activeLangTab === "en" && (
            <>
              {/* ENGLISH QUESTION */}
              <div className="quiz-form-group" id="section-quiz-question">
                <div className="form-group-header-with-btn">
                  <label style={{ margin: 0 }}>
                    <HelpCircle className="btn-icon" size={16} /> Question (English Question)
                  </label>
                  <div className="section-header-actions">
                    {renderLangTabs("quiz-question")}
                    <button
                      type="button"
                      className="field-ai-translate-btn en-btn"
                      onClick={() => handleTranslateField("en", "question")}
                      disabled={translatingField !== null}
                      title="Translate only question to English using AI"
                    >
                      <Sparkles className={`btn-icon ${translatingField === "en-question" ? "spinning" : ""}`} size={14} />
                      {translatingField === "en-question" ? "અનુવાદ થઈ રહ્યો છે..." : "✨ પ્રશ્ન AI અનુવાદ"}
                    </button>
                  </div>
                </div>
                <textarea
                  name="questionEn"
                  value={formData.questionEn}
                  onChange={handleChange}
                  placeholder="Type question in English or click '✨ પ્રશ્ન AI અનુવાદ' above..."
                  rows="4"
                />
              </div>

              {/* ENGLISH OPTIONS & CORRECT ANSWER */}
              <div className="quiz-options-section-box" id="section-quiz-options">
                <div className="form-group-header-with-btn" style={{ marginBottom: "14px" }}>
                  <label style={{ margin: 0 }}>
                    <List className="btn-icon" size={16} /> Options & Correct Answer (English Options & Answer)
                  </label>
                  <div className="section-header-actions">
                    {renderLangTabs("quiz-options")}
                    <button
                      type="button"
                      className="field-ai-translate-btn en-btn"
                      onClick={() => handleTranslateField("en", "options")}
                      disabled={translatingField !== null}
                      title="Translate only options and answer to English using AI"
                    >
                      <Sparkles className={`btn-icon ${translatingField === "en-options" ? "spinning" : ""}`} size={14} />
                      {translatingField === "en-options" ? "અનુવાદ થઈ રહ્યો છે..." : "✨ વિકલ્પો AI અનુવાદ"}
                    </button>
                  </div>
                </div>

                <div className="quiz-options-grid-container">
                  <div className="quiz-form-group">
                    <label>Option 1 (English)</label>
                    <input
                      type="text"
                      name="option1En"
                      value={formData.option1En}
                      onChange={handleChange}
                      placeholder="English Option 1"
                    />
                  </div>

                  <div className="quiz-form-group">
                    <label>Option 2 (English)</label>
                    <input
                      type="text"
                      name="option2En"
                      value={formData.option2En}
                      onChange={handleChange}
                      placeholder="English Option 2"
                    />
                  </div>

                  <div className="quiz-form-group">
                    <label>Option 3 (English)</label>
                    <input
                      type="text"
                      name="option3En"
                      value={formData.option3En}
                      onChange={handleChange}
                      placeholder="English Option 3"
                    />
                  </div>

                  <div className="quiz-form-group">
                    <label>Option 4 (English)</label>
                    <input
                      type="text"
                      name="option4En"
                      value={formData.option4En}
                      onChange={handleChange}
                      placeholder="English Option 4"
                    />
                  </div>
                </div>

                {/* ENGLISH CORRECT ANSWER */}
                <div className="quiz-form-group" style={{ marginBottom: 0 }}>
                  <label>Correct Answer (English Correct Answer)</label>
                  <select
                    name="correctAnswerEn"
                    value={formData.correctAnswerEn}
                    onChange={handleChange}
                  >
                    <option value="">-- Select English Correct Answer --</option>
                    {[
                      formData.option1En,
                      formData.option2En,
                      formData.option3En,
                      formData.option4En,
                    ]
                      .filter((option) => option && option.trim())
                      .map((option, index) => (
                        <option key={index} value={option}>
                          {option}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* ENGLISH EXPLANATION */}
              <div className="quiz-form-group" id="section-quiz-explanation">
                <div className="form-group-header-with-btn">
                  <label style={{ margin: 0 }}>
                    <BookOpen className="btn-icon" size={16} /> Explanation (English Explanation) <span>(Optional)</span>
                  </label>
                  <div className="section-header-actions">
                    {renderLangTabs("quiz-explanation")}
                    <button
                      type="button"
                      className="field-ai-translate-btn en-btn"
                      onClick={() => handleTranslateField("en", "explanation")}
                      disabled={translatingField !== null}
                      title="Translate only explanation to English using AI"
                    >
                      <Sparkles className={`btn-icon ${translatingField === "en-explanation" ? "spinning" : ""}`} size={14} />
                      {translatingField === "en-explanation" ? "અનુવાદ થઈ રહ્યો છે..." : "✨ સમજૂતી AI અનુવાદ"}
                    </button>
                  </div>
                </div>
                <textarea
                  name="explanationEn"
                  value={formData.explanationEn}
                  onChange={handleChange}
                  placeholder="Explain why this answer is correct in English..."
                  rows="3"
                />
              </div>
            </>
          )}

          {/* =================================================
              SUBMIT
          ================================================= */}

          <div className="quiz-form-actions">

            <button
              type="submit"
              className="quiz-save-button"
              disabled={saving}
            >
              {saving ? (
                <span>
                  <Loader2 className="btn-icon animate-spin" size={16} />{" "}
                  {txt("સાચવી રહ્યું છે...", "सहेजा जा रहा है...", "Saving...")}
                </span>
              ) : editingId ? (
                <span>
                  <Save className="btn-icon" size={16} /> Update Question
                </span>
              ) : (
                <span>
                  <Plus className="btn-icon" size={16} /> Add Question
                </span>
              )}
            </button>

            {editingId && (
              <button
                type="button"
                className="quiz-cancel-button"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>
            )}

          </div>

        </form>

      </section>
      )}


      {/* =================================================
          QUESTIONS LIST
      ================================================= */}

      <section className="quiz-question-list-section">

        {/* =================================================
            LIST HEADER
        ================================================= */}

        <div className="quiz-list-header">

          <div className="quiz-list-header-left">
            <span className="quiz-heading-icon-wrap">
              <FileQuestion size={22} />
            </span>
            <div>
              <h2>Quiz Questions</h2>
              <div className="quiz-header-badges-row">
                <span className="quiz-total-count-badge">
                  કુલ {filteredQuestions.length} questions
                </span>
                {questionFilter.startsWith("chapter-") && shlokaFilter !== "all" && (
                  <span className="quiz-active-shlok-badge">
                    શ્લોક {shlokaFilter}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="quiz-list-controls">

            {/* FILTERS TOOLBAR */}
            <div className="quiz-filter-bar-group">
              {/* CHAPTER FILTER */}
              <div className="quiz-question-filter">
                <label htmlFor="question-filter">
                  Filter:
                </label>
                <select
                  id="question-filter"
                  value={questionFilter}
                  onChange={handleQuestionFilterChange}
                >
                  <option value="all">
                    બધા Questions
                  </option>

                  {Array.from({ length: 18 }, (_, index) => (
                    <option key={index + 1} value={`chapter-${index + 1}`}>
                      અધ્યાય {index + 1}
                    </option>
                  ))}

                  <option value="mahabharata">
                    સમગ્ર મહાભારત
                  </option>
                </select>
              </div>


            </div>

            {/* ACTION BUTTONS GROUP */}
            <div className="quiz-action-bar-group">
              <button
                type="button"
                className="quiz-refresh-button"
                onClick={loadQuestions}
                disabled={deletingAll}
                title={txt("Refresh Questions", "Refresh Questions", "Refresh Questions")}
              >
                <RefreshCw className="btn-icon" size={15} /> Refresh
              </button>

              {canDeleteQuiz && (
              <button
                type="button"
                className="quiz-delete-all-button"
                onClick={handleDeleteFilteredQuestions}
                disabled={filteredQuestions.length === 0 || deletingAll}
                title={
                  filteredQuestions.length === 0
                    ? txt("Delete કરવા માટે કોઈ પ્રશ્નો નથી", "Delete करने के लिए कोई प्रश्न नहीं हैं", "No questions to delete")
                    : txt(
                        `${getFilterLabel()} ના બધા (${filteredQuestions.length}) પ્રશ્નો Delete કરો`,
                        `${getFilterLabel()} के सभी (${filteredQuestions.length}) प्रश्न Delete करें`,
                        `Delete all (${filteredQuestions.length}) questions of ${getFilterLabel()}`
                      )
                }
              >
                {deletingAll ? (
                  <>
                    <Loader2 className="btn-icon animate-spin" size={15} />
                    <span>{txt("Deleting...", "Deleting...", "Deleting...")}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="btn-icon" size={15} />
                    <span>
                      {txt("Delete All Questions", "Delete All Questions", "Delete All Questions")}
                      {filteredQuestions.length > 0 && ` (${filteredQuestions.length})`}
                    </span>
                  </>
                )}
              </button>
              )}
            </div>

          </div>

        </div>

        {/* =================================================
            SHLOKA BREAKDOWN & CHIP FILTER (FOR CHAPTERS)
        ================================================= */}
        {shlokaStats && shlokaStats.total > 0 && (
          <div style={{
            margin: "0 0 20px 0",
            padding: "12px 18px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "12px",
            fontSize: "13px"
          }}>
            <div style={{
              fontWeight: "700",
              color: "#166534",
              marginBottom: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px"
            }}>
              <span>📖 {getFilterLabel()} - શ્લોક વાઈઝ પ્રશ્નોની ગણતરી (કુલ: {shlokaStats.total})</span>
              {shlokaFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setShlokaFilter("all")}
                  style={{
                    background: "#fee2e2",
                    border: "1px solid #fca5a5",
                    color: "#991b1b",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "11.5px",
                    padding: "3px 8px",
                    fontWeight: "600"
                  }}
                >
                  ✕ ફિલ્ટર હટાવો (બધા શ્લોક દર્શાવો)
                </button>
              )}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {Object.keys(shlokaStats.counts).length === 0 && shlokaStats.unassigned > 0 ? (
                <span style={{ color: "#64748b" }}>
                  હજુ કોઈ પ્રશ્નમાં શ્લોક નંબર ઉમેરેલ નથી (બધા સામાન્ય પ્રશ્નો છે). પ્રશ્ન edit કરીને શ્લોક નંબર ઉમેરી શકો છો.
                </span>
              ) : (
                Object.entries(shlokaStats.counts)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([sNum, count]) => {
                    const isSelected = String(shlokaFilter) === String(sNum);
                    return (
                      <button
                        key={sNum}
                        type="button"
                        onClick={() => setShlokaFilter(isSelected ? "all" : sNum)}
                        style={{
                          cursor: "pointer",
                          padding: "4px 12px",
                          borderRadius: "16px",
                          background: isSelected ? "#15803d" : "#ffffff",
                          color: isSelected ? "#ffffff" : "#166534",
                          fontWeight: "600",
                          fontSize: "12.5px",
                          border: isSelected ? "1px solid #15803d" : "1px solid #86efac",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                          transition: "all 0.15s ease"
                        }}
                        title={`શ્લોક ${sNum} ના પ્રશ્નો જોવા ક્લિક કરો`}
                      >
                        શ્લોક {sNum}: <span style={{ opacity: isSelected ? 1 : 0.85, fontWeight: "700" }}>{count}</span>
                      </button>
                    );
                  })
              )}

              {shlokaStats.unassigned > 0 && Object.keys(shlokaStats.counts).length > 0 && (
                <button
                  type="button"
                  onClick={() => setShlokaFilter(shlokaFilter === "none" ? "all" : "none")}
                  style={{
                    cursor: "pointer",
                    padding: "4px 12px",
                    borderRadius: "16px",
                    background: shlokaFilter === "none" ? "#475569" : "#f1f5f9",
                    color: shlokaFilter === "none" ? "#ffffff" : "#475569",
                    fontWeight: "600",
                    fontSize: "12px",
                    border: "1px solid #cbd5e1",
                    transition: "all 0.15s ease"
                  }}
                  title="સામાન્ય પ્રશ્નો (જેમાં કોઈ શ્લોક નંબર નથી)"
                >
                  અન્ય/સામાન્ય: {shlokaStats.unassigned}
                </button>
              )}
            </div>
          </div>
        )}


        {/* =================================================
            NO QUESTIONS AFTER FILTER
        ================================================= */}

        {questions.length === 0 ? (

          <div className="quiz-no-questions">

            <div className="quiz-no-questions-icon">
              <BookOpen size={42} strokeWidth={1.5} color="#3b82f6" />
            </div>

            <h3>
              હજુ કોઈ quiz question નથી.
            </h3>

            <p>
              ઉપરથી પ્રથમ question add કરો.
            </p>

          </div>

        ) : filteredQuestions.length === 0 ? (

          <div className="quiz-no-questions">

            <div className="quiz-no-questions-icon">
              <Search size={42} strokeWidth={1.5} color="#3b82f6" />
            </div>

            <h3>
              આ filter માટે કોઈ question નથી.
            </h3>

            <p>
              બીજો chapter પસંદ કરો અથવા
              "બધા Questions" પસંદ કરો.
            </p>

          </div>

        ) : (

          /* =================================================
              QUESTION GRID
          ================================================= */

          <div className="quiz-question-scroll-wrapper">
            <div className="quiz-question-grid">

            {filteredQuestions.map(
              (item, index) => {

                const isExpanded =
                  expandedQuestionId ===
                  item._id;

                const shlokaQNum =
                  shlokaQuestionNumberMap.get(String(item._id)) || (index + 1);

                return (
                  <article
                    className={
                      isExpanded
                        ? "quiz-question-card expanded"
                        : "quiz-question-card collapsed"
                    }
                    key={item._id}
                  >

                    {/* =================================================
                        QUESTION
                    ================================================= */}

                    <h3
                      className="quiz-question-clickable"
                      onClick={() =>
                        toggleQuestion(
                          item._id
                        )
                      }
                    >
                      <span className="quiz-question-title-text">
                        <HelpCircle className="btn-icon question-help-icon" size={18} />
                        <span className="quiz-shloka-q-badge" title={`શ્લોક સંબંધિત પ્રશ્ન ક્રમ: ${shlokaQNum}`}>
                          {item.shlokaNumber ? `શ્લોક ${item.shlokaNumber} • Q#${shlokaQNum}` : `Q#${shlokaQNum}`}
                        </span>
                        <span className="quiz-question-text-actual">{item.question}</span>
                      </span>
                      <span className="quiz-card-header-right-tools">
                        {canShareQuiz && (
                          <button
                            type="button"
                            className="quiz-quick-share-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenShareQuestion(item);
                            }}
                            title={`Share Question Card (પ્રશ્ન #${shlokaQNum})`}
                            aria-label="Share Question Card"
                          >
                            <Share2 size={14} />
                          </button>
                        )}
                        <span className="quiz-card-expand-indicator">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </span>
                      </span>
                    </h3>


                    {/* =================================================
                        FULL QUESTION CONTENT
                    ================================================= */}

                    {isExpanded && (
                      <>

                        {/* =================================================
                            TOP
                        ================================================= */}

                        <div className="quiz-question-card-top">

                          <span className="quiz-question-number" title="શ્લોક સંબંધિત પ્રશ્ન ક્રમ (Share Question Number)">
                            {item.shlokaNumber ? `શ્લોક ${item.shlokaNumber} • પ્રશ્ન #${shlokaQNum}` : `પ્રશ્ન #${shlokaQNum}`}
                          </span>

                          <span className="quiz-question-category">
                            {getCategoryName(
                              item.category,
                              item.chapterNumber
                            )}
                          </span>

                          {item.questionHi ? (
                            <span style={{
                              marginLeft: "8px",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              background: "#e0e7ff",
                              color: "#4338ca",
                              fontSize: "11.5px",
                              fontWeight: "700",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}>
                              हिन्दी ઉપલબ્ધ
                            </span>
                          ) : (
                            <span style={{
                              marginLeft: "8px",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              background: "#fef3c7",
                              color: "#92400e",
                              fontSize: "11px",
                              fontWeight: "600"
                            }}>
                              માત્ર ગુજરાતી
                            </span>
                          )}

                        </div>

                        {item.questionHi && (
                          <div style={{
                            margin: "10px 0 14px",
                            padding: "10px 14px",
                            background: "#f5f7ff",
                            borderRadius: "10px",
                            borderLeft: "3.5px solid #6366f1"
                          }}>
                            <div style={{ fontSize: "12px", color: "#4f46e5", fontWeight: "750", marginBottom: "3px" }}>
                              हिन्दी प्रश्न (Auto-Translated / Hindi):
                            </div>
                            <div style={{ fontSize: "14px", color: "#1e293b", fontWeight: "600" }}>
                              {item.questionHi}
                            </div>
                            {item.explanationHi && (
                              <div style={{ marginTop: "5px", fontSize: "12.5px", color: "#475569" }}>
                                <b>हिन्दी व्याख्या:</b> {item.explanationHi}
                              </div>
                            )}
                          </div>
                        )}


                        {/* =================================================
                            CHAPTER NUMBER
                        ================================================= */}

                        {item.chapterNumber && (
                          <div className="quiz-question-chapter">

                            <BookOpen className="btn-icon" size={14} /> Chapter{" "}
                            {item.chapterNumber}
                            {item.shlokaNumber && (
                              <span style={{ marginLeft: "8px", background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: "6px", fontWeight: "600", fontSize: "11.5px" }}>
                                શ્લોક: {item.shlokaNumber}
                              </span>
                            )}

                          </div>
                        )}


                        {/* =================================================
                            OPTIONS
                        ================================================= */}

                        <div className="quiz-options-list">

                          {item.options?.map(
                            (
                              option,
                              optionIndex
                            ) => {

                              const isCorrect =
                                option.trim() ===
                                item.correctAnswer?.trim();

                              return (
                                <div
                                  className={
                                    isCorrect
                                      ? "quiz-option correct"
                                      : "quiz-option"
                                  }
                                  key={
                                    optionIndex
                                  }
                                >

                                  <span>
                                    {String.fromCharCode(
                                      65 +
                                        optionIndex
                                    )}
                                    .
                                  </span>

                                  <span>
                                    {option}
                                  </span>

                                  {isCorrect && (
                                    <strong>
                                      <Check size={14} className="btn-icon" /> Correct
                                    </strong>
                                  )}

                                </div>
                              );

                            }
                          )}

                        </div>


                        {/* =================================================
                            EXPLANATION
                        ================================================= */}

                        {item.explanation && (
                          <div className="quiz-question-explanation">

                            <strong>
                              <Lightbulb className="btn-icon" size={14} /> Explanation:
                            </strong>

                            <p>
                              {item.explanation}
                            </p>

                          </div>
                        )}


                        {/* =================================================
                            ACTIONS
                        ================================================= */}

                        <div className="quiz-question-actions">

                          {canShareQuiz && (
                            <button
                              type="button"
                              className="quiz-share-card-button"
                              onClick={() => handleOpenShareQuestion(item)}
                              title="આ પ્રશ્નનું સોશિયલ મીડિયા Share Card બનાવો"
                            >
                              <Share2 className="btn-icon" size={15} /> Share Card
                            </button>
                          )}

                          {canEditQuiz && (
                            <button
                              type="button"
                              className="quiz-edit-button"
                              onClick={() =>
                                handleEdit(
                                  item
                                )
                              }
                            >
                              <Edit3 className="btn-icon" size={15} /> Edit
                            </button>
                          )}

                          {canDeleteQuiz && (
                          <button
                            type="button"
                            className="quiz-delete-button"
                            onClick={() =>
                              handleDelete(
                                item._id
                              )
                            }
                          >
                            <Trash2 className="btn-icon" size={16} /> Delete
                          </button>
                          )}

                        </div>

                      </>
                    )}

                  </article>
                );
              }
            )}

            </div>
          </div>

        )}

      </section>

      {/* =================================================
          SHARE QUIZ QUESTION MODAL (ADMIN ONLY)
      ================================================= */}
      {selectedQuestionForShare && (
        <ShareQuizQuestionModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          questionData={selectedQuestionForShare}
        />
      )}

    </main>
  );
}

export default QuizManagement;