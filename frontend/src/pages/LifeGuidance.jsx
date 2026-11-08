import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Flame,
  CloudRain,
  Target,
  ShieldAlert,
  Scale,
  HeartHandshake,
  HeartCrack,
  Zap,
  Award,
  Gem,
  Sunrise,
  Users,
  Sparkles,
  BookOpen,
  ChevronRight
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { getValidToken } from "../utils/authHelper.js";
import "./LifeGuidance.css";

const API_URL = "https://bhagavad-gita-backend-jy1a.onrender.com/api/shloks";

const GUIDANCE_TOPICS = [
  {
    id: "anger",
    title: "ક્રોધ અને આવેગ",
    titleHi: "क्रोध और आवेग",
    englishTitle: "Anger & Impatience",
    icon: Flame,
    color: "#1d4ed8",
    bgColor: "rgba(29, 78, 216, 0.10)",
    borderColor: "rgba(29, 78, 216, 0.28)",
    essence: "ક્રોધથી મનુષ્યની બુદ્ધિ ભ્રમિત થાય છે અને વિચારવાની શક્તિ નષ્ટ થઈ જાય છે. શાંત મન જ સાચો નિર્ણય લઈ શકે છે.",
    essenceHi: "क्रोध से मनुष्य की बुद्धि भ्रमित हो जाती है और सोचने की शक्ति नष्ट हो जाती है। शांत मन ही सही निर्णय ले सकता है।",
    essenceEn: "Unchecked anger clouds the intellect, shatters reasoning, and leads to ruin. A calm and disciplined mind is the fountainhead of wisdom and victory.",
    shlokas: [
      { chapterNumber: 2, shlokNumber: 63 },
      { chapterNumber: 5, shlokNumber: 26 },
      { chapterNumber: 16, shlokNumber: 21 }
    ]
  },
  {
    id: "stress",
    title: "ચિંતા અને તણાવ",
    titleHi: "चिंता और तनाव",
    englishTitle: "Anxiety & Stress",
    icon: CloudRain,
    color: "#0284c7",
    bgColor: "rgba(2, 132, 199, 0.10)",
    borderColor: "rgba(2, 132, 199, 0.28)",
    essence: "જે પરિસ્થિતિ તમારા હાથમાં નથી તેની ચિંતા ન કરો. માત્ર તમારા શ્રેષ્ઠ પ્રયાસ પર ધ્યાન કેન્દ્રિત કરો, પરિણામ ઈશ્વર પર છોડો.",
    essenceHi: "जो परिस्थिति आपके नियंत्रण में नहीं है उसकी चिंता न करें। केवल अपने सर्वश्रेष्ठ प्रयास पर ध्यान केंद्रित करें, परिणाम ईश्वर पर छोड़ें।",
    essenceEn: "Worrying about what is beyond your control only exhausts the mind. Focus entirely on righteous action today, and surrender the outcome to the Divine.",
    shlokas: [
      { chapterNumber: 2, shlokNumber: 47 },
      { chapterNumber: 2, shlokNumber: 14 },
      { chapterNumber: 18, shlokNumber: 66 }
    ]
  },
  {
    id: "focus",
    title: "મનની અશાંતિ & એકાગ્રતા",
    titleHi: "मन की अशांति और एकाग्रता",
    englishTitle: "Restless Mind & Focus",
    icon: Target,
    color: "#2563eb",
    bgColor: "rgba(37, 99, 235, 0.10)",
    borderColor: "rgba(37, 99, 235, 0.28)",
    essence: "મન વાયુની જેમ ચંચળ છે, પરંતુ દૈનિક સાધના, અભ્યાસ અને વૈરાગ્ય દ્વારા તેને એકાગ્ર કરી શકાય છે.",
    essenceHi: "मन वायु की भांति चंचल है, किंतु नियमित अभ्यास और वैराग्य द्वारा इसे एकाग्र किया जा सकता है।",
    essenceEn: "The mind is naturally turbulent like the wind. Yet through daily practice, conscious breathing, and detachment, it becomes your greatest ally.",
    shlokas: [
      { chapterNumber: 6, shlokNumber: 26 },
      { chapterNumber: 6, shlokNumber: 35 },
      { chapterNumber: 6, shlokNumber: 5 }
    ]
  },
  {
    id: "fear",
    title: "નિષ્ફળતા અને ડર",
    titleHi: "વિफलता और भय",
    englishTitle: "Fear & Dealing with Failure",
    icon: ShieldAlert,
    color: "#1e40af",
    bgColor: "rgba(30, 64, 175, 0.10)",
    borderColor: "rgba(30, 64, 175, 0.28)",
    essence: "હારી જવાનો ડર મનુષ્યને સાચો પ્રયાસ પણ કરવા દેતો નથી. જય અને પરાજય બંને જીવનના પાઠ છે, અંત નથી.",
    essenceHi: "हारने का भय मनुष्य को सही प्रयास भी नहीं करने देता। जय और पराजय दोनों जीवन के पाठ हैं, अंत नहीं।",
    essenceEn: "Fear of failure paralyzes potential before you even begin. Stand firm in your dharma; victory and defeat are merely passing experiences.",
    shlokas: [
      { chapterNumber: 2, shlokNumber: 38 },
      { chapterNumber: 4, shlokNumber: 40 },
      { chapterNumber: 9, shlokNumber: 22 }
    ]
  },
  {
    id: "decision",
    title: "નિર્ણય લેવાની મૂંઝવણ",
    titleHi: "निर्णय क्षमता और धर्मसंकट",
    englishTitle: "Confusion & Right Choice",
    icon: Scale,
    color: "#0369a1",
    bgColor: "rgba(3, 105, 161, 0.10)",
    borderColor: "rgba(3, 105, 161, 0.28)",
    essence: "જ્યારે કર્તવ્ય અને મોહ વચ્ચે સંઘર્ષ થાય, ત્યારે મનની અશાંતિ છોડીને ધર્મ અને અંતરાત્માના અવાજને સાંભળો.",
    essenceHi: "जब कर्तव्य और मोह के बीच संघर्ष हो, तब मन की अशांति छोड़कर धर्म और अंतरात्मा की आवाज सुनें।",
    essenceEn: "When torn between doubts and duties, quiet the anxious ego and seek higher wisdom. Righteous action guided by moral clarity dispels every doubt.",
    shlokas: [
      { chapterNumber: 2, shlokNumber: 7 },
      { chapterNumber: 3, shlokNumber: 35 },
      { chapterNumber: 18, shlokNumber: 63 }
    ]
  },
  {
    id: "peace",
    title: "એકલતા અને આંતરિક શાંતિ",
    titleHi: "आंतरिक शांति और संतोष",
    englishTitle: "Loneliness & Inner Peace",
    icon: HeartHandshake,
    color: "#0d9488",
    bgColor: "rgba(13, 148, 136, 0.10)",
    borderColor: "rgba(13, 148, 136, 0.28)",
    essence: "સાચી શાંતિ સંસારથી ભાગવામાં નથી, પણ ઈશ્વરને સર્વત્ર અનુભવવામાં છે. વાસનાઓનો ત્યાગ કરવાથી જ પરમ સંતોષ મળે છે.",
    essenceHi: "सच्ची शांति संसार से भागने में नहीं, बल्कि हर जगह ईश्वर का अनुभव करने में है। वासनाओं के त्याग से ही परम शांति मिलती है।",
    essenceEn: "True peace is not found in fleeing the world, but in finding God within. Surrender desires, live with gratitude, and discover supreme tranquility.",
    shlokas: [
      { chapterNumber: 5, shlokNumber: 29 },
      { chapterNumber: 2, shlokNumber: 71 },
      { chapterNumber: 12, shlokNumber: 15 }
    ]
  },
  {
    id: "grief",
    title: "શોક અને વિયોગ",
    titleHi: "दुःख, वियोग और शोक",
    englishTitle: "Grief, Loss & Sorrow",
    icon: HeartCrack,
    color: "#475569",
    bgColor: "rgba(71, 85, 105, 0.10)",
    borderColor: "rgba(71, 85, 105, 0.28)",
    essence: "શરીર નશ્વર છે, પણ આત્મા અજર, અમર અને શાશ્વત છે. પરિવર્તન એ સંસારનો નિયમ છે, તેથી વ્યર્થ શોક ન કરો.",
    essenceHi: "शरीर नश्वर है, आत्मा अजर, अमर और शाश्वत है। परिवर्तन प्रकृति का नियम है, इसलिए व्यर्थ शोक न करें।",
    essenceEn: "Death or parting is merely the transition of the physical body; the soul is eternally immortal. Rest firmly in the eternity of consciousness.",
    shlokas: [
      { chapterNumber: 2, shlokNumber: 11 },
      { chapterNumber: 2, shlokNumber: 20 },
      { chapterNumber: 2, shlokNumber: 27 }
    ]
  },
  {
    id: "laziness",
    title: "આળસ અને પ્રમાદ",
    titleHi: "आलस्य, प्रमाद और निराशा",
    englishTitle: "Laziness & Procrastination",
    icon: Zap,
    color: "#d97706",
    bgColor: "rgba(217, 119, 6, 0.10)",
    borderColor: "rgba(217, 119, 6, 0.28)",
    essence: "આળસ અને કાર્ય ટાળવાની વૃત્તિ જીવનની શક્તિને નષ્ટ કરે છે. નિષ્ઠાપૂર્વક કરેલું સત્કર્મ જ આત્માને ઉન્નતિના શિખરે લઈ જાય છે.",
    essenceHi: "आलस्य जीवन की ऊर्जा को नष्ट कर देता है। निष्ठापूर्वक किया गया कर्म ही आत्मा की वास्तविक शक्ति है।",
    essenceEn: "Laziness and procrastination shroud the brilliance of the soul. Awaken to proactive action and dedicated duty with enthusiasm.",
    shlokas: [
      { chapterNumber: 3, shlokNumber: 8 },
      { chapterNumber: 18, shlokNumber: 39 },
      { chapterNumber: 6, shlokNumber: 5 }
    ]
  },
  {
    id: "ego",
    title: "અહંકાર અને અભિમાન",
    titleHi: "अहंकार और ईर्ष्या",
    englishTitle: "Ego & Pride",
    icon: Award,
    color: "#1d4ed8",
    bgColor: "rgba(29, 78, 216, 0.10)",
    borderColor: "rgba(29, 78, 216, 0.28)",
    essence: "'હું જ બધું કરું છું' એવો અહંકાર સર્વ પતનનું મૂળ છે. નમ્રતા, સરળતા અને ઈશ્વરાર્પણ ભાવના જ સાચી મુક્તિ અને આંતરિક શાંતિ આપે છે.",
    essenceHi: "'सब कुछ मैं ही करता हूँ' यह भ्रम ही अहंकार है। विनम्रता और सेवाभाव ही मनुष्य को महान बनाते हैं।",
    essenceEn: "Thinking 'I am the sole doer' is the root of pride and fall. Humility, simplicity, and selfless dedication grant genuine liberation and peace.",
    shlokas: [
      { chapterNumber: 3, shlokNumber: 27 },
      { chapterNumber: 16, shlokNumber: 4 },
      { chapterNumber: 18, shlokNumber: 58 }
    ]
  },
  {
    id: "attachment",
    title: "મોહ અને વાસના",
    titleHi: "अत्यधिक मोह और आसक्ति",
    englishTitle: "Attachment, Desire & Greed",
    icon: Gem,
    color: "#0284c7",
    bgColor: "rgba(2, 132, 199, 0.10)",
    borderColor: "rgba(2, 132, 199, 0.28)",
    essence: "વસ્તુઓ કે વ્યક્તિઓ પ્રત્યે અતિશય આસક્તિ મનુષ્યને બંધનમાં રાખે છે. અનાસક્ત ભાવે જીવવાથી જ સાચો સંતોષ અને પરમ આનંદ મળે છે.",
    essenceHi: "मोह से कर्तव्य में रुकावट आती है। प्रेम निस्वार्थ होना चाहिए, बंधनकारी नहीं।",
    essenceEn: "Excessive attachment binds the human spirit. Living with selfless detachment yields true contentment and unbounded joy.",
    shlokas: [
      { chapterNumber: 2, shlokNumber: 62 },
      { chapterNumber: 3, shlokNumber: 37 },
      { chapterNumber: 14, shlokNumber: 7 }
    ]
  },
  {
    id: "devotion",
    title: "શંકા અને શ્રદ્ધાનો અભાવ",
    titleHi: "श्रद्धा, भक्ति और ईश्वर शरणागति",
    englishTitle: "Doubt & Lack of Faith",
    icon: Sunrise,
    color: "#0891b2",
    bgColor: "rgba(8, 145, 178, 0.10)",
    borderColor: "rgba(8, 145, 178, 0.28)",
    essence: "સંશય મનુષ્યની ક્ષમતાઓ અને શાંતિને કોરી ખાય છે. ઈશ્વર અને પોતાના સત્કર્મ પર અતૂટ શ્રદ્ધા જ જીવનની નૌકા પાર ઉતારે છે.",
    essenceHi: "सच्ची भक्ति भय नहीं, बल्कि प्रेम और समर्पण है। ईश्वर की शरण में जाने से सभी चिंताएं समाप्त हो जाती हैं।",
    essenceEn: "Unshakable faith in the Divine and devotion to righteous deeds carry you across every storm in life.",
    shlokas: [
      { chapterNumber: 4, shlokNumber: 40 },
      { chapterNumber: 9, shlokNumber: 22 },
      { chapterNumber: 18, shlokNumber: 66 }
    ]
  },
  {
    id: "relationship",
    title: "સંબંધોમાં તણાવ અને ક્ષમા",
    titleHi: "संबंधों में तनाव और क्षमा",
    englishTitle: "Relationship Conflicts & Forgiveness",
    icon: Users,
    color: "#3b82f6",
    bgColor: "rgba(59, 130, 246, 0.10)",
    borderColor: "rgba(59, 130, 246, 0.28)",
    essence: "સામેવાળામાં પણ પરમાત્માનો અંશ છે તે સમજીને ક્ષમા અને સહાનુભૂતિ કેળવો. મધુર વાણી સંબંધોનું અમૃત છે.",
    essenceHi: "सामने वाले में भी परमात्मा का अंश है यह समझकर क्षमा और सहानुभूति अपनाएं। मधुर वाणी संबंधों का अमृत है।",
    essenceEn: "Recognize the divine spark within every being; foster forgiveness and empathy. Kind and truthful speech is nectar for relationships.",
    shlokas: [
      { chapterNumber: 6, shlokNumber: 32 },
      { chapterNumber: 12, shlokNumber: 13 },
      { chapterNumber: 17, shlokNumber: 15 }
    ]
  }
];

