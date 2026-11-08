import { getValidToken } from "../utils/authHelper.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Heart, Mic, Sparkles, AlertCircle, ChevronLeft, ChevronRight, Share2, Volume2, Square, Play, CheckCircle2, Loader2, ChevronDown, Gauge } from "lucide-react";
import "./ChapterReader.css";
import ShareShlokaModal from "../components/ShareShlokaModal.jsx";
import SudarshanShimmerLoader from "../components/SudarshanShimmerLoader.jsx";

import {
  useParams,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { trackShlokaRead, getFirstUnreadShloka, getLocalProgress } from "../utils/readingTracker.js";
import { saveChapterOffline, getChapterOffline } from "../utils/offlineStorage.js";
import { saveAudioToCache, getAudioFromCache, isAudioInCache, autoSyncChapterAudios, stopAudioSync } from "../utils/audioCache.js";
import { isRunningInStandaloneApp } from "../utils/pwaManager.js";

function ChapterReader() {
  const { chapterNumber } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // =====================================================
  // LANGUAGE CONTEXT
  // =====================================================

  const { language, setLanguage, isHindi, isEnglish, t, txt, getLocalizedShlok, CHAPTER_NAMES } = useLanguage();

  // =====================================================
  // AUTH CONTEXT
  // =====================================================

  const { user } = useAuth();

  // =====================================================
  // STATE
  // =====================================================

  const [shlokas, setShlokas] = useState([]);
  const [chapterName, setChapterName] = useState("");
  const [currentShloka, setCurrentShloka] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [audioSyncProgress, setAudioSyncProgress] = useState({ current: 0, total: 0, done: false });
  const [audioToast, setAudioToast] = useState("");

  const showAudioToast = (msg) => {
    setAudioToast(msg);
    setTimeout(() => {
      setAudioToast("");
    }, 4500);
  };

  // Currently clicked Sanskrit word
  const [activeWordIndex, setActiveWordIndex] = useState(null);

  const sanskritRef = useRef(null);
const [sanskritFontSize, setSanskritFontSize] = useState(21);



  // =====================================================
  // FAVOURITE STATE
  // =====================================================

  const [favoriteShlokas, setFavoriteShlokas] = useState([]);

  const [favoriteLoading, setFavoriteLoading] =
    useState(false);

  // =====================================================
  // SHARE MODAL STATE
  // =====================================================

  const [shareModalOpen, setShareModalOpen] = useState(false);

  // =====================================================
  // TEXT-TO-SPEECH (AUDIO) STATE
  // =====================================================
  const [speakingType, setSpeakingType] = useState(null); // null | 'sanskrit' | 'translation' | 'message'
  const [pausedType, setPausedType] = useState(null); // null | 'sanskrit' | 'translation' | 'message'
  const speakingTypeRef = useRef(null);
  const pausedTypeRef = useRef(null);
  const pausedShlokaIndexRef = useRef(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioPlayerRef = useRef(null);

  // Playback speed state (0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x)
  const [audioSpeed, setAudioSpeed] = useState(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("gita_audio_speed");
      if (saved && !isNaN(Number(saved))) return Number(saved);
    }
    return 1.0;
  });
  const audioSpeedRef = useRef(audioSpeed);
  const [speedDropdownOpen, setSpeedDropdownOpen] = useState(null); // 'sanskrit' | 'translation' | 'message' | null

  useEffect(() => {
    audioSpeedRef.current = audioSpeed;
  }, [audioSpeed]);

  const handleAudioSpeedChange = (newSpeed) => {
    setAudioSpeed(newSpeed);
    audioSpeedRef.current = newSpeed;
    try {
      localStorage.setItem("gita_audio_speed", String(newSpeed));
    } catch (e) {}

    // Instantly apply to active audio without stopping playback!
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = newSpeed;
    }
  };

  // Close speed dropdown when clicking outside
  useEffect(() => {
    if (!speedDropdownOpen) return;
    const handleDocumentClick = () => {
      setSpeedDropdownOpen(null);
    };
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, [speedDropdownOpen]);
  const autoPlayTimerRef = useRef(null);
  const isContinuousPlayRef = useRef(false);
  const autoPlayNextShlokaRef = useRef(false);
  const currentShlokaRef = useRef(currentShloka);
  const shlokasRef = useRef(shlokas);
  const userRef = useRef(user);
  const translationContainerRef = useRef(null);
  const messageContainerRef = useRef(null);
  const lastActiveWordIdxRef = useRef(-1);
  const lastActiveWordElRef = useRef(null);
  const lastScrollTimeRef = useRef(0);
  const audioModeActiveRef = useRef(false);
  const mainTimerIdRef = useRef(null);

  // =====================================================
  // API URL
  // =====================================================

  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  const API_URL = isLocal
    ? "http://localhost:5000/api/shloks"
    : "https://bhagavad-gita-backend-jy1a.onrender.com/api/shloks";

  const FAVORITE_API_URL = isLocal
    ? "http://localhost:5000/api/favorites"
    : "https://bhagavad-gita-backend-jy1a.onrender.com/api/favorites";

  const CONTINUE_READING_API_URL = isLocal
    ? "http://localhost:5000/api/continue-reading"
    : "https://bhagavad-gita-backend-jy1a.onrender.com/api/continue-reading";

  // =====================================================
  // CHAPTER NUMBER
  // =====================================================

  const currentChapterNumber =
    Number(chapterNumber);

  // =====================================================
  // REQUESTED SHLOK
  // =====================================================

  const requestedShloka = Number(
    searchParams.get("shloka")
  );

  // =====================================================
// AUTO FIT SANSKRIT FOR MOBILE
// =====================================================

useEffect(() => {
  const container = sanskritRef.current;

  if (!container) {
    return;
  }

  const fitSanskrit = () => {
    const lines =
      container.querySelectorAll(
        ".sanskrit-line"
      );

    if (lines.length === 0) {
      return;
    }

    // Desktop
    if (window.innerWidth > 700) {
      container.style.fontSize = "25px";
      setSanskritFontSize(25);
      return;
    }

    // Start from normal mobile size
    let fontSize = 21;

    container.style.fontSize =
      `${fontSize}px`;

    // Reduce only when a line is wider
    // than the available mobile width
    while (
      fontSize > 12 &&
      Array.from(lines).some(
        (line) =>
          line.scrollWidth >
          line.clientWidth
      )
    ) {
      fontSize -= 0.5;

      container.style.fontSize =
        `${fontSize}px`;
    }

    setSanskritFontSize(fontSize);
  };

  const timer = setTimeout(
    fitSanskrit,
    100
  );

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
}, [
  currentShloka,
  shlokas,
]);

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

  // =====================================================
  // NORMALIZE WORD
  // =====================================================

  const normalizeWord = (word) => {
    return String(word || "")
      .replace(/<[^>]*>/g, "")
      .replace(
        /[।॥,;:!?()[\]{}"“”‘’'`]/gu,
        ""
      )
      .trim();
  };

  // =====================================================
  // REMOVE HTML
  // =====================================================

  const removeHtml = (text) => {
    if (!text) {
      return "";
    }

    // Convert all block tags and breaks into newlines first so lines are never merged together
    const converted = String(text)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(div|p|li|blockquote|h[1-6]|tr)>/gi, "\n")
      .replace(/<(div|p|li|blockquote|h[1-6]|tr)[^>]*>/gi, "\n");

    const temp =
      document.createElement("div");

    temp.innerHTML = converted;

    return (
      temp.textContent ||
      temp.innerText ||
      ""
    )
      .replace(/&nbsp;/gi, " ")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
  };

// =====================================================
// FETCH CHAPTER SHLOKAS
// =====================================================

useEffect(() => {
  const applyLoadedShlokas = (loadedShlokas, chName, isOffline = false) => {
    setShlokas(loadedShlokas);
    setIsOfflineMode(isOffline);
    if (loadedShlokas.length > 0) {
      setChapterName(
        chName ||
          loadedShlokas[0].chapterName ||
          chapterNames[currentChapterNumber] ||
          (isHindi ? `अध्याय ${currentChapterNumber}` : `અધ્યાય ${currentChapterNumber}`)
      );
    } else {
      setChapterName(
        chapterNames[currentChapterNumber] || `અધ્યાય ${currentChapterNumber}`
      );
    }

    let targetShlokaNum = requestedShloka;
    if (!targetShlokaNum) {
      try {
        const localProgress = getLocalProgress();
        const firstUnread = getFirstUnreadShloka(
          localProgress.readShlokas,
          currentChapterNumber,
          loadedShlokas.length
        );
        targetShlokaNum = firstUnread || 1;
      } catch (e) {
        targetShlokaNum = 1;
      }
    }

    if (targetShlokaNum) {
      if (!user && targetShlokaNum > 5) {
        if (isOffline || !navigator.onLine) {
          alert(
            txt(
              "ઑફલાઇનમાં ૫ થી વધુ શ્લોક વાંચવા માટે Login કરવું જરૂરી છે. કૃપા કરીને ઇન્ટરનેટ ચાલુ કરીને Login કરો.",
              "ऑफ़लाइन में 5 से अधिक श्लोक पढ़ने के लिए Login करना आवश्यक है। कृपया इंटरनेट चालू करके Login करें।",
              "Login is required to read more than 5 shlokas offline. Please connect to the internet and login."
            )
          );
          setCurrentShloka(0);
          return;
        }

        const redirectPath = `/chapter/${currentChapterNumber}?shloka=${targetShlokaNum}`;
        const redirectMsg = isHindi
          ? `अध्याय ${currentChapterNumber} के श्लोक ${targetShlokaNum} पढ़ने के लिए Login करना आवश्यक है।`
          : `અધ્યાય ${currentChapterNumber} ના શ્લોક ${targetShlokaNum} વાંચવા માટે Login કરવું જરૂરી છે.`;

        localStorage.setItem("pendingChapter", String(currentChapterNumber));
        localStorage.setItem("pendingShloka", String(targetShlokaNum));

        sessionStorage.setItem(
          "authRedirect",
          JSON.stringify({
            from: redirectPath,
            message: redirectMsg,
          })
        );

        navigate("/login", {
          replace: true,
          state: {
            from: redirectPath,
            message: redirectMsg,
          },
        });
        return;
      }

      const shlokaIndex = loadedShlokas.findIndex(
        (item) => Number(item.shlokNumber) === targetShlokaNum
      );

      if (shlokaIndex !== -1) {
        setCurrentShloka(shlokaIndex);
      } else {
        setCurrentShloka(0);
      }
    } else {
      setCurrentShloka(0);
    }
  };

  const fetchChapterShlokas = async () => {
    try {
      setLoading(true);
      setError("");
      setActiveWordIndex(null);

      // 1. If device is explicitly offline, check offline storage first
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        const offlineData = getChapterOffline(currentChapterNumber);
        if (offlineData && Array.isArray(offlineData.shlokas) && offlineData.shlokas.length > 0) {
          applyLoadedShlokas(offlineData.shlokas, offlineData.chapterName, true);
          setLoading(false);
          return;
        }
      }

      const token = getValidToken();

      const response = await fetch(
        `${API_URL}/chapter/${currentChapterNumber}`,
        {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            (isHindi ? "श्लोक लोड नहीं हो सके।" : "Shlokas load થઈ શક્યા નથી.")
        );
      }

      const fetchedShlokas = data.shlokas || [];

      fetchedShlokas.sort(
        (a, b) =>
          Number(a.shlokNumber) -
          Number(b.shlokNumber)
      );

      const resolvedChapterName =
        fetchedShlokas[0]?.chapterName ||
        chapterNames[currentChapterNumber] ||
        (isHindi ? `अध्याय ${currentChapterNumber}` : `અધ્યાય ${currentChapterNumber}`);

      // Cache immediately for future 100% offline access
      saveChapterOffline(currentChapterNumber, fetchedShlokas, resolvedChapterName);

      applyLoadedShlokas(fetchedShlokas, resolvedChapterName, false);

    } catch (err) {
      console.error("Fetch Chapter Shlokas Error:", err);

      // 2. Offline fallback if network failed (no internet, Failed to fetch, etc.)
      const offlineData = getChapterOffline(currentChapterNumber);
      if (offlineData && Array.isArray(offlineData.shlokas) && offlineData.shlokas.length > 0) {
        applyLoadedShlokas(offlineData.shlokas, offlineData.chapterName, true);
        return;
      }

      const isNetworkErr =
        (typeof navigator !== "undefined" && !navigator.onLine) ||
        String(err.message || "").toLowerCase().includes("fetch");

      setError(
        isNetworkErr
          ? (isHindi
              ? "आप ऑफ़लाइन हैं और यह अध्याय पहले सहेजा नहीं गया है। कृपया एक बार इंटरनेट चालू करके इस अध्याय को खोलें ताकि यह ऑफ़लाइन सहेज लिया जाए।"
              : "તમે હાલમાં ઑફલાઇન છો અને આ અધ્યાય અગાઉ સેવ થયેલ નથી. એકવાર ઇન્ટરનેટ ચાલુ કરીને આ અધ્યાય ખોલો જેથી તે ઑફલાઇન સેવ થઈ જાય.")
          : (err.message || (isHindi ? "श्लोक लोड करने में त्रुटि आई।" : "Shlokas load કરવામાં error આવ્યો."))
      );

      setShlokas([]);

    } finally {
      setLoading(false);
    }
  };

  if (
    currentChapterNumber >= 1 &&
    currentChapterNumber <= 18
  ) {
    fetchChapterShlokas();
  } else {
    setLoading(false);
    setError(
      "Invalid chapter number."
    );
  }

}, [
  currentChapterNumber,
  user,
]);

  // =====================================================
  // HANDLE EXTERNAL URL QUERY PARAM CHANGE (IN-MEMORY)
  // =====================================================

  useEffect(() => {
    if (!requestedShloka || shlokas.length === 0) return;

    const currentShlokNum = Number(shlokas[currentShloka]?.shlokNumber);
    if (currentShlokNum === requestedShloka) return;

    const targetIndex = shlokas.findIndex(
      (item) => Number(item.shlokNumber) === requestedShloka
    );
    if (targetIndex !== -1) {
      setCurrentShloka(targetIndex);
    }
  }, [requestedShloka, shlokas]);

  // =====================================================
  // SYNC CURRENT SHLOKA WITH URL & STORAGE (FOR PAGE REFRESH)
  // =====================================================

  useEffect(() => {
    if (shlokas.length === 0) return;

    const current = shlokas[currentShloka];
    if (!current || !current.shlokNumber) return;

    const shlokNum = Number(current.shlokNumber);

    // 1. Save in session & local storage for immediate in-page reload and continue reading
    try {
      sessionStorage.setItem(
        `gita_last_shloka_ch_${currentChapterNumber}`,
        String(shlokNum)
      );
      localStorage.setItem(
        `gita_last_shloka_ch_${currentChapterNumber}`,
        String(shlokNum)
      );
      const uid = user?._id || user?.email;
      const userKey = uid ? `gita_continue_reading_${uid}` : "gita_continue_reading_guest";
      localStorage.setItem(
        userKey,
        JSON.stringify({
          chapterNumber: currentChapterNumber,
          shlokNumber: shlokNum,
          updatedAt: new Date().toISOString(),
        })
      );
      localStorage.setItem(
        "gita_continue_reading",
        JSON.stringify({
          chapterNumber: currentChapterNumber,
          shlokNumber: shlokNum,
          userId: uid || null,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch (e) {}

    // 2. Synchronize URL query parameter smoothly via replaceState (no page reload, no history spam)
    const targetUrl = `/chapter/${currentChapterNumber}?shloka=${shlokNum}`;
    const currentUrl = window.location.pathname + window.location.search;
    if (currentUrl !== targetUrl) {
      window.history.replaceState(window.history.state, "", targetUrl);
    }

    // 3. Immediately save Continue Reading to backend if user is logged in
    if (user) {
      saveContinueReading(currentChapterNumber, shlokNum);
    }
  }, [currentShloka, shlokas, currentChapterNumber, user]);

  // =====================================================
  // LOAD FAVOURITES FROM BACKEND
  // =====================================================

  useEffect(() => {
    const loadFavorites = async () => {
      // User login નથી
      if (!user) {
        setFavoriteShlokas([]);
        return;
      }

      try {
        const token =
          getValidToken();

        if (!token) {
          setFavoriteShlokas([]);
          return;
        }

        const response = await fetch(
          FAVORITE_API_URL,
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
              (isHindi ? "पसंदीदा श्लोक लोड नहीं हो सके।" : "Favourite શ્લોક load થઈ શક્યા નથી.")
          );
        }

        setFavoriteShlokas(
          data.favorites || []
        );
      } catch (error) {
        console.error(
          "Load Favorites Error:",
          error
        );

        setFavoriteShlokas([]);
      }
    };

    loadFavorites();
  }, [user]);

  // =====================================================
  // CONTINUE READING
  // SAVE CURRENT SHLOK
  // =====================================================

  const saveContinueReading = async (
    chapter,
    shlok
  ) => {
    // Login વગર save નહીં થાય
    if (!user) {
      return;
    }

    const token =
      getValidToken();

    if (!token) {
      return;
    }

    if (
      !chapter ||
      !shlok
    ) {
      return;
    }

    try {
      const response = await fetch(
        CONTINUE_READING_API_URL,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            chapterNumber: Number(
              chapter
            ),
            shlokNumber: Number(
              shlok
            ),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            txt("Continue Reading save થઈ શક્યું નથી.", "पठन जारी रखें सहेजा नहीं जा सका।", "Could not save Continue Reading.")
        );
      }

      console.log(
        "Continue Reading Saved:",
        data.continueReading
      );
    } catch (error) {
      console.error(
        "Save Continue Reading Error:",
        error
      );
    }
  };

  // =====================================================
  // CONTINUE READING IS SAVED WHEN SHLOKA IS COMPLETED
  // (Either 50s reading time or full audio listened)
  // =====================================================

  // =====================================================
  // TIMED READING TRACKER (50-SECOND MINIMUM READ)
  // A shloka is silently counted as "read" after the user
  // has stayed on it for at least 50 seconds in the background.
  // =====================================================

  const READ_TIME_MS = 50_000; // 50 seconds

  // Tracks which (chapter, shloka) pairs have already
  // been counted so we never double-count in a session.
  const trackedInSessionRef = useRef(new Set());

  useEffect(() => {
    if (shlokas.length === 0) return;

    const current = shlokas[currentShloka];
    if (!current || !current.shlokNumber) return;

    const sessionKey = `${currentChapterNumber}-${current.shlokNumber}`;
    const alreadyTracked = trackedInSessionRef.current.has(sessionKey);

    // If already counted this session, no need to re-run
    if (alreadyTracked) return;

    audioModeActiveRef.current = false;
    const startTime = Date.now();
    let mainTimerId;
    let pausedAt = null;

    const markAsRead = () => {
      // If user switched to audio mode, silent 50s reading timer MUST NOT count!
      if (audioModeActiveRef.current) return;
      if (trackedInSessionRef.current.has(sessionKey)) return;
      const token = getValidToken();
      trackShlokaRead(currentChapterNumber, current.shlokNumber, token);
      trackedInSessionRef.current.add(sessionKey);
      try {
        localStorage.setItem(
          `gita_last_shloka_ch_${currentChapterNumber}`,
          String(current.shlokNumber)
        );
      } catch (e) {}
      if (user) {
        saveContinueReading(currentChapterNumber, current.shlokNumber);
      }
    };

    // Main timer: fires silently ONLY after full 50 seconds IF reading without audio
    mainTimerId = setTimeout(() => {
      if (document.visibilityState === "visible" && !audioModeActiveRef.current) {
        markAsRead();
      }
    }, READ_TIME_MS);
    mainTimerIdRef.current = mainTimerId;

    // Pause timer when tab is hidden; resume when visible again
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pausedAt = Date.now();
        clearTimeout(mainTimerId);
      } else {
        if (pausedAt !== null && !audioModeActiveRef.current) {
          const elapsedBeforePause = pausedAt - startTime;
          const remainingMs = Math.max(0, READ_TIME_MS - elapsedBeforePause);
          pausedAt = null;

          mainTimerId = setTimeout(() => {
            if (document.visibilityState === "visible" && !audioModeActiveRef.current) {
              markAsRead();
            }
          }, remainingMs);
          mainTimerIdRef.current = mainTimerId;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup: user moved away before 50 seconds → cancel timer (does NOT mark as read)
    return () => {
      clearTimeout(mainTimerId);
      mainTimerIdRef.current = null;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    currentShloka,
    shlokas,
    currentChapterNumber,
  ]);


  // =====================================================
  // CHECK FAVOURITE
  // =====================================================

  const isFavorite = (shloka) => {
    if (!shloka || !user) {
      return false;
    }

    return favoriteShlokas.some(
      (favorite) =>
        String(favorite._id) ===
        String(shloka._id)
    );
  };

  // =====================================================
  // TOGGLE FAVOURITE
  // =====================================================

  const toggleFavorite = async () => {
    if (!shloka) {
      return;
    }

    // User login નથી
    if (!user) {
      navigate("/login");
      return;
    }

    const token =
      getValidToken();

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setFavoriteLoading(true);

      const alreadyFavorite =
        isFavorite(shloka);

      // =================================================
      // REMOVE FAVOURITE
      // =================================================

      if (alreadyFavorite) {
        const response = await fetch(
          `${FAVORITE_API_URL}/${shloka._id}`,
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
              txt("Favourite દૂર થઈ શક્યું નથી.", "पसंदीदा से नहीं हटाया जा सका।", "Could not remove from favorites.")
          );
        }

        setFavoriteShlokas(
          data.favorites || []
        );

        return;
      }

      // =================================================
      // ADD FAVOURITE
      // =================================================

      const response = await fetch(
        `${FAVORITE_API_URL}/${shloka._id}`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json",
          },
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            txt("Favouriteમાં add થઈ શક્યું નથી.", "पसंदीदा में जोड़ा नहीं जा सका।", "Could not add to favorites.")
        );
      }

      setFavoriteShlokas(
        data.favorites || []
      );
    } catch (error) {
      console.error(
        "Toggle Favourite Error:",
        error
      );

      alert(
        error.message ||
          txt("Favouriteમાં ફેરફાર કરવામાં error આવ્યો.", "पसंदीदा में बदलाव करने में त्रुटि आई।", "Error updating favorites.")
      );
    } finally {
      setFavoriteLoading(false);
    }
  };

  // =====================================================
  // SELECT SHLOK
  // =====================================================

