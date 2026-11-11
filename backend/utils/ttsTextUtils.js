const crypto = require("crypto");

// Map language and preferred voice to Microsoft Neural voices
const VOICE_MAP = {
  gu: {
    male: "gu-IN-NiranjanNeural",
    female: "gu-IN-DhwaniNeural",
  },
  hi: {
    male: "hi-IN-MadhurNeural",
    female: "hi-IN-SwaraNeural",
  },
  en: {
    male: "en-IN-PrabhatNeural",
    female: "en-IN-NeerjaNeural",
  },
  sa: {
    male: "hi-IN-MadhurNeural",
    female: "hi-IN-SwaraNeural",
  },
};

function removeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li|blockquote|h[1-6]|tr)>/gi, "\n")
    .replace(/<(div|p|li|blockquote|h[1-6]|tr)[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

/**
 * Matches frontend audioCache.js extractCleanTextForSpeech identically so
 * server-side precache/warmup/batch/download share 100% of the same MD5 keys.
 */
function extractCleanTextForSpeech(htmlString) {
  if (!htmlString) return "";
  try {
    const preprocessed = String(htmlString)
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6])>/gi, " . ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&");
    let text = preprocessed.replace(/<[^>]*>/g, "");
    text = text.replace(/\s*[:：]\s*/g, " . ... ");
    text = text.replace(/[•\-\*]/g, " ");
    text = text.replace(/\s+/g, " ").trim();
    text = text.replace(/(\.\s*\.\.\.\s*)+/g, ". ... ");
    return text;
  } catch (e) {
    return String(htmlString).replace(/<[^>]*>/g, " ").trim();
  }
}

/**
 * Matches frontend audioCache.js formatSanskritForSpeech identically.
 */
function formatSanskritForSpeech(shlokObj) {
  if (!shlokObj) return "";
  let plain = removeHtml(shlokObj.sanskrit || "");
  if (!plain && (shlokObj.sanskritLine1 || shlokObj.sanskritLine2)) {
    plain = [shlokObj.sanskritLine1, shlokObj.sanskritLine2].filter(Boolean).join("\n");
  }
  plain = plain.replace(/[॥\|]\s*[\d\.\-०-९]+\s*[॥\|]/g, "।");
  const rawLines = plain
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const rhythmLines = rawLines
    .map((line) => {
      const cleanLine = line.replace(/[|।॥]+$/g, "").trim();
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
}

function normalizeTtsInputText(text) {
  if (!text || typeof text !== "string" || !text.trim()) return "";
  let cleanText = text.trim();
  cleanText = cleanText.replace(/<[^>]*>/g, " ");
  cleanText = cleanText.replace(/&nbsp;/gi, " ");
  cleanText = cleanText.replace(/&amp;/gi, " and ");
  cleanText = cleanText.replace(/[&<>]/g, " ");
  cleanText = cleanText.replace(/\s*[:：]\s*/g, ". ... ");
  cleanText = cleanText.replace(/(\.\s*\.\.\.\s*)+/g, ". ... ");
  return cleanText.replace(/\s+/g, " ").trim();
}

function getTtsSynthesisParams(text, lang = "gu", customRate = null) {
  const cleanText = normalizeTtsInputText(text);
  if (!cleanText) return null;

  const voiceLang = VOICE_MAP[lang] ? lang : "gu";
  const selectedVoice = VOICE_MAP[voiceLang].male;
  const prosodyOptions = {
    rate: customRate !== null && customRate !== undefined ? customRate : lang === "sa" ? "-22%" : "-2%",
    pitch: lang === "sa" ? "-2Hz" : "+0Hz",
  };

  const cacheKey = crypto
    .createHash("md5")
    .update(`${selectedVoice}:${prosodyOptions.rate}:${prosodyOptions.pitch}:${cleanText}`)
    .digest("hex");

  return { cleanText, voiceLang, selectedVoice, prosodyOptions, cacheKey };
}

/**
 * Build canonical speech tasks for a shloka matching the frontend audio cache keys.
 */
function buildShlokTtsTasks(shloka, languages = ["gu"]) {
  if (!shloka) return [];
  const tasks = [];
  const ch = shloka.chapterNumber;
  const sh = shloka.shlokNumber;

  const saText = formatSanskritForSpeech(shloka);
  if (saText) {
    const params = getTtsSynthesisParams(saText, "sa", "-22%");
    if (params) {
      tasks.push({
        label: `Ch ${ch} Sh ${sh} [Sanskrit]`,
        text: saText,
        cleanText: params.cleanText,
        lang: "sa",
        rate: "-22%",
        cacheKey: params.cacheKey,
      });
    }
  }

  for (const lang of languages) {
    const rawTr =
      (lang === "en"
        ? shloka.translationEn
        : lang === "hi"
        ? shloka.translationHi
        : shloka.translation) || shloka.translation;
    const trText = extractCleanTextForSpeech(rawTr);
    if (trText) {
      const params = getTtsSynthesisParams(trText, lang, "-2%");
      if (params) {
        tasks.push({
          label: `Ch ${ch} Sh ${sh} [Translation:${lang}]`,
          text: trText,
          cleanText: params.cleanText,
          lang,
          rate: "-2%",
          cacheKey: params.cacheKey,
        });
      }
    }

    const rawMsg =
      (lang === "en" ? shloka.messageEn : lang === "hi" ? shloka.messageHi : shloka.message) ||
      shloka.message;
    const msgText = extractCleanTextForSpeech(rawMsg);
    if (msgText) {
      const params = getTtsSynthesisParams(msgText, lang, "-2%");
      if (params) {
        tasks.push({
          label: `Ch ${ch} Sh ${sh} [Message:${lang}]`,
          text: msgText,
          cleanText: params.cleanText,
          lang,
          rate: "-2%",
          cacheKey: params.cacheKey,
        });
      }
    }
  }

  return tasks;
}

module.exports = {
  VOICE_MAP,
  removeHtml,
  extractCleanTextForSpeech,
  formatSanskritForSpeech,
  normalizeTtsInputText,
  getTtsSynthesisParams,
  buildShlokTtsTasks,
};
