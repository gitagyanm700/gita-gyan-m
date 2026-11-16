import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, CheckCircle2, Loader2, Lock, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { getValidToken } from "../utils/authHelper.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import {
  downloadAllChaptersOffline,
  getOfflineStatusSummary,
  getOfflineStatusSummaryAsync,
  isOfflineDownloadedSync,
  markOfflineDownloadComplete,
} from "../utils/offlineStorage.js";
import { isRunningInStandaloneApp } from "../utils/pwaManager.js";
import "./Chapters.css";

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

const chapters = [
  { number: 1, name: "અર્જુનવિષાદ યોગ", verses: 47, image: "/images/chapter-1.jpg" },
  { number: 2, name: "સાંખ્ય યોગ", verses: 72, image: "/images/chapter-2.jpg" },
  { number: 3, name: "કર્મ યોગ", verses: 43, image: "/images/chapter-3.jpg" },
  { number: 4, name: "જ્ઞાનકર્મસંન્યાસ યોગ", verses: 42, image: "/images/chapter-4.jpg" },
  { number: 5, name: "કર્મસંન્યાસ યોગ", verses: 29, image: "/images/chapter-5.jpg" },
  { number: 6, name: "આત્મસંયમ યોગ", verses: 47, image: "/images/chapter-6.jpg" },
  { number: 7, name: "જ્ઞાનવિજ્ઞાન યોગ", verses: 30, image: "/images/chapter-7.jpg" },
  { number: 8, name: "અક્ષરબ્રહ્મ યોગ", verses: 28, image: "/images/chapter-8.jpg" },
  { number: 9, name: "રાજવિદ્યા રાજગુહ્ય યોગ", verses: 34, image: "/images/chapter-9.jpg" },
  { number: 10, name: "વિભૂતિ યોગ", verses: 42, image: "/images/chapter-10.jpg" },
  { number: 11, name: "વિશ્વરૂપદર્શન યોગ", verses: 55, image: "/images/chapter-11.jpg" },
  { number: 12, name: "ભક્તિ યોગ", verses: 20, image: "/images/chapter-12.jpg" },
  { number: 13, name: "ક્ષેત્રક્ષેત્રજ્ઞ વિભાગ યોગ", verses: 35, image: "/images/chapter-13.jpg" },
  { number: 14, name: "ગુણત્રય વિભાગ યોગ", verses: 27, image: "/images/chapter-14.jpg" },
  { number: 15, name: "પુરુષોત્તમ યોગ", verses: 20, image: "/images/chapter-15.jpg" },
  { number: 16, name: "દૈવાસુર સંપદ્વિભાગ યોગ", verses: 24, image: "/images/chapter-16.jpg" },
  { number: 17, name: "શ્રદ્ધાત્રય વિભાગ યોગ", verses: 28, image: "/images/chapter-17.jpg" },
  { number: 18, name: "મોક્ષસંન્યાસ યોગ", verses: 78, image: "/images/chapter-18.jpg" },
];

