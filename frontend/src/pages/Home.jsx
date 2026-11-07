import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { 
  BookOpen, 
  Search, 
  AlertCircle, 
  Loader2, 
  Sparkles,
  Share2,
  Trophy,
  Flame,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import "./Home.css";
import ShareShlokaModal from "../components/ShareShlokaModal.jsx";
import { getLocalProgress, getCombinedReadingProgress, getNextSequentialUnread } from "../utils/readingTracker.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { getValidToken } from "../utils/authHelper.js";

const stripHtml = (html) => {
  if (!html) return "";
  try {
    if (typeof document !== "undefined") {
      const temp = document.createElement("div");
      temp.innerHTML = String(html)
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
        .replace(/<(p|div|li|h[1-6])[^>]*>/gi, " ");
      const text = temp.textContent || temp.innerText || "";
      return text.replace(/\s+/g, " ").trim();
    }
  } catch (e) {
    // fallback
  }
  return String(html)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(?:p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
};

function Home() {
  const navigate = useNavigate();

  // =====================================================
  // LANGUAGE CONTEXT
  // =====================================================

  const { isHindi, isEnglish, t, txt, getLocalizedShlok, getChapterName } = useLanguage();

  // =====================================================
  // AUTH CONTEXT
  // =====================================================

  const { user } = useAuth();

  // =====================================================
  // STATE
  // =====================================================

  const [allShlokas, setAllShlokas] = useState([]);

  const [chapterNumber, setChapterNumber] = useState("");
  const [shlokaNumber, setShlokaNumber] = useState("");
  const [searchText, setSearchText] = useState("");

  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(false);

  // =====================================================
  // CONTINUE READING STATE
  // =====================================================

  const [continueReading, setContinueReading] =
    useState(null);

  const [continueReadingLoading, setContinueReadingLoading] =
    useState(false);

  // =====================================================
  // READING TRACKER STATS (STREAK & BADGES)
  // =====================================================

  const [readingStats, setReadingStats] = useState({
    readCount: 0,
    currentStreak: 0,
    badgesCount: 0,
  });

  useEffect(() => {
    let isCancelled = false;

    const loadReadingStats = async () => {
      // If user is not logged in, reset stats immediately (no streak chip, 0 count)
      if (!user) {
        if (!isCancelled) {
          setReadingStats({
            readCount: 0,
            currentStreak: 0,
            badgesCount: 0,
          });
        }
        return;
      }

      try {
        const token = getValidToken();
        const data = await getCombinedReadingProgress(token);
        if (!isCancelled && data) {
          setReadingStats({
            readCount: data.readCount || (data.readShlokas || []).length,
            currentStreak: data.currentStreak || 0,
            badgesCount: (data.unlockedBadges || []).length,
          });
        }
      } catch (e) {
        if (!isCancelled) {
          try {
            const p = getLocalProgress();
            setReadingStats({
              readCount: (p.readShlokas || []).length,
              currentStreak: p.currentStreak || 0,
              badgesCount: (p.unlockedBadges || []).length,
            });
          } catch (err) {}
        }
      }
    };

    loadReadingStats();
    return () => {
      isCancelled = true;
    };
  }, [user]);

  // =====================================================
  // TODAY'S SHLOK STATE
  // =====================================================

  const [todayShlok, setTodayShlok] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // =====================================================
// TODAY'S SANSKRIT AUTO FIT
// =====================================================

const todaySanskritRef = useRef(null);

useEffect(() => {
  const element =
    todaySanskritRef.current;

  if (!element || !todayShlok?.sanskrit) {
    return;
  }

  const fitSanskrit = () => {
    const maxFontSize = 22;
    const minFontSize = 10;

    let fontSize = maxFontSize;

    element.style.fontSize =
      `${fontSize}px`;

    while (
      element.scrollHeight >
        fontSize * 1.45 * 2 &&
      fontSize > minFontSize
    ) {
      fontSize -= 0.5;

      element.style.fontSize =
        `${fontSize}px`;
    }
  };

  const timer =
    setTimeout(() => {
      fitSanskrit();
    }, 50);

  window.addEventListener(
    "resize",
    fitSanskrit
  );

  return () => {
    clearTimeout(timer);

    window.removeEventListener(
      "resize",
      fitSanskrit
    );
  };
}, [todayShlok]);

  // =====================================================
  // API URL
  // =====================================================

  const API_URL =
    "https://bhagavad-gita-backend-jy1a.onrender.com/api/shloks";

  const CONTINUE_READING_API_URL =
    "https://bhagavad-gita-backend-jy1a.onrender.com/api/continue-reading";

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
    14: "गुणत्रय विभाग योग",
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
    6: "Atma Samyama Yoga",
    7: "Jnana Vijnana Yoga",
    8: "Akshara Brahma Yoga",
    9: "Raja Vidya Raja Guhya Yoga",
    10: "Vibhuti Yoga",
    11: "Vishwarupa Darshana Yoga",
    12: "Bhakti Yoga",
    13: "Kshetra Kshetrajna Vibhaga Yoga",
    14: "Gunatraya Vibhaga Yoga",
    15: "Purushottama Yoga",
    16: "Daivasura Sampad Vibhaga Yoga",
    17: "Shraddhatraya Vibhaga Yoga",
    18: "Moksha Sanyasa Yoga",
  };

  const getCurrentChapterName = (num) => {
    if (!num) return "";
    return txt(
      chapterNames[num] || `અધ્યાય ${num}`,
      chapterNamesHi[num] || `अध्याय ${num}`,
      chapterNamesEn[num] || `Chapter ${num}`
    );
  };

  // =====================================================
  // LOAD TODAY'S SHLOK (PUBLIC FOR EVERYONE)
  // =====================================================

  useEffect(() => {
    const fetchTodayShlok = async () => {
      try {
        const response = await fetch(`${API_URL}/today`);
        const data = await response.json();
        if (data.success && data.shlok) {
          setTodayShlok(data.shlok);
        }
      } catch (err) {
        console.error("❌ Home Today's Shlok Error:", err);
      }
    };

    fetchTodayShlok();
  }, []);

  // =====================================================
  // LOAD ALL SHLOKAS
  // =====================================================

  useEffect(() => {
    const fetchAllShlokas = async () => {
      try {
        setLoading(true);
        setMessage("");

        const token = getValidToken();
        const response = await fetch(API_URL, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              txt("Shlok data load થઈ શક્યો નથી.", "श्लोक डेटा लोड नहीं हो सका।", "Could not load shlok data.")
          );
        }

        const fetchedShlokas =
          data.shlokas || [];

        setAllShlokas(fetchedShlokas);

        // =================================================
        // SET TODAY'S SHLOK (FALLBACK)
        // =================================================

        if (fetchedShlokas.length > 0) {
          setTodayShlok((prev) => {
            if (prev?.sanskrit) return prev;
            const today = new Date();
            const startOfYear = new Date(today.getFullYear(), 0, 1);
            const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const difference = currentDate.getTime() - startOfYear.getTime();
            const dayOfYear = Math.floor(difference / (1000 * 60 * 60 * 24));
            const todayIndex = dayOfYear % fetchedShlokas.length;
            const candidate = fetchedShlokas[todayIndex];
            return candidate?.sanskrit ? candidate : prev;
          });
        }
      } catch (error) {
        console.error(
          "❌ Home Shlok Search Error:",
          error
        );

        setMessage(
          txt("Server સાથે connection થઈ શક્યું નથી.", "सर्वर के साथ कनेक्शन नहीं हो सका।", "Could not connect to the server.")
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAllShlokas();
  }, [user]);

  // =====================================================
  // LOAD CONTINUE READING
  // Driven strictly by sequential unread shlokas from Reading Tracker
  // (starts at Chapter 1 Shloka 1, advances sequentially, never skips)
  // =====================================================

  useEffect(() => {
    let isCancelled = false;

    const loadContinueReading = async () => {
      // 1. If not logged in, reset continue reading
      if (!user) {
        if (!isCancelled) {
          setContinueReading(null);
          setContinueReadingLoading(false);
        }
        return;
      }

      // 2. User is logged in: compute from local progress immediately (zero lag)
      try {
        const local = getLocalProgress();
        const nextLocal = getNextSequentialUnread(local?.readShlokas || []);
        if (!isCancelled) {
          setContinueReading(nextLocal);
        }
      } catch (e) {}

      // 3. Sync authoritative reading progress from backend
      const token = getValidToken();
      if (!token) {
        if (!isCancelled) setContinueReadingLoading(false);
        return;
      }

      try {
        if (!isCancelled) setContinueReadingLoading(true);
        const data = await getCombinedReadingProgress(token);
        if (!isCancelled && data && data.readShlokas) {
          const nextSequential = getNextSequentialUnread(data.readShlokas);
          setContinueReading(nextSequential);
        }
      } catch (error) {
        console.error("❌ Continue Reading Load Error:", error);
      } finally {
        if (!isCancelled) setContinueReadingLoading(false);
      }
    };

    loadContinueReading();
    window.addEventListener("focus", loadContinueReading);
    return () => {
      isCancelled = true;
      window.removeEventListener("focus", loadContinueReading);
    };
  }, [user]);

  // =====================================================
  // CONTINUE READING CLICK
  // =====================================================

  const handleContinueReading = () => {
    const ch = continueReading?.chapterNumber || 1;
    const shl = continueReading?.shlokNumber || 1;

    if (!user) {
      const target = `/chapter/${ch}?shloka=${shl}`;

      const loginMsg = txt(
        "વાંચન ચાલુ રાખવા માટે Login કરવું જરૂરી છે.",
        "पठन जारी रखने के लिए Login आवश्यक है।",
        "Login is required to continue reading."
      );

      sessionStorage.setItem(
        "authRedirect",
        JSON.stringify({
          from: target,
          message: loginMsg,
        })
      );

      navigate("/login", {
        state: {
          from: target,
          message: loginMsg,
        },
      });
      return;
    }

    // Go directly to the exact sequential unread chapter and shloka
    navigate(`/chapter/${ch}?shloka=${shl}`);
  };

  // =====================================================
  // START READING (Starts from Chapter 1 Shloka 1)
  // =====================================================

  const handleStartReading = () => {
    navigate("/chapter/1?shloka=1");
  };

  // =====================================================
  // QUIZ BUTTON
  // =====================================================

  const handleQuiz = () => {
    // Login ન હોય તો Login page પર message અને target path સાથે મોકલો
    if (!user) {
      const loginMsg = txt(
        "Quiz રમવા માટે Login કરવું જરૂરી છે.",
        "क्विज़ खेलने के लिए Login आवश्यक है।",
        "Login is required to play Quiz."
      );

      sessionStorage.setItem(
        "authRedirect",
        JSON.stringify({
          from: "/quiz-category",
          message: loginMsg,
        })
      );

      navigate("/login", {
        state: {
          from: "/quiz-category",
          message: loginMsg,
        },
      });
      return;
    }

    // Login હોય તો Quiz Category / Chapter Selection page
    navigate("/quiz-category");
  };

  // =====================================================
  // READING TRACKER BUTTON (LOGIN REQUIRED FOR LOGGED-OUT USERS)
  // =====================================================

  const handleReadingTracker = () => {
    if (!user) {
      const loginMsg = txt(
        "વાંચન પ્રગતિ જોવા માટે Login કરવું જરૂરી છે.",
        "पठन प्रगति देखने के लिए Login आवश्यक है।",
        "Login is required to view reading progress."
      );

      sessionStorage.setItem(
        "authRedirect",
        JSON.stringify({
          from: "/reading-tracker",
          message: loginMsg,
        })
      );

      navigate("/login", {
        state: {
          from: "/reading-tracker",
          message: loginMsg,
        },
      });
      return;
    }

    navigate("/reading-tracker");
  };

  // =====================================================
  // OPEN TODAY'S SHLOK
  // =====================================================

  const handleTodayShlok = () => {
    if (
      !todayShlok ||
      !todayShlok.chapterNumber ||
      !todayShlok.shlokNumber
    ) {
      return;
    }

    const shlokNum = Number(todayShlok.shlokNumber);

    // આજનો શ્લોક બધા માટે મુક્ત છે - Login વગર પણ સંપૂર્ણ વાંચી શકાય
    navigate(
      `/chapter/${todayShlok.chapterNumber}?shloka=${todayShlok.shlokNumber}&today=true`
    );
  };

  // =====================================================
  // SHARE TODAY'S SHLOK (બધા માટે ઉપલબ્ધ)
  // =====================================================

  const handleShareTodayShlok = () => {
    if (!todayShlok) return;
    setShareModalOpen(true);
  };

  // =====================================================
  // GET CHAPTER MAX SHLOKA
  // =====================================================

  const getChapterMaxShloka = (chapter) => {
    if (!chapter) {
      return 0;
    }

    const chapterShlokas =
      allShlokas.filter(
        (shlok) =>
          Number(shlok.chapterNumber) ===
          Number(chapter)
      );

    if (chapterShlokas.length === 0) {
      return 0;
    }

    return Math.max(
      ...chapterShlokas.map(
        (shlok) =>
          Number(shlok.shlokNumber) || 0
      )
    );
  };

  // =====================================================
  // MAX SHLOKA OF ALL CHAPTERS
  // =====================================================

  const getOverallMaxShloka = () => {
    return 78;
  };

  // =====================================================
  // CURRENT SHLOKA MAX
  // =====================================================

  const currentShlokaMax = chapterNumber
    ? getChapterMaxShloka(
        chapterNumber
      )
    : getOverallMaxShloka();

  // =====================================================
  // CHAPTER NUMBER CHANGE
  // =====================================================

  const handleChapterChange = (event) => {
    let value =
      event.target.value;

    if (value === "") {
      setChapterNumber("");
      setShlokaNumber("");
      setMessage("");
      setResult(null);
      return;
    }

    value = value.replace(/\D/g, "");

    if (!value) {
      setChapterNumber("");
      setShlokaNumber("");
      return;
    }

    const number = Number(value);

    if (
      number < 1 ||
      number > 18
    ) {
      return;
    }

    setChapterNumber(
      String(number)
    );

    setMessage("");
    setResult(null);

    const maxShloka =
      getChapterMaxShloka(number);

    if (maxShloka === 0) {
      setShlokaNumber("0");
      return;
    }

    if (shlokaNumber) {
      const currentShloka =
        Number(shlokaNumber);

      if (
        currentShloka >
        maxShloka
      ) {
        setShlokaNumber(
          String(maxShloka)
        );
      }

      if (
        currentShloka === 0
      ) {
        setShlokaNumber("");
      }
    }
  };

  // =====================================================
  // SHLOKA NUMBER CHANGE
  // =====================================================

  const handleShlokaChange = (event) => {
    let value =
      event.target.value;

    if (value === "") {
      setShlokaNumber("");
      setMessage("");
      setResult(null);
      return;
    }

    value = value.replace(/\D/g, "");

    if (!value) {
      return;
    }

    let number =
      Number(value);

    const maxShloka =
      chapterNumber
        ? getChapterMaxShloka(
            chapterNumber
          )
        : getOverallMaxShloka();

    if (
      chapterNumber &&
      maxShloka === 0
    ) {
      setShlokaNumber("0");
      setMessage("");
      setResult(null);
      return;
    }

    if (number < 1) {
      number = 1;
    }

    if (
      maxShloka > 0 &&
      number > maxShloka
    ) {
      number = maxShloka;
    }

    setShlokaNumber(
      String(number)
    );

    setMessage("");
    setResult(null);
  };

  // =====================================================
  // STEPPERS FOR CHAPTER & SHLOKA (UP / DOWN)
  // =====================================================

  const stepChapter = (dir) => {
    let current = chapterNumber ? Number(chapterNumber) : 0;
    let next;
    if (dir === "up") {
      next = current ? Math.min(18, current + 1) : 1;
    } else {
      next = current ? Math.max(1, current - 1) : 1;
    }

    setChapterNumber(String(next));
    setMessage("");
    setResult(null);

    const maxShloka = getChapterMaxShloka(next);

    if (maxShloka === 0) {
      setShlokaNumber("0");
      return;
    }

    if (shlokaNumber) {
      const curSh = Number(shlokaNumber);
      if (curSh > maxShloka) {
        setShlokaNumber(String(maxShloka));
      } else if (curSh === 0) {
        setShlokaNumber("");
      }
    }
  };

  const stepShloka = (dir) => {
    const maxShloka = chapterNumber
      ? getChapterMaxShloka(chapterNumber)
      : getOverallMaxShloka();

    if (chapterNumber && maxShloka === 0) {
      setShlokaNumber("0");
      return;
    }

    let current = shlokaNumber ? Number(shlokaNumber) : 0;
    let next;
    if (dir === "up") {
      next = current ? Math.min(maxShloka, current + 1) : 1;
    } else {
      next = current ? Math.max(1, current - 1) : 1;
    }

    setShlokaNumber(String(next));
    setMessage("");
    setResult(null);
  };

  // =====================================================
  // TEXT CHANGE
  // =====================================================

  const handleTextChange = (event) => {
    setSearchText(
      event.target.value
    );

    setMessage("");
    setResult(null);
  };

  // =====================================================
  // SEARCH
  // =====================================================

  const handleSearch = () => {
    const chapterValue =
      chapterNumber.trim();

    const shlokaValue =
      shlokaNumber.trim();

    const textValue =
      searchText
        .trim()
        .toLowerCase();

    setMessage("");
    setResult(null);

    if (loading && allShlokas.length === 0) {
      setMessage(
        txt(
          "શ્લોક લોડ થઈ રહ્યા છે, કૃપા કરીને થોડી ક્ષણ રાહ જુઓ...",
          "श्लोक लोड हो रहे हैं, कृपया कुछ क्षण प्रतीक्षा करें...",
          "Shlokas are loading, please wait a moment..."
        )
      );
      return;
    }

    if (
      !chapterValue &&
      !shlokaValue &&
      !textValue
    ) {
      setMessage(
        txt(
          "કૃપા કરીને શોધવા માટે કંઈક લખો.",
          "कृपया खोजने के लिए कुछ लिखें।",
          "Please enter something to search."
        )
      );
      return;
    }

    if (
      chapterValue &&
      !shlokaValue &&
      !textValue
    ) {
      setMessage(
        txt(
          "માત્ર અધ્યાય નંબરથી શોધી શકાશે નહીં. શ્લોક નંબર અથવા શબ્દ પણ લખો.",
          "केवल अध्याय संख्या से नहीं खोजा जा सकता। श्लोक संख्या या शब्द भी लिखें।",
          "Cannot search only by chapter number. Please provide a shloka number or keyword."
        )
      );
      return;
    }

    if (
      chapterValue &&
      (
        Number(chapterValue) < 1 ||
        Number(chapterValue) > 18
      )
    ) {
      setMessage(
        txt(
          "અધ્યાય નંબર 1 થી 18 સુધી જ હોઈ શકે છે.",
          "अध्याय संख्या केवल 1 से 18 तक हो सकती है।",
          "Chapter number must be between 1 and 18."
        )
      );
      return;
    }

    const maxShloka =
      chapterValue
        ? getChapterMaxShloka(
            chapterValue
          )
        : getOverallMaxShloka();

    if (shlokaValue) {
      const shlokaNum =
        Number(shlokaValue);

      if (shlokaNum === 0) {
        setMessage(
          txt(
            "આ અધ્યાયમાં હાલમાં કોઈ શ્લોક ઉપલબ્ધ નથી.",
            "इस अध्याय में वर्तमान में कोई श्लोक उपलब्ध नहीं है।",
            "No shlokas currently available in this chapter."
          )
        );
        return;
      }

      if (shlokaNum < 1) {
        setMessage(
          txt(
            "શ્લોક નંબર 1 અથવા તેનાથી મોટો હોવો જોઈએ.",
            "श्लोक संख्या 1 या उससे अधिक होनी चाहिए।",
            "Shloka number must be 1 or greater."
          )
        );
        return;
      }

      if (maxShloka === 0) {
        setMessage(
          txt(
            "આ અધ્યાયમાં હાલમાં કોઈ શ્લોક ઉપલબ્ધ નથી.",
            "इस अध्याय में वर्तमान में कोई श्लोक उपलब्ध नहीं है।",
            "No shlokas currently available in this chapter."
          )
        );
        return;
      }

      if (
        shlokaNum > maxShloka
      ) {
        setMessage(
          txt(
            `${chapterValue ? "આ અધ્યાયમાં" : "ગીતા માં"} મહત્તમ શ્લોક નંબર ${maxShloka} સુધી જ છે.`,
            `${chapterValue ? "इस अध्याय में" : "गीता में"} अधिकतम श्लोक संख्या ${maxShloka} तक ही है।`,
            `Maximum shloka number in ${chapterValue ? "this chapter" : "the Gita"} is ${maxShloka}.`
          )
        );
        return;
      }
    }

    const matches =
      allShlokas.filter(
        (shlok) => {
          const matchesChapter =
            !chapterValue ||
            Number(
              shlok.chapterNumber
            ) ===
              Number(
                chapterValue
              );

          const matchesShloka =
            !shlokaValue ||
            Number(
              shlok.shlokNumber
            ) ===
              Number(
                shlokaValue
              );

          const rawSearchable = [
            shlok.sanskrit,
            shlok.sanskritLine1,
            shlok.sanskritLine2,
            shlok.translation,
            shlok.translationHi,
            shlok.translationEn,
            shlok.message,
            shlok.messageHi,
            shlok.messageEn,
            shlok.speaker,
            shlok.speakerEn,
            shlok.chapterName,
            shlok.chapterNameHi,
            shlok.chapterNameEn,
          ]
            .filter(Boolean)
            .join(" ");

          const searchableText = stripHtml(rawSearchable).toLowerCase();

          const matchesText =
            !textValue ||
            searchableText.includes(
              textValue
            );

          return (
            matchesChapter &&
            matchesShloka &&
            matchesText
          );
        }
      );

    if (
      matches.length === 0
    ) {
      setMessage(
        txt(
          "કોઈ શ્લોક મળ્યો નથી.",
          "कोई श्लोक नहीं मिला।",
          "No shlokas found."
        )
      );
      return;
    }

    setResult(matches);
  };

  // =====================================================
  // ENTER KEY SEARCH
  // =====================================================

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter"
    ) {
      event.preventDefault();
      handleSearch();
    }
  };

  // =====================================================
  // OPEN SHLOKA
  // =====================================================

  const openShloka = (item) => {
    if (!user && Number(item.shlokNumber) > 5) {
      const redirectPath = `/chapter/${item.chapterNumber}?shloka=${item.shlokNumber}`;
      const redirectMsg = txt(
        `અધ્યાય ${item.chapterNumber} ના શ્લોક ${item.shlokNumber} વાંચવા માટે Login કરવું જરૂરી છે.`,
        `अध्याय ${item.chapterNumber} के श्लोक ${item.shlokNumber} पढ़ने के लिए Login करना आवश्यक है।`,
        `Login is required to read Chapter ${item.chapterNumber}, Shloka ${item.shlokNumber}.`
      );

      localStorage.setItem("pendingChapter", String(item.chapterNumber));
      localStorage.setItem("pendingShloka", String(item.shlokNumber));

      sessionStorage.setItem(
        "authRedirect",
        JSON.stringify({
          from: redirectPath,
          message: redirectMsg,
        })
      );

      navigate("/login", {
        state: {
          from: redirectPath,
          message: redirectMsg,
        },
      });
      return;
    }

    navigate(
      `/chapter/${item.chapterNumber}?shloka=${item.shlokNumber}`
    );
  };

  // =====================================================
  // CONTINUE READING BUTTON CONTENT
  // =====================================================

  const renderReadingButton = () => {
    if (user) {
      if (continueReadingLoading && !continueReading) {
        return (
          <button
            type="button"
            className="continue-reading-button"
            disabled
          >
            <Loader2 className="btn-icon spinner" size={20} /> {txt("Continue Reading...", "पढ़ना जारी रखें...", "Continue Reading...")}
          </button>
        );
      }

      const ch = continueReading?.chapterNumber || 1;
      const shl = continueReading?.shlokNumber || 1;

      return (
        <button
          type="button"
          className="continue-reading-button"
          onClick={handleContinueReading}
        >
          <BookOpen className="btn-icon" size={20} /> {txt("Continue Reading", "पढ़ना जारी रखें", "Continue Reading")}
          {" • "}
          {txt("અધ્યાય", "अध्याय", "Chapter")} {ch}
          {" • "}
          {txt("શ્લોક", "श्लोक", "Shloka")} {shl}
        </button>
      );
    }

    return null;
  };

  // =====================================================
  // HOME PAGE
  // =====================================================

  return (
   <main className="home-page">

      {/* =================================================
          HERO
      ================================================= */}

      <section className="hero">

        {/* SACRED TITLE */}

        <p className="subtitle">
          ॥ श्रीमद्भगवद्गीता ॥
        </p>

        {/* MAIN TITLE */}

        <h1>
          {txt("ભગવદ્ ગીતા", "भगवद् गीता", "Bhagavad Gita")}
        </h1>

        {/* DESCRIPTION */}

        <p className="description">
          {txt(
            "ભગવાન શ્રીકૃષ્ણના દિવ્ય જ્ઞાન અને જીવનને સાચી દિશા આપતા અમૂલ્ય ઉપદેશની પવિત્ર યાત્રામાં આપનું સ્વાગત છે.",
            "भगवान श्रीकृष्ण के दिव्य ज्ञान और जीवन को सही दिशा देने वाले अमूल्य उपदेश की पवित्र यात्रा में आपका स्वागत है।",
            "Welcome to the sacred journey of Lord Krishna's divine wisdom and life-transforming teachings."
          )}
        </p>

        {/* =================================================
            HERO ACTIONS (BUTTONS)
        ================================================= */}

        <div className="hero-actions">
          {user ? (
            renderReadingButton()
          ) : (
            <button
              type="button"
              className="continue-reading-button"
              onClick={
                handleStartReading
              }
            >
              <BookOpen className="btn-icon" size={20} /> {txt("ગીતા વાંચવાનું શરૂ કરો", "गीता पढ़ना शुरू करें", "Start Reading Gita")}
            </button>
          )}


          <button
            type="button"
            className="quiz-home-button quiz-button tracker-hero-btn"
            onClick={handleReadingTracker}
            title={txt("ગીતા વાંચન પ્રગતિ અને બેજ જુઓ", "गीता पठन प्रगति और बैज देखें", "View Gita Reading Progress & Badges")}
          >
            <Trophy className="btn-icon tracker-trophy-icon" size={20} /> {txt("વાંચન પ્રગતિ", "पठन प्रगति", "Reading Tracker")}
            {readingStats.currentStreak > 0 && (
              <span className="hero-streak-chip">
                <Flame size={14} className="streak-chip-flame" /> {readingStats.currentStreak}d
              </span>
            )}
          </button>
        </div>

        {/* =================================================
            ADVANCED SEARCH
        ================================================= */}

        <div className="home-search">

          {/* SEARCH TITLE */}

          <div className="search-title">
            <Search className="title-icon" size={22} /> {txt("ગીતા શ્લોક શોધો", "गीता श्लोक खोजें", "Search Gita Shlokas")}
          </div>

          {/* SEARCH FIELDS */}

          <div className="search-fields">

            {/* CHAPTER */}
            <div className="search-field-wrapper search-chapter-wrapper">
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={txt("અધ્યાય (1-18)", "अध्याय (1-18)", "Chapter (1-18)")}
                value={chapterNumber}
                onChange={handleChapterChange}
                onKeyDown={handleKeyDown}
                min="1"
                max="18"
              />
              <div className="search-stepper">
                <button
                  type="button"
                  tabIndex={-1}
                  className="search-stepper-btn search-stepper-up"
                  onClick={() => stepChapter("up")}
                  title={txt("અધ્યાય વધારો", "अध्याय बढ़ाएं", "Increase Chapter")}
                  aria-label="Increase chapter"
                >
                  <ChevronUp size={12} strokeWidth={2.8} />
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  className="search-stepper-btn search-stepper-down"
                  onClick={() => stepChapter("down")}
                  title={txt("અધ્યાય ઘટાડો", "अध्याय घटाएं", "Decrease Chapter")}
                  aria-label="Decrease chapter"
                >
                  <ChevronDown size={12} strokeWidth={2.8} />
                </button>
              </div>
            </div>

            {/* SHLOKA */}
            <div
              className={`search-field-wrapper search-shloka-wrapper ${
                !!chapterNumber && currentShlokaMax === 0 ? "disabled" : ""
              }`}
            >
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={
                  chapterNumber
                    ? getChapterMaxShloka(chapterNumber) === 0
                      ? txt("શ્લોક (0)", "श्लोक (0)", "Shloka (0)")
                      : txt(
                          `શ્લોક (1-${getChapterMaxShloka(chapterNumber)})`,
                          `श्लोक (1-${getChapterMaxShloka(chapterNumber)})`,
                          `Shloka (1-${getChapterMaxShloka(chapterNumber)})`
                        )
                    : txt("શ્લોક (1-78)", "श्लोक (1-78)", "Shloka (1-78)")
                }
                value={shlokaNumber}
                onChange={handleShlokaChange}
                onKeyDown={handleKeyDown}
                min={chapterNumber && currentShlokaMax === 0 ? "0" : "1"}
                max={currentShlokaMax > 0 ? currentShlokaMax : "0"}
                disabled={!!chapterNumber && currentShlokaMax === 0}
              />
              <div className="search-stepper">
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={!!chapterNumber && currentShlokaMax === 0}
                  className="search-stepper-btn search-stepper-up"
                  onClick={() => stepShloka("up")}
                  title={txt("શ્લોક વધારો", "श्लोक बढ़ाएं", "Increase Shloka")}
                  aria-label="Increase shloka"
                >
                  <ChevronUp size={12} strokeWidth={2.8} />
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={!!chapterNumber && currentShlokaMax === 0}
                  className="search-stepper-btn search-stepper-down"
                  onClick={() => stepShloka("down")}
                  title={txt("શ્લોક ઘટાડો", "श्लोक घटाएं", "Decrease Shloka")}
                  aria-label="Decrease shloka"
                >
                  <ChevronDown size={12} strokeWidth={2.8} />
                </button>
              </div>
            </div>

            {/* TEXT */}

            <input
              type="text"
              placeholder={txt("શ્લોક / શબ્દ શોધો...", "श्लोक / शब्द खोजें...", "Search shloka / word...")}
              value={searchText}
              onChange={
                handleTextChange
              }
              onKeyDown={
                handleKeyDown
              }
            />

            {/* SEARCH BUTTON */}

            <button
              type="button"
              className="search-button"
              onClick={
                handleSearch
              }
              title={txt("શ્લોક શોધો", "श्लोक खोजें", "Search Shloka")}
            >
              <Search className="btn-icon" size={18} />
              <span className="search-btn-text">{txt("શોધો", "खोजें", "Search")}</span>
            </button>

          </div>

          {/* ERROR / MESSAGE */}

          {message && (
            <div className="search-message">
              <AlertCircle className="msg-icon" size={18} /> {message}
            </div>
          )}

          {/* SEARCH RESULTS */}

          {result && (
            <div className="search-results">

              <h3>
                <Search className="title-icon" size={20} /> {result.length} {txt("પરિણામ મળ્યા", "परिणाम मिले", "results found")}
              </h3>

              {result.map(
                (item, index) => (
                  <div
                    className="search-result-card"
                    key={
                      `${item._id}-${index}`
                    }
                    onClick={() =>
                      openShloka(item)
                    }
                  >

                    <div className="result-chapter">
                      {txt("અધ્યાય", "अध्याय", "Chapter")}{" "}
                      {
                        item.chapterNumber
                      }

                      {" • "}

                      {txt("શ્લોક", "श्लोक", "Shloka")}{" "}
                      {
                        item.shlokNumber
                      }
                    </div>

                    <h4>
                      {getCurrentChapterName(item.chapterNumber)}
                    </h4>

                    <p>
                      {stripHtml(
                        txt(
                          item.translation,
                          item.translationHi || item.translation,
                          item.translationEn || item.translation
                        )
                      )}
                    </p>

                    <span>
                      {txt("શ્લોક વાંચો", "श्लोक पढ़ें", "Read Shloka")}
                    </span>

                  </div>
                )
              )}

            </div>
          )}

        </div>

      </section>

      {/* =================================================
          TODAY'S SHLOK
      ================================================= */}

      {todayShlok && (() => {
        const localizedToday = getLocalizedShlok(todayShlok);
        const todayChapterName = getCurrentChapterName(todayShlok.chapterNumber);

        return (
          <section className="today-shlok">

            <div className="today-shlok-header">
              <span className="today-shlok-icon">
                <Sparkles size={28} />
              </span>

              <div>
                <h2>
                  {txt("આજનો શ્લોક", "आज का श्लोक", "Today's Shloka")}
                </h2>
              </div>
            </div>

            <div className="today-shlok-meta">
              <span>
                {txt(`અધ્યાય ${todayShlok.chapterNumber}`, `अध्याय ${todayShlok.chapterNumber}`, `Chapter ${todayShlok.chapterNumber}`)}
              </span>

              <span>
                {todayChapterName}
              </span>

              <span>
                {txt(`શ્લોક ${todayShlok.shlokNumber}`, `श्लोक ${todayShlok.shlokNumber}`, `Shloka ${todayShlok.shlokNumber}`)}
              </span>
            </div>

            <div className="today-shlok-content">
              {/* SANSKRIT SHLOK - PURE SANSKRIT */}
              <div className="today-sanskrit">
                {todayShlok.sanskrit && (
                  <div
                    ref={todaySanskritRef}
                    className="today-sanskrit-text"
                    dangerouslySetInnerHTML={{
                      __html: todayShlok.sanskrit,
                    }}
                  />
                )}
              </div>

              {(localizedToday.translation || todayShlok.translation) && (
                <div className="today-translation">
                  <h3>
                    <BookOpen className="section-icon" size={20} />{" "}
                    {txt("ગુજરાતી અનુવાદ", "हिन्दी अनुवाद", "English Translation")}
                  </h3>

                  <div
                    dangerouslySetInnerHTML={{
                      __html:
                        localizedToday.translation ||
                        todayShlok.translation,
                    }}
                  />
                </div>
              )}

              {(localizedToday.message || todayShlok.message) && (
                <div className="today-message">
                  <h3>
                    <Sparkles className="section-icon" size={20} />{" "}
                    {txt("આજનો સંદેશ", "आज का सन्देश", "Today's Message")}
                  </h3>

                  <div
                    dangerouslySetInnerHTML={{
                      __html:
                        localizedToday.message ||
                        todayShlok.message,
                    }}
                  />
                </div>
              )}
            </div>

            <div className="today-shlok-actions">
              <button
                type="button"
                className="today-shlok-button"
                onClick={handleTodayShlok}
              >
                <BookOpen className="btn-icon" size={18} />{" "}
                {txt("સંપૂર્ણ શ્લોક વાંચો", "सम्पूर्ण श्लोक पढ़ें", "Read Full Shloka")}
              </button>
              <button
                type="button"
                className="today-shlok-button today-share-button"
                onClick={handleShareTodayShlok}
                title={txt("શ્લોક કાર્ડ શેર કરો / ડાઉનલોડ કરો", "श्लोक कार्ड शेयर / डाउनलोड करें", "Share / Download Shloka Card")}
              >
                <Share2 className="btn-icon" size={18} />{" "}
                {txt("શ્લોક કાર્ડ શેર કરો", "श्लोक कार्ड शेयर करें", "Share Shloka Card")}
              </button>
            </div>

          </section>
        );
      })()}

      {/* =================================================
          SHARE SHLOKA CARD MODAL (TODAY'S SHLOK)
      ================================================= */}
      {todayShlok && (() => {
        const localizedToday = getLocalizedShlok(todayShlok);
        const todayChapterName = getCurrentChapterName(todayShlok.chapterNumber);

        return (
          <ShareShlokaModal
            isOpen={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
            shlokaData={{
              chapterNumber: todayShlok.chapterNumber,
              chapterName: todayChapterName,
              shlokNumber: todayShlok.shlokNumber,
              sanskrit: todayShlok.sanskrit,
              translation: localizedToday.translation || todayShlok.translation,
              speaker: localizedToday.speaker || todayShlok.speaker,
              message: localizedToday.message || todayShlok.message,
            }}
          />
        );
      })()}

    </main>
  );
}

export default Home;