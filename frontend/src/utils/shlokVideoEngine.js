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
import { fixVideoDuration } from "./videoDurationFixer.js";
import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4ArrayBufferTarget } from "mp4-muxer";
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmArrayBufferTarget } from "webm-muxer";

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
 * Intelligent Sanskrit Shloka Verse Formatter
 * Accurately parses shlokas into 2 authentic, beautifully balanced lines.
 * Handles Devanagari dandas (। / ॥), ASCII pipes (| / ||), newlines, and strips speaker intro text
 * (since speaker is already displayed in the speaker badge above the card).
 */
export function getSanskritLines(shlok, sNum = 1) {
  if (shlok.sanskritLine1 && shlok.sanskritLine2) {
    return [
      cleanHtmlText(shlok.sanskritLine1).trim(),
      cleanHtmlText(shlok.sanskritLine2).trim(),
    ];
  }

  const raw = cleanHtmlText(shlok.sanskrit || "").trim();
  // Normalize all pipe variations to Vedic dandas
  const normalized = raw
    .replace(/\|\|/g, "॥")
    .replace(/\|/g, "।")
    .replace(/\s+/g, " ");

  // Split by danda, double danda, or newline
  const rawParts = normalized
    .split(/[।॥\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Filter out any standalone shloka numbers like '15', '१५'
  const textParts = rawParts.filter((p) => !/^[\d०-૯0-9\s]+$/.test(p));

  // Convert shloka number to Devanagari numerals
  const devNum = String(sNum).replace(/[0-9]/g, (d) => "०१२३४५६७૮૯"[d] || "०१२३४५६७८९"[d] || d);

  if (textParts.length === 0) {
    return [raw];
  }

  // If there are 3 or more parts and one of them is speaker info (e.g. 'अर्जुन उवाच'),
  // filter it out since it's already shown in the speaker badge!
  const nonSpeakerParts = textParts.filter(
    (p) => !/(श्रीभगवान|अर्जुन|धृतराष्ट्र|सञ्जय|युधिष्ठिर)?\s*उवाच/i.test(p)
  );
  const partsToUse = nonSpeakerParts.length >= 2 ? nonSpeakerParts : textParts;

  if (partsToUse.length === 1) {
    // If only 1 long line without dandas, split evenly across words into 2 lines
    const words = partsToUse[0].split(/\s+/).filter(Boolean);
    if (words.length >= 4) {
      const mid = Math.ceil(words.length / 2);
      return [
        words.slice(0, mid).join(" ") + " ।",
        words.slice(mid).join(" ") + ` ॥ ${devNum} ॥`,
      ];
    }
    return [partsToUse[0] + ` ॥ ${devNum} ॥`];
  } else if (partsToUse.length === 2) {
    return [
      partsToUse[0].replace(/[।॥]+$/, "").trim() + " ।",
      partsToUse[1].replace(/[।॥]+$/, "").trim() + ` ॥ ${devNum} ॥`,
    ];
  } else {
    // 3 or more lines: format each line cleanly
    return partsToUse.map((tp, idx) => {
      const cleanTp = tp.replace(/[।॥]+$/, "").trim();
      return idx === partsToUse.length - 1 ? cleanTp + ` ॥ ${devNum} ॥` : cleanTp + " ।";
    });
  }
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

  // Select EXACTLY 10 distinct images for this video (unique combination for every shloka)
  let video10Shots = [];
  if (cloudPool && Array.isArray(cloudPool) && cloudPool.length > 0) {
    // Deterministic pseudo-random shuffle per shloka so every single video has a completely unique mix
    const pool = [...cloudPool];
    let seed = chNum * 7919 + sNum * 104729;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    video10Shots = pool.slice(0, 10);
  } else {
    const combinedDefaults = [
      ...scene1Shots,
      ...scene2Shots,
      ...scene3Shots,
      SCENE_IMAGES.krishnaUpdesh,
      SCENE_IMAGES.battleChariot,
      SCENE_IMAGES.karmaAction,
      SCENE_IMAGES.peaceMeditation,
      SCENE_IMAGES.krishnaVishwaroop,
      SCENE_IMAGES.guidanceMentor,
      SCENE_IMAGES.duryodhanaDrona,
    ];
    video10Shots = [...new Set(combinedDefaults)].filter(Boolean).slice(0, 10);
  }

  // Assign distinct slices of these 10 images to scenes
  scene1Shots = video10Shots.slice(0, 3);
  scene2Shots = video10Shots.slice(3, 5);
  scene3Shots = video10Shots.slice(5, 10);

  return {
    video10Shots,
    scene1Shots,
    scene2Shots,
    scene3Shots,
    scene1: video10Shots[0],
    scene2: video10Shots[3] || video10Shots[0],
    scene3: video10Shots[5] || video10Shots[0],
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

  // 2. Preload EXACTLY 10 unique video images (+ logo)
  onProgress({ stage: "images", percent: 15, message: "9:16 મલ્ટી-શોટ સિનેમેટિક આર્ટવર્ક લોડ થઈ રહ્યું છે..." });
  const uniqueSrcs = [
    ...new Set([
      ...(scenes.video10Shots || scenes.scene1Shots),
      SCENE_IMAGES.logo,
    ]),
  ].filter(Boolean);

  const loadedResults = await Promise.all(uniqueSrcs.map(preloadImage));
  const imageMap = {};
  loadedResults.forEach(({ src, img }) => {
    imageMap[src] = img;
  });

  const imgScene1Shots = (scenes.scene1Shots || []).map((src) => imageMap[src]).filter(Boolean);
  const imgScene2Shots = (scenes.scene2Shots || []).map((src) => imageMap[src]).filter(Boolean);
  const imgScene3Shots = (scenes.scene3Shots || []).map((src) => imageMap[src]).filter(Boolean);
  const imgLogo = imageMap[SCENE_IMAGES.logo];

  // Exactly 10 distinct images for this video (never more than 10; repeats in loop when finished)
  const allVideoShots = (scenes.video10Shots || [...imgScene1Shots, ...imgScene2Shots, ...imgScene3Shots])
    .map((src) => (typeof src === "string" ? imageMap[src] : src))
    .filter(Boolean)
    .slice(0, 10);

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
  const sanskritLines = getSanskritLines(shlok, sNum);
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

  // Pre-calculate exact acoustic duration and start/end times for each section in Scene 3
  // Acoustic weight factors in:
  // 1. Character count (reading speed in Gujarati/Hindi/English ~14.5 chars/sec at +6% rate)
  // 2. Word count
  // 3. Punctuation pauses (commas/colons ~0.28s, periods/dandas ~0.52s)
  // 4. Inter-section boundary pause (~0.45s)
  const secWeights = msgSections.map((sec) => {
    const words = sec.words.length;
    const chars = (sec.text.replace(/\s+/g, "")).length;
    const commaCount = (sec.text.match(/[,;:]/g) || []).length;
    const periodCount = (sec.text.match(/[.।!?]/g) || []).length;
    const estimatedSecs = (chars / 14.5) + (words * 0.1) + (commaCount * 0.28) + (periodCount * 0.52) + 0.45;
    return Math.max(1.5, estimatedSecs);
  });

  const totalSecWeight = secWeights.reduce((a, b) => a + b, 0);

  let cumulativeSecTime = 0;
  msgSections.forEach((sec, idx) => {
    const ratio = secWeights[idx] / totalSecWeight;
    const dur = ratio * d3;
    sec.startTime = cumulativeSecTime;
    sec.duration = dur;
    sec.endTime = cumulativeSecTime + dur;
    cumulativeSecTime += dur;
  });
  if (msgSections.length > 0) {
    msgSections[msgSections.length - 1].endTime = d3;
    msgSections[msgSections.length - 1].duration = Math.max(1, d3 - msgSections[msgSections.length - 1].startTime);
  }

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
  const precomputedTrLines = wrapContentLines(ctx, cleanTranslationText, width - 80 - 60).lines;

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
   * DYNAMIC 9:16 MULTI-SHOT BACKGROUND MONTAGE
   * User requirements:
   * - First 9 seconds: image changes every 3 seconds (0s to 3s, 3s to 6s, 6s to 9s)
   * - After 9 seconds: image changes every 5 seconds (9s to 14s, 14s to 19s, 19s to 24s, ...)
   * - Exactly 10 images per video: once all 10 images are shown, they repeat in loop (no extra images!)
   * Smooth Ken-Burns zoom + 0.55s cross-dissolve between shots.
   */
  function getShotInfo(t) {
    if (t < 9.0) {
      const shotDur = 3.0;
      const idx = Math.max(0, Math.floor(t / shotDur));
      const shotStart = idx * shotDur;
      const shotElapsed = t - shotStart;
      return { idx, shotDur, shotElapsed };
    } else {
      const shotDur = 5.0;
      const past9 = t - 9.0;
      const idx = 3 + Math.max(0, Math.floor(past9 / shotDur));
      const shotStart = 9.0 + (idx - 3) * shotDur;
      const shotElapsed = t - shotStart;
      return { idx, shotDur, shotElapsed };
    }
  }

  function drawDynamicMultiShotBackground(t) {
    if (!allVideoShots || allVideoShots.length === 0) return;
    if (allVideoShots.length === 1) {
      const p = Math.min(1, Math.max(0, t / (totalDuration || 20)));
      drawSingleKenBurns(allVideoShots[0], p, 0, 1);
      return;
    }

    const { idx, shotDur, shotElapsed } = getShotInfo(t);
    const FADE = Math.min(0.55, shotDur * 0.15);

    const currImg = allVideoShots[idx % allVideoShots.length];

    if (idx > 0 && shotElapsed < FADE) {
      const prevInfo = getShotInfo(Math.max(0, t - shotElapsed - 0.02));
      const prevImg = allVideoShots[(idx - 1) % allVideoShots.length];
      const fadeProgress = shotElapsed / FADE;

      const prevP = Math.min(1, (prevInfo.shotDur - FADE + shotElapsed) / prevInfo.shotDur);
      drawSingleKenBurns(prevImg, prevP, idx - 1, 1 - fadeProgress);

      const currP = shotElapsed / shotDur;
      drawSingleKenBurns(currImg, currP, idx, fadeProgress);
    } else {
      const currP = Math.min(1, shotElapsed / shotDur);
      drawSingleKenBurns(currImg, currP, idx, 1);
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
    // First 15 seconds: changes every 3s
    // After 15 seconds: changes every 5s
    // ==========================================
    drawDynamicMultiShotBackground(t);

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
      // Speech timing: 0.12s audio lead-in, finish typing ~0.25s before scene ends
      const progress1 = Math.min(1, Math.max(0, elapsed1 - 0.12) / Math.max(0.5, d1 - 0.25));

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

      // Glass Card for Sanskrit Verse (Translucent & Compact so background art is clearly visible)
      const cardX = 40;
      const cardY = 200 + slideY1;
      const cardW = width - 80;
      const cardH = 220;

      ctx.fillStyle = "rgba(4, 12, 34, 0.45)";
      ctx.strokeStyle = "rgba(251, 191, 36, 0.40)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, cardX, cardY, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();

      // Responsive Sanskrit Verse Auto-fitting (Guaranteed to fit 100% inside the card)
      const maxLineWidthAllowed = cardW - 46;
      let finalSanskritLines = [];

      let saFontSize = 25;
      ctx.font = `bold ${saFontSize}px 'Noto Sans Devanagari', 'Yatra One', serif`;

      let maxLineW = Math.max(...sanskritLines.map((l) => ctx.measureText(l).width), 0);
      while (maxLineW > maxLineWidthAllowed && saFontSize > 18) {
        saFontSize -= 1;
        ctx.font = `bold ${saFontSize}px 'Noto Sans Devanagari', 'Yatra One', serif`;
        maxLineW = Math.max(...sanskritLines.map((l) => ctx.measureText(l).width), 0);
      }

      sanskritLines.forEach((line) => {
        if (ctx.measureText(line).width <= maxLineWidthAllowed) {
          finalSanskritLines.push(line);
        } else {
          const { lines: wrapped } = wrapContentLines(ctx, line, maxLineWidthAllowed);
          wrapped.forEach((wl) => finalSanskritLines.push(wl.text));
        }
      });

      // PURE TYPEWRITER REVEAL: Words appear as recited; future words are INVISIBLE!
      const totalSaLineWords = finalSanskritLines.reduce(
        (acc, l) => acc + l.split(/\s+/).filter(Boolean).length,
        0
      );
      const wordsCount1 = Math.min(totalSaLineWords, Math.floor(progress1 * totalSaLineWords));

      ctx.textAlign = "left";
      const lineSpacing = Math.round(saFontSize * 2.15);
      const totalTextH = (finalSanskritLines.length - 1) * lineSpacing;
      const startY = cardY + Math.max(50, (cardH - 35 - totalTextH) / 2 + 5);

      let globalWordOffset = 0;
      finalSanskritLines.forEach((line, lineIdx) => {
        const lineY = startY + lineIdx * lineSpacing;
        const lineWords = line.split(" ").filter(Boolean);
        const fullLineWidth = ctx.measureText(line).width;
        let currentX = Math.max(cardX + 22, (width - fullLineWidth) / 2);

        lineWords.forEach((word) => {
          const wordWithSpace = word + " ";
          const wordWidth = ctx.measureText(wordWithSpace).width;

          // Only render if word has been reached by audio (pure typewriter reveal, NO highlight)
          if (globalWordOffset <= wordsCount1) {
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
            ctx.shadowBlur = 8;
            ctx.fillText(word, currentX, lineY);
          }
          // Future words: NOT drawn!

          currentX += wordWidth;
          globalWordOffset++;
        });
      });

      drawAudioWaveform(ctx, width / 2 - 120, cardY + cardH - 26, 240, 16, t);

      ctx.restore();
    }

    // ----- SCENE 2: TRANSLATION (Pure Typewriter as audio speaks) -----
    if (t >= tScene2Start && t < tScene3Start) {
      const elapsed2 = t - tScene2Start;
      // Speech timing: 0.15s audio lead-in, finish typing ~0.35s before scene ends
      const progress2 = Math.min(1, Math.max(0, elapsed2 - 0.15) / Math.max(0.5, d2 - 0.35));

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

      // Translation Glass Card (Translucent & Compact so background art is clearly visible)
      const cardX = 40;
      const cardY = 200 + slideY2;
      const cardW = width - 80;
      const cardH = 240;

      ctx.fillStyle = "rgba(4, 14, 38, 0.45)";
      ctx.strokeStyle = "rgba(96, 165, 250, 0.40)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, cardX, cardY, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();

      // PURE TYPEWRITER REVEAL FOR TRANSLATION
      const wordsCount2 = Math.floor(progress2 * trWords.length);

      ctx.font = "600 23px 'Noto Sans Gujarati', 'Mukta', sans-serif";
      ctx.textAlign = "left";
      const trLines = precomputedTrLines;

      ctx.save();
      ctx.beginPath();
      roundRect(ctx, cardX + 15, cardY + 15, cardW - 30, cardH - 50, 12);
      ctx.clip();

      const lineSpacing = 40;
      const totalH = trLines.length * lineSpacing;
      const visibleH = cardH - 65;

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

      const startY = cardY + 50 - scrollY;

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

          // Pure typewriter reveal: words appear as spoken in pure high-contrast white (NO yellow/green highlight)
          if (globalWIdx <= wordsCount2) {
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
            ctx.shadowBlur = 8;
            ctx.fillText(word, currentX, lineY);
          }

          currentX += wordWidth;
        });
      });

      ctx.restore();

      drawAudioWaveform(ctx, width / 2 - 120, cardY + cardH - 26, 240, 16, t);

      ctx.restore();
    }

    // ----- SCENE 3: GITA LIFE MESSAGE (Sequential Point-by-Point Cards + Large 23px Font) -----
    if (t >= tScene3Start && t < tScene3End) {
      const elapsed3 = t - tScene3Start;

      // 1. Determine currently active section (Point 1 -> Point 2 -> Example) based on calibrated acoustic duration
      let activeSecIdx = 0;
      for (let i = 0; i < msgSections.length; i++) {
        if (elapsed3 >= msgSections[i].startTime) {
          activeSecIdx = i;
        }
      }
      const activeSec = msgSections[activeSecIdx] || msgSections[0];

      // 2. Section timing calculations
      const secStartTime = activeSec.startTime;
      const secEndTime = activeSec.endTime;
      const secDuration = Math.max(0.1, activeSec.duration);
      const secElapsed = Math.max(0, elapsed3 - secStartTime);
      const timeUntilEnd = Math.max(0, secEndTime - elapsed3);

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

      // 5. Glass Card (Translucent & Compact 240px height so background art is visible!)
      const cardX = 40;
      const cardY = 200 + secSlideY;
      const cardW = width - 80;
      const cardH = 240;

      ctx.fillStyle = "rgba(4, 14, 38, 0.45)";
      ctx.strokeStyle = isEx ? "rgba(16, 185, 129, 0.40)" : "rgba(251, 191, 36, 0.40)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, cardX, cardY, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();

      // 6. Section words typewriter paced to match speaking speed exactly!
      // - 0.15s initial speech lead-in silence before first word
      // - Finishes revealing words ~0.35s before section ends (natural pause before next point)
      const secSpeechDuration = Math.max(0.5, secDuration - 0.45);
      const secProgress = Math.min(1, Math.max(0, secElapsed - 0.15) / secSpeechDuration);
      const secWordCount = Math.floor(secProgress * (activeSec.words?.length || 1));

      ctx.font = "600 23px 'Noto Sans Gujarati', 'Mukta', sans-serif";
      ctx.textAlign = "left";
      const lineSpacing = 40;

      ctx.save();
      ctx.beginPath();
      roundRect(ctx, cardX + 15, cardY + 15, cardW - 30, cardH - 50, 12);
      ctx.clip();

      const lines = activeSec.wrappedLines || [];
      const totalH = lines.length * lineSpacing;
      const visibleH = cardH - 65;

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
      const startY = cardY + 50 + verticalPad - scrollY;

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

          // Pure typewriter reveal: words appear as spoken in pure high-contrast white (NO yellow/green highlight)
          if (wordIndexInSec <= secWordCount) {
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
            ctx.shadowBlur = 8;
            ctx.fillText(word, currentX, lineY);
          }

          currentX += wordWidth;
        });
      });

      ctx.restore();

      // Audio waveform
      drawAudioWaveform(ctx, width / 2 - 120, cardY + cardH - 26, 240, 16, t);

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
 * Select a matched hardware-accelerated (Video + Audio + Container) codec pair for WebCodecs
 */