function Chapters() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isHindi, isEnglish, txt, CHAPTER_NAMES } = useLanguage();

  const [shlokCounts, setShlokCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [offlineStatus, setOfflineStatus] = useState(() => getOfflineStatusSummary());
  const [downloadingOffline, setDownloadingOffline] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isStandaloneApp, setIsStandaloneApp] = useState(() =>
    typeof window !== "undefined" ? isRunningInStandaloneApp() : false
  );
  const [isDownloaded, setIsDownloaded] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return (
        localStorage.getItem("gita_all_chapters_downloaded") === "true" ||
        localStorage.getItem("gita_18_chapters_downloaded") === "true" ||
        localStorage.getItem("gita_hide_offline_download_btn") === "true" ||
        isOfflineDownloadedSync()
      );
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    setIsStandaloneApp(isRunningInStandaloneApp());
  }, []);

  useEffect(() => {
    let active = true;

    const syncDownloadState = async () => {
      try {
        const summary = await getOfflineStatusSummaryAsync();
        if (!active) return;
        setOfflineStatus(summary);
        if (
          summary.isDownloaded ||
          summary.isFullyCached ||
          summary.cachedCount >= 18 ||
          localStorage.getItem("gita_all_chapters_downloaded") === "true" ||
          localStorage.getItem("gita_18_chapters_downloaded") === "true" ||
          localStorage.getItem("gita_hide_offline_download_btn") === "true" ||
          isOfflineDownloadedSync()
        ) {
          setIsDownloaded(true);
        }
      } catch (e) {}
    };

    syncDownloadState();

    const handleDownloadComplete = () => {
      if (!active) return;
      setIsDownloaded(true);
      try {
        localStorage.setItem("gita_all_chapters_downloaded", "true");
        localStorage.setItem("gita_18_chapters_downloaded", "true");
        localStorage.setItem("gita_hide_offline_download_btn", "true");
      } catch (e) {}
      setOfflineStatus((prev) => ({
        ...prev,
        isFullyCached: true,
        isDownloaded: true,
      }));
    };

    window.addEventListener("gita-offline-download-complete", handleDownloadComplete);
    window.addEventListener("storage", syncDownloadState);
    return () => {
      active = false;
      window.removeEventListener("gita-offline-download-complete", handleDownloadComplete);
      window.removeEventListener("storage", syncDownloadState);
    };
  }, [user]);

  const handleDownloadOffline = async () => {
    if (downloadingOffline) return;

    const token = getValidToken();
    if (!user || !token) {
      const redirectPath = "/chapters";
      const redirectMsg = txt(
        "બધા ૧૮ અધ્યાય ઑફલાઇન માટે ડાઉનલોડ કરવા માટે Login કરવું જરૂરી છે. કૃપા કરીને પહેલાં Login કરો.",
        "सभी 18 अध्याय ऑफ़लाइन के लिए डाउनलोड करने के लिए Login करना आवश्यक है। कृपया पहले Login करें।",
        "Login is required to download all 18 chapters for offline. Please login first."
      );
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

    if (!navigator.onLine) {
      alert(
        txt(
          "ડાઉનલોડ કરવા માટે કૃપા કરીને ઇન્ટરનેટ ચાલુ કરો.",
          "डाउनलोड करने के लिए कृपया इंटरनेट चालू करें।",
          "Please connect to the internet to download."
        )
      );
      return;
    }
    setDownloadingOffline(true);
    setDownloadProgress(5);
    try {
      const res = await downloadAllChaptersOffline((prog) => {
        setDownloadProgress(prog.percent);
      });
      if (res.success || res.totalShlokas > 0 || (res.downloadedChapters && res.downloadedChapters.length > 0)) {
        try {
          localStorage.setItem("gita_all_chapters_downloaded", "true");
          localStorage.setItem("gita_18_chapters_downloaded", "true");
          localStorage.setItem("gita_hide_offline_download_btn", "true");
        } catch (e) {}
        await markOfflineDownloadComplete(user?._id || user?.id || user?.email);
        setIsDownloaded(true);
        const updated = await getOfflineStatusSummaryAsync();
        setOfflineStatus({ ...updated, isFullyCached: true, isDownloaded: true });
      } else if (res.requireLogin) {
        const redirectPath = "/chapters";
        const redirectMsg = txt(
          "બધા ૧૮ અધ્યાય ઑફલાઇન માટે ડાઉનલોડ કરવા માટે Login કરવું જરૂરી છે. કૃપા કરીને ફરી Login કરો.",
          "सभी 18 अध्याय ऑफ़लाइन के लिए डाउनलोड करने के लिए Login करना आवश्यक है। कृपया फिर Login करें।",
          "Login is required to download all 18 chapters for offline. Please login again."
        );
        navigate("/login", {
          state: { from: redirectPath, message: redirectMsg },
        });
      } else if (res.error) {
        alert(res.error);
      }
    } catch (e) {
      console.warn("Offline download error:", e);
    } finally {
      setDownloadingOffline(false);
      setDownloadProgress(0);
    }
  };

  useEffect(() => {
    const fetchChapterData = async () => {
      try {
        setLoading(true);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(
          "https://bhagavad-gita-backend-jy1a.onrender.com/api/shloks",
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        const data = await response.json();

        if (response.ok && Array.isArray(data.shlokas) && data.shlokas.length > 0) {
          const counts = {};
          data.shlokas.forEach((shlok) => {
            const ch = Number(shlok.chapterNumber);
            counts[ch] = (counts[ch] || 0) + 1;
          });
          setShlokCounts(counts);
          return;
        }
      } catch (error) {
        console.warn("Chapters data network error, using bundled fallback:", error.message);
      } finally {
        setLoading(false);
      }

      // Fallback from bundled shlokas
      try {
        const fallbackMod = await import("../data/fallbackShlokas.json");
        const fallbackMap = fallbackMod.default || fallbackMod;
        const counts = {};
        for (const [ch, list] of Object.entries(fallbackMap)) {
          if (Array.isArray(list)) {
            counts[Number(ch)] = list.length;
          }
        }
        setShlokCounts(counts);
      } catch (e) {}
    };

    fetchChapterData();
  }, []);

  const openChapter = (chapterNumber) => {
    try {
      sessionStorage.setItem(`gita_last_shloka_ch_${chapterNumber}`, "1");
      localStorage.setItem(`gita_last_shloka_ch_${chapterNumber}`, "1");
    } catch (e) {}
    navigate(`/chapter/${chapterNumber}?shloka=1`);
  };

  const getChapterName = (chapter) => {
    if (isEnglish) return chapterNamesEn[chapter.number] || CHAPTER_NAMES[chapter.number]?.en || chapter.name;
    if (isHindi) return chapterNamesHi[chapter.number] || CHAPTER_NAMES[chapter.number]?.hi || chapter.name;
    return chapter.name;
  };

  return (
    <main className="chapters-page">

      <section className="chapters-header">

        <p>
          ॥ श्रीमद्भगवद्गीता ॥
        </p>

        <h1>
          {txt("ભગવદ્ ગીતાના 18 અધ્યાય", "भगवद् गीता के 18 अध्याय", "18 Chapters of Bhagavad Gita")}
        </h1>

        {isStandaloneApp && !isDownloaded && !offlineStatus.isFullyCached && !offlineStatus.isDownloaded && (
          <div className="offline-download-bar">
            {downloadingOffline ? (
              <div className="offline-downloading-box">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Loader2 size={16} className="spinner" />
                  <span>
                    {txt(
                      `ઑફલાઇન ડાઉનલોડ થઈ રહ્યું છે... ${downloadProgress}%`,
                      `ऑफ़लाइन डाउनलोड हो रहा है... ${downloadProgress}%`,
                      `Downloading offline... ${downloadProgress}%`
                    )}
                  </span>
                </div>
                <div className="offline-progress-track">
                  <div
                    className="offline-progress-bar"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="offline-download-btn"
                onClick={handleDownloadOffline}
                title={
                  !user
                    ? txt("Login જરૂરી છે", "Login आवश्यक है", "Login required")
                    : txt(
                        "બધા ૧૮ અધ્યાય નેટ વગર વાંચવા માટે ફોનમાં સેવ કરો",
                        "सभी 18 अध्याय बिना इंटरनेट पढ़ने के लिए फोन में सहेजें",
                        "Save all 18 chapters offline for instant access"
                      )
                }
              >
                {!user ? <Lock size={15} /> : <Download size={15} />}
                <span>
                  {txt(
                    "બધા ૧૮ અધ્યાય ઑફલાઇન માટે ડાઉનલોડ કરો",
                    "सभी 18 अध्याय ऑफ़लाइन के लिए डाउनलोड करें",
                    "Download All 18 Chapters for Offline"
                  )}
                  {!user && (
                    <span style={{ fontSize: "11px", opacity: 0.88, marginLeft: "6px" }}>
                      ({txt("Login જરૂરી", "Login आवश्यक", "Login required")})
                    </span>
                  )}
                </span>
              </button>
            )}
          </div>
        )}
      </section>


      <section className="chapters-grid">

        {chapters.map((chapter) => {

          const databaseCount =
            shlokCounts[chapter.number] || 0;

          return (
            <div
              className="chapter-card"
              key={chapter.number}
              onClick={() => openChapter(chapter.number)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  openChapter(chapter.number);
                }
              }}
            >
              <div className="chapter-card-thumb">
                <img
                  src={chapter.image || "/images/gita-background-mobile.jpg"}
                  alt={`અધ્યાય ${chapter.number}`}
                  loading="lazy"
                />
              </div>

              <div className="chapter-card-info">
                <span className="chapter-card-num">
                  {txt(`અધ્યાય ${chapter.number}`, `अध्याय ${chapter.number}`, `Chapter ${chapter.number}`)}
                </span>
                <h2>{getChapterName(chapter)}</h2>
                <span className="chapter-card-count">
                  {databaseCount > 0 ? databaseCount : chapter.verses} {txt("શ્લોક", "श्लोक", "Shlokas")}
                </span>
              </div>

              <ChevronRight className="chapter-card-arrow" size={20} />
            </div>
          );
        })}

      </section>

    </main>
  );
}

export default Chapters;