const selectShloka = (index) => {
  if (
    index < 0 ||
    index >= shlokas.length
  ) {
    return;
  }

  const selectedShlok =
    shlokas[index];

  // =====================================================
  // LOGIN REQUIRED AFTER 5 SHLOKAS
  // =====================================================

if (
  !user &&
  Number(selectedShlok?.shlokNumber) > 5
) {
  if (isOfflineMode || !navigator.onLine) {
    alert(
      txt(
        "ઑફલાઇનમાં ૫ થી વધુ શ્લોક વાંચવા માટે Login કરવું જરૂરી છે. કૃપા કરીને ઇન્ટરનેટ ચાલુ કરીને Login કરો.",
        "ऑफ़लाइन में 5 से अधिक श्लोक पढ़ने के लिए Login करना आवश्यक है। कृपया इंटरनेट चालू करके Login करें।",
        "Login is required to read more than 5 shlokas offline. Please connect to the internet and login."
      )
    );
    return;
  }
  const redirectPath = `/chapter/${currentChapterNumber}?shloka=${selectedShlok.shlokNumber}`;
  const redirectMsg = txt(
    `અધ્યાય ${currentChapterNumber} ના શ્લોક ${selectedShlok.shlokNumber} વાંચવા માટે Login કરવું જરૂરી છે.`,
    `अध्याय ${currentChapterNumber} के श्लोक ${selectedShlok.shlokNumber} पढ़ने के लिए Login करना आवश्यक है।`,
    `Login is required to read Chapter ${currentChapterNumber}, Shloka ${selectedShlok.shlokNumber}.`
  );

  localStorage.setItem(
    "pendingChapter",
    String(currentChapterNumber)
  );

  localStorage.setItem(
    "pendingShloka",
    String(selectedShlok.shlokNumber)
  );

  sessionStorage.setItem(
    "authRedirect",
    JSON.stringify({
      from: redirectPath,
      message: redirectMsg,
    })
  );

  navigate("/login", {
    replace: true,
    state: {
      from: redirectPath,
      message: redirectMsg,
    },
  });
  return;
}

  setCurrentShloka(index);
  setActiveWordIndex(null);

  // Continue Reading
  if (selectedShlok) {
    saveContinueReading(
      currentChapterNumber,
      selectedShlok.shlokNumber
    );
  }

  // Scroll to current shloka
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

  // Advances to next shloka automatically in continuous play mode
  const advanceToNextShloka = () => {
    const list = shlokasRef.current || [];
    const currentIndex = currentShlokaRef.current;
    const nextIndex = currentIndex + 1;

    // Check if next shloka exists in this chapter
    if (nextIndex < list.length) {
      const nextShlok = list[nextIndex];

      // Login check: if user not logged in and next shloka > 5, stop autoplay & prompt login
      if (!userRef.current && Number(nextShlok?.shlokNumber) > 5) {
        isContinuousPlayRef.current = false;
        autoPlayNextShlokaRef.current = false;
        selectShloka(nextIndex);
        return;
      }

      // Mark that this transition is automatic so audio starts automatically on next shloka
      autoPlayNextShlokaRef.current = true;
      selectShloka(nextIndex);
    } else {
      // Reached the end of the chapter!
      isContinuousPlayRef.current = false;
      autoPlayNextShlokaRef.current = false;
      setSpeakingType(null);
      setAudioLoading(false);
    }
  };

  // =====================================================
  // TEXT-TO-SPEECH (AUDIO) ENGINE
  // =====================================================

  // Wraps text tokens inside HTML into spans with data-word-idx for accurate, attractive audio tracking
  const wrapHtmlWithSpans = (htmlString) => {
    if (!htmlString || typeof htmlString !== "string") return "";
    try {
      let wordIdx = 0;
      return htmlString.replace(/(<[^>]+>)|([^<]+)/g, (match, tag, text) => {
        if (tag) return tag;
        if (text) {
          return text.replace(/([^\s]+)/g, (word) => {
            return `<span class="tts-word" data-word-idx="${wordIdx++}">${word}</span>`;
          });
        }
        return match;
      });
    } catch (e) {
      return htmlString;
    }
  };

  // Clear any existing active word / sentence TTS highlighting
  const clearTtsHighlights = () => {
    lastActiveWordIdxRef.current = -1;
    lastActiveWordElRef.current = null;
    if (typeof document !== "undefined") {
      const highlighted = document.querySelectorAll(".tts-word-active, .tts-word-read");
      highlighted.forEach((el) => {
        el.classList.remove("tts-word-active", "tts-word-read");
      });
    }
  };

  // Re-applies active and previously read word highlights so they never disappear on pause/stop
  const restoreTtsHighlights = (containerSelector, activeIndex) => {
    if (activeIndex === undefined || activeIndex === null || activeIndex < 0) return;
    if (typeof document === "undefined") return;
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const words = Array.from(container.querySelectorAll(".tts-word"));
    for (let i = 0; i < words.length; i++) {
      if (i === activeIndex) {
        words[i].classList.add("tts-word-active");
        words[i].classList.remove("tts-word-read");
      } else if (i < activeIndex) {
        words[i].classList.remove("tts-word-active");
        words[i].classList.add("tts-word-read");
      } else {
        words[i].classList.remove("tts-word-active", "tts-word-read");
      }
    }
  };

  // Helper to extract clean spoken text from HTML with natural pauses (1s pause after point titles / colons / lists)
  const extractCleanTextForSpeech = (htmlString) => {
    if (!htmlString) return "";
    try {
      const tempDiv = document.createElement("div");
      const preprocessed = String(htmlString)
        .replace(/<br\s*[\/]?>/gi, " [P] ")
        .replace(/<\/p>/gi, " [P] ")
        .replace(/<\/li>/gi, " [P] ")
        .replace(/<li>/gi, " [P] ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&");
      tempDiv.innerHTML = preprocessed;
      let text = (tempDiv.textContent || tempDiv.innerText || "");

      // Strip remaining HTML tags
      text = text.replace(/<[^>]*>/g, "");

      // 1-second natural pause after speaker name or point titles with colons (e.g. "ધૃતરાષ્ટ્રે કહ્યું :")
      text = text.replace(/\s*[:：]\s*/g, " [P] ");

      // Remove bullet marks
      text = text.replace(/[•\-\*]/g, " ");

      // Collapse extra spaces
      text = text.replace(/\s+/g, " ").trim();

      // Replace pause marker with ". ... " which causes a calm ~1 second pause in speech synthesis
      text = text.replace(/\s*\[P\]\s*/g, ". ... ");

      // Clean up duplicate pause markers or trailing punctuation
      text = text
        .replace(/(\.\s*\.\.\.\s*)+/g, ". ... ")
        .replace(/^[\.\s\.\.\.]+/, "")
        .replace(/[\.\s\.\.\.]+$/, ".")
        .trim();

      return text;
    } catch (e) {
      return String(htmlString)
        .replace(/<[^>]*>/g, " ")
        .replace(/\s*[:：]\s*/g, ". ... ")
        .trim();
    }
  };

  // Formats Sanskrit verse text with natural poetic meter (rag/chandas pauses) for authentic recitation
  const formatSanskritForSpeech = (shlokObj) => {
    if (!shlokObj) return "";
    let plain = removeHtml(shlokObj.sanskrit || "");
    if (!plain && (shlokObj.sanskritLine1 || shlokObj.sanskritLine2)) {
      plain = [shlokObj.sanskritLine1, shlokObj.sanskritLine2].filter(Boolean).join("\n");
    }
    // Strip trailing shloka numbers like ॥ १ ॥ or || 1 ||
    plain = plain.replace(/[॥\|]\s*[\d\.\-०-९]+\s*[॥\|]/g, "।");
    const rawLines = plain
      .split(/\n+/)
      .map((l) => l.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    const rhythmLines = rawLines
      .map((line) => {
        let cleanLine = line.replace(/[|।॥]+$/g, "").trim();
        const words = cleanLine.split(/\s+/).filter((w) => !/^[|।॥\d\.\-०-९]+$/.test(w));
        if (words.length >= 4) {
          const half = Math.ceil(words.length / 2);
          const pada1 = words.slice(0, half).join(" ");
          const pada2 = words.slice(half).join(" ");
          return `${pada1}, ${pada2} ।`;
        } else if (words.length > 0) {
          return `${words.join(" ")} ।`;
        }
        return "";
      })
      .filter(Boolean);

    return rhythmLines.join("\n\n");
  };

  // Smoothly scroll the screen to keep the active section comfortably in view
  const scrollToSection = (sectionType) => {
    try {
      const selector =
        sectionType === "sanskrit"
          ? ".sanskrit-box"
          : sectionType === "message"
          ? ".message-box"
          : ".translation-box";
      const el = document.querySelector(selector);
      if (el) {
        const yOffset = -90; // Leave comfortable space below top navbar
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      }
    } catch (e) {}
  };

  // Resiliently fetch Microsoft Neural AI speech audio (with automatic fallback to Render and retry)
  const fetchNeuralAudioBlob = async (text, lang, customRate = null) => {
    const isLocal =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

    // Candidate endpoints: If on localhost, check local first, but ALWAYS fall back to Render!
    const candidateBases = isLocal
      ? ["http://localhost:5000", "https://bhagavad-gita-backend-jy1a.onrender.com"]
      : ["https://bhagavad-gita-backend-jy1a.onrender.com"];

    const payload = {
      text,
      lang,
      voice: "male", // Niranjan / Madhur
    };
    if (customRate) {
      payload.rate = customRate;
    }

    let lastFetchErr = null;
    for (const base of candidateBases) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutMs = base.includes("localhost") ? 2000 : 25000;
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

          const response = await fetch(`${base}/api/tts/speak`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            return await response.blob();
          }
        } catch (err) {
          lastFetchErr = err;
          // If localhost connection failed or timed out, immediately skip to Render!
          if (base.includes("localhost")) {
            break;
          }
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 650));
          }
        }
      }
    }
    throw lastFetchErr || new Error("Failed to fetch audio from all endpoints");
  };

  // Marks shloka as read strictly when the full audio sequence completes
  const markShlokaAsReadAudio = (shlokaObj) => {
    if (!shlokaObj || !shlokaObj.shlokNumber) return;
    const sessionKey = `${currentChapterNumber}-${shlokaObj.shlokNumber}`;
    if (trackedInSessionRef.current.has(sessionKey)) return;

    const token = getValidToken();
    trackShlokaRead(currentChapterNumber, shlokaObj.shlokNumber, token);
    trackedInSessionRef.current.add(sessionKey);
    try {
      localStorage.setItem(
        `gita_last_shloka_ch_${currentChapterNumber}`,
        String(shlokaObj.shlokNumber)
      );
    } catch (e) {}
    if (user) {
      saveContinueReading(currentChapterNumber, shlokaObj.shlokNumber);
    }
  };

  // Browser native Web Speech API fallback if server-side neural TTS is unavailable or offline
  const playWebSpeechFallback = (text, lang, type, targetIdx) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeakingType(null);
      setAudioLoading(false);
      showAudioToast(
        txt(
          "આ શ્લોકનો ઑડિયો હજુ ઑફલાઇન સેવ થયો નથી. કૃપા કરીને થોડી સેકન્ડ ઇન્ટરનેટ ચાલુ રાખીને ઑડિયો સેવ થવા દો.",
          "यह ऑडियो अभी ऑफ़लाइन सेव नहीं हुआ है। कृपया कुछ सेकंड इंटरनेट चालू रखकर इसे सेव होने दें।",
          "Audio is not yet cached offline. Please keep internet on for a few seconds to cache it."
        )
      );
      return;
    }

    // User is now listening to audio: activate audio mode and disable 50s reading timer immediately
    audioModeActiveRef.current = true;
    if (mainTimerIdRef.current) {
      clearTimeout(mainTimerIdRef.current);
      mainTimerIdRef.current = null;
    }

    try {
      window.speechSynthesis.cancel();

      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(text);

          // Find best local/offline voice from device
          const voices = window.speechSynthesis.getVoices() || [];
          const targetLangPrefix = lang === "sa" ? "hi" : (isEnglish ? "en" : isHindi ? "hi" : "gu");

          let chosenVoice = voices.find(
            (v) => (v.lang.toLowerCase().startsWith(targetLangPrefix) || v.lang.toLowerCase().replace("_", "-").startsWith(targetLangPrefix)) && v.localService
          );

          if (!chosenVoice) {
            chosenVoice = voices.find((v) =>
              v.lang.toLowerCase().startsWith(targetLangPrefix) || v.lang.toLowerCase().replace("_", "-").startsWith(targetLangPrefix)
            );
          }

          if (!chosenVoice && targetLangPrefix === "gu") {
            chosenVoice = voices.find((v) => v.lang.toLowerCase().startsWith("hi") && v.localService) ||
              voices.find((v) => v.lang.toLowerCase().startsWith("hi"));
          }

          if (!chosenVoice) {
            chosenVoice = voices.find((v) => v.lang.toLowerCase().includes("-in"));
          }

          if (chosenVoice) {
            utterance.voice = chosenVoice;
            utterance.lang = chosenVoice.lang;
          } else {
            utterance.lang = lang === "sa" ? "hi-IN" : (isEnglish ? "en-IN" : isHindi ? "hi-IN" : "gu-IN");
          }

          utterance.rate = (type === "sanskrit" ? 0.82 : 0.95) * audioSpeedRef.current;

          utterance.onstart = () => {
            setAudioLoading(false);
            setSpeakingType(type);
            speakingTypeRef.current = type;
          };

          utterance.onend = () => {
            clearTtsHighlights();
            speakingTypeRef.current = null;
            pausedTypeRef.current = null;
            setSpeakingType(null);
            setPausedType(null);
            pausedShlokaIndexRef.current = null;
            setAudioLoading(false);

            const list = shlokasRef.current || shlokas;
            const targetShlokaObj = list[targetIdx];
            const targetLoc = getLocalizedShlok(targetShlokaObj || {});
            const hasTranslation = Boolean(extractCleanTextForSpeech(targetLoc.translation || targetShlokaObj?.translation));
            const hasMessage = Boolean(extractCleanTextForSpeech(targetLoc.message || targetShlokaObj?.message));

            if (type === "sanskrit" && hasTranslation) {
              if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
              autoPlayTimerRef.current = setTimeout(() => {
                startSpeech("translation", targetIdx);
              }, 1000);
            } else if ((type === "sanskrit" || type === "translation") && hasMessage) {
              if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
              autoPlayTimerRef.current = setTimeout(() => {
                startSpeech("message", targetIdx);
              }, 1000);
            } else {
              // Whole audio of this shloka has completed!
              markShlokaAsReadAudio(targetShlokaObj);

              if (isContinuousPlayRef.current) {
                if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
                autoPlayTimerRef.current = setTimeout(() => {
                  advanceToNextShloka();
                }, 2000);
              }
            }
          };

          utterance.onerror = (e) => {
            console.error("SpeechSynthesis fallback error:", e);
            clearTtsHighlights();
            speakingTypeRef.current = null;
            setSpeakingType(null);
            setAudioLoading(false);

            showAudioToast(
              txt(
                "આ શ્લોકનો ઑડિયો હજુ ઑફલાઇન સેવ થયો નથી. કૃપા કરીને થોડી સેકન્ડ ઇન્ટરનેટ ચાલુ રાખીને ઑડિયો સેવ થવા દો.",
                "यह ऑडियो अभी ऑफ़लाइन सेव नहीं हुआ है। कृपया कुछ सेकंड इंटरनेट चालू रखकर इसे सेव होने दें।",
                "Audio is not yet cached offline. Please keep internet on for a few seconds to cache it."
              )
            );
          };

          window.speechSynthesis.speak(utterance);
        } catch (innerErr) {
          console.error("Inner SpeechSynthesis error:", innerErr);
          setAudioLoading(false);
          setSpeakingType(null);
        }
      }, 60);
    } catch (e) {
      console.error("SpeechSynthesis error:", e);
      clearTtsHighlights();
      speakingTypeRef.current = null;
      setSpeakingType(null);
      setAudioLoading(false);
    }
  };

  // Pause currently playing speech at the exact current position without losing font highlights
  const pauseSpeech = (type) => {
    isContinuousPlayRef.current = false;
    autoPlayNextShlokaRef.current = false;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    speakingTypeRef.current = null;
    pausedTypeRef.current = type;
    pausedShlokaIndexRef.current = currentShloka;
    setSpeakingType(null);
    setPausedType(type);
    setAudioLoading(false);

    // Ensure all read and active word highlights stay 100% visible
    const activeIdx = lastActiveWordIdxRef.current;
    const selector =
      type === "sanskrit"
        ? ".sanskrit"
        : type === "translation"
        ? ".gujarati-meaning"
        : ".message-text";
    requestAnimationFrame(() => {
      restoreTtsHighlights(selector, activeIdx);
    });
    setTimeout(() => {
      restoreTtsHighlights(selector, activeIdx);
    }, 40);
  };

  // Resume paused speech from the exact paused word
  const resumeSpeech = async (type) => {
    if (
      pausedTypeRef.current === type &&
      pausedShlokaIndexRef.current === currentShloka &&
      audioPlayerRef.current &&
      !audioPlayerRef.current.ended
    ) {
      speakingTypeRef.current = type;
      pausedTypeRef.current = null;
      setSpeakingType(type);
      setPausedType(null);
      // User is now listening to audio: activate audio mode and disable 50s reading timer immediately
    audioModeActiveRef.current = true;
    if (mainTimerIdRef.current) {
      clearTimeout(mainTimerIdRef.current);
      mainTimerIdRef.current = null;
    }

    isContinuousPlayRef.current = true;
      scrollToSection(type);
      try {
        if (audioPlayerRef.current) {
          audioPlayerRef.current.playbackRate = audioSpeedRef.current;
        }
        await audioPlayerRef.current.play();
      } catch (err) {
        console.error("Resume audio play error:", err);
      }
    }
  };

  // Starts or continues playing speech for a given section (NEVER pauses; used for auto-play and fresh plays)
  const startSpeech = async (type, overrideIndex = null) => {
    // Clear any pending automatic timers
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }

    // Stop and reset previous audio
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    clearTtsHighlights();
    speakingTypeRef.current = type;
    pausedTypeRef.current = null;
    pausedShlokaIndexRef.current = null;
    setPausedType(null);
    setSpeakingType(type);
    setAudioLoading(true);

    // User is now listening to audio: activate audio mode and disable 50s reading timer immediately
    audioModeActiveRef.current = true;
    if (mainTimerIdRef.current) {
      clearTimeout(mainTimerIdRef.current);
      mainTimerIdRef.current = null;
    }

    isContinuousPlayRef.current = true;

    const list = shlokasRef.current || shlokas;
    const targetIdx = overrideIndex !== null ? overrideIndex : currentShlokaRef.current;
    const targetShlok = list[targetIdx] || {};
    const targetLocalized = getLocalizedShlok(targetShlok);
    let textToSpeak = "";
    if (type === "sanskrit") {
      textToSpeak = formatSanskritForSpeech(targetShlok);
    } else {
      const rawText =
        type === "translation"
          ? targetLocalized.translation || targetShlok?.translation
          : targetLocalized.message || targetShlok?.message;
      textToSpeak = extractCleanTextForSpeech(rawText);
    }

    if (!textToSpeak) {
      speakingTypeRef.current = null;
      setSpeakingType(null);
      setAudioLoading(false);
      // If sanskrit is missing, immediately try playing translation
      if (type === "sanskrit") {
        startSpeech("translation", targetIdx);
      } else if (type === "message" && isContinuousPlayRef.current) {
        // If message is missing or empty, wait 2s and move to next shloka automatically
        autoPlayTimerRef.current = setTimeout(() => {
          advanceToNextShloka();
        }, 2000);
      }
      return;
    }

    const langCode = type === "sanskrit" ? "sa" : (isEnglish ? "en" : isHindi ? "hi" : "gu");
    const customRate = type === "sanskrit" ? "-22%" : "-2%";
    scrollToSection(type);

    try {
      // 1. FIRST check IndexedDB offline audio cache (works 100% offline and online!)
      let blob = await getAudioFromCache(
        currentChapterNumber,
        targetShlok?.shlokNumber,
        type,
        langCode
      );

      // 2. If not in cache and device is online, fetch from backend neural TTS and cache immediately
      if (!blob && typeof navigator !== "undefined" && navigator.onLine) {
        try {
          blob = await fetchNeuralAudioBlob(textToSpeak, langCode, customRate);
          if (blob) {
            saveAudioToCache(
              currentChapterNumber,
              targetShlok?.shlokNumber,
              type,
              langCode,
              blob
            );
          }
        } catch (fetchErr) {
          console.warn("Backend TTS fetch failed:", fetchErr);
        }
      }

      // 3. If still no blob (device is offline and audio not yet cached), fallback to device speech
      if (!blob) {
        playWebSpeechFallback(textToSpeak, langCode, type, targetIdx);
        return;
      }

      const audioBlobUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioBlobUrl);
      audio.playbackRate = audioSpeedRef.current;
      audioPlayerRef.current = audio;

      // Word tracking and live font highlighting with smooth auto-scroll
      const containerSelector =
        type === "sanskrit"
          ? ".sanskrit"
          : type === "translation"
          ? ".gujarati-meaning"
          : ".message-text";

      audio.ontimeupdate = () => {
        if (!audio.duration || isNaN(audio.duration) || audio.duration === 0) return;

        const container = document.querySelector(containerSelector);
        if (!container) return;

        const words = Array.from(container.querySelectorAll(".tts-word"));
        if (!words || words.length === 0) return;

        let totalWeight = 0;
        const wordWeights = [];
        const isSanskrit = type === "sanskrit";
        for (let i = 0; i < words.length; i++) {
          const wText = (words[i].textContent || "").trim();
          const hasPause = /[:：.!?|।॥]$/.test(wText);
          const isSanskritPadaEnd = isSanskrit && (i % 2 === 1);
          const weight = Math.max(wText.length, 2) + (hasPause ? 8 : isSanskritPadaEnd ? 6 : 0);
          totalWeight += weight;
          wordWeights.push(totalWeight);
        }

        const progress = Math.min(Math.max(audio.currentTime / audio.duration, 0), 1);
        const targetWeight = progress * totalWeight;

        let activeIndex = wordWeights.findIndex((w) => w >= targetWeight);
        if (activeIndex === -1) activeIndex = words.length - 1;

        if (activeIndex !== lastActiveWordIdxRef.current) {
          for (let i = 0; i < words.length; i++) {
            if (i === activeIndex) {
              words[i].classList.add("tts-word-active");
              words[i].classList.remove("tts-word-read");
            } else if (i < activeIndex) {
              words[i].classList.remove("tts-word-active");
              words[i].classList.add("tts-word-read");
            } else {
              words[i].classList.remove("tts-word-active", "tts-word-read");
            }
          }

          lastActiveWordIdxRef.current = activeIndex;

          // Intelligent Dynamic Auto-scroll:
          // Whatever word is currently spoken is always kept in visible view.
          // When speech approaches the bottom of the screen, smoothly scroll down ~2 lines (~80px).
          const activeEl = words[activeIndex];
          if (activeEl) {
            const rect = activeEl.getBoundingClientRect();
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const navbarOffset = 85;
            const bottomThreshold = viewportHeight - 130;
            const now = Date.now();

            if (now - lastScrollTimeRef.current > 650) {
              if (rect.bottom > bottomThreshold) {
                lastScrollTimeRef.current = now;
                const scrollAmount = Math.max(80, rect.bottom - (viewportHeight - 200));
                window.scrollBy({ top: scrollAmount, behavior: "smooth" });
              } else if (rect.top < navbarOffset) {
                lastScrollTimeRef.current = now;
                const scrollAmount = rect.top - navbarOffset - 30;
                window.scrollBy({ top: scrollAmount, behavior: "smooth" });
              }
            }
          }
        }
      };

      audio.onended = () => {
        clearTtsHighlights();
        speakingTypeRef.current = null;
        pausedTypeRef.current = null;
        setSpeakingType(null);
        setPausedType(null);
        pausedShlokaIndexRef.current = null;
        setAudioLoading(false);
        try {
          URL.revokeObjectURL(audioBlobUrl);
        } catch (e) {}

        const list = shlokasRef.current || shlokas;
        const targetShlokaObj = list[targetIdx];
        const targetLoc = getLocalizedShlok(targetShlokaObj || {});
        const hasTranslation = Boolean(extractCleanTextForSpeech(targetLoc.translation || targetShlokaObj?.translation));
        const hasMessage = Boolean(extractCleanTextForSpeech(targetLoc.message || targetShlokaObj?.message));

        // If continuous audio sequence has more parts for this shloka, continue without marking as read yet
        if (type === "sanskrit" && hasTranslation) {
          if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
          autoPlayTimerRef.current = setTimeout(() => {
            startSpeech("translation", targetIdx);
          }, 1000);
        } else if ((type === "sanskrit" || type === "translation") && hasMessage) {
          if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
          autoPlayTimerRef.current = setTimeout(() => {
            startSpeech("message", targetIdx);
          }, 1000);
        } else {
          // Whole audio sequence for this shloka is completed!
          markShlokaAsReadAudio(targetShlokaObj);

          if (isContinuousPlayRef.current) {
            if (autoPlayTimerRef.current) clearTimeout(autoPlayTimerRef.current);
            autoPlayTimerRef.current = setTimeout(() => {
              advanceToNextShloka();
            }, 2000);
          }
        }
      };

      audio.onerror = () => {
        console.error("Audio playback error occurred");
        clearTtsHighlights();
        speakingTypeRef.current = null;
        pausedTypeRef.current = null;
        setSpeakingType(null);
        setPausedType(null);
        pausedShlokaIndexRef.current = null;
        setAudioLoading(false);
        if (autoPlayTimerRef.current) {
          clearTimeout(autoPlayTimerRef.current);
          autoPlayTimerRef.current = null;
        }
      };

      await audio.play();
      setAudioLoading(false);
    } catch (err) {
      console.warn("Neural TTS playback error, falling back to browser speech synthesis:", err);
      playWebSpeechFallback(textToSpeak, langCode, type, targetIdx);
    }
  };

  // Main user button click handler (Toggles Stop / Resume / Play)
  const toggleSpeech = async (type, overrideIndex = null) => {
    if (speakingTypeRef.current === type) {
      pauseSpeech(type);
    } else if (
      pausedTypeRef.current === type &&
      pausedShlokaIndexRef.current === currentShloka &&
      audioPlayerRef.current &&
      !audioPlayerRef.current.ended
    ) {
      await resumeSpeech(type);
    } else {
      await startSpeech(type, overrideIndex);
    }
  };

  // Stop any ongoing speech or audio playback when switching shlokas manually, or handle auto-advance
  useEffect(() => {
    currentShlokaRef.current = currentShloka;

    if (autoPlayNextShlokaRef.current) {
      // Auto-advance from previous shloka: start Sanskrit audio for this new shloka
      autoPlayNextShlokaRef.current = false;
      speakingTypeRef.current = null;
      pausedTypeRef.current = null;
      setPausedType(null);
      pausedShlokaIndexRef.current = null;
      startSpeech("sanskrit", currentShloka);
      return;
    }

    // Manual shloka change (user selected another shloka / clicked next or prev / initial load):
    // Stop continuous autoplay and ongoing audio immediately, and reset paused/resume states
    isContinuousPlayRef.current = false;
    clearTtsHighlights();
    speakingTypeRef.current = null;
    pausedTypeRef.current = null;
    setPausedType(null);
    pausedShlokaIndexRef.current = null;
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    setSpeakingType(null);
    setAudioLoading(false);
  }, [currentShloka]);

  // Stop audio immediately when chapter changes
  useEffect(() => {
    isContinuousPlayRef.current = false;
    autoPlayNextShlokaRef.current = false;
    clearTtsHighlights();
    speakingTypeRef.current = null;
    pausedTypeRef.current = null;
    setPausedType(null);
    pausedShlokaIndexRef.current = null;
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    setSpeakingType(null);
    setAudioLoading(false);
  }, [currentChapterNumber]);

  // Stop audio when navigating away from page or on browser back/forward
  useEffect(() => {
    const handleNavigationStop = () => {
      isContinuousPlayRef.current = false;
      autoPlayNextShlokaRef.current = false;
      clearTtsHighlights();
      speakingTypeRef.current = null;
      pausedTypeRef.current = null;
      setPausedType(null);
      pausedShlokaIndexRef.current = null;
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      }
      setSpeakingType(null);
      setAudioLoading(false);
    };

    window.addEventListener("popstate", handleNavigationStop);

    return () => {
      handleNavigationStop();
      window.removeEventListener("popstate", handleNavigationStop);
    };
  }, []);

  useEffect(() => {
    shlokasRef.current = shlokas;
  }, [shlokas]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Quiet background auto-download of Neural TTS audios for this chapter into IndexedDB (In App Only!)
  // Automatically saves audio in background so the user does NOT need to listen to it online!
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.onLine) return;
    if (!isRunningInStandaloneApp()) return;
    if (!shlokas || shlokas.length === 0) return;

    const currentLang = isEnglish ? "en" : isHindi ? "hi" : "gu";
    autoSyncChapterAudios(
      currentChapterNumber,
      shlokas,
      currentLang,
      currentShloka,
      (prog) => {
        setAudioSyncProgress({
          current: prog.current,
          total: prog.total,
          done: prog.current >= prog.total,
        });
      }
    );

    return () => {
      stopAudioSync();
    };
  }, [currentChapterNumber, shlokas.length, language]);

  const currentShlok = shlokas[currentShloka] || {};
  const currentLocalized = getLocalizedShlok(currentShlok);

  const wrappedTranslationHtml = useMemo(() => {
    return wrapHtmlWithSpans(
      currentLocalized.translation ||
      currentShlok.translation ||
      txt("ગુજરાતી અનુવાદ ઉપલબ્ધ નથી.", "हिन्दी अनुवाद उपलब्ध नहीं है।", "Translation not available.")
    );
  }, [currentLocalized.translation, currentShlok.translation, currentShloka, isEnglish, isHindi]);

  const wrappedMessageHtml = useMemo(() => {
    return wrapHtmlWithSpans(
      currentLocalized.message ||
      currentShlok.message ||
      txt("સંદેશ ઉપલબ્ધ નથી.", "सन्देश उपलब्ध नहीं है।", "Message not available.")
    );
  }, [currentLocalized.message, currentShlok.message, currentShloka, isEnglish, isHindi]);

  // =====================================================
  // INVALID CHAPTER
  // =====================================================

  if (
    currentChapterNumber < 1 ||
    currentChapterNumber > 18
  ) {
    return (
      <main className="chapter-reader">
        <div className="reader-error-card">
          <div className="error-icon">
            <AlertCircle size={48} color="#ef4444" />
          </div>

          <h1>{txt("અધ્યાય મળ્યો નથી", "अध्याय नहीं मिला", "Chapter Not Found")}</h1>

          <p>{txt("તમે પસંદ કરેલો અધ્યાય ઉપલબ્ધ નથી.", "आपका चुना हुआ अध्याय उपलब्ध नहीं है।", "The selected chapter is not available.")}</p>

          <button
            className="error-back-button"
            onClick={() =>
              navigate("/chapters")
            }
          >
            {txt("૧૮ અધ્યાય પર પાછા જાઓ", "18 अध्यायों पर वापस जाएं", "Back to 18 Chapters")}
          </button>
        </div>
      </main>
    );
  }

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="chapter-reader">
        <SudarshanShimmerLoader
          type="reader"
          title={
            txt(
              `અધ્યાય ${chapterNumber || ""} ના શ્લોક લોડ થઈ રહ્યા છે...`,
              `अध्याय ${chapterNumber || ""} के श्लोक लोड हो रहे हैं...`,
              `Loading shlokas for Chapter ${chapterNumber || ""}...`
            )
          }
          subtitle={
            txt(
              "કૃપા કરીને થોડી ક્ષણ રાહ જુઓ ॥ શ્રીકૃષ્ણાર્પણમસ્તુ ॥",
              "कृपया कुछ क्षण प्रतीक्षा करें ॥ श्रीकृष्णार्पणमस्तु ॥",
              "Please wait a moment ॥ Sri Krishnarpanamastu ॥"
            )
          }
        />
      </main>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <main className="chapter-reader">
        <div className="reader-error-card">
          <div className="error-icon">
            <AlertCircle size={48} color="#ef4444" />
          </div>

          <h1>{txt("કંઈક સમસ્યા આવી", "कुछ समस्या आई", "Something went wrong")}</h1>

          <p>{error}</p>

          <button
            className="error-back-button"
            onClick={() =>
              navigate("/chapters")
            }
          >
            {txt("૧૮ અધ્યાય પર પાછા જાઓ", "18 अध्यायों पर वापस जाएं", "Back to 18 Chapters")}
          </button>
        </div>
      </main>
    );
  }

  // =====================================================
  // EMPTY CHAPTER
  // =====================================================

  if (shlokas.length === 0) {
    return (
      <main className="chapter-reader">
        <section className="reader-header">
          <div className="reader-om">
            ॐ
          </div>

          <p className="reader-sacred-title">
            ॥ श्रीमद्भगवद्गीता ॥
          </p>

          <h1>
            {txt("અધ્યાય", "अध्याय", "Chapter")}{" "}
            {currentChapterNumber}
          </h1>

          <h2>
            {chapterName}
          </h2>
        </section>

        <div className="reader-empty-card">
          <div className="empty-icon">
            <BookOpen size={48} color="#3b82f6" />
          </div>

          <h2>{txt("આ અધ્યાયમાં હજુ કોઈ શ્લોક નથી", "इस अध्याय में अभी कोई श्लोक नहीं है", "No shlokas in this chapter yet")}</h2>

          <p>{txt("Admin Panelમાંથી આ અધ્યાયના શ્લોક add કરો.", "एडमिन पैनल से इस अध्याय के श्लोक जोड़ें।", "Add shlokas for this chapter from Admin Panel.")}</p>

          <button
            className="error-back-button"
            onClick={() =>
              navigate("/chapters")
            }
          >{txt("૧૮ અધ્યાય", "18 अध्याय", "18 Chapters")}</button>
        </div>
      </main>
    );
  }

  // =====================================================
  // CURRENT SHLOKA
  // =====================================================

  const shloka = currentShlok;
  const localized = currentLocalized;

  const currentChapterTitle = isEnglish
    ? (CHAPTER_NAMES[currentChapterNumber]?.en || `Chapter ${currentChapterNumber}`)
    : (isHindi
        ? (shloka.chapterNameHi || chapterNamesHi[currentChapterNumber] || chapterName)
        : (chapterName || chapterNames[currentChapterNumber] || `અધ્યાય ${currentChapterNumber}`));



  // =====================================================
  // NEXT SHLOK
  // =====================================================