function LifeGuidance() {
  const navigate = useNavigate();
  const { isHindi, isEnglish, txt, CHAPTER_NAMES } = useLanguage();

  // Resolve initial topic from URL param or storage so refresh preserves current button
  const getInitialTopicId = () => {
    try {
      const urlParam = new URLSearchParams(window.location.search).get("topic");
      if (urlParam && GUIDANCE_TOPICS.some((t) => t.id === urlParam)) {
        return urlParam;
      }
      const saved =
        sessionStorage.getItem("gita_guidance_selected_topic") ||
        localStorage.getItem("gita_guidance_selected_topic");
      if (saved && GUIDANCE_TOPICS.some((t) => t.id === saved)) {
        return saved;
      }
    } catch (e) {}
    return GUIDANCE_TOPICS[0].id;
  };

  const [selectedTopicId, setSelectedTopicId] = useState(getInitialTopicId);
  const [chapterCache, setChapterCache] = useState({});
  const [loadingChapters, setLoadingChapters] = useState({});
  const shlokasSectionRef = useRef(null);

  const TOPIC_TITLES_HI = {
    anger: "क्रोध और आवेग",
    stress: "चिंता और तनाव",
    focus: "मन की अशांति और एकाग्रता",
    fear: "विफलता और भय",
    decision: "निर्णय क्षमता और धर्मसंकट",
    peace: "आंतरिक शांति और संतोष",
    grief: "दुःख, वियोग और शोक",
    laziness: "आलस्य, प्रमाद और निराशा",
    ego: "अहंकार और ईर्ष्या",
    attachment: "अत्यधिक मोह और आसक्ति",
    devotion: "श्रद्धा, भक्ति और ईश्वर शरणागति",
    relationship: "संबंधों में तनाव और क्षमा",
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Synchronize active topic to URL & Storage whenever it changes
  useEffect(() => {
    if (!selectedTopicId) return;
    try {
      sessionStorage.setItem("gita_guidance_selected_topic", selectedTopicId);
      localStorage.setItem("gita_guidance_selected_topic", selectedTopicId);

      const currentParams = new URLSearchParams(window.location.search);
      if (currentParams.get("topic") !== selectedTopicId) {
        currentParams.set("topic", selectedTopicId);
        const newUrl = `${window.location.pathname}?${currentParams.toString()}`;
        window.history.replaceState(window.history.state, "", newUrl);
      }
    } catch (e) {}

    // Ensure active topic pill is scrolled into view in horizontal scroller on mobile
    try {
      const activeBtn = document.querySelector(".topic-pill-btn.active");
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      }
    } catch (e) {}
  }, [selectedTopicId]);

  // Support browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      try {
        const urlParam = new URLSearchParams(window.location.search).get("topic");
        if (urlParam && GUIDANCE_TOPICS.some((t) => t.id === urlParam)) {
          setSelectedTopicId(urlParam);
        }
      } catch (e) {}
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const currentTopic =
    GUIDANCE_TOPICS.find((t) => t.id === selectedTopicId) || GUIDANCE_TOPICS[0];

  // Dynamically fetch shlokas for chapters required by the current topic
  useEffect(() => {
    if (!currentTopic || !currentTopic.shlokas) return;

    const neededChapters = [
      ...new Set(currentTopic.shlokas.map((s) => s.chapterNumber))
    ];

    neededChapters.forEach((chapterNum) => {
      // If already cached or currently loading, skip
      if (chapterCache[chapterNum] !== undefined || loadingChapters[chapterNum]) {
        return;
      }

      setLoadingChapters((prev) => ({ ...prev, [chapterNum]: true }));

      const token = getValidToken();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      fetch(`${API_URL}/chapter/${chapterNum}`, {
        signal: controller.signal,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
        .then((res) => {
          clearTimeout(timeoutId);
          if (!res.ok) throw new Error("Failed to fetch chapter shlokas");
          return res.json();
        })
        .then((data) => {
          setChapterCache((prev) => ({
            ...prev,
            [chapterNum]: data.shlokas || []
          }));
        })
        .catch(async (err) => {
          clearTimeout(timeoutId);
          console.warn(`Error loading chapter ${chapterNum} shlokas from API, using fallback:`, err.message);
          try {
            const fallbackMod = await import("../data/fallbackShlokas.json");
            const fallbackMap = fallbackMod.default || fallbackMod;
            const chList = fallbackMap[String(chapterNum)] || [];
            setChapterCache((prev) => ({
              ...prev,
              [chapterNum]: chList
            }));
          } catch (e) {
            setChapterCache((prev) => ({
              ...prev,
              [chapterNum]: []
            }));
          }
        })
        .finally(() => {
          setLoadingChapters((prev) => ({ ...prev, [chapterNum]: false }));
        });
    });
  }, [selectedTopicId, chapterCache, loadingChapters, currentTopic]);

  const handleSelectTopic = (topicId) => {
    setSelectedTopicId(topicId);
    try {
      sessionStorage.setItem("gita_guidance_selected_topic", topicId);
      localStorage.setItem("gita_guidance_selected_topic", topicId);
    } catch (e) {}

    // Smoothly scroll down to the shlokas section
    setTimeout(() => {
      if (shlokasSectionRef.current) {
        const yOffset = window.innerWidth <= 768 ? -70 : -85;
        const element = shlokasSectionRef.current;
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      }
    }, 60);
  };

  const handleReadFullShlok = (chapterNumber, shlokNumber) => {
    navigate(`/chapter/${chapterNumber}?shloka=${shlokNumber}`);
  };

  return (
    <main className="guidance-page">
      {/* PAGE HEADER */}
      <header className="guidance-header-banner">
        <h1>
          {isEnglish ? (
            <>Life Dilemmas & <span className="highlight-text">Gita Solutions</span></>
          ) : isHindi ? (
            <>जीवन की उलझन और <span className="highlight-text">गीता समाधान</span></>
          ) : (
            <>જીવનની મૂંઝવણ અને <span className="highlight-text">ગીતા ઉકેલ</span></>
          )}
        </h1>

        <p className="guidance-intro">
          {txt(
            "તમારી વર્તમાન મનોસ્થિતિ કે પડકાર પસંદ કરો અને ભગવાન શ્રીકૃષ્ણના અમૃતમય શબ્દોમાંથી પ્રેરણા, સાચો નિર્ણય અને આંતરિક શાંતિ પ્રાપ્ત કરો.",
            "अपनी वर्तमान मनःस्थिति या चुनौती चुनें और भगवान श्रीकृष्ण के अमृतमयी वचनों से प्रेरणा, सही निर्णय और आंतरिक शांति प्राप्त करें।",
            "Choose your current state of mind or challenge and discover divine inspiration, clarity, and peace through the timeless teachings of Lord Krishna."
          )}
        </p>

        {/* TOPIC SELECTOR GRID */}
        <div className="guidance-topics-scroll-wrapper">
          <div className="guidance-topics-grid">
            {GUIDANCE_TOPICS.map((topic) => {
              const IconComponent = topic.icon;
              const isSelected = topic.id === selectedTopicId;
              const displayedTitle = isEnglish
                ? (topic.englishTitle || topic.title)
                : isHindi
                ? (TOPIC_TITLES_HI[topic.id] || topic.title)
                : topic.title;

              return (
                <button
                  key={topic.id}
                  type="button"
                  className={`topic-pill-btn ${isSelected ? "active" : ""}`}
                  onClick={() => handleSelectTopic(topic.id)}
                  style={{
                    "--topic-accent": topic.color,
                    "--topic-bg": topic.bgColor,
                    "--topic-border": topic.borderColor
                  }}
                >
                  <span className="pill-icon">
                    <IconComponent size={18} strokeWidth={2.2} />
                  </span>
                  <span className="pill-text">
                    <strong>{displayedTitle}</strong>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* CONTENT WRAPPER */}
      <section className="guidance-content-container" ref={shlokasSectionRef}>
        {/* DIVINE ESSENCE BANNER */}
        <div
          className="divine-essence-card"
          style={{
            borderLeftColor: currentTopic.color
          }}
        >
          <div
            className="essence-badge-icon"
            style={{ background: currentTopic.color }}
          >
            <Sparkles size={22} color="#ffffff" />
          </div>
          <div className="essence-info">
            <h3>
              {isEnglish
                ? currentTopic.essenceEn
                : isHindi
                ? currentTopic.essenceHi
                : currentTopic.essence}
            </h3>
          </div>
        </div>

        {/* SHLOKAS SECTION */}
        <div className="guidance-shlokas-grid">
          {currentTopic.shlokas.map((ref) => {
            const localizedChapterName = isEnglish
              ? (CHAPTER_NAMES?.[ref.chapterNumber]?.nameEn || CHAPTER_NAMES?.[ref.chapterNumber]?.en || `Chapter ${ref.chapterNumber}`)
              : isHindi
              ? (CHAPTER_NAMES?.[ref.chapterNumber]?.nameHi || CHAPTER_NAMES?.[ref.chapterNumber]?.hi || `अध्याय ${ref.chapterNumber}`)
              : (CHAPTER_NAMES?.[ref.chapterNumber]?.name || CHAPTER_NAMES?.[ref.chapterNumber]?.gu || `અધ્યાય ${ref.chapterNumber}`);

            const chapterShlokas = chapterCache[ref.chapterNumber];
            const isChapterLoading = loadingChapters[ref.chapterNumber];

            // Match shloka from database list
            const foundShlok = chapterShlokas
              ? chapterShlokas.find(
                  (item) => Number(item.shlokNumber) === Number(ref.shlokNumber)
                )
              : null;

            return (
              <article
                className="guidance-card"
                key={`${currentTopic.id}-${ref.chapterNumber}-${ref.shlokNumber}`}
              >
                {/* CARD TOP META */}
                <div className="card-header-meta">
                  <span className="card-ref-badge">
                    {txt("અધ્યાય", "अध्याय", "Chapter")} {ref.chapterNumber} • {txt("શ્લોક", "श्लोक", "Verse")} {ref.shlokNumber}
                  </span>
                  <span className="card-chapter-title">{localizedChapterName}</span>
                </div>

                {isChapterLoading ? (
                  <div className="card-loading-block">
                    <div
                      className="spinner"
                      style={{
                        width: 28,
                        height: 28,
                        border: "3px solid rgba(37,99,235,0.2)",
                        borderTopColor: "#2563eb",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite"
                      }}
                    />
                    <span>
                      {txt(
                        "શ્લોક લોડ થઈ રહ્યો છે...",
                        "श्लोक लोड हो रहा है...",
                        "Loading verse..."
                      )}
                    </span>
                  </div>
                ) : foundShlok && foundShlok.sanskrit ? (
                  /* Shloka has been added by admin and is in DB */
                  <>
                    <div className="card-sanskrit-block">
                      <div
                        className="sanskrit-text formatted-content"
                        dangerouslySetInnerHTML={{
                          __html: foundShlok.sanskrit || ""
                        }}
                      />
                    </div>

                    <div className="card-meaning-block">
                      <h4>
                        <BookOpen size={16} />{" "}
                        {txt(
                          "અર્થ / ભાવાર્થ",
                          "सरल अर्थ / भावार्थ",
                          "Meaning / Translation"
                        )}
                      </h4>
                      <div
                        className="card-meaning-text formatted-content"
                        dangerouslySetInnerHTML={{
                          __html: isEnglish
                            ? (foundShlok.translationEn || foundShlok.translation || foundShlok.messageEn || foundShlok.message || "")
                            : isHindi
                            ? (foundShlok.translationHi || foundShlok.translation || foundShlok.messageHi || foundShlok.message || "")
                            : (foundShlok.translation || foundShlok.message || "")
                        }}
                      />
                    </div>

                    {(foundShlok.message || foundShlok.messageHi || foundShlok.messageEn) && (
                      <div
                        className="card-lesson-block"
                        style={{
                          borderColor: `${currentTopic.color}45`,
                          background: currentTopic.bgColor
                        }}
                      >
                        <span
                          className="lesson-header-tag"
                          style={{ color: currentTopic.color }}
                        >
                          💡 {txt("ગીતા સંદેશ / માર્ગદર્શન:", "गीता संदेश / मार्गदर्शन:", "Gita Guidance:")}
                        </span>
                        <div
                          className="card-lesson-text formatted-content"
                          dangerouslySetInnerHTML={{
                            __html: isEnglish
                              ? (foundShlok.messageEn || foundShlok.message || "")
                              : isHindi
                              ? (foundShlok.messageHi || foundShlok.message || "")
                              : (foundShlok.message || "")
                          }}
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      className="card-navigate-btn"
                      onClick={() =>
                        handleReadFullShlok(ref.chapterNumber, ref.shlokNumber)
                      }
                    >
                      <span>
                        {txt("સંપૂર્ણ શ્લોક વાંચો", "सम्पूर्ण श्लोक पढ़ें", "Read Full Verse")}
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  </>
                ) : foundShlok && !foundShlok.sanskrit ? (
                  /* Shloka is in DB, but login is required for shlok > 5 */
                  <>
                    <div
                      className="card-not-added-block"
                      style={{ borderColor: `${currentTopic.color}50` }}
                    >
                      <span
                        className="not-added-badge"
                        style={{
                          background: "rgba(37, 99, 235, 0.12)",
                          color: "#2563eb",
                          borderColor: "rgba(37, 99, 235, 0.25)"
                        }}
                      >
                        🔒 {txt("લોગિન જરૂરી", "लॉगिन आवश्यक", "Login Required")}
                      </span>
                      <h4 className="not-added-title">
                        {txt(
                          "આ શ્લોક વાંચવા માટે Login કરો",
                          "यह श्लोक पढ़ने के लिए Login करें",
                          "Please login to view this verse"
                        )}
                      </h4>
                      <p className="not-added-text">
                        {txt(
                          `અધ્યાય ${ref.chapterNumber} નો શ્લોક ${ref.shlokNumber} ઉપલબ્ધ છે. વાંચવા માટે તમારા એકાઉન્ટમાં લોગિન કરો.`,
                          `अध्याय ${ref.chapterNumber} का श्लोक ${ref.shlokNumber} उपलब्ध है। पढ़ने के लिए लॉग इन करें।`,
                          `Chapter ${ref.chapterNumber}, Verse ${ref.shlokNumber} is available. Log in to read.`
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="card-navigate-btn"
                      onClick={() =>
                        handleReadFullShlok(ref.chapterNumber, ref.shlokNumber)
                      }
                    >
                      <span>
                        {txt("લોગિન કરીને શ્લોક વાંચો", "लॉगिन करके श्लोक पढ़ें", "Login to Read Verse")}
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  </>
                ) : (
                  /* Shloka has NOT been added to database yet */
                  <>
                    <div className="card-not-added-block">
                      <span className="not-added-badge">
                        ⚠️ {txt("હજી એડ કર્યો નથી", "अभी जोड़ा नहीं गया", "Not Added Yet")}
                      </span>
                      <h4 className="not-added-title">
                        {txt(
                          "હજુ આ શ્લોક ઉમેરવામાં આવ્યો નથી",
                          "यह श्लोक अभी नहीं जोड़ा गया है",
                          "This verse has not been added yet"
                        )}
                      </h4>
                      <p className="not-added-text">
                        {txt(
                          `અધ્યાય ${ref.chapterNumber}, શ્લોક ${ref.shlokNumber} એડમિન દ્વારા ટૂંક સમયમાં ઉમેરવામાં આવશે.`,
                          `अध्याय ${ref.chapterNumber}, श्लोक ${ref.shlokNumber} एडमिन द्वारा जल्द ही जोड़ा जाएगा।`,
                          `Chapter ${ref.chapterNumber}, Verse ${ref.shlokNumber} will be added by admin soon.`
                        )}
                      </p>
                    </div>

                    <div className="card-disabled-btn">
                      <span>
                        {txt("હજી ઉમેરાયો નથી", "अभी उपलब्ध नहीं", "Not Available Yet")}
                      </span>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default LifeGuidance;
