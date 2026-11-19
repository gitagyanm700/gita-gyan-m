/**
 * ====================================================================
 * BHAGAVAD GITA - 9:16 HD CINEMATIC MULTI-SHOT VIDEO ENGINE
 * Multi-Language (Gujarati / Hindi / English)
 * Continuous Multi-Shot Montage: Background changes every 2 to 3 seconds!
 * Pure Typewriter Live Speech Reveal: Words appear as spoken (unspoken words hidden)
 * 100% 9:16 Vertical 3D Mythological Scenes Only (No Chapter or App Backgrounds)
 * Clean Text Formatting (HTML stripped, bulleted lists, decoded entities)
 * Teleprompter Auto-Scroll Subtitles (Zero text overflow)
 * Synchronized Typewriter / Karaoke Golden Highlighting
 * Clean Scene Exits (Shloka fades out -> Translation fades out -> Message)
 * Pure Client-Side GPU Canvas + Web Audio + MediaRecorder (Zero Server Cost)
 * ====================================================================
 */

import { getValidToken } from "./authHelper.js";

// Pure 9:16 Vertical 3D Mythological Master Scenes (10 Unique Proper Scenes - Zero Duplicates)
export const SCENE_IMAGES = {
  dhritarashtraPalace: "/images/scenes/scene_dhritarashtra_sanjaya_v916.jpg",
  duryodhanaDrona: "/images/scenes/scene_duryodhana_dronacharya_v916.jpg",
  kurukshetraConch: "/images/scenes/scene_kurukshetra_conch_armies_v916.jpg",
  arjunaGrief: "/images/scenes/scene_arjuna_grief_chariot_v916.jpg",
  battleChariot: "/images/scenes/scene_krishna_arjuna_battle_chariot_v916.jpg",
  krishnaUpdesh: "/images/scenes/scene_krishna_updesh_v916.jpg",
  krishnaVishwaroop: "/images/scenes/scene_krishna_vishwaroop_v916.jpg",
  guidanceMentor: "/images/scenes/scene_guidance_mentor_guru_v916.jpg",
  karmaAction: "/images/scenes/scene_karma_action_duty_v916.jpg",
  peaceMeditation: "/images/scenes/scene_peace_meditation_mind_v916.jpg",

  // Compatibility aliases
  dhritarashtraThrone: "/images/scenes/scene_dhritarashtra_sanjaya_v916.jpg",
  dronaMaster: "/images/scenes/scene_duryodhana_dronacharya_v916.jpg",
  conchWarrior: "/images/scenes/scene_kurukshetra_conch_armies_v916.jpg",
  arjunaSorrow: "/images/scenes/scene_arjuna_grief_chariot_v916.jpg",
  krishnaArjunaBattleChariot: "/images/scenes/scene_krishna_arjuna_battle_chariot_v916.jpg",
  battleChariotCloseup: "/images/scenes/scene_krishna_arjuna_battle_chariot_v916.jpg",
  krishnaChariotDivine: "/images/scenes/scene_krishna_arjuna_battle_chariot_v916.jpg",
  chariotHorses: "/images/scenes/scene_krishna_arjuna_battle_chariot_v916.jpg",
  krishnaFace: "/images/scenes/scene_krishna_updesh_v916.jpg",
  vishwaroopCosmic: "/images/scenes/scene_krishna_vishwaroop_v916.jpg",
  guruRishi: "/images/scenes/scene_guidance_mentor_guru_v916.jpg",
  dharmaWheel: "/images/scenes/scene_karma_action_duty_v916.jpg",
  omLotus: "/images/scenes/scene_peace_meditation_mind_v916.jpg",
  defaultBg: "/images/scenes/scene_krishna_updesh_v916.jpg",
  logo: "/icons/logo-circle.png",
};

/**
 * Cloudinary Live Scenes Cache & Fetcher
 */
let cloudScenesCache = null;

export async function fetchCloudScenes(forceRefresh = false) {
  if (cloudScenesCache && !forceRefresh) return cloudScenesCache;
  try {
    const isLocalHost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");
    const base = isLocalHost
      ? "http://localhost:5000"
      : "https://bhagavad-gita-backend-jy1a.onrender.com";

    const res = await fetch(`${base}/api/scenes${forceRefresh ? "?refresh=true" : ""}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.scenes) && data.scenes.length > 0) {
        cloudScenesCache = data.scenes.map((s) => s.url);
        return cloudScenesCache;
      }
    }
  } catch (err) {
    console.warn("Could not fetch cloud scenes from backend:", err.message);
  }
  return null;
}

/**
 * Clean HTML strings into pure readable plain text
 */
export function cleanHtmlText(html) {
  if (!html) return "";
  let text = String(html);

  // 1. Convert block tags & line breaks
  text = text
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "")
    .replace(/<\/ul>/gi, "\n")
    .replace(/<\/ol>/gi, "\n");

  // 2. Strip all remaining HTML tags and inline attributes
  text = text.replace(/<[^>]*>/g, "");

  // 3. Decode common HTML entities
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&ndash;/gi, "-")
    .replace(/&mdash;/gi, "—")
    .replace(/&#\d+;/gi, (m) => {
      const code = parseInt(m.slice(2, -1), 10);
      return !isNaN(code) ? String.fromCharCode(code) : " ";
    });

  // 4. Normalize whitespace
  text = text
    .split("\n")
    .map((line) => line.trim().replace(/[ \t]+/g, " "))
    .filter((line) => line.length > 0)
    .join("\n");

  return text.trim();
}

/**
 * Intelligent Multi-Shot 3D Scene Sequence Generator for all shlokas
 * Returns exclusively 9:16 vertical 3D mythological scene shots (changing every 2-3s)
 */
export function detectShlokScenes(shlok, cloudPool = null) {
  const speaker = String(shlok.speaker || shlok.speakerGu || shlok.speakerHi || "").toLowerCase();
  const chNum = Number(shlok.chapterNumber) || 1;
  const sNum = Number(shlok.shlokNumber) || 1;

  const rawMsg = String(shlok.message || shlok.messageGu || shlok.messageHi || shlok.messageEn || "");
  const cleanMsg = cleanHtmlText(rawMsg).toLowerCase();

  // -------------------------------------------------------------
  // 1. SCENE 1 SHOTS (Shloka Recitation & Speaker Context)
  // -------------------------------------------------------------
  let scene1Shots = [
    SCENE_IMAGES.krishnaUpdesh,
    SCENE_IMAGES.battleChariot,
    SCENE_IMAGES.karmaAction,
    SCENE_IMAGES.peaceMeditation,
  ];
  let scene1Name = "શ્રીકૃષ્ણ દિવ્ય ઉપદેશ";
  let speakerRole = "શ્રીભગવાન";

  if (speaker.includes("ધૃતરાષ્ટ્ર") || speaker.includes("धृतराष्ट्र") || speaker.includes("dhritarashtra")) {
    scene1Shots = [
      SCENE_IMAGES.dhritarashtraPalace,
      SCENE_IMAGES.kurukshetraConch,
      SCENE_IMAGES.battleChariot,
      SCENE_IMAGES.krishnaUpdesh,
    ];
    scene1Name = "હસ્તિનાપુર રાજદરબાર (ધૃતરાષ્ટ્ર & સંજય)";
    speakerRole = "ધૃતરાષ્ટ્ર";
  } else if (speaker.includes("સંજય") || speaker.includes("संजय") || speaker.includes("sanjaya")) {
    speakerRole = "સંજય";
    if (chNum === 1 && sNum >= 2 && sNum <= 11) {
      scene1Shots = [
        SCENE_IMAGES.duryodhanaDrona,
        SCENE_IMAGES.kurukshetraConch,
        SCENE_IMAGES.battleChariot,
        SCENE_IMAGES.dhritarashtraPalace,
      ];
      scene1Name = "દુર્યોધન & દ્રોણાચાર્ય (કુરુક્ષેત્ર)";
    } else if (chNum === 1 && sNum >= 12 && sNum <= 27) {
      scene1Shots = [
        SCENE_IMAGES.kurukshetraConch,
        SCENE_IMAGES.battleChariot,
        SCENE_IMAGES.duryodhanaDrona,
        SCENE_IMAGES.krishnaUpdesh,
      ];
      scene1Name = "કુરુક્ષેત્ર મહાયુદ્ધ શંખનાદ & સૈન્ય વ્યૂહ";
    } else if ((chNum === 1 && sNum >= 47) || (chNum === 2 && sNum <= 10)) {
      scene1Shots = [
        SCENE_IMAGES.arjunaGrief,
        SCENE_IMAGES.battleChariot,
        SCENE_IMAGES.krishnaUpdesh,
        SCENE_IMAGES.guidanceMentor,
      ];
      scene1Name = "અર્જુન વિષાદ (રથ પર શોકગ્રસ્ત)";
    } else {
      scene1Shots = [
        SCENE_IMAGES.kurukshetraConch,
        SCENE_IMAGES.battleChariot,
        SCENE_IMAGES.krishnaUpdesh,
        SCENE_IMAGES.karmaAction,
      ];
      scene1Name = "કુરુક્ષેત્ર રણભૂમિ દ્રશ્ય";
    }
  } else if (speaker.includes("અર્જુન") || speaker.includes("अर्जुन") || speaker.includes("arjuna")) {
    speakerRole = "અર્જુન";
    if (chNum === 1 || (chNum === 2 && sNum <= 10)) {
      scene1Shots = [
        SCENE_IMAGES.arjunaGrief,
        SCENE_IMAGES.battleChariot,
        SCENE_IMAGES.krishnaUpdesh,
        SCENE_IMAGES.guidanceMentor,
      ];
      scene1Name = "અર્જુન વિષાદ (ગાંડીવ ધનુષ ત્યાગ)";
    } else if (chNum === 10 || chNum === 11) {
      scene1Shots = [
        SCENE_IMAGES.krishnaVishwaroop,
        SCENE_IMAGES.krishnaUpdesh,
        SCENE_IMAGES.peaceMeditation,
        SCENE_IMAGES.karmaAction,
      ];
      scene1Name = "વિશ્વરૂપ દર્શન પ્રાર્થના";
    } else {
      scene1Shots = [
        SCENE_IMAGES.arjunaGrief,
        SCENE_IMAGES.battleChariot,
        SCENE_IMAGES.krishnaUpdesh,
        SCENE_IMAGES.peaceMeditation,
      ];
      scene1Name = "અર્જુન જિજ્ઞાસા & સંવાદ";
    }
  } else {
    // Shri Bhagavan (Lord Krishna)
    speakerRole = "શ્રીભગવાન";
    if (chNum === 11) {
      scene1Shots = [
        SCENE_IMAGES.krishnaVishwaroop,
        SCENE_IMAGES.krishnaUpdesh,
        SCENE_IMAGES.peaceMeditation,
        SCENE_IMAGES.karmaAction,
      ];
      scene1Name = "વિરાટ વિશ્વરૂપ દર્શન";
    } else if (chNum === 6) {
      scene1Shots = [
        SCENE_IMAGES.peaceMeditation,
        SCENE_IMAGES.guidanceMentor,
        SCENE_IMAGES.krishnaUpdesh,
        SCENE_IMAGES.karmaAction,
      ];
      scene1Name = "ધ્યાનયોગ & મનની સ્થિરતા";
    } else if (chNum === 3 || chNum === 5) {
      scene1Shots = [
        SCENE_IMAGES.karmaAction,
        SCENE_IMAGES.battleChariot,
        SCENE_IMAGES.krishnaUpdesh,
        SCENE_IMAGES.guidanceMentor,
      ];
      scene1Name = "નિષ્કામ કર્મયોગ પથ";
    } else if (chNum === 10) {
      scene1Shots = [
        SCENE_IMAGES.krishnaVishwaroop,
        SCENE_IMAGES.krishnaUpdesh,
        SCENE_IMAGES.peaceMeditation,
        SCENE_IMAGES.karmaAction,
      ];
      scene1Name = "વિભૂતિયોગ (દિવ્ય ઐશ્વર્ય)";
    } else {
      scene1Shots = [
        SCENE_IMAGES.krishnaUpdesh,
        SCENE_IMAGES.battleChariot,
        SCENE_IMAGES.karmaAction,
        SCENE_IMAGES.peaceMeditation,
      ];
      scene1Name = "શ્રીકૃષ્ણ દિવ્ય ઉપદેશ";
    }
  }

  // -------------------------------------------------------------
  // 2. SCENE 2 SHOTS (Translation Context & Verse Action)
  // -------------------------------------------------------------
  let scene2Shots = [
    SCENE_IMAGES.krishnaUpdesh,
    SCENE_IMAGES.battleChariot,
    SCENE_IMAGES.kurukshetraConch,
    SCENE_IMAGES.karmaAction,
  ];
  let scene2Name = "દિવ્ય અર્થબોધ";

  if (chNum === 1 && sNum === 1) {
    scene2Shots = [
      SCENE_IMAGES.dhritarashtraPalace,
      SCENE_IMAGES.kurukshetraConch,
      SCENE_IMAGES.battleChariot,
      SCENE_IMAGES.krishnaUpdesh,
    ];
    scene2Name = "ધર્મક્ષેત્ર કુરુક્ષેત્ર પૂછપરછ";
  } else if (chNum === 1 && sNum >= 2 && sNum <= 11) {
    scene2Shots = [
      SCENE_IMAGES.duryodhanaDrona,
      SCENE_IMAGES.kurukshetraConch,
      SCENE_IMAGES.battleChariot,
      SCENE_IMAGES.dhritarashtraPalace,
    ];
    scene2Name = "દુર્યોધન-દ્રોણાચાર્ય સંવાદ & સૈન્ય નિરીક્ષણ";
  } else if (chNum === 1 && sNum >= 12 && sNum <= 27) {
    scene2Shots = [
      SCENE_IMAGES.kurukshetraConch,
      SCENE_IMAGES.battleChariot,
      SCENE_IMAGES.duryodhanaDrona,
      SCENE_IMAGES.krishnaUpdesh,
    ];
    scene2Name = "રણશિંગા, ઢોલ & દિવ્ય શંખનાદ";
  } else if (chNum === 1 && sNum >= 28) {
    scene2Shots = [
      SCENE_IMAGES.arjunaGrief,
      SCENE_IMAGES.battleChariot,
      SCENE_IMAGES.kurukshetraConch,
      SCENE_IMAGES.krishnaUpdesh,
    ];
    scene2Name = "અર્જુનનો શોક & આત્મીય મોહ";
  } else if (chNum === 2 && sNum <= 10) {
    scene2Shots = [
      SCENE_IMAGES.arjunaGrief,
      SCENE_IMAGES.krishnaUpdesh,
      SCENE_IMAGES.battleChariot,
      SCENE_IMAGES.guidanceMentor,
    ];
    scene2Name = "અર્જુન શરણાગતિ & વિષાદ";
  } else if (chNum === 2 && sNum > 10) {
    scene2Shots = [
      SCENE_IMAGES.krishnaUpdesh,
      SCENE_IMAGES.peaceMeditation,
      SCENE_IMAGES.karmaAction,
      SCENE_IMAGES.guidanceMentor,
    ];
    scene2Name = "આત્મા અમર છે - સાંખ્ય દર્શન";
  } else if (chNum === 3 || chNum === 5) {
    scene2Shots = [
      SCENE_IMAGES.karmaAction,
      SCENE_IMAGES.battleChariot,
      SCENE_IMAGES.krishnaUpdesh,
      SCENE_IMAGES.guidanceMentor,
    ];
    scene2Name = "કર્મણ્યેવાધિકારસ્તે - કર્મયોગ";
  } else if (chNum === 6) {
    scene2Shots = [
      SCENE_IMAGES.peaceMeditation,
      SCENE_IMAGES.guidanceMentor,
      SCENE_IMAGES.krishnaUpdesh,
      SCENE_IMAGES.karmaAction,
    ];
    scene2Name = "ધ્યાનયોગ & આત્મસંયમ";
  } else if (chNum === 10 || chNum === 11) {
    scene2Shots = [
      SCENE_IMAGES.krishnaVishwaroop,
      SCENE_IMAGES.krishnaUpdesh,
      SCENE_IMAGES.peaceMeditation,
      SCENE_IMAGES.karmaAction,
    ];
    scene2Name = "અનંત બ્રહ્માંડ - વિશ્વરૂપ દર્શન";
  } else {
    scene2Shots = [
      SCENE_IMAGES.krishnaUpdesh,
      SCENE_IMAGES.battleChariot,
      SCENE_IMAGES.karmaAction,
      SCENE_IMAGES.peaceMeditation,
    ];
    scene2Name = "ભગવાન શ્રીકષ્ણનો દિવ્ય સંદેશ";
  }

  // -------------------------------------------------------------
  // 3. SCENE 3 SHOTS (Multi-Shot Montage for Gita Life Message)
  // Continuous shot transitions every 2-3 seconds while audio plays!
  // -------------------------------------------------------------
  let scene3Shots = [
    SCENE_IMAGES.guidanceMentor,
    SCENE_IMAGES.karmaAction,
    SCENE_IMAGES.peaceMeditation,
    SCENE_IMAGES.krishnaUpdesh,
    SCENE_IMAGES.battleChariot,
  ];
  let scene3Name = "જીવન માર્ગદર્શન & ગુરુ શરણ";

  const mentorKeywords = [
    "માર્ગદર્શક", "ગુરુ", "સહારો", "સલાહ", "મેન્ટર", "ડર", "ભય", "અસુરક્ષા", "ગભરાઈ",
    "આશ્રય", "શરણ", "અનુભવી", "પક્ષપાત", "મોહ", "સ્વાર્થ", "मार्गदर्शक", "गुरु", "डर", "भय",
    "mentor", "guide", "guidance", "fear", "insecurity", "counsel", "teacher"
  ];
  const karmaKeywords = [
    "કર્મ", "મહેનત", "પરિશ્રમ", "કર્તવ્ય", "ફળ", "પરિણામ", "કામ", "પુરુષાર્થ",
    "ધ્યેય", "કર્મયોગ", "સફળતા", "પ્રયત્ન", "કંપની", "મેનેજર", "પ્રમોશન", "कर्म", "मेहनत",
    "कर्तव्य", "फल", "action", "duty", "work", "effort", "karma", "success"
  ];
  const peaceKeywords = [
    "મન", "શાંતિ", "ધ્યાન", "સ્થિરતા", "વિચારો", "એકાગ્રતા", "સંયમ", "ધીરજ", "મન શાંત",
    "તણાવ", "તટસ્થ", "તટસ્થતા", "शांत", "मन", "ध्यान", "स्थिरता", "एकाग्रता", "peace",
    "mind", "meditation", "calm", "focus", "patience", "mental"
  ];
  const devotionKeywords = [
    "ભક્તિ", "શ્રદ્ધા", "સમર્પણ", "વિશ્વાસ", "ઈશ્વર", "ભગવાન", "કૃષ્ણ", "બ્રહ્માંડ",
    "પરમાત્મા", "આત્મા", "भक्ति", "श्रद्धा", "समर्पण", "भगवान", "ईश्वर", "devotion",
    "faith", "surrender", "god", "divine", "universe"
  ];
  const griefKeywords = [
    "શોક", "દુઃખ", "હતાશા", "નિરાશા", "ચિંતા", "વિષાદ", "ઉદાસી", "શोक", "दुःख",
    "grief", "sadness", "depression"
  ];

  if (mentorKeywords.some((k) => cleanMsg.includes(k))) {
    scene3Name = "જીવન માર્ગદર્શન & ગુરુ શરણ";
    scene3Shots = [
      chNum === 1 && sNum === 2 ? SCENE_IMAGES.duryodhanaDrona : SCENE_IMAGES.guidanceMentor,
      SCENE_IMAGES.krishnaUpdesh,
      SCENE_IMAGES.karmaAction,
      SCENE_IMAGES.peaceMeditation,
      SCENE_IMAGES.battleChariot,
    ];
  } else if (karmaKeywords.some((k) => cleanMsg.includes(k))) {
    scene3Name = "કર્મયોગ & સતત પુરુષાર્થ";
    scene3Shots = [
      SCENE_IMAGES.karmaAction,
      SCENE_IMAGES.battleChariot,
      SCENE_IMAGES.krishnaUpdesh,
      SCENE_IMAGES.guidanceMentor,
      SCENE_IMAGES.peaceMeditation,
    ];
  } else if (peaceKeywords.some((k) => cleanMsg.includes(k))) {
    scene3Name = "માનસિક શાંતિ & ધ્યાન યોગ";
    scene3Shots = [
      SCENE_IMAGES.peaceMeditation,
      SCENE_IMAGES.guidanceMentor,
      SCENE_IMAGES.krishnaUpdesh,
      SCENE_IMAGES.karmaAction,
      SCENE_IMAGES.battleChariot,
    ];
  } else if (devotionKeywords.some((k) => cleanMsg.includes(k))) {
    scene3Name = "ઈશ્વર ભક્તિ & શ્રદ્ધા સમર્પણ";
    scene3Shots = [
      SCENE_IMAGES.krishnaVishwaroop,
      SCENE_IMAGES.peaceMeditation,
      SCENE_IMAGES.krishnaUpdesh,
      SCENE_IMAGES.karmaAction,
      SCENE_IMAGES.guidanceMentor,
    ];
  } else if (griefKeywords.some((k) => cleanMsg.includes(k))) {
    scene3Name = "હતાશામાંથી મુક્તિ & માર્ગદર્શન";
    scene3Shots = [
      SCENE_IMAGES.arjunaGrief,
      SCENE_IMAGES.guidanceMentor,
      SCENE_IMAGES.krishnaUpdesh,
      SCENE_IMAGES.peaceMeditation,
      SCENE_IMAGES.karmaAction,
    ];
  }

  // If Cloudinary scene pool has images, inject them deterministically for this shloka
  if (cloudPool && Array.isArray(cloudPool) && cloudPool.length > 0) {
    const seed = (chNum * 37 + sNum * 13) % cloudPool.length;
    const c1 = cloudPool[seed];
    const c2 = cloudPool[(seed + 1) % cloudPool.length];
    const c3 = cloudPool[(seed + 2) % cloudPool.length];
    const c4 = cloudPool[(seed + 3) % cloudPool.length];
    const c5 = cloudPool[(seed + 4) % cloudPool.length];

    scene1Shots = [c1, scene1Shots[0], c2, scene1Shots[1] || c3];
    scene2Shots = [c3, scene2Shots[0], c4, scene2Shots[1] || c1];
    scene3Shots = [c5, scene3Shots[0], c1, scene3Shots[1] || c2, c4];
  }

  // Filter out any duplicate adjacent images
  scene1Shots = scene1Shots.filter((s, idx, arr) => s && (idx === 0 || s !== arr[idx - 1]));
  scene2Shots = scene2Shots.filter((s, idx, arr) => s && (idx === 0 || s !== arr[idx - 1]));
  scene3Shots = scene3Shots.filter((s, idx, arr) => s && (idx === 0 || s !== arr[idx - 1]));

  return {
    scene1Shots,
    scene2Shots,
    scene3Shots,
    scene1: scene1Shots[0],
    scene2: scene2Shots[0],
    scene3: scene3Shots[0],
    scene1Name,
    scene2Name,
    scene3Name,
    speakerRole,
  };
}

/**
 * Preload an HTMLImageElement safely
 */
function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ src, img });
    img.onerror = () => {
      const fallback = new Image();
      fallback.crossOrigin = "anonymous";
      fallback.onload = () => resolve({ src, img: fallback });
      fallback.onerror = () => resolve({ src, img: null });
      fallback.src = SCENE_IMAGES.defaultBg;
    };
    img.src = src;
  });
}

/**
 * Fetch Audio Buffer from TTS API
 */
async function fetchAudioBuffer(audioCtx, chNum, sNum, type, lang) {
  try {
    const token = getValidToken();
    const isLocalHost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");
    const base = isLocalHost
      ? "http://localhost:5000"
      : "https://bhagavad-gita-backend-jy1a.onrender.com";

    const res = await fetch(
      `${base}/api/tts/download/shlok/${chNum}/${sNum}?type=${type}&lang=${lang}&smooth=true`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );

    if (!res.ok) {
      throw new Error(`Audio fetch failed: ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } catch (err) {
    console.warn(`Could not load audio for ${type} (${lang}):`, err);
    return null;
  }
}

/**
 * Fallback silent audio buffer
 */
function createSilentBuffer(audioCtx, durationSec = 5) {
  const rate = audioCtx.sampleRate || 44100;
  return audioCtx.createBuffer(1, Math.floor(rate * durationSec), rate);
}

/**
 * Clean text into word tokens for audio speech synchronization
 */
function tokenizeCleanWords(text) {
  if (!text) return [];
  return text
    .replace(/[•\-\*\:\|।॥,;"'()\[\]{}]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/**
 * Smart Word Wrap & Line Breakdown Helper with Teleprompter Metrics
 */
function wrapContentLines(ctx, text, maxWidth) {
  if (!text) return { lines: [], totalWords: 0 };

  const rawParagraphs = text.split("\n").filter((p) => p.trim().length > 0);
  const formattedLines = [];
  let globalWordCount = 0;

  rawParagraphs.forEach((paragraph) => {
    const isBullet = paragraph.startsWith("• ");
    const cleanPara = isBullet ? paragraph.slice(2).trim() : paragraph.trim();
    const words = cleanPara.split(/\s+/).filter(Boolean);

    let currentLineWords = [];
    let currentLineText = "";

    words.forEach((word) => {
      const testText = currentLineText ? `${currentLineText} ${word}` : word;
      const metrics = ctx.measureText(testText);
      const effectiveMax = isBullet && currentLineWords.length > 0 ? maxWidth - 24 : maxWidth;

      if (metrics.width <= effectiveMax) {
        currentLineWords.push(word);
        currentLineText = testText;
      } else {
        if (currentLineWords.length > 0) {
          formattedLines.push({
            text: currentLineText,
            isBulletStart: isBullet && currentLineWords[0] === words[0],
            words: currentLineWords,
            startWordIdx: globalWordCount,
            endWordIdx: globalWordCount + currentLineWords.length - 1,
          });
          globalWordCount += currentLineWords.length;
        }
        currentLineWords = [word];
        currentLineText = word;
      }
    });

    if (currentLineWords.length > 0) {
      formattedLines.push({
        text: currentLineText,
        isBulletStart: isBullet,
        words: currentLineWords,
        startWordIdx: globalWordCount,
        endWordIdx: globalWordCount + currentLineWords.length - 1,
      });
      globalWordCount += currentLineWords.length;
    }
  });

  return { lines: formattedLines, totalWords: globalWordCount };
}

/**
 * Break Gita Life Message into sequential pedagogical sections:
 * Point 1 -> Point 2 -> Example (Each rendered in its own dedicated card with large 23px font)
 */
export function parseMessageSections(rawHtml, lang = "gu") {
  if (!rawHtml) return [];
  const raw = String(rawHtml);

  const gujaratiNums = ["૧", "૨", "૩", "૪", "૫"];
  const hindiNums = ["१", "२", "३", "४", "५"];

  const getBadge = (idx, isExample) => {
    if (lang === "en") {
      if (isExample) return "💡 Real-Life Example";
      return idx === 0 ? "✨ 1. Life Wisdom" : `🎯 ${idx + 1}. Practical Action`;
    }
    if (lang === "hi") {
      if (isExample) return "💡 वास्तविक उदाहरण";
      return idx === 0 ? "✨ १. जीवन बोध" : `🎯 ${hindiNums[idx] || (idx + 1)}. व्यावहारिक आचरण`;
    }
    // Gujarati
    if (isExample) return "💡 વાસ્તવિક ઉદાહરણ";
    return idx === 0 ? "✨ ૧. જીવન બોધ" : `🎯 ${gujaratiNums[idx] || (idx + 1)}. વ્યવહારિક આચરણ`;
  };

  const sanitize = (t) => {
    return cleanHtmlText(t)
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\s*[:：]\s*/g, ", ")
      .replace(/\s*([,।\.!?])\s*([,।\.!?])+/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  };

  // 1. Try <li> tags
  const liMatches = raw.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
  if (liMatches && liMatches.length >= 2) {
    return liMatches
      .map((li, idx) => {
        const text = sanitize(li);
        const isExample = /ઉદાહરણ|उदाहरण|example/i.test(text.slice(0, 35));
        return {
          index: idx + 1,
          isExample,
          badge: getBadge(idx, isExample),
          text,
        };
      })
      .filter((s) => s.text.length > 5);
  }

  // 2. Paragraphs / double newlines fallback
  const paras = raw
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6])>/gi, "\n\n")
    .split(/\n\s*\n/)
    .map((p) => sanitize(p))
    .filter((p) => p.length > 10);

  if (paras.length >= 2) {
    return paras.map((text, idx) => {
      const isExample = /ઉદાહરણ|उदाहरण|example/i.test(text.slice(0, 35));
      return {
        index: idx + 1,
        isExample,
        badge: getBadge(idx, isExample),
        text,
      };
    });
  }

  // Single block fallback
  const singleText = sanitize(raw);
  const isExample = /ઉદાહરણ|उदाहरण|example/i.test(singleText.slice(0, 35));
  return [
    {
      index: 1,
      isExample,
      badge: isExample
        ? getBadge(0, true)
        : lang === "en"
        ? "✨ Gita Message"
        : lang === "hi"
        ? "✨ गीता संदेश"
        : "✨ દિવ્ય ગીતા સંદેશ",
      text: singleText,
    },
  ];
}

/**
 * Floating Particle System for Celestial Golden Sparkles
 */
class ParticleSystem {
  constructor(count, width, height) {
    this.width = width;
    this.height = height;
    this.particles = Array.from({ length: count }, () => this.createParticle());
  }

  createParticle() {
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      radius: Math.random() * 2.2 + 0.8,
      speedY: -(Math.random() * 0.6 + 0.25),
      speedX: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.7 + 0.2,
      pulse: Math.random() * Math.PI * 2,
    };
  }

  update() {
    this.particles.forEach((p) => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.pulse += 0.04;
      if (p.y < -10) {
        p.y = this.height + 10;
        p.x = Math.random() * this.width;
      }
    });
  }

  draw(ctx) {
    ctx.save();
    this.particles.forEach((p) => {
      const a = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));
      ctx.fillStyle = `rgba(251, 191, 36, ${a})`;
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}

