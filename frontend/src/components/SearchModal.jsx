import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  X,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import "../pages/Home.css";
import "./SearchModal.css";

// Global in-memory cache for shlokas so search modal never repeats fetch
let cachedShlokas = null;

export default function SearchModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { txt } = useLanguage();
  const { user } = useAuth();

  const [allShlokas, setAllShlokas] = useState(cachedShlokas || []);
  const [chapterNumber, setChapterNumber] = useState("");
  const [shlokaNumber, setShlokaNumber] = useState("");
  const [searchText, setSearchText] = useState("");
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  const API_URL = isLocal
    ? "http://localhost:5000/api/shloks"
    : "https://bhagavad-gita-backend-jy1a.onrender.com/api/shloks";

  // Chapter Names mapping
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

  // Fetch shlokas on mount if not cached
  useEffect(() => {
    if (cachedShlokas && cachedShlokas.length > 0) {
      setAllShlokas(cachedShlokas);
      return;
    }

    let isMounted = true;
    const fetchAllShlokas = async () => {
      setLoading(true);
      const token = localStorage.getItem("token");

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);

        const response = await fetch(API_URL, {
          signal: controller.signal,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        clearTimeout(timeoutId);

        const data = await response.json();

        if (response.ok && Array.isArray(data.shlokas) && data.shlokas.length > 0) {
          if (isMounted) {
            cachedShlokas = data.shlokas;
            setAllShlokas(data.shlokas);
          }
          return;
        }
      } catch (error) {
        console.warn("SearchModal Shlok Network Error, using bundled fallback:", error.message);
      } finally {
        if (isMounted) setLoading(false);
      }

      // Fallback from bundled shlokas
      try {
        const fallbackMod = await import("../data/fallbackShlokas.json");
        const fallbackMap = fallbackMod.default || fallbackMod;
        const allList = Object.values(fallbackMap).flat();
        if (allList.length > 0 && isMounted) {
          cachedShlokas = allList;
          setAllShlokas(allList);
        }
      } catch (e) {}
    };

    fetchAllShlokas();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Handle ESC and body overflow
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // =====================================================
  // GET CHAPTER MAX SHLOKA
  // =====================================================
  const getChapterMaxShloka = (chapter) => {
    if (!chapter) {
      return 0;
    }

    const chapterShlokas = allShlokas.filter(
      (shlok) => Number(shlok.chapterNumber) === Number(chapter)
    );

    if (chapterShlokas.length === 0) {
      return 0;
    }

    return Math.max(
      ...chapterShlokas.map((shlok) => Number(shlok.shlokNumber) || 0)
    );
  };

  // =====================================================
  // MAX SHLOKA OF ALL CHAPTERS
  // =====================================================
  const getOverallMaxShloka = () => {
    return 78;
  };

  const currentShlokaMax = chapterNumber
    ? getChapterMaxShloka(chapterNumber)
    : getOverallMaxShloka();

  // =====================================================
  // CHAPTER NUMBER CHANGE (WITH ALL RESTRICTIONS)
  // =====================================================
  const handleChapterChange = (event) => {
    let value = event.target.value;

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

    if (number < 1 || number > 18) {
      return;
    }

    setChapterNumber(String(number));

    setMessage("");
    setResult(null);

    const maxShloka = getChapterMaxShloka(number);

    if (maxShloka === 0) {
      setShlokaNumber("0");
      return;
    }

    if (shlokaNumber) {
      const currentShloka = Number(shlokaNumber);

      if (currentShloka > maxShloka) {
        setShlokaNumber(String(maxShloka));
      }

      if (currentShloka === 0) {
        setShlokaNumber("");
      }
    }
  };

  // =====================================================
  // SHLOKA NUMBER CHANGE (WITH ALL RESTRICTIONS)
  // =====================================================
  const handleShlokaChange = (event) => {
    let value = event.target.value;

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

    let number = Number(value);

    const maxShloka = chapterNumber
      ? getChapterMaxShloka(chapterNumber)
      : getOverallMaxShloka();

    if (chapterNumber && maxShloka === 0) {
      setShlokaNumber("0");
      setMessage("");
      setResult(null);
      return;
    }

    if (number < 1) {
      number = 1;
    }

    if (maxShloka > 0 && number > maxShloka) {
      number = maxShloka;
    }

    setShlokaNumber(String(number));

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
    setSearchText(event.target.value);
    setMessage("");
    setResult(null);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  const stripHtml = (html) => {
    if (!html) return "";
    return html.replace(/<[^>]*>?/gm, "");
  };

  // =====================================================
  // SEARCH (WITH ALL EXACT RESTRICTIONS)
  // =====================================================
  const handleSearch = () => {
    const chapterValue = chapterNumber.trim();
    const shlokaValue = shlokaNumber.trim();
    const textValue = searchText.trim().toLowerCase();

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

    if (!chapterValue && !shlokaValue && !textValue) {
      setMessage(
        txt(
          "કૃપા કરીને શોધવા માટે કંઈક લખો.",
          "कृपया खोजने के लिए कुछ लिखें।",
          "Please enter something to search."
        )
      );
      return;
    }

    if (chapterValue && !shlokaValue && !textValue) {
      setMessage(
        txt(
          "માત્ર અધ્યાય નંબરથી શોધી શકાશે નહીં. શ્લોક નંબર અથવા શબ્દ પણ લખો.",
          "केवल अध्याय संख्या से नहीं खोजा जा सकता। श्लोक संख्या या शब्द भी लिखें।",
          "Cannot search only by chapter number. Please provide a shloka number or keyword."
        )
      );
      return;
    }

    if (chapterValue && (Number(chapterValue) < 1 || Number(chapterValue) > 18)) {
      setMessage(
        txt(
          "અધ્યાય નંબર 1 થી 18 સુધી જ હોઈ શકે છે.",
          "अध्याय संख्या केवल 1 से 18 तक हो सकती है।",
          "Chapter number must be between 1 and 18."
        )
      );
      return;
    }

    const maxShloka = chapterValue
      ? getChapterMaxShloka(chapterValue)
      : getOverallMaxShloka();

    if (shlokaValue) {
      const shlokaNum = Number(shlokaValue);

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

      if (shlokaNum > maxShloka) {
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

    const matches = allShlokas.filter((shlok) => {
      const matchesChapter =
        !chapterValue || Number(shlok.chapterNumber) === Number(chapterValue);

      const matchesShloka =
        !shlokaValue || Number(shlok.shlokNumber) === Number(shlokaValue);

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

      const matchesText = !textValue || searchableText.includes(textValue);

      return matchesChapter && matchesShloka && matchesText;
    });

    if (matches.length === 0) {
      setMessage(
        txt(
          "કોઈ શ્લોક મળ્યો નથી.",
          "कोई श्लोक नहीं मिला।",
          "No shlokas found."
        )
      );
      setResult([]);
      return;
    }

    setResult(matches);
  };

  const openShloka = (item) => {
    onClose();
    navigate(`/chapter/${item.chapterNumber}?shloka=${item.shlokNumber}`);
  };

  return (
    <div className="search-modal-backdrop" onClick={onClose}>
      <div
        className="search-modal-popup-wrap"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={txt("ગીતા શ્લોક શોધો", "गीता श्लोक खोजें", "Search Gita Shlokas")}
      >
        {/* EXACT HOME SEARCH BOX WITH CLOSE BUTTON */}
        <div className="home-search modal-home-search">
          <button
            type="button"
            className="modal-search-close-btn"
            onClick={onClose}
            aria-label="Close"
            title={txt("બંધ કરો", "बंद करें", "Close")}
          >
            <X size={20} />
          </button>

          {/* SEARCH TITLE */}
          <div className="search-title">
            <Search className="title-icon" size={22} />{" "}
            {txt("ગીતા શ્લોક શોધો", "गीता श्लोक खोजें", "Search Gita Shlokas")}
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
              placeholder={txt(
                "શ્લોક / શબ્દ શોધો...",
                "श्लोक / शब्द खोजें...",
                "Search shloka / word..."
              )}
              value={searchText}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
            />

            {/* SEARCH BUTTON */}
            <button
              type="button"
              className="search-button"
              onClick={handleSearch}
              title={txt("શ્લોક શોધો", "श्लोक खोजें", "Search Shloka")}
            >
              <Search className="btn-icon" size={18} />
              <span className="search-btn-text">
                {txt("શોધો", "खोजें", "Search")}
              </span>
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
                <Search className="title-icon" size={20} /> {result.length}{" "}
                {txt("પરિણામ મળ્યા", "परिणाम मिले", "results found")}
              </h3>

              <div className="search-results-modal-scroll">
                {result.map((item, index) => (
                  <div
                    className="search-result-card"
                    key={`${item._id || item.chapterNumber}-${item.shlokNumber}-${index}`}
                    onClick={() => openShloka(item)}
                  >
                    <div className="result-chapter">
                      {txt("અધ્યાય", "अध्याय", "Chapter")}{" "}
                      {item.chapterNumber}
                      {" • "}
                      {txt("શ્લોક", "श्लोक", "Shloka")}{" "}
                      {item.shlokNumber}
                    </div>

                    <h4>{getCurrentChapterName(item.chapterNumber)}</h4>

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
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