async function selectSupportedMuxerCodecs(width, height) {
  if (typeof VideoEncoder === "undefined" || typeof AudioEncoder === "undefined") {
    return null;
  }

  // 1. Try MP4 (H.264 + AAC @ 48kHz)
  const mp4VideoCandidates = ["avc1.4d0028", "avc1.42001f", "avc1.640028"];
  for (const vCodec of mp4VideoCandidates) {
    try {
      const vSup = await VideoEncoder.isConfigSupported({
        codec: vCodec,
        width,
        height,
        bitrate: 2_500_000,
        framerate: 25,
      });
      if (vSup?.supported) {
        const aSup = await AudioEncoder.isConfigSupported({
          codec: "mp4a.40.2",
          numberOfChannels: 1,
          sampleRate: 48000,
          bitrate: 128_000,
        });
        if (aSup?.supported) {
          return {
            format: "mp4",
            videoCodec: vCodec,
            videoMuxerCodec: "avc",
            audioCodec: "mp4a.40.2",
            audioMuxerCodec: "aac",
            sampleRate: 48000,
          };
        }
        break; // H.264 is supported, but AAC AudioEncoder is unavailable -> use WebM pair
      }
    } catch (e) {}
  }

  // 2. Fallback to WebM (VP8/VP9 + Opus @ 48kHz — supported on Chrome, Edge & Android!)
  const webmVideoCandidates = [
    { codec: "vp8", muxerCodec: "V_VP8" },
    { codec: "vp09.00.10.08", muxerCodec: "V_VP9" },
  ];
  for (const vc of webmVideoCandidates) {
    try {
      const vSup = await VideoEncoder.isConfigSupported({
        codec: vc.codec,
        width,
        height,
        bitrate: 2_500_000,
        framerate: 25,
      });
      if (vSup?.supported) {
        const aSup = await AudioEncoder.isConfigSupported({
          codec: "opus",
          numberOfChannels: 1,
          sampleRate: 48000,
          bitrate: 128_000,
        });
        if (aSup?.supported) {
          return {
            format: "webm",
            videoCodec: vc.codec,
            videoMuxerCodec: vc.muxerCodec,
            audioCodec: "opus",
            audioMuxerCodec: "A_OPUS",
            sampleRate: 48000,
          };
        }
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Stitch & resample all speech buffers into a 48kHz AudioBuffer using OfflineAudioContext (< 50ms)
 */
async function buildShlokCompositeAudioBuffer(renderer, targetSampleRate = 48000) {
  const { saBuf, trBuf, msgBuf, tIntroEnd, tScene2Start, tScene3Start, totalDuration } = renderer;
  const totalSamples = Math.max(1, Math.ceil(totalDuration * targetSampleRate));
  const offlineCtx = new OfflineAudioContext(1, totalSamples, targetSampleRate);

  const scheduleBuf = (buf, startSec) => {
    if (!buf) return;
    const src = offlineCtx.createBufferSource();
    src.buffer = buf;
    src.connect(offlineCtx.destination);
    src.start(Math.max(0, startSec));
  };

  if (saBuf) scheduleBuf(saBuf, tIntroEnd);
  if (trBuf) scheduleBuf(trBuf, tScene2Start);
  if (msgBuf) scheduleBuf(msgBuf, tScene3Start);

  return await offlineCtx.startRendering();
}

/**
 * Super-Fast Offline Hardware Video Export using WebCodecs (VideoEncoder + AudioEncoder + Muxer)
 * Renders at maximum GPU/CPU speed (typically 75-120+ FPS), encoding a video in ~8 to 15 seconds!
 */
async function exportShlokVideoFastWebCodecs(renderer, codecs, onProgress = () => {}) {
  const { canvas, totalDuration, renderFrame, close } = renderer;
  const useMp4 = codecs.format === "mp4";
  const targetFormat = codecs.format;

  let muxer;
  let target;

  if (useMp4) {
    target = new Mp4ArrayBufferTarget();
    muxer = new Mp4Muxer({
      target,
      video: {
        codec: "avc",
        width: canvas.width,
        height: canvas.height,
        frameRate: 25,
      },
      audio: {
        codec: "aac",
        numberOfChannels: 1,
        sampleRate: codecs.sampleRate,
      },
      fastStart: "in-memory",
      firstTimestampBehavior: "offset",
    });
  } else {
    target = new WebmArrayBufferTarget();
    muxer = new WebmMuxer({
      target,
      video: {
        codec: codecs.videoMuxerCodec,
        width: canvas.width,
        height: canvas.height,
        frameRate: 25,
      },
      audio: {
        codec: "A_OPUS",
        numberOfChannels: 1,
        sampleRate: codecs.sampleRate,
      },
      firstTimestampBehavior: "offset",
    });
  }

  let encoderError = null;

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => {
      try {
        muxer.addVideoChunk(chunk, meta);
      } catch (err) {
        encoderError = err;
      }
    },
    error: (err) => {
      encoderError = err;
    },
  });

  videoEncoder.configure({
    codec: codecs.videoCodec,
    width: canvas.width,
    height: canvas.height,
    bitrate: 2_500_000,
    framerate: 25,
  });

  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => {
      try {
        muxer.addAudioChunk(chunk, meta);
      } catch (err) {
        encoderError = err;
      }
    },
    error: (err) => {
      encoderError = err;
    },
  });

  audioEncoder.configure({
    codec: codecs.audioCodec,
    numberOfChannels: 1,
    sampleRate: codecs.sampleRate,
    bitrate: 128_000,
  });

  // 1. Super-Fast Audio Track Encoding (Process entire audio in < 0.2s!)
  onProgress({
    stage: "encoding_audio",
    percent: 10,
    message: "ઓડિયો સુપર-સ્પીડ પ્રોસેસ થઈ રહ્યો છે...",
  });

  const compositeAudio = await buildShlokCompositeAudioBuffer(renderer, codecs.sampleRate);
  const audioRate = compositeAudio.sampleRate;
  const channelData = compositeAudio.getChannelData(0);
  const totalAudioSamples = channelData.length;
  const AUDIO_CHUNK_SIZE = 1024;

  let audioOffset = 0;
  while (audioOffset < totalAudioSamples) {
    if (encoderError) throw encoderError;

    const framesInChunk = Math.min(AUDIO_CHUNK_SIZE, totalAudioSamples - audioOffset);
    const chunkBuffer = new Float32Array(framesInChunk);
    chunkBuffer.set(channelData.subarray(audioOffset, audioOffset + framesInChunk));

    const timestampUs = Math.round((audioOffset / audioRate) * 1_000_000);

    const audioData = new AudioData({
      format: "f32-planar",
      sampleRate: audioRate,
      numberOfFrames: framesInChunk,
      numberOfChannels: 1,
      timestamp: timestampUs,
      data: chunkBuffer,
    });

    audioEncoder.encode(audioData);
    audioData.close();

    audioOffset += framesInChunk;

    if (audioEncoder.encodeQueueSize > 12) {
      await new Promise((resolve) => {
        audioEncoder.ondequeue = resolve;
      });
    }
  }

  await audioEncoder.flush();

  // 2. High-Speed Frame-by-Frame GPU Video Encoding
  const TARGET_FPS = 25;
  const totalFrames = Math.ceil(totalDuration * TARGET_FPS);
  const startPerf = performance.now();

  onProgress({
    stage: "recording",
    percent: 15,
    message: "વિડીયો હાઇ-સ્પીડ એન્કોડિંગ શરૂ થઈ રહ્યું છે...",
  });

  for (let i = 0; i < totalFrames; i++) {
    if (encoderError) throw encoderError;

    const t = i / TARGET_FPS;
    renderFrame(t);

    const timestampUs = Math.round(t * 1_000_000);
    const isKeyFrame = i % (TARGET_FPS * 2) === 0;

    const videoFrame = new VideoFrame(canvas, { timestamp: timestampUs });
    videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
    videoFrame.close();

    // Prevent encoder queue overflow
    if (videoEncoder.encodeQueueSize > 5) {
      await new Promise((resolve) => {
        videoEncoder.ondequeue = resolve;
      });
    }

    // Update progress and micro-yield every 6 frames for smooth UI
    if (i % 6 === 0 || i === totalFrames - 1) {
      const percent = Math.min(99, Math.floor((i / totalFrames) * 100));
      const elapsedSec = (performance.now() - startPerf) / 1000;
      const currentFps = i > 0 && elapsedSec > 0 ? i / elapsedSec : 25;
      const remainingFrames = totalFrames - i;
      const estRemainingSec = Math.max(0, Math.ceil(remainingFrames / currentFps));

      onProgress({
        stage: "recording",
        percent,
        message: `હાઇ-સ્પીડ એન્કોડિંગ: ${percent}% (~${Math.round(currentFps)} FPS, અંદાજે ${estRemainingSec} સેકન્ડ બાકી)...`,
      });

      await new Promise((r) => setTimeout(r, 0));
    }
  }

  onProgress({
    stage: "finalizing",
    percent: 98,
    message: "વિડીયો ફાઇલ કન્વર્ઝન પૂર્ણ થઈ રહ્યું છે...",
  });

  await videoEncoder.flush();
  muxer.finalize();

  const buffer = target.buffer;
  const isMp4 = targetFormat === "mp4";
  const rawBlob = new Blob([buffer], { type: isMp4 ? "video/mp4" : "video/webm" });

  let blob = rawBlob;
  if (!isMp4) {
    try {
      blob = await fixVideoDuration(rawBlob, totalDuration, "video/webm");
    } catch (e) {
      console.warn("Could not patch webm duration:", e);
    }
  }

  close();

  onProgress({
    stage: "done",
    percent: 100,
    message: "વિડીયો સફળતાપૂર્વક તૈયાર થઈ ગયો છે!",
  });

  return {
    blob,
    ext: isMp4 ? "mp4" : "webm",
    mimeType: isMp4 ? "video/mp4" : "video/webm",
    duration: totalDuration,
  };
}