/**
 * MAIN SHLOKA VIDEO RENDERER
 */
export async function createShlokVideoRenderer({
  shlok,
  lang = "gu",
  width = 720,
  height = 1280, // 9:16 Vertical format
  onProgress = () => {},
}) {
  onProgress({ stage: "init", percent: 5, message: "ઓડિયો અને 9:16 દ્રશ્યો લોડ થઈ રહ્યા છે..." });

  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioCtxClass();

  const chNum = shlok.chapterNumber;
  const sNum = shlok.shlokNumber;

  // 1. Intelligent Multi-Shot 9:16 Scene Detection (Using live Cloudinary CDN pool when available)
  const cloudPool = await fetchCloudScenes();
  const scenes = detectShlokScenes(shlok, cloudPool);

  // 2. Preload all unique images needed across all scenes
  onProgress({ stage: "images", percent: 15, message: "9:16 મલ્ટી-શોટ સિનેમેટિક આર્ટવર્ક લોડ થઈ રહ્યું છે..." });
  const uniqueSrcs = [
    ...new Set([
      ...scenes.scene1Shots,
      ...scenes.scene2Shots,
      ...scenes.scene3Shots,
      SCENE_IMAGES.logo,
    ]),
  ].filter(Boolean);

  const loadedResults = await Promise.all(uniqueSrcs.map(preloadImage));
  const imageMap = {};
  loadedResults.forEach(({ src, img }) => {
    imageMap[src] = img;
  });

  const imgScene1Shots = scenes.scene1Shots.map((src) => imageMap[src]).filter(Boolean);
  const imgScene2Shots = scenes.scene2Shots.map((src) => imageMap[src]).filter(Boolean);
  const imgScene3Shots = scenes.scene3Shots.map((src) => imageMap[src]).filter(Boolean);
  const imgLogo = imageMap[SCENE_IMAGES.logo];

  // 3. Preload audio tracks for all 3 scenes
  onProgress({ stage: "audio", percent: 30, message: "સંસ્કૃત, અનુવાદ અને સંદેશ ઓડિયો તૈયાર થઈ રહ્યો છે..." });
  const [saBufRaw, trBufRaw, msgBufRaw] = await Promise.all([
    fetchAudioBuffer(audioCtx, chNum, sNum, "sanskrit", "sa"),
    fetchAudioBuffer(audioCtx, chNum, sNum, "translation", lang),
    fetchAudioBuffer(audioCtx, chNum, sNum, "message", lang),
  ]);

  const saBuf = saBufRaw || createSilentBuffer(audioCtx, 6);
  const trBuf = trBufRaw || createSilentBuffer(audioCtx, 8);
  const msgBuf = msgBufRaw || createSilentBuffer(audioCtx, 12);

  // Scene timing calculation (100% continuous flow, zero gaps between scenes)
  const SCENE_EXIT_PAUSE = 0.05;
  const INTRO_PAD = 0.08;
  const OUTRO_DURATION = 0.8;

  const tIntroEnd = INTRO_PAD;
  const d1 = saBuf.duration;
  const tScene1End = tIntroEnd + d1;
  const tScene2Start = tScene1End + SCENE_EXIT_PAUSE;
  const d2 = trBuf.duration;
  const tScene2End = tScene2Start + d2;
  const tScene3Start = tScene2End + SCENE_EXIT_PAUSE;
  const d3 = msgBuf.duration;
  const tScene3End = tScene3Start + d3;
  const totalDuration = tScene3End + OUTRO_DURATION;

  // 4. Extract and CLEAN texts based on selected language (Zero HTML tags!)
  let sanskritLines = [];
  if (shlok.sanskritLine1 && shlok.sanskritLine2) {
    sanskritLines = [cleanHtmlText(shlok.sanskritLine1), cleanHtmlText(shlok.sanskritLine2)];
  } else {
    const rawSa = cleanHtmlText(shlok.sanskrit || "");
    const parts = rawSa.split(/[।॥\n]/).map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      sanskritLines = [parts[0] + " ।", parts[1] + ` ॥ ${sNum} ॥`];
    } else {
      sanskritLines = [rawSa];
    }
  }
  const cleanSanskritText = sanskritLines.join(" ");

  const rawTranslation =
    lang === "hi"
      ? shlok.translationHi || shlok.translation
      : lang === "en"
      ? shlok.translationEn || shlok.translation
      : shlok.translation || "";
  const cleanTranslationText = cleanHtmlText(rawTranslation);

  const rawMessage =
    lang === "hi"
      ? shlok.messageHi || shlok.message
      : lang === "en"
      ? shlok.messageEn || shlok.message
      : shlok.message || "";

  // Parse Gita Life Message into sequential Point 1 -> Point 2 -> Example
  const msgSections = parseMessageSections(rawMessage, lang);
  const cleanMessageText = msgSections.map((s) => s.text).join(" ");

  const chapterName = cleanHtmlText(
    lang === "hi"
      ? shlok.chapterNameHi || shlok.chapterName
      : lang === "en"
      ? shlok.chapterNameEn || shlok.chapterName
      : shlok.chapterName || ""
  );

  const speakerName = cleanHtmlText(
    lang === "hi"
      ? shlok.speakerHi || shlok.speaker
      : lang === "en"
      ? shlok.speakerEn || shlok.speaker
      : shlok.speaker || ""
  );

  const saWords = tokenizeCleanWords(cleanSanskritText);
  const trWords = tokenizeCleanWords(cleanTranslationText);

  // Distribute word offsets across sequential message sections
  let cumulativeMsgWords = 0;
  msgSections.forEach((sec) => {
    sec.words = tokenizeCleanWords(sec.text);
    sec.startWordIdx = cumulativeMsgWords;
    cumulativeMsgWords += sec.words.length;
    sec.endWordIdx = cumulativeMsgWords;
  });
  const totalMsgWords = Math.max(1, cumulativeMsgWords);
  const msgWords = tokenizeCleanWords(cleanMessageText);

  // Setup offscreen / live canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Pre-wrap text for each section with prominent 23px font (identical to Gujarati Translation!)
  ctx.font = "600 23px 'Noto Sans Gujarati', 'Mukta', sans-serif";
  const maxMsgLineWidth = width - 80 - 60; // 580px
  msgSections.forEach((sec) => {
    sec.wrappedLines = wrapContentLines(ctx, sec.text, maxMsgLineWidth).lines;
  });

  const particles = new ParticleSystem(45, width, height);

  // UI labels per language
  const labels = {
    gu: {
      chapter: `અધ્યાય ${chNum} • ${chapterName}`,
      shlok: `શ્લોક ${sNum}`,
      shlokBadge: `॥ ${speakerName} ઉવાચ ॥`,
      transBadge: "ગુજરાતી અનુવાદ",
      msgBadge: "દિવ્ય ગીતા સંદેશ",
      outroTop: "॥ ૐ શ્રીકૃષ્ણાર્પણમસ્તુ ॥",
      outroBottom: "શ્રીમદ્ભગવદ્ગીતા • Gita Gyan",
    },
    hi: {
      chapter: `अध्याय ${chNum} • ${chapterName}`,
      shlok: `श्लोक ${sNum}`,
      shlokBadge: `॥ ${speakerName} उवाच ॥`,
      transBadge: "हिन्दी अनुवाद",
      msgBadge: "दिव्य गीता संदेश",
      outroTop: "॥ ॐ श्रीकृष्णार्पणमस्तु ॥",
      outroBottom: "श्रीमद्भगवद्गीता • Gita Gyan",
    },
    en: {
      chapter: `Chapter ${chNum} • ${chapterName}`,
      shlok: `Shloka ${sNum}`,
      shlokBadge: `${speakerName} Said:`,
      transBadge: "English Translation",
      msgBadge: "Gita Life Message",
      outroTop: "॥ Om Tat Sat ॥",
      outroBottom: "Bhagavad Gita • Gita Gyan",
    },
  }[lang] || labels.gu;

  /**
   * Draw a single 9:16 background image with Ken Burns pan & zoom
   */
  function drawSingleKenBurns(img, progress, shotIndex = 0, alpha = 1) {
    if (!img) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    const scale = 1.0 + progress * 0.08;
    let panX = 0;
    let panY = -progress * 26;

    if (shotIndex % 3 === 1) {
      panY = progress * 24;
    } else if (shotIndex % 3 === 2) {
      panX = (progress - 0.5) * 30;
    }

    const imgAspect = img.width / img.height;
    const canvasAspect = width / height;

    let drawW, drawH;
    if (imgAspect > canvasAspect) {
      drawH = height * scale;
      drawW = drawH * imgAspect;
    } else {
      drawW = width * scale;
      drawH = drawW / imgAspect;
    }

    const drawX = (width - drawW) / 2 + panX;
    const drawY = (height - drawH) / 2 + panY;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Vignette gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "rgba(4, 10, 26, 0.70)");
    grad.addColorStop(0.20, "rgba(4, 10, 26, 0.35)");
    grad.addColorStop(0.60, "rgba(4, 10, 26, 0.35)");
    grad.addColorStop(0.85, "rgba(3, 7, 20, 0.75)");
    grad.addColorStop(1, "rgba(2, 5, 15, 0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }

  /**
   * MULTI-SHOT MONTAGE RENDERER: CHANGES EVERY 4 SECONDS!
   * Target shot duration: 4.0s per shot with 0.55s smooth dissolve
   */
  const TARGET_SHOT_DUR = 4.0;

  function drawMultiShotBackground(shots, elapsed, totalSceneDuration) {
    if (!shots || shots.length === 0) return;
    if (shots.length === 1) {
      const p = Math.min(1, Math.max(0, elapsed / totalSceneDuration));
      drawSingleKenBurns(shots[0], p, 0, 1);
      return;
    }

    const numShots = Math.max(1, Math.ceil(totalSceneDuration / TARGET_SHOT_DUR));
    const shotDur = totalSceneDuration / numShots;
    const FADE = Math.min(0.55, shotDur * 0.15);

    const virtualIdx = Math.min(numShots - 1, Math.max(0, Math.floor(elapsed / shotDur)));
    const shotElapsed = elapsed - virtualIdx * shotDur;

    const currImg = shots[virtualIdx % shots.length];

    if (virtualIdx > 0 && shotElapsed < FADE) {
      const prevImg = shots[(virtualIdx - 1) % shots.length];
      const fadeProgress = shotElapsed / FADE;

      const prevP = Math.min(1, (shotDur - FADE + shotElapsed) / shotDur);
      drawSingleKenBurns(prevImg, prevP, virtualIdx - 1, 1 - fadeProgress);

      const currP = shotElapsed / shotDur;
      drawSingleKenBurns(currImg, currP, virtualIdx, fadeProgress);
    } else {
      const currP = Math.min(1, shotElapsed / shotDur);
      drawSingleKenBurns(currImg, currP, virtualIdx, 1);
    }
  }

  /**
   * Helper to draw rounded rectangle on canvas
   */
  function roundRect(ctx, x, y, w, h, r = 16) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /**
   * Draw Decorative Golden Border & Badges
   */
  function drawDecorations(t) {
    ctx.save();

    // 1. Outer Golden Border
    ctx.strokeStyle = "rgba(251, 191, 36, 0.55)";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(18, 18, width - 36, height - 36);

    // 2. Corner Ornaments (Vedic style)
    const corners = [
      [18, 18, 1, 1],
      [width - 18, 18, -1, 1],
      [18, height - 18, 1, -1],
      [width - 18, height - 18, -1, -1],
    ];
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;
    corners.forEach(([cx, cy, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy + dy * 28);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + dx * 28, cy);
      ctx.stroke();

      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(cx + dx * 8, cy + dy * 8, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Top Header Pill with Bhagavad Gita Branding
    const pillW = width - 80;
    const pillH = 46;
    const pillX = 40;
    const pillY = 32;

    ctx.fillStyle = "rgba(10, 24, 60, 0.85)";
    ctx.strokeStyle = "rgba(251, 191, 36, 0.50)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, pillX, pillY, pillW, pillH, 23);
    ctx.fill();
    ctx.stroke();

    // Mini Logo Icon
    if (imgLogo) {
      ctx.drawImage(imgLogo, pillX + 8, pillY + 6, 34, 34);
    }

    // Header Text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 17px 'Noto Sans Gujarati', 'Mukta', sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 6;
    ctx.fillText(`${labels.chapter}  •  ${labels.shlok}`, width / 2 + 10, pillY + 29);

    ctx.restore();
  }

  /**
   * Bottom Audio Waveform Visualizer
   */
  function drawAudioWaveform(ctx, x, y, w, h, t) {
    ctx.save();
    const bars = 24;
    const barW = w / bars - 4;
    for (let i = 0; i < bars; i++) {
      const barH = Math.abs(Math.sin(t * 5 + i * 0.45)) * h;
      const barX = x + i * (barW + 4);
      const barY = y + (h - barH) / 2;
      ctx.fillStyle = "rgba(251, 191, 36, 0.75)";
      roundRect(ctx, barX, barY, barW, Math.max(3, barH), 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Main Frame Renderer (called at any timestamp t in seconds)
   */
  function renderFrame(t) {
    ctx.clearRect(0, 0, width, height);

    // ==========================================
    // 1. DYNAMIC MULTI-SHOT 9:16 SCENE BACKGROUND
    // Changes every 2-3 seconds throughout the video!
    // ==========================================
    if (t < tScene2Start) {
      // SCENE 1: Shloka Recitation (Multi-shot every 2-3s)
      const elapsed1 = Math.max(0, t);
      drawMultiShotBackground(imgScene1Shots, elapsed1, tScene1End);
    } else if (t < tScene3Start) {
      // SCENE 2: Translation (Multi-shot every 2-3s)
      const elapsed2 = Math.max(0, t - tScene2Start);
      drawMultiShotBackground(imgScene2Shots, elapsed2, d2);
    } else if (t < tScene3End) {
      // SCENE 3: Gita Life Message (Multi-shot every 2-3s!)
      const elapsed3 = Math.max(0, t - tScene3Start);
      drawMultiShotBackground(imgScene3Shots, elapsed3, d3);
    } else {
      // OUTRO
      const pOut = Math.min(1, Math.max(0, (t - tScene3End) / OUTRO_DURATION));
      drawSingleKenBurns(imgScene3Shots[imgScene3Shots.length - 1], pOut, 0, 1);
    }

    // Golden celestial particles
    particles.update();
    particles.draw(ctx);

    // Top header branding & golden frame
    drawDecorations(t);

    // ==========================================
    // 2. TEXT ANIMATION & SCENE TRANSITIONS
    // PURE TYPEWRITER REVEAL: WORDS APPEAR LIVE AS SPOKEN!
    // ==========================================

    // ----- SCENE 1: SHLOKA RECITATION -----
    if (t >= tIntroEnd && t < tScene2Start) {
      const elapsed1 = t - tIntroEnd;
      const progress1 = Math.min(1, elapsed1 / d1);

      let alpha1 = 1;
      let slideY1 = 0;
      if (t > tScene1End) {
        const exitProg = (t - tScene1End) / SCENE_EXIT_PAUSE;
        alpha1 = Math.max(0, 1 - exitProg);
        slideY1 = exitProg * 40;
      }

      ctx.save();
      ctx.globalAlpha = alpha1;

      // Badge: Speaker
      const badgeY = 130 + slideY1;
      ctx.fillStyle = "rgba(251, 191, 36, 0.22)";
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 1.5;
      roundRect(ctx, width / 2 - 140, badgeY, 280, 42, 21);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 19px 'Noto Sans Devanagari', 'Mukta', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(labels.shlokBadge, width / 2, badgeY + 28);

      // Glass Card for Sanskrit Verse
      const cardX = 40;
      const cardY = 195 + slideY1;
      const cardW = width - 80;
      const cardH = 340;

      ctx.fillStyle = "rgba(6, 18, 48, 0.88)";
      ctx.strokeStyle = "rgba(251, 191, 36, 0.50)";
      ctx.lineWidth = 2;
      roundRect(ctx, cardX, cardY, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();

      // PURE TYPEWRITER REVEAL: Words appear as recited; future words are INVISIBLE!
      const wordsCount1 = Math.floor(progress1 * saWords.length);

      ctx.font = "bold 26px 'Noto Sans Devanagari', 'Yatra One', serif";
      ctx.textAlign = "left";

      const startY = cardY + 115;
      const lineSpacing = 58;

      let globalWordOffset = 0;
      sanskritLines.forEach((line, lineIdx) => {
        const lineY = startY + lineIdx * lineSpacing;
        const lineWords = line.split(" ").filter(Boolean);
        const fullLineWidth = ctx.measureText(line).width;
        let currentX = (width - fullLineWidth) / 2;

        lineWords.forEach((word) => {
          const wordWithSpace = word + " ";
          const wordWidth = ctx.measureText(wordWithSpace).width;

          // Only render if word has been reached by audio!
          if (globalWordOffset <= wordsCount1) {
            const isCurrentlySpoken = globalWordOffset === wordsCount1;
            if (isCurrentlySpoken) {
              ctx.fillStyle = "#fbbf24";
              ctx.shadowColor = "rgba(251, 191, 36, 0.9)";
              ctx.shadowBlur = 15;
            } else {
              ctx.fillStyle = "#ffffff";
              ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
              ctx.shadowBlur = 6;
            }
            ctx.fillText(word, currentX, lineY);
          }
          // Future words: NOT drawn!

          currentX += wordWidth;
          globalWordOffset++;
        });
      });

      drawAudioWaveform(ctx, width / 2 - 120, cardY + cardH - 35, 240, 20, t);

      ctx.restore();
    }

    // ----- SCENE 2: TRANSLATION (Pure Typewriter as audio speaks) -----
    if (t >= tScene2Start && t < tScene3Start) {
      const elapsed2 = t - tScene2Start;
      const progress2 = Math.min(1, elapsed2 / d2);

      let alpha2 = 1;
      let slideY2 = 0;
      if (elapsed2 < 0.4) {
        alpha2 = elapsed2 / 0.4;
      } else if (t > tScene2End) {
        const exitProg = (t - tScene2End) / SCENE_EXIT_PAUSE;
        alpha2 = Math.max(0, 1 - exitProg);
        slideY2 = exitProg * 40;
      }

      ctx.save();
      ctx.globalAlpha = alpha2;

      // Badge: Translation
      const badgeY = 130 + slideY2;
      ctx.fillStyle = "rgba(37, 99, 235, 0.28)";
      ctx.strokeStyle = "#60a5fa";
      ctx.lineWidth = 1.5;
      roundRect(ctx, width / 2 - 140, badgeY, 280, 42, 21);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#93c5fd";
      ctx.font = "bold 18px 'Noto Sans Gujarati', 'Mukta', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`📖  ${labels.transBadge}`, width / 2, badgeY + 28);

      // Translation Glass Card
      const cardX = 40;
      const cardY = 195 + slideY2;
      const cardW = width - 80;
      const cardH = 390;

      ctx.fillStyle = "rgba(8, 24, 60, 0.90)";
      ctx.strokeStyle = "rgba(96, 165, 250, 0.55)";
      ctx.lineWidth = 2;
      roundRect(ctx, cardX, cardY, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();

      // PURE TYPEWRITER REVEAL FOR TRANSLATION
      const wordsCount2 = Math.floor(progress2 * trWords.length);

      ctx.font = "600 23px 'Noto Sans Gujarati', 'Mukta', sans-serif";
      ctx.textAlign = "left";
      const { lines: trLines } = wrapContentLines(ctx, cleanTranslationText, cardW - 60);

      ctx.save();
      ctx.beginPath();
      roundRect(ctx, cardX + 15, cardY + 20, cardW - 30, cardH - 65, 12);
      ctx.clip();

      const lineSpacing = 42;
      const totalH = trLines.length * lineSpacing;
      const visibleH = cardH - 85;

      let scrollY = 0;
      if (totalH > visibleH) {
        let activeIdx = 0;
        for (let i = 0; i < trLines.length; i++) {
          if (wordsCount2 >= trLines[i].startWordIdx) {
            activeIdx = i;
          }
        }
        const targetScroll = activeIdx * lineSpacing - visibleH / 2 + lineSpacing / 2;
        scrollY = Math.max(0, Math.min(totalH - visibleH + 15, targetScroll));
      }

      const startY = cardY + 65 - scrollY;

      trLines.forEach((lineObj, idx) => {
        const lineY = startY + idx * lineSpacing;
        if (lineY < cardY - 20 || lineY > cardY + cardH + 20) return;

        // Skip entire line if audio has not reached it yet!
        if (lineObj.startWordIdx > wordsCount2) return;

        const fullLineWidth = ctx.measureText(lineObj.text).width;
        let currentX = (width - fullLineWidth) / 2;

        lineObj.words.forEach((word, wIdx) => {
          const globalWIdx = lineObj.startWordIdx + wIdx;
          const wordWithSpace = word + " ";
          const wordWidth = ctx.measureText(wordWithSpace).width;

          if (globalWIdx <= wordsCount2) {
            const isSpeaking = globalWIdx === wordsCount2;
            if (isSpeaking) {
              ctx.fillStyle = "#fbbf24";
              ctx.shadowColor = "rgba(251, 191, 36, 0.9)";
              ctx.shadowBlur = 12;
            } else {
              ctx.fillStyle = "#ffffff";
              ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
              ctx.shadowBlur = 6;
            }
            ctx.fillText(word, currentX, lineY);
          }

          currentX += wordWidth;
        });
      });

      ctx.restore();

      drawAudioWaveform(ctx, width / 2 - 120, cardY + cardH - 35, 240, 20, t);

      ctx.restore();
    }

    // ----- SCENE 3: GITA LIFE MESSAGE (Sequential Point-by-Point Cards + Large 23px Font) -----
    if (t >= tScene3Start && t < tScene3End) {
      const elapsed3 = t - tScene3Start;
      const progress3 = Math.min(1, elapsed3 / d3);
      const wordsCount3 = Math.floor(progress3 * totalMsgWords);

      // 1. Determine currently active section (Point 1 -> Point 2 -> Example)
      let activeSecIdx = 0;
      for (let i = 0; i < msgSections.length; i++) {
        if (wordsCount3 >= msgSections[i].startWordIdx) {
          activeSecIdx = i;
        }
      }
      const activeSec = msgSections[activeSecIdx] || msgSections[0];

      // 2. Section timing calculations
      const secStartRatio = activeSec.startWordIdx / totalMsgWords;
      const secEndRatio = activeSec.endWordIdx / totalMsgWords;
      const secStartTime = secStartRatio * d3;
      const secEndTime = secEndRatio * d3;
      const secElapsed = elapsed3 - secStartTime;
      const timeUntilEnd = secEndTime - elapsed3;

      // 3. Smooth section transitions:
      // Fade in & slide up when entering
      // Fade out & slide up when leaving for the next point
      const FADE_DUR = 0.28;
      let secAlpha = 1;
      let secSlideY = 0;

      if (secElapsed < FADE_DUR) {
        const p = Math.max(0, secElapsed / FADE_DUR);
        secAlpha = p;
        secSlideY = (1 - p) * 16;
      } else if (timeUntilEnd < FADE_DUR && activeSecIdx < msgSections.length - 1) {
        const p = Math.max(0, timeUntilEnd / FADE_DUR);
        secAlpha = p;
        secSlideY = (1 - p) * -16;
      }

      ctx.save();
      ctx.globalAlpha = secAlpha;

      // 4. Badge: Point 1 / Point 2 / Real-Life Example
      const badgeY = 130 + secSlideY;
      const isEx = activeSec.isExample;
      ctx.fillStyle = isEx ? "rgba(16, 185, 129, 0.25)" : "rgba(245, 158, 11, 0.25)";
      ctx.strokeStyle = isEx ? "#10b981" : "#f59e0b";
      ctx.lineWidth = 1.5;
      roundRect(ctx, width / 2 - 145, badgeY, 290, 42, 21);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isEx ? "#6ee7b7" : "#fbbf24";
      ctx.font = "bold 18px 'Noto Sans Gujarati', 'Mukta', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(activeSec.badge, width / 2, badgeY + 28);

      // 5. Glass Card (Prominent 390px height, identical to Gujarati Translation!)
      const cardX = 40;
      const cardY = 195 + secSlideY;
      const cardW = width - 80;
      const cardH = 390;

      ctx.fillStyle = "rgba(10, 25, 60, 0.92)";
      ctx.strokeStyle = isEx ? "rgba(16, 185, 129, 0.55)" : "rgba(251, 191, 36, 0.55)";
      ctx.lineWidth = 2;
      roundRect(ctx, cardX, cardY, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();

      // 6. Large 23px Font Typography & Centered Lines (Just like Gujarati Translation!)
      const secWordCount = Math.max(0, wordsCount3 - activeSec.startWordIdx);

      ctx.font = "600 23px 'Noto Sans Gujarati', 'Mukta', sans-serif";
      ctx.textAlign = "left";
      const lineSpacing = 42;

      ctx.save();
      ctx.beginPath();
      roundRect(ctx, cardX + 15, cardY + 20, cardW - 30, cardH - 65, 12);
      ctx.clip();

      const lines = activeSec.wrappedLines || [];
      const totalH = lines.length * lineSpacing;
      const visibleH = cardH - 85;

      let scrollY = 0;
      if (totalH > visibleH) {
        let activeIdx = 0;
        for (let i = 0; i < lines.length; i++) {
          if (secWordCount >= lines[i].startWordIdx) {
            activeIdx = i;
          }
        }
        const targetScroll = activeIdx * lineSpacing - visibleH / 2 + lineSpacing / 2;
        scrollY = Math.max(0, Math.min(totalH - visibleH + 15, targetScroll));
      }

      // Vertical auto-centering:
      const verticalPad = totalH < visibleH ? Math.max(0, (visibleH - totalH) / 2) : 0;
      const startY = cardY + 60 + verticalPad - scrollY;

      lines.forEach((lineObj, idx) => {
        const lineY = startY + idx * lineSpacing;
        if (lineY < cardY - 20 || lineY > cardY + cardH + 20) return;

        // Skip entire line if audio has not reached it yet!
        if (lineObj.startWordIdx > secWordCount) return;

        const fullLineWidth = ctx.measureText(lineObj.text).width;
        let currentX = (width - fullLineWidth) / 2;

        lineObj.words.forEach((word, wIdx) => {
          const wordIndexInSec = lineObj.startWordIdx + wIdx;
          const wordWithSpace = word + " ";
          const wordWidth = ctx.measureText(wordWithSpace).width;

          // Only draw if word has been reached by audio!
          if (wordIndexInSec <= secWordCount) {
            const isSpeaking = wordIndexInSec === secWordCount;
            if (isSpeaking) {
              ctx.fillStyle = isEx ? "#a7f3d0" : "#fde047";
              ctx.shadowColor = isEx ? "rgba(16, 185, 129, 0.9)" : "rgba(251, 191, 36, 0.9)";
              ctx.shadowBlur = 12;
            } else {
              ctx.fillStyle = "#ffffff";
              ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
              ctx.shadowBlur = 5;
            }
            ctx.fillText(word, currentX, lineY);
          }

          currentX += wordWidth;
        });
      });

      ctx.restore();

      // Audio waveform
      drawAudioWaveform(ctx, width / 2 - 120, cardY + cardH - 35, 240, 20, t);

      ctx.restore();
    }

    // ----- OUTRO (Final 2 seconds) -----
    if (t >= tScene3End) {
      const outElapsed = t - tScene3End;
      const outAlpha = Math.min(1, outElapsed / 0.8);

      ctx.save();
      ctx.globalAlpha = outAlpha;

      ctx.fillStyle = "rgba(4, 12, 36, 0.75)";
      ctx.fillRect(0, 0, width, height);

      const logoSize = 130;
      const logoX = width / 2 - logoSize / 2;
      const logoY = height / 2 - 120;

      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = 25;
      if (imgLogo) {
        ctx.drawImage(imgLogo, logoX, logoY, logoSize, logoSize);
      }

      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 28px 'Noto Sans Devanagari', 'Mukta', sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 8;
      ctx.fillText(labels.outroTop, width / 2, logoY + logoSize + 55);

      ctx.fillStyle = "#ffffff";
      ctx.font = "600 20px 'Noto Sans Gujarati', 'Mukta', sans-serif";
      ctx.fillText(labels.outroBottom, width / 2, logoY + logoSize + 100);

      ctx.restore();
    }
  }

  onProgress({ stage: "ready", percent: 100, message: "9:16 મલ્ટી-શોટ વિડીયો તૈયાર છે!" });

  return {
    canvas,
    audioCtx,
    saBuf,
    trBuf,
    msgBuf,
    totalDuration,
    tScene1End,
    tScene2Start,
    tScene2End,
    tScene3Start,
    tScene3End,
    tIntroEnd,
    detectedScenes: scenes,
    renderFrame,
    close: () => {
      try {
        audioCtx.close();
      } catch (e) {}
    },
  };
}

/**
 * Record and Export Shloka Canvas Video as 9:16 MP4 / WebM
 */
export async function exportShlokVideoMP4({
  shlok,
  lang = "gu",
  width = 720,
  height = 1280,
  onProgress = () => {},
}) {
  const renderer = await createShlokVideoRenderer({
    shlok,
    lang,
    width,
    height,
    onProgress,
  });

  const {
    canvas,
    audioCtx,
    saBuf,
    trBuf,
    msgBuf,
    totalDuration,
    tIntroEnd,
    tScene2Start,
    tScene3Start,
    renderFrame,
    close,
  } = renderer;

  onProgress({ stage: "recording", percent: 0, message: "9:16 વિડીયો રેકોર્ડ થઈ રહ્યો છે..." });

  const destNode = audioCtx.createMediaStreamDestination();

  const saSource = audioCtx.createBufferSource();
  saSource.buffer = saBuf;
  saSource.connect(destNode);

  const trSource = audioCtx.createBufferSource();
  trSource.buffer = trBuf;
  trSource.connect(destNode);

  const msgSource = audioCtx.createBufferSource();
  msgSource.buffer = msgBuf;
  msgSource.connect(destNode);

  const startTime = audioCtx.currentTime + 0.1;
  saSource.start(startTime + tIntroEnd);
  trSource.start(startTime + tScene2Start);
  msgSource.start(startTime + tScene3Start);

  const canvasStream = canvas.captureStream(30);

  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...destNode.stream.getAudioTracks(),
  ]);

  let mimeType = "video/webm;codecs=vp9,opus";
  if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1,mp4a.40.2")) {
    mimeType = "video/mp4;codecs=avc1,mp4a.40.2";
  } else if (MediaRecorder.isTypeSupported("video/mp4")) {
    mimeType = "video/mp4";
  } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
    mimeType = "video/webm;codecs=vp8,opus";
  } else if (MediaRecorder.isTypeSupported("video/webm")) {
    mimeType = "video/webm";
  }

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 3500000,
  });

  const recordedChunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      close();
      const ext = "mp4";
      const blob = new Blob(recordedChunks, { type: mimeType.split(";")[0] });
      resolve({ blob, ext, mimeType });
    };

    recorder.onerror = (e) => {
      close();
      reject(e);
    };

    recorder.start();

    const startPerfTime = performance.now();

    function renderLoop() {
      const now = (performance.now() - startPerfTime) / 1000;
      renderFrame(now);

      const percent = Math.min(99, Math.floor((now / totalDuration) * 100));
      onProgress({
        stage: "recording",
        percent,
        message: `9:16 વિડીયો રેકોર્ડ થઈ રહ્યો છે: ${percent}%...`,
      });

      if (now < totalDuration) {
        requestAnimationFrame(renderLoop);
      } else {
        setTimeout(() => {
          if (recorder.state === "recording") {
            recorder.stop();
          }
        }, 300);
      }
    }

    renderLoop();
  });
}