const nextShloka = () => {
  if (
    currentShloka <
    shlokas.length - 1
  ) {
    const nextIndex =
      currentShloka + 1;

    const next =
      shlokas[nextIndex];

    // =====================================================
    // LOGIN REQUIRED AFTER 5 SHLOKAS
    // =====================================================

if (
  !user &&
  Number(next?.shlokNumber) > 5
) {
  if (isOfflineMode || !navigator.onLine) {
    alert(
      txt(
        "ઑફલાઇનમાં ૫ થી વધુ શ્લોક વાંચવા માટે Login કરવું જરૂરી છે. કૃપા કરીને ઇન્ટરનેટ ચાલુ કરીને Login કરો.",
        "ऑफ़लाइन में 5 से अधिक श्लोक पढ़ने के लिए Login करना आवश्यक है। कृपया इंटरनेट चालू करके Login करें।",
        "Login is required to read more than 5 shlokas offline. Please connect to the internet and login."
      )
    );
    return;
  }
  const redirectPath = `/chapter/${currentChapterNumber}?shloka=${next.shlokNumber}`;
  const redirectMsg = txt(
    `અધ્યાય ${currentChapterNumber} ના શ્લોક ${next.shlokNumber} વાંચવા માટે Login કરવું જરૂરી છે.`,
    `अध्याय ${currentChapterNumber} के श्लोक ${next.shlokNumber} पढ़ने के लिए Login करना आवश्यक है।`,
    `Login is required to read Chapter ${currentChapterNumber}, Shloka ${next.shlokNumber}.`
  );

  localStorage.setItem(
    "pendingChapter",
    String(currentChapterNumber)
  );

  localStorage.setItem(
    "pendingShloka",
    String(next.shlokNumber)
  );

  sessionStorage.setItem(
    "authRedirect",
    JSON.stringify({
      from: redirectPath,
      message: redirectMsg,
    })
  );

  navigate("/login", {
    replace: true,
    state: {
      from: redirectPath,
      message: redirectMsg,
    },
  });
  return;
}

    setCurrentShloka(
      nextIndex
    );

    setActiveWordIndex(null);

    // Continue Reading
    if (next) {
      saveContinueReading(
        currentChapterNumber,
        next.shlokNumber
      );
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }
};

  // =====================================================
  // PREVIOUS SHLOK
  // =====================================================

  const previousShloka = () => {
    if (currentShloka > 0) {
      const previousIndex =
        currentShloka - 1;

      setCurrentShloka(
        previousIndex
      );

      setActiveWordIndex(null);

      // Continue Reading
      const previous =
        shlokas[previousIndex];

      if (previous) {
        saveContinueReading(
          currentChapterNumber,
          previous.shlokNumber
        );
      }

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });



    }
  };

  // =====================================================
  // NEXT CHAPTER
  // =====================================================

  const nextChapter = () => {
    const nextChapterNumber =
      currentChapterNumber + 1;

    if (nextChapterNumber <= 18) {
      setActiveWordIndex(null);

      // Save current reading position
      saveContinueReading(
        currentChapterNumber,
        shloka.shlokNumber
      );

      try {
        sessionStorage.setItem(`gita_last_shloka_ch_${nextChapterNumber}`, "1");
        localStorage.setItem(`gita_last_shloka_ch_${nextChapterNumber}`, "1");
      } catch (e) {}

      navigate(
        `/chapter/${nextChapterNumber}?shloka=1`
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  // =====================================================
  // PREVIOUS CHAPTER
  // =====================================================

  const previousChapter = () => {
    const previousChapterNumber =
      currentChapterNumber - 1;

    if (
      previousChapterNumber >= 1
    ) {
      setActiveWordIndex(null);

      // Save current reading position
      saveContinueReading(
        currentChapterNumber,
        shloka.shlokNumber
      );

      try {
        sessionStorage.setItem(`gita_last_shloka_ch_${previousChapterNumber}`, "1");
        localStorage.setItem(`gita_last_shloka_ch_${previousChapterNumber}`, "1");
      } catch (e) {}

      navigate(
        `/chapter/${previousChapterNumber}?shloka=1`
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  // =====================================================
  // PROGRESS
  // =====================================================

  const progress =
    ((currentShloka + 1) /
      shlokas.length) *
    100;

  // =====================================================
  // GET WORD MEANING
  // =====================================================

  const getWordMeaning = (word) => {
    const wordMeanings =
      Array.isArray(localized?.wordMeanings) && localized.wordMeanings.length > 0
        ? localized.wordMeanings
        : Array.isArray(shloka.wordMeanings)
        ? shloka.wordMeanings
        : [];

    const cleanWord =
      normalizeWord(word);

    if (!cleanWord) {
      return null;
    }

    const foundMeaning =
      wordMeanings.find((item) => {
        const databaseWord =
          normalizeWord(
            item?.word
          );

        return (
          databaseWord === cleanWord
        );
      });

    return foundMeaning || null;
  };

  // =====================================================
  // HANDLE WORD CLICK
  // =====================================================

  const handleWordClick = (index) => {
    if (
      activeWordIndex === index
    ) {
      setActiveWordIndex(null);
    } else {
      setActiveWordIndex(index);
    }
  };

  // =====================================================
  // PREPARE SANSKRIT WORDS
  // =====================================================

const prepareSanskritLines = () => {
  const plainSanskrit =
    removeHtml(shloka?.sanskrit);

  if (!plainSanskrit) {
    return [];
  }

  const rawLines = plainSanskrit
    .split(/\n+/)
    .map((line) =>
      line
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);

  // If already 2 or more lines, faithfully preserve the database / user line structure
  if (rawLines.length >= 2) {
    return rawLines.map((line) =>
      line
        .split(" ")
        .filter(Boolean)
    );
  }

  // If only 1 line, check if a Sanskrit single danda '।' divides the two halves
  if (rawLines.length === 1) {
    const single = rawLines[0];
    const dandaMatch = single.match(/^(.*?।(?!\s*।))\s+(.+)$/);
    if (dandaMatch && dandaMatch[1].trim() && dandaMatch[2].trim()) {
      return [
        dandaMatch[1].trim().split(" ").filter(Boolean),
        dandaMatch[2].trim().split(" ").filter(Boolean),
      ];
    }

    // Collect all words
    const allWords = single
      .split(" ")
      .filter(Boolean);

    if (allWords.length === 0) {
      return [];
    }

    // Split into exactly 2 lines
    const middle = Math.ceil(
      allWords.length / 2
    );

    return [
      allWords.slice(0, middle),
      allWords.slice(middle),
    ];
  }

  return [];
};

  // =====================================================
  // RENDER SANSKRIT
  // =====================================================

  const renderSanskritWords =
    () => {
      const lines =
        prepareSanskritLines();

      if (lines.length === 0) {
        return (
          <div className="sanskrit-original">
            {txt("સંસ્કૃત શ્લોક ઉપલબ્ધ નથી.", "संस्कृत श्लोक उपलब्ध नहीं है।", "Sanskrit shloka not available.")}
          </div>
        );
      }

      let globalWordIndex = 0;

      return (
        <div className="sanskrit-word-container">
          {lines.map(
            (
              line,
              lineIndex
            ) => (
              <div
                className="sanskrit-line"
                key={`sanskrit-line-${lineIndex}`}
              >
                {line.map(
                  (
                    word,
                    wordPosition
                  ) => {
                    const isPunctuationOrNumber = /^[|।॥\d\.\-०-९\s]+$/.test(word.trim());
                    if (isPunctuationOrNumber) {
                      return (
                        <span
                          key={`punct-${lineIndex}-${wordPosition}`}
                          className="sanskrit-punctuation"
                        >
                          {word}
                          {wordPosition < line.length - 1 && (
                            <span className="sanskrit-word-space">{" "}</span>
                          )}
                        </span>
                      );
                    }

                    const wordIndex =
                      globalWordIndex++;

                    const meaning =
                      getWordMeaning(
                        word
                      );

                    const isActive =
                      activeWordIndex ===
                      wordIndex;

                    return (
                      <span
                        key={`${word}-${wordIndex}`}
                        className="sanskrit-word-wrapper"
                      >
                        <span
                          className={`sanskrit-word tts-word ${
                            isActive
                              ? "active-word"
                              : meaning
                              ? "clickable-word"
                              : ""
                          }`}
                          data-word-idx={wordIndex}
                          onClick={() => {
                            if (
                              meaning
                            ) {
                              handleWordClick(
                                wordIndex
                              );
                            }
                          }}
                          title={
                            meaning
                              ? (isEnglish && meaning.meaningEn && meaning.meaningEn.trim()
                                  ? "Click to view English meaning"
                                  : isHindi && meaning.meaningHi && meaning.meaningHi.trim()
                                  ? "हिन्दी अर्थ देखने के लिए क्लिक करें"
                                  : "ગુજરાતી અર્થ જોવા માટે click કરો")
                              : undefined
                          }
                        >
                          {word}
                        </span>

                        {wordPosition <
                          line.length -
                            1 && (
                          <span className="sanskrit-word-space">
                            {" "}
                          </span>
                        )}

                        {isActive &&
                          meaning && (
                          <span className="word-meaning-popup">
                            <span className="word-meaning-sanskrit">
                              {word}
                            </span>

                            <span className="word-meaning-arrow">
                              →
                            </span>

                            <span className="word-meaning-gujarati">
                              {isEnglish && meaning.meaningEn && meaning.meaningEn.trim()
                                ? meaning.meaningEn.trim()
                                : isHindi && meaning.meaningHi && meaning.meaningHi.trim()
                                ? meaning.meaningHi.trim()
                                : meaning.meaning}
                            </span>
                          </span>
                        )}
                      </span>
                    );
                  }
                )}
              </div>
            )
          )}
        </div>
      );
    };

  // Speed dropdown shown next to audio button when audio is active (speaking or paused)
  const renderSpeedDropdown = (sectionType) => {
    const isSectionActive =
      speakingType === sectionType ||
      (pausedType === sectionType && pausedShlokaIndexRef.current === currentShloka);

    if (!isSectionActive) return null;

    const isOpen = speedDropdownOpen === sectionType;
    const speeds = [
      { value: 0.75, label: "0.75x", desc: txt("ધીમી", "धीमी", "Slow") },
      { value: 1.0, label: "1.0x", desc: txt("સામાન્ય", "सामान्य", "Normal") },
      { value: 1.25, label: "1.25x", desc: txt("ઝડપી", "तेज़", "Fast") },
      { value: 1.5, label: "1.5x", desc: txt("વધુ ઝડપી", "अधिक तेज़", "Faster") },
      { value: 1.75, label: "1.75x", desc: txt("અતિ ઝડપી", "अति तेज़", "Very Fast") },
      { value: 2.0, label: "2.0x", desc: txt("૨x ઝડપ", "2x गति", "2x Speed") },
    ];

    return (
      <div className="cr-speed-dropdown-container">
        <button
          type="button"
          className={`cr-speed-btn ${isOpen ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setSpeedDropdownOpen(isOpen ? null : sectionType);
          }}
          title={txt("ઑડિયો સ્પીડ બદલો", "ऑडियो स्पीड बदलें", "Change Audio Speed")}
          aria-label="Change Audio Speed"
        >
          <Gauge size={13} className="cr-speed-gauge-icon" />
          <span>{audioSpeed}x</span>
          <ChevronDown size={12} className={`cr-speed-chevron ${isOpen ? "open" : ""}`} />
        </button>

        {isOpen && (
          <div className="cr-speed-menu" onClick={(e) => e.stopPropagation()}>
            <div className="cr-speed-menu-header">
              {txt("ઑડિયો સ્પીડ", "ऑडियो गति", "Audio Speed")}
            </div>
            {speeds.map((s) => {
              const isSelected = Math.abs(audioSpeed - s.value) < 0.01;
              return (
                <button
                  key={s.value}
                  type="button"
                  className={`cr-speed-option ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    handleAudioSpeedChange(s.value);
                    setSpeedDropdownOpen(null);
                  }}
                >
                  <span className="cr-speed-value">{s.label}</span>
                  <span className="cr-speed-desc">{s.desc}</span>
                  {isSelected && <span className="cr-speed-check">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <main className="chapter-reader">

      {/* =================================================
          HEADER
      ================================================= */}

      <section className="reader-header">
        <div className="reader-om">
          ॐ
        </div>

        <h1>
          {txt(`અધ્યાય ${currentChapterNumber}`, `अध्याय ${currentChapterNumber}`, `Chapter ${currentChapterNumber}`)}
        </h1>

        <h2>
          {currentChapterTitle}
        </h2>

        {isOfflineMode ? (
          <div className="cr-offline-pill" title={txt("ઑફલાઇન મોડમાં વાંચી રહ્યા છો", "ऑफ़लाइन मोड में पढ़ रहे हैं", "Reading in Offline Mode")}>
            <span className="cr-offline-dot"></span>
            {txt("ઑફલાઇન વાંચન", "ऑफ़लाइन पठन", "Offline Reading")}
          </div>
        ) : typeof window !== "undefined" && isRunningInStandaloneApp() && audioSyncProgress.total > 0 ? (
          <div
            className={`cr-audio-sync-pill ${audioSyncProgress.done ? "ready" : "syncing"}`}
            title={
              audioSyncProgress.done
                ? txt("બધા શ્લોકનો ઑડિયો ઑફલાઇન તૈયાર છે", "सभी श्लोकों का ऑडियो ऑफ़लाइन तैयार है", "All audio cached offline")
                : txt("ઑફલાઇન માટે ઑડિયો સેવ થઈ રહ્યો છે", "ऑफ़लाइन के लिए ऑडियो सहेजा जा रहा है", "Saving audio for offline")
            }
          >
            {audioSyncProgress.done ? (
              <span>{txt("ઑડિયો ઑફલાઇન તૈયાર", "ऑडियो ऑफ़लाइन तैयार", "Audio Offline Ready")}</span>
            ) : (
              <span>
                {txt(
                  `ઑફલાઇન માટે ઑડિયો સેવ થાય છે (${audioSyncProgress.current}/${audioSyncProgress.total})`,
                  `ऑफ़लाइन के लिए ऑडियो सहेजा जा रहा है (${audioSyncProgress.current}/${audioSyncProgress.total})`,
                  `Saving Audio Offline (${audioSyncProgress.current}/${audioSyncProgress.total})`
                )}
              </span>
            )}
          </div>
        ) : null}
      </section>

      {/* =================================================
          PROGRESS
      ================================================= */}

      <section className="reader-progress">
        <div className="progress-info">
          <span>
            {txt("શ્લોક ", "श्लोक ", "Shloka ")}
            {shloka.shlokNumber}
            {" / "}
            {shlokas.length}
          </span>

          <span>
            {Math.round(progress)}%
          </span>
        </div>

        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </section>

      {/* =================================================
          CURRENT SHLOKA CARD
      ================================================= */}

      <section className="shloka-card">

        {/* PREVIOUS SHLOK */}

        <button
          type="button"
          className="shloka-side-button shloka-prev-button"
          onClick={previousShloka}
          disabled={
            currentShloka === 0
          }
          aria-label={txt("પાછલો શ્લોક", "पिछला श्लोक", "Previous Shloka")}
          title={txt("પાછલો શ્લોક", "पिछला श्लोक", "Previous Shloka")}
        >
          <ChevronLeft size={28} />
        </button>

        {/* MAIN CONTENT */}

        <div className="shloka-main-content">

          {/* SHLOK NUMBER */}

          <div className="shloka-number">
            {txt("શ્લોક ", "श्लोक ", "Shloka ")}
            {shloka.shlokNumber}
          </div>

          {/* TOP ACTIONS: SHARE CARD & FAVOURITE BUTTON */}

          <div className="shloka-top-actions">
            <button
              type="button"
              className="share-shloka-button"
              onClick={() => setShareModalOpen(true)}
              aria-label={txt("શ્લોક કાર્ડ શેર કરો", "श्लोक कार्ड शेयर करें", "Share Shloka Card")}
              title={txt("શ્લોક કાર્ડ શેર કરો / ડાઉનલોડ કરો", "श्लोक कार्ड शेयर / डाउनलोड करें", "Share / Download Shloka Card")}
            >
              <Share2 size={20} />
            </button>

            <button
              type="button"
              className={
                isFavorite(shloka)
                  ? "favorite-shloka-button favorited active"
                  : "favorite-shloka-button"
              }
              onClick={
                toggleFavorite
              }
              disabled={favoriteLoading}
              aria-label={
                isFavorite(shloka)
                  ? txt("Favouriteમાંથી દૂર કરો", "पसंदीदा से हटाएं", "Remove from Favorites")
                  : txt("Favouriteમાં ઉમેરો", "पसंदीदा में जोड़ें", "Add to Favorites")
              }
              title={
                isFavorite(shloka)
                  ? txt("Favouriteમાંથી દૂર કરો", "पसंदीदा से हटाएं", "Remove from Favorites")
                  : txt("Favouriteમાં ઉમેરો", "पसंदीदा में जोड़ें", "Add to Favorites")
              }
            >
              {isFavorite(shloka)
                ? <Heart fill="#ef4444" color="#ef4444" size={20} />
                : <Heart size={20} />}
            </button>
          </div>


          {/* SPEAKER */}

          <div className="speaker">
            <Mic className="btn-icon" size={16} /> {localized.speaker || shloka.speaker}
          </div>

          {/* =================================================
              SANSKRIT (PURE SANSKRIT - PRESERVED 100%)
          ================================================= */}

          <div className={`content-box sanskrit-box ${(speakingType === "sanskrit" || (pausedType === "sanskrit" && pausedShlokaIndexRef.current === currentShloka)) ? "tts-box-active" : ""}`}>

            <div className="content-box-header">
              <h3>
                <Sparkles className="btn-icon" size={18} /> {txt("સંસ્કૃત શ્લોક", "संस्कृत श्लोक", "Sanskrit Shloka")}
              </h3>

              <div className="content-box-header-actions">
                {renderSpeedDropdown("sanskrit")}

                <button
                  type="button"
                  className={`shloka-speech-btn ${
                    speakingType === "sanskrit"
                      ? "is-speaking"
                      : pausedType === "sanskrit" && pausedShlokaIndexRef.current === currentShloka
                      ? "is-paused"
                      : ""
                  }`}
                  onClick={() => toggleSpeech("sanskrit")}
                  title={
                    speakingType === "sanskrit"
                      ? txt("ઓડિયો સ્ટોપ કરો", "ऑडियो स्टॉप करें", "Stop Audio")
                      : pausedType === "sanskrit" && pausedShlokaIndexRef.current === currentShloka
                      ? txt("ઓડિયો ફરી ચાલુ કરો", "ऑडियो फिर से शुरू करें", "Resume Audio")
                      : txt("શ્લોક સાંભળો", "श्लोक सुनें", "Listen to Shloka")
                  }
                  aria-label={
                    speakingType === "sanskrit"
                      ? "Stop Audio"
                      : pausedType === "sanskrit" && pausedShlokaIndexRef.current === currentShloka
                      ? "Resume Audio"
                      : "Listen to Sanskrit Shloka Audio"
                  }
                >
                  {speakingType === "sanskrit" ? (
                    audioLoading ? (
                      <span>{txt("લોડ થાય છે...", "लोड हो रहा है...", "Loading...")}</span>
                    ) : (
                      <>
                        <Square size={12} fill="currentColor" />
                        <span>{txt("સ્ટોપ", "स्टॉप", "Stop")}</span>
                      </>
                    )
                  ) : pausedType === "sanskrit" && pausedShlokaIndexRef.current === currentShloka ? (
                    <>
                      <Play size={13} fill="currentColor" />
                      <span>{txt("ચાલુ કરો", "जारी रखें", "Resume")}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={15} />
                      <span>{txt("સાંભળો", "सुनें", "Listen")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div
              ref={sanskritRef}
              className={`sanskrit formatted-content ${(speakingType === "sanskrit" || (pausedType === "sanskrit" && pausedShlokaIndexRef.current === currentShloka)) ? "tts-section-active" : ""}`}
              style={{
                fontSize: `${sanskritFontSize}px`,
              }}
            >
              {renderSanskritWords()}
            </div>

            {/* WORD MEANING INFO */}

            <div className="word-meaning-info">
              <BookOpen className="btn-icon" size={14} />{" "}
              {txt(
                "સંસ્કૃત શબ્દનો અર્થ ઉપલબ્ધ છે તેના પર click કરીને ગુજરાતી અર્થ જુઓ.",
                "संस्कृत शब्द पर क्लिक करके उसका हिन्दी अर्थ देखें।",
                "Click on any Sanskrit word to view its meaning."
              )}
            </div>

          </div>

          {/* =================================================
              TRANSLATION
          ================================================= */}

          <div className={`content-box translation-box ${(speakingType === "translation" || (pausedType === "translation" && pausedShlokaIndexRef.current === currentShloka)) ? "tts-box-active" : ""}`}>

            <div className="content-box-header">
              <h3>
                <BookOpen className="btn-icon" size={18} /> {txt("ગુજરાતી અનુવાદ", "हिन्दी अनुवाद", "English Translation")}
              </h3>

              <div className="content-box-header-actions">
                {renderSpeedDropdown("translation")}

                <button
                  type="button"
                  className={`shloka-speech-btn ${
                    speakingType === "translation"
                      ? "is-speaking"
                      : pausedType === "translation" && pausedShlokaIndexRef.current === currentShloka
                      ? "is-paused"
                      : ""
                  }`}
                  onClick={() => toggleSpeech("translation")}
                  title={
                    speakingType === "translation"
                      ? txt("ઓડિયો સ્ટોપ કરો", "ऑडियो स्टॉप करें", "Stop Audio")
                      : pausedType === "translation" && pausedShlokaIndexRef.current === currentShloka
                      ? txt("ઓડિયો ફરી ચાલુ કરો", "ऑडियो फिर से शुरू करें", "Resume Audio")
                      : txt("અનુવાદ સાંભળો", "अनुवाद सुनें", "Listen to Translation")
                  }
                  aria-label={
                    speakingType === "translation"
                      ? "Stop Audio"
                      : pausedType === "translation" && pausedShlokaIndexRef.current === currentShloka
                      ? "Resume Audio"
                      : "Listen to Translation Audio"
                  }
                >
                  {speakingType === "translation" ? (
                    audioLoading ? (
                      <span>{txt("લોડ થાય છે...", "लोड हो रहा है...", "Loading...")}</span>
                    ) : (
                      <>
                        <Square size={12} fill="currentColor" />
                        <span>{txt("સ્ટોપ", "स्टॉप", "Stop")}</span>
                      </>
                    )
                  ) : pausedType === "translation" && pausedShlokaIndexRef.current === currentShloka ? (
                    <>
                      <Play size={13} fill="currentColor" />
                      <span>{txt("ચાલુ કરો", "जारी रखें", "Resume")}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={15} />
                      <span>{txt("સાંભળો", "सुनें", "Listen")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div
              ref={translationContainerRef}
              className={`gujarati-meaning formatted-content ${(speakingType === "translation" || (pausedType === "translation" && pausedShlokaIndexRef.current === currentShloka)) ? "tts-section-active" : ""}`}
              dangerouslySetInnerHTML={{
                __html: wrappedTranslationHtml,
              }}
            />

          </div>

          {/* =================================================
              MESSAGE
          ================================================= */}

          <div className={`content-box message-box ${(speakingType === "message" || (pausedType === "message" && pausedShlokaIndexRef.current === currentShloka)) ? "tts-box-active" : ""}`}>

            <div className="content-box-header">
              <h3>
                <Sparkles className="btn-icon" size={18} /> {txt("સંદેશ / સમજણ", "सन्देश / व्याख्या", "Message / Meaning")}
              </h3>

              <div className="content-box-header-actions">
                {renderSpeedDropdown("message")}

                <button
                  type="button"
                  className={`shloka-speech-btn ${
                    speakingType === "message"
                      ? "is-speaking"
                      : pausedType === "message" && pausedShlokaIndexRef.current === currentShloka
                      ? "is-paused"
                      : ""
                  }`}
                  onClick={() => toggleSpeech("message")}
                  title={
                    speakingType === "message"
                      ? txt("ઓડિયો સ્ટોપ કરો", "ऑडियो स्टॉप करें", "Stop Audio")
                      : pausedType === "message" && pausedShlokaIndexRef.current === currentShloka
                      ? txt("ઓડિયો ફરી ચાલુ કરો", "ऑडियो फिर से शुरू करें", "Resume Audio")
                      : txt("સંદેશ સાંભળો", "सन्देश सुनें", "Listen to Message")
                  }
                  aria-label={
                    speakingType === "message"
                      ? "Stop Audio"
                      : pausedType === "message" && pausedShlokaIndexRef.current === currentShloka
                      ? "Resume Audio"
                      : "Listen to Message Audio"
                  }
                >
                  {speakingType === "message" ? (
                    audioLoading ? (
                      <span>{txt("લોડ થાય છે...", "लोड हो रहा है...", "Loading...")}</span>
                    ) : (
                      <>
                        <Square size={12} fill="currentColor" />
                        <span>{txt("સ્ટોપ", "स्टॉप", "Stop")}</span>
                      </>
                    )
                  ) : pausedType === "message" && pausedShlokaIndexRef.current === currentShloka ? (
                    <>
                      <Play size={13} fill="currentColor" />
                      <span>{txt("ચાલુ કરો", "जारी रखें", "Resume")}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={15} />
                      <span>{txt("સાંભળો", "सुनें", "Listen")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div
              ref={messageContainerRef}
              className={`message-text formatted-content ${(speakingType === "message" || (pausedType === "message" && pausedShlokaIndexRef.current === currentShloka)) ? "tts-section-active" : ""}`}
              dangerouslySetInnerHTML={{
                __html: wrappedMessageHtml,
              }}
            />

          </div>

        </div>

        {/* NEXT SHLOK */}

        <button
          type="button"
          className="shloka-side-button shloka-next-button"
          onClick={nextShloka}
          disabled={
            currentShloka ===
            shlokas.length - 1
          }
          aria-label={txt("આગળનો શ્લોક", "अगला श्लोक", "Next Shloka")}
          title={txt("આગળનો શ્લોક", "अगला श्लोक", "Next Shloka")}
        >
          <ChevronRight size={28} />
        </button>

      </section>

      {/* =====================================================
          CHAPTER NAVIGATION
      ===================================================== */}

      <section className="chapter-navigation">

        {/* PREVIOUS CHAPTER */}

        <button
          type="button"
          className="chapter-nav-button previous-chapter-button"
          onClick={
            previousChapter
          }
          disabled={
            currentChapterNumber ===
            1
          }
        >
          <ChevronLeft size={26} style={{ marginRight: '10px' }} />
          <span className="chapter-nav-text">
            <h3>
              {txt("પાછલો અધ્યાય", "पिछला अध्याय", "Previous Chapter")}
            </h3>

            {currentChapterNumber >
              1 && (
              <strong>
                {txt(`અધ્યાય ${currentChapterNumber - 1}`, `अध्याय ${currentChapterNumber - 1}`, `Chapter ${currentChapterNumber - 1}`)}
              </strong>
            )}
          </span>
        </button>

        {/* CURRENT CHAPTER */}

        <div className="chapter-nav-center">
          <span>
            {txt(`અધ્યાય ${currentChapterNumber}`, `अध्याय ${currentChapterNumber}`, `Chapter ${currentChapterNumber}`)}
          </span>

          <div>
            {currentChapterTitle}
          </div>
        </div>

        {/* NEXT CHAPTER */}

        <button
          type="button"
          className="chapter-nav-button next-chapter-button"
          onClick={nextChapter}
          disabled={
            currentChapterNumber ===
            18
          }
        >
          <span className="chapter-nav-text">
            <h3>
              {txt("આગળનો અધ્યાય", "अगला अध्याय", "Next Chapter")}
            </h3>

            {currentChapterNumber <
              18 && (
              <strong>
                {txt(`અધ્યાય ${currentChapterNumber + 1}`, `अध्याय ${currentChapterNumber + 1}`, `Chapter ${currentChapterNumber + 1}`)}
              </strong>
            )}
          </span>
          <ChevronRight size={26} style={{ marginLeft: '10px' }} />
        </button>

      </section>

      {/* =====================================================
          ALL SHLOK BUTTONS
      ===================================================== */}

      <section className="chapter-shloka-selector">

        <div className="shloka-selector-header">

          <div>
            <span className="selector-small-title">
              <BookOpen className="btn-icon" size={14} />{" "}
              {txt(`અધ્યાય ${currentChapterNumber}`, `अध्याय ${currentChapterNumber}`, `Chapter ${currentChapterNumber}`)}
            </span>

            <h2>
              {txt("બધા શ્લોક", "सभी श्लोक", "All Shlokas")}
            </h2>
          </div>

          <div className="selector-count">
            <strong>
              {shlokas.length}
            </strong>

            <span>
              {txt("શ્લોક", "श्लोक", "Shlokas")}
            </span>
          </div>

        </div>

        {/* SHLOK BUTTON GRID */}

        <div className="chapter-shloka-grid">

          {shlokas.map(
            (item, index) => {
              const isActive =
                index ===
                currentShloka;

              return (
                <button
                  key={
                    item._id ||
                    `${item.shlokNumber}-${index}`
                  }
                  type="button"
                  className={
                    isActive
                      ? "chapter-shloka-button active"
                      : "chapter-shloka-button"
                  }
                  onClick={() =>
                    selectShloka(
                      index
                    )
                  }
                  aria-label={
                    txt(`શ્લોક ${item.shlokNumber}`, `श्लोक ${item.shlokNumber}`, `Shloka ${item.shlokNumber}`)
                  }
                  aria-current={
                    isActive
                      ? "true"
                      : undefined
                  }
                >
                  <span className="shlok-btn-label">
                    {txt("શ્લોક", "श्लोक", "Shloka")}
                  </span>

                  <strong>
                    {item.shlokNumber}
                  </strong>

                  {isActive && (
                    <span className="active-shlok-indicator">
                      ●
                    </span>
                  )}
                </button>
              );
            }
          )}

        </div>

      </section>

      {/* =================================================
          SHARE SHLOKA CARD MODAL
      ================================================= */}
      {shloka && (
        <ShareShlokaModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          shlokaData={{
            chapterNumber: currentChapterNumber,
            chapterName: currentChapterTitle,
            shlokNumber: shloka.shlokNumber,
            sanskrit: shloka.sanskrit,
            translation: localized.translation || shloka.translation,
            speaker: localized.speaker || shloka.speaker,
            message: localized.message || shloka.message,
          }}
        />
      )}

      {/* Floating gentle non-blocking audio toast */}
      {audioToast && (
        <div className="cr-audio-toast" role="alert">
          {audioToast}
        </div>
      )}

    </main>
  );
}

export default ChapterReader;