/**
 * Real-time MediaRecorder Fallback for older browsers without WebCodecs support
 */
async function exportShlokVideoRealtimeMediaRecorder(renderer, onProgress = () => {}) {
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

  onProgress({ stage: "recording", percent: 0, message: "9:16 વિડીયો રેકોર્ડિંગ શરૂ થઈ રહ્યું છે..." });

  // Ensure AudioContext is actively running before capturing stream
  try {
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }
  } catch (e) {
    console.warn("AudioContext resume failed:", e);
  }

  const destNode = audioCtx.createMediaStreamDestination();

  // Keep audio stream continuously active with inaudible zero-gain oscillator to prevent MediaRecorder starvation
  const silentOsc = audioCtx.createOscillator();
  const silentGain = audioCtx.createGain();
  silentGain.gain.value = 0;
  silentOsc.connect(silentGain);
  silentGain.connect(destNode);
  try {
    silentOsc.start();
  } catch (e) {
    // ignore
  }

  const startTime = audioCtx.currentTime + 0.1;

  if (saBuf) {
    const saSource = audioCtx.createBufferSource();
    saSource.buffer = saBuf;
    saSource.connect(destNode);
    saSource.start(startTime + tIntroEnd);
  }

  if (trBuf) {
    const trSource = audioCtx.createBufferSource();
    trSource.buffer = trBuf;
    trSource.connect(destNode);
    trSource.start(startTime + tScene2Start);
  }

  if (msgBuf) {
    const msgSource = audioCtx.createBufferSource();
    msgSource.buffer = msgBuf;
    msgSource.connect(destNode);
    msgSource.start(startTime + tScene3Start);
  }

  // Pre-render frame 0 so the canvas stream has an active bitmap
  renderFrame(0);

  // 25 FPS standard cinema/reels framerate (silky smooth, lightweight, hardware optimized)
  const canvasStream = canvas.captureStream(25);

  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...destNode.stream.getAudioTracks(),
  ]);

  // Hardware accelerated codec priority: MP4 (H.264 / AVC1) & VP8 encode 3x-4x faster than software VP9!
  const candidateTypes = [
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/webm;codecs=vp9,opus",
  ];

  let recorder = null;
  let mimeType = "";

  for (const type of candidateTypes) {
    if (typeof MediaRecorder.isTypeSupported === "function" && !MediaRecorder.isTypeSupported(type)) {
      continue;
    }
    try {
      recorder = new MediaRecorder(combinedStream, {
        mimeType: type,
        videoBitsPerSecond: 2000000,
      });
      mimeType = type;
      break;
    } catch (e) {
      console.warn(`MediaRecorder failed with type ${type}:`, e);
    }
  }

  if (!recorder) {
    try {
      recorder = new MediaRecorder(combinedStream);
      mimeType = recorder.mimeType || "video/webm";
    } catch (err) {
      try {
        silentOsc.stop();
      } catch (e) {}
      close();
      throw new Error(`બ્રાઉઝરમાં વિડિઓ રેકોર્ડિંગ સપોર્ટ ઉપલબ્ધ નથી: ${err?.message || err?.name || err}`);
    }
  }

  const recordedChunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  return new Promise((resolve, reject) => {
    let stopped = false;

    recorder.onstop = async () => {
      stopped = true;
      try {
        silentOsc.stop();
      } catch (e) {}
      close();

      onProgress({
        stage: "finalizing",
        percent: 99,
        message: "વિડીયો મેટાડેટા (ડ્યુરેશન) તૈયાર થઈ રહ્યું છે...",
      });

      const isMp4 = mimeType.toLowerCase().includes("mp4");
      const ext = isMp4 ? "mp4" : "webm";
      const rawBlob = new Blob(recordedChunks, {
        type: mimeType.split(";")[0] || (isMp4 ? "video/mp4" : "video/webm"),
      });

      let blob = rawBlob;
      try {
        blob = await fixVideoDuration(rawBlob, totalDuration, mimeType);
      } catch (patchErr) {
        console.warn("Could not patch video duration metadata:", patchErr);
      }

      resolve({ blob, ext, mimeType, duration: totalDuration });
    };

    recorder.onerror = (e) => {
      stopped = true;
      try {
        silentOsc.stop();
      } catch (err) {}
      close();

      const detailed =
        e?.error?.message ||
        e?.error?.name ||
        e?.message ||
        e?.name ||
        "મીડિયા રેકોર્ડરમાં ક્ષતિ આવી";
      console.error("MediaRecorder error:", e);
      reject(new Error(detailed));
    };

    try {
      recorder.start(2000);
    } catch (startErr) {
      try {
        silentOsc.stop();
      } catch (e) {}
      close();
      reject(new Error(`રેકોર્ડિંગ શરૂ કરવામાં નિષ્ફળ: ${startErr?.message || startErr?.name || startErr}`));
      return;
    }

    const startPerfTime = performance.now();
    const TARGET_FPS = 25;
    const FRAME_MS = 1000 / TARGET_FPS;
    let lastRenderPerf = 0;

    function recordLoop() {
      if (stopped || recorder.state !== "recording") return;

      const perfNow = performance.now();
      const elapsedSinceRender = perfNow - lastRenderPerf;

      if (elapsedSinceRender >= FRAME_MS) {
        lastRenderPerf = perfNow - (elapsedSinceRender % FRAME_MS);
        const now = (perfNow - startPerfTime) / 1000;
        renderFrame(now);

        const remainingSec = Math.max(0, Math.ceil(totalDuration - now));
        const percent = Math.min(99, Math.floor((now / totalDuration) * 100));
        onProgress({
          stage: "recording",
          percent,
          message: `વિડીયો એન્કોડ થઈ રહ્યો છે: ${percent}% (અંદાજે ${remainingSec} સેકન્ડ બાકી)...`,
        });

        if (now >= totalDuration) {
          setTimeout(() => {
            try {
              if (recorder.state === "recording") {
                recorder.stop();
              }
            } catch (stopErr) {
              console.warn("Error stopping recorder:", stopErr);
            }
          }, 80);
          return;
        }
      }

      requestAnimationFrame(recordLoop);
    }

    requestAnimationFrame(recordLoop);
  });
}

/**
 * Record and Export Shloka Canvas Video as 9:16 MP4 / WebM
 * Automatically leverages high-speed WebCodecs hardware encoding (5x-10x faster) when supported,
 * and falls back gracefully to real-time MediaRecorder in legacy browsers.
 */
export async function exportShlokVideoMP4({
  shlok,
  lang = "gu",
  width = 720,
  height = 1280,
  onProgress = () => {},
}) {
  const canUseFastWebCodecs =
    typeof window !== "undefined" &&
    typeof window.VideoEncoder === "function" &&
    typeof window.AudioEncoder === "function" &&
    typeof window.VideoFrame === "function" &&
    typeof window.AudioData === "function";

  const codecs = canUseFastWebCodecs ? await selectSupportedMuxerCodecs(width, height) : null;

  const renderer = await createShlokVideoRenderer({
    shlok,
    lang,
    width,
    height,
    onProgress,
  });

  if (codecs) {
    try {
      return await exportShlokVideoFastWebCodecs(renderer, codecs, onProgress);
    } catch (fastErr) {
      console.warn("Fast WebCodecs export failed, falling back to MediaRecorder:", fastErr);
      const fallbackRenderer = await createShlokVideoRenderer({
        shlok,
        lang,
        width,
        height,
        onProgress,
      });
      return await exportShlokVideoRealtimeMediaRecorder(fallbackRenderer, onProgress);
    }
  }

  return await exportShlokVideoRealtimeMediaRecorder(renderer, onProgress);
}
