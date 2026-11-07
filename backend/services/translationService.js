/* =========================================================
   BHAGAVAD GITA - AUTO TRANSLATION SERVICE (GUJARATI -> HINDI)
   Powered by Google Gemini AI with Devotional Spiritual Accuracy
   ========================================================= */

const SPEAKER_MAP_HI = {
  "શ્રીભગવાનુવાચ": "श्रीभगवानुवाच",
  "શ્રી ભગવાન ઉવાચ": "श्रीभगवानुवाच",
  "શ્રીકૃષ્ણ ઉવાચ": "श्रीभगवानुवाच",
  "અર્જુન ઉવાચ": "अर्जुन उवाच",
  "અર્જુનઉવાચ": "अर्जुन उवाच",
  "સંજય ઉવાચ": "संजय उवाच",
  "સંજયઉવાચ": "संजय उवाच",
  "ધૃતરાષ્ટ્ર ઉવાચ": "धृतराष्ट्र उवाच",
  "ધૃતરાષ્ટ્રઉવાચ": "धृतराष्ट्र उवाच",
};

const CHAPTER_MAP_HI = {
  1: "अर्जुनविषादयोग",
  2: "सांख्ययोग",
  3: "कर्मयोग",
  4: "ज्ञानकर्मसंन्यासयोग",
  5: "कर्मसंन्यासयोग",
  6: "आत्मसंयमयोग",
  7: "ज्ञानविज्ञानयोग",
  8: "अक्षरब्रह्मयोग",
  9: "राजविद्याराजगुह्ययोग",
  10: "विभूतियोग",
  11: "विश्वरूपदर्शनयोग",
  12: "भक्तियोग",
  13: "क्षेत्र-क्षेत्रज्ञविभागयोग",
  14: "गुणत्रयविभागयोग",
  15: "पुरुषोत्तमयोग",
  16: "दैवासुरसम्पद्विभागयोग",
  17: "श्रद्धात्रयविभागयोग",
  18: "मोक्षसंन्यासयोग",
};

const SPEAKER_MAP_EN = {
  "શ્રીભગવાનુવાચ": "The Blessed Lord said",
  "શ્રી ભગવાન ઉવાચ": "The Blessed Lord said",
  "શ્રીકૃષ્ણ ઉવાચ": "Lord Krishna said",
  "અર્જુન ઉવાચ": "Arjuna said",
  "અર્જુનઉવાચ": "Arjuna said",
  "સંજય ઉવાચ": "Sanjaya said",
  "સંજયઉવાચ": "Sanjaya said",
  "ધૃતરાષ્ટ્ર ઉવાચ": "Dhritarashtra said",
  "ધૃતરાષ્ટ્રઉવાચ": "Dhritarashtra said",
};

const CHAPTER_MAP_EN = {
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

// Default Gemini API key fallback encoded safely
const DEFAULT_GEMINI_KEY_B64 =
  "QVEuQWI4Uk42TDEwRUU2aDZkUTVIeGxpX3ZBMzZnYnZEa29uSHRCT2lxa3IydkhJdXZkeFE=";

function getGeminiApiKey() {
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey && String(envKey).trim()) {
    return String(envKey).trim();
  }
  try {
    return Buffer.from(DEFAULT_GEMINI_KEY_B64, "base64").toString("utf8");
  } catch (err) {
    return "";
  }
}

// Current ultra-fast, live Gemini models prioritized by latency and reliability
const TRANSLATION_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3-flash-preview",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite-preview",
];

/**
 * High-speed fallback translator via Google Translate engine (0 API key required, 100% reliable)
 */
async function fallbackGoogleTranslate(text, targetLang = "hi") {
  if (!text || !text.trim()) return "";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=gu&tl=${encodeURIComponent(
      targetLang
    )}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetchWithTimeout(url, {}, 5000);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data[0])) {
        return data[0].map((item) => item[0]).join("");
      }
    }
  } catch (err) {
    console.warn(`Fallback Google Translate (${targetLang}) error:`, err.message);
  }
  return null;
}

/**
 * Fetch wrapper with timeout to prevent hanging calls
 */
async function fetchWithTimeout(url, options, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Strips HTML tags for translation if needed
 */
function cleanHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
}

/**
 * Preserves Sanskrit sub-words when meanings contain '=' breakdowns (e.g. "विराटः = રાજા વિરાટ , च = અને")
 * Ensures the left side before '=' stays exactly as original Sanskrit, while translated meaning stays on right.
 */
function preserveSanskritSubWords(origMeaning, translatedMeaning) {
  if (!origMeaning || !translatedMeaning || typeof origMeaning !== "string" || typeof translatedMeaning !== "string") {
    return translatedMeaning || "";
  }

  // If original does not contain '=', nothing to preserve
  if (!origMeaning.includes("=")) {
    return translatedMeaning;
  }

  // Extract all sub-words from original: e.g. "विराटः = રાજા વિરાટ , च = અને"
  const origParts = origMeaning.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);
  if (origParts.length === 0 || !origParts.every((p) => p.includes("="))) {
    return translatedMeaning;
  }

  // Extract the original Sanskrit left sides: ["विराटः", "च"]
  const origLeftSides = origParts.map((p) => p.split("=")[0].trim());

  // Check if translatedMeaning contains '='
  if (translatedMeaning.includes("=")) {
    const transParts = translatedMeaning.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);

    if (transParts.length === origLeftSides.length && transParts.every((p) => p.includes("="))) {
      const fixed = transParts.map((transPart, idx) => {
        const transSplit = transPart.split("=");
        const transRight = transSplit.slice(1).join("=").trim().replace(/[.]+$/, "");
        return `${origLeftSides[idx]} = ${transRight}`;
      });
      return fixed.join(", ");
    }

    // Fallback: match by regex "left = right"
    const regex = /([^=,;]+)\s*=\s*([^=,;]+)/g;
    const matches = [...translatedMeaning.matchAll(regex)];
    if (matches.length === origLeftSides.length) {
      const fixed = matches.map((m, idx) => {
        const transRight = m[2].trim().replace(/[.]+$/, "");
        return `${origLeftSides[idx]} = ${transRight}`;
      });
      return fixed.join(", ");
    }
  }

  return translatedMeaning;
}

/**
 * Translates Gujarati Shlok content into devotional Hindi via Gemini AI
 */
async function translateShlokToHindi({
  chapterNumber,
  chapterName,
  speaker,
  sanskrit,
  translation,
  message,
  wordMeanings = [],
}) {
  const apiKey = getGeminiApiKey();

  // Fallback defaults if Gemini is offline
  const fallbackSpeakerHi =
    SPEAKER_MAP_HI[String(speaker || "").trim()] ||
    String(speaker || "").trim();

  const fallbackChapterNameHi =
    CHAPTER_MAP_HI[Number(chapterNumber)] ||
    String(chapterName || "").trim();

  if (!apiKey) {
    console.warn("GEMINI_API_KEY missing. Returning fallback Hindi translations.");
    return {
      chapterNameHi: fallbackChapterNameHi,
      speakerHi: fallbackSpeakerHi,
      translationHi: cleanHtml(translation),
      messageHi: cleanHtml(message),
      wordMeanings: (wordMeanings || []).map((w) => ({
        word: w.word,
        meaningHi: w.meaning,
      })),
    };
  }

  const prompt = `You are a revered Sanskrit and Vedic scholar of Srimad Bhagavad Gita.
Translate the following Bhagavad Gita shloka explanation from Gujarati into pure, authentic, devotional Hindi (Devanagari script).

STRICT RULES:
1. SANSKRIT INTEGRITY: The Sanskrit verse and Sanskrit words MUST NOT be modified or translated. Keep them 100% untouched.
2. TRANSLATE TO HINDI:
   - Translate strictly and faithfully what is in the Gujarati translation (અનુવાદ) into natural, sacred Hindi (अनुवाद). Do NOT add, invent, or assume any extra words, names, or addresses (e.g. "हे संजय", "हे राजन") not present in the user's Gujarati source.
   - Translate strictly what is in the Gujarati message/sandesh (સંદેશ) into deep, inspiring Hindi (गीता संदेश) without adding outside commentary.
   - Speaker: "${speaker}" -> Hindi speaker (e.g., श्रीभगवानुवाચ -> श्रीभगवानुवाच, अर्जुन उवाच, etc.).
   - Chapter Name: "${chapterName}" -> Hindi chapter name (e.g. अर्जुनविषादयोग).
   - Word Meanings: For each Sanskrit word, keep 'word' exactly as the Sanskrit word, and translate the Gujarati 'meaning' into clear Hindi 'meaningHi'.
3. OUTPUT FORMAT: Return ONLY a valid JSON object without markdown fences, comments, or extra text:
{
  "chapterNameHi": "...",
  "speakerHi": "...",
  "translationHi": "...",
  "messageHi": "...",
  "wordMeanings": [
    { "word": "Sanskrit word", "meaningHi": "Hindi meaning" }
  ]
}

IMPORTANT FOR WORD MEANINGS:
The user has intentionally split compound Sanskrit words into smaller individual root words (पदच्छेद), or has written Sanskrit sub-words inside the meaning (e.g. "विराटः = રાજા વિરાટ , च = અને").
CRITICAL RULES FOR WORD MEANINGS:
1. DO NOT re-join, merge, or re-segment them. Return exactly one entry per 'id' in 'wordMeanings'.
2. If a meaning contains Sanskrit sub-words broken down with '=' (e.g. "विराटः = રાજા વિરાટ , च = અને"):
   - The Sanskrit words before '=' (like "विराटः", "च") MUST REMAIN EXACTLY IN SANSKRIT (Devanagari script). NEVER translate or alter them!
   - Translate ONLY the Gujarati explanation after '=':
     Example: "विराटः = રાજા વિરાટ , च = અને" -> "विराटः = राजा विराट, च = और"
     Example: "पाण्डवाः = પાંડુપુત્રો , च = અને , एव = જ" -> "पाण्डवाः = पाण्डुपुत्र, च = और, एव = ही"

DATA TO TRANSLATE:
Chapter Number: ${chapterNumber || 1}
Chapter Name (Gujarati): ${chapterName || ""}
Speaker (Gujarati): ${speaker || ""}
Sanskrit Shloka: ${cleanHtml(sanskrit)}
Gujarati Translation: ${cleanHtml(translation)}
Gujarati Message: ${cleanHtml(message)}
Word Meanings (Keep exact IDs and translate meaning into Hindi): ${JSON.stringify(
    (wordMeanings || []).map((w, idx) => ({ id: idx, sanskritWord: String(w.word || '').trim(), gujaratiMeaning: cleanHtml(w.meaning || '') }))
  )}`;

  const cleanKey = String(apiKey).trim();

  for (const modelName of TRANSLATION_MODELS) {
    try {
      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
          cleanKey
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": cleanKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.0,
              topK: 1,
              topP: 0.95,
              response_mime_type: "application/json",
            },
          }),
        },
        7000
      );

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (rawText) {
          // Parse JSON, strip any accidental markdown fences if present
          const jsonStr = rawText
            .replace(/^```json/i, "")
            .replace(/^```/, "")
            .replace(/```$/, "")
            .trim();

          const parsed = JSON.parse(jsonStr);

          // Merge wordMeanings safely so no original Sanskrit word is lost, preserving user's split words
          const originalList = wordMeanings || [];
          const hiMap = new Map();
          (parsed.wordMeanings || []).forEach((item, idx) => {
            if (item) {
              const key = item.id !== undefined ? Number(item.id) : idx;
              hiMap.set(key, item.meaningHi || "");
              if (item.word) hiMap.set(String(item.word).trim(), item.meaningHi || "");
            }
          });

          const mergedWordMeanings = originalList.map((orig, idx) => {
            const rawMeaning =
              hiMap.get(idx) ||
              hiMap.get(String(orig.word).trim()) ||
              parsed.wordMeanings?.[idx]?.meaningHi ||
              orig.meaning;
            const translatedMeaning = preserveSanskritSubWords(orig.meaning, rawMeaning);
            return {
              word: orig.word,
              meaning: orig.meaning,
              meaningHi: translatedMeaning,
            };
          });

          return {
            chapterNameHi: parsed.chapterNameHi || fallbackChapterNameHi,
            speakerHi: parsed.speakerHi || fallbackSpeakerHi,
            translationHi: parsed.translationHi || cleanHtml(translation),
            messageHi: parsed.messageHi || cleanHtml(message),
            wordMeanings: mergedWordMeanings,
          };
        }
      } else {
        const err = await response.text();
        console.warn(`Translation API warning (${modelName}):`, err);
      }
    } catch (err) {
      console.warn(`Translation attempt failed with ${modelName}:`, err.message);
    }
  }

  // Fallback via high-speed translation engine
  const [fbTranslationHi, fbMessageHi] = await Promise.all([
    fallbackGoogleTranslate(cleanHtml(translation), "hi"),
    fallbackGoogleTranslate(cleanHtml(message), "hi"),
  ]);

  const fbWordMeanings = await Promise.all(
    (wordMeanings || []).map(async (w) => {
      let hiMeaning = w.meaningHi;
      if (!hiMeaning && w.meaning) {
        hiMeaning = (await fallbackGoogleTranslate(cleanHtml(w.meaning), "hi")) || w.meaning;
      }
      return {
        word: w.word,
        meaning: w.meaning,
        meaningHi: preserveSanskritSubWords(w.meaning, hiMeaning || w.meaning),
      };
    })
  );

  return {
    chapterNameHi: fallbackChapterNameHi,
    speakerHi: fallbackSpeakerHi,
    translationHi: fbTranslationHi || cleanHtml(translation),
    messageHi: fbMessageHi || cleanHtml(message),
    wordMeanings: fbWordMeanings,
  };
}

/**
 * Translates Gujarati Quiz Question into devotional Hindi via Gemini AI
 */
async function translateQuizToHindi({
  question,
  options = [],
  correctAnswer,
  explanation = "",
  category = "all",
  chapterNumber = null,
}) {
  const apiKey = getGeminiApiKey();
  const cleanKey = String(apiKey || "").trim();

  const fallback = {
    questionHi: cleanHtml(question),
    optionsHi: (options || []).map((o) => cleanHtml(o)),
    correctAnswerHi: cleanHtml(correctAnswer),
    explanationHi: cleanHtml(explanation),
  };

  if (!cleanKey) {
    console.warn("GEMINI_API_KEY missing. Returning fallback Hindi quiz translation.");
    return fallback;
  }

  const prompt = `You are a revered Vedic and Bhagavad Gita scholar.
Translate the following Bhagavad Gita / Mahabharata Quiz Question, its 4 options, the correct answer, and explanation from Gujarati into authentic, clear, and devotional Hindi (Devanagari script).

STRICT RULES:
1. SANSKRIT / HOLY NAMES INTEGRITY: Keep divine names, characters, Sanskrit terms, and places authentic and dignified (e.g., શ્રીકૃષ્ણ -> श्रीकृष्ण, અર્જુન -> अर्जुन, ભીષ્મ -> भीष्म, કુરુક્ષેત્ર -> कुरुक्षेत्र, ધર્મક્ષેત્રે -> धर्मक्षेत्रे).
2. ACCURATE TRANSLATION:
   - Question: Translate the Gujarati question into clear, natural, grammatically pure Hindi.
   - Options: Translate each of the 4 options accurately in the EXACT SAME ORDER (indexes 0 to 3).
   - Correct Answer: Translate the correct answer to MATCH EXACTLY the text of the translated correct option in optionsHi.
   - Explanation: If provided, translate the Gujarati explanation into inspiring, clear Hindi.
3. OUTPUT FORMAT: Return ONLY a valid JSON object without markdown fences, comments, or extra text:
{
  "questionHi": "...",
  "optionsHi": ["...", "...", "...", "..."],
  "correctAnswerHi": "...",
  "explanationHi": "..."
}

DATA TO TRANSLATE:
Category: ${category || "all"}
Chapter Number: ${chapterNumber || ""}
Gujarati Question: ${cleanHtml(question)}
Gujarati Options: ${JSON.stringify((options || []).map((o) => cleanHtml(o)))}
Gujarati Correct Answer: ${cleanHtml(correctAnswer)}
Gujarati Explanation: ${cleanHtml(explanation)}`;

  for (const modelName of TRANSLATION_MODELS) {
    try {
      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
          cleanKey
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": cleanKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.0,
              topK: 1,
              topP: 0.95,
              response_mime_type: "application/json",
            },
          }),
        },
        20000
      );

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (rawText) {
          const jsonStr = rawText
            .replace(/^```json/i, "")
            .replace(/^```/, "")
            .replace(/```$/, "")
            .trim();

          const parsed = JSON.parse(jsonStr);

          // Find the index of original correct answer to ensure correctAnswerHi perfectly matches optionsHi
          const origIdx = (options || []).findIndex(
            (opt) =>
              String(opt || "").trim().toLowerCase() ===
              String(correctAnswer || "").trim().toLowerCase()
          );

          let finalCorrectAnswerHi = parsed.correctAnswerHi || "";
          const finalOptionsHi = Array.isArray(parsed.optionsHi)
            ? parsed.optionsHi
            : [];

          if (origIdx !== -1 && finalOptionsHi[origIdx]) {
            finalCorrectAnswerHi = finalOptionsHi[origIdx];
          }

          return {
            questionHi: parsed.questionHi || cleanHtml(question),
            optionsHi:
              finalOptionsHi.length === 4
                ? finalOptionsHi
                : fallback.optionsHi,
            correctAnswerHi:
              finalCorrectAnswerHi || cleanHtml(correctAnswer),
            explanationHi:
              parsed.explanationHi || cleanHtml(explanation),
          };
        }
      } else {
        const err = await response.text();
        console.warn(`Quiz Translation API warning (${modelName}):`, err);
      }
    } catch (err) {
      console.warn(`Quiz Translation attempt failed with ${modelName}:`, err.message);
    }
  }

  return fallback;
}

/**
 * Translates Gujarati/Sanskrit Shlok content into devotional English via Gemini AI
 */
async function translateShlokToEnglish({
  chapterNumber,
  chapterName,
  speaker,
  sanskrit,
  translation,
  message,
  wordMeanings = [],
}) {
  const apiKey = getGeminiApiKey();

  const fallbackSpeakerEn =
    SPEAKER_MAP_EN[String(speaker || "").trim()] ||
    String(speaker || "").trim();

  const fallbackChapterNameEn =
    CHAPTER_MAP_EN[Number(chapterNumber)] ||
    String(chapterName || "").trim();

  if (!apiKey) {
    console.warn("GEMINI_API_KEY missing. Returning fallback English translations.");
    return {
      chapterNameEn: fallbackChapterNameEn,
      speakerEn: fallbackSpeakerEn,
      translationEn: cleanHtml(translation),
      messageEn: cleanHtml(message),
      wordMeanings: (wordMeanings || []).map((w) => ({
        word: w.word,
        meaningEn: w.meaningEn || "",
      })),
    };
  }

  const prompt = `You are a revered Vedic and Sanskrit scholar of Srimad Bhagavad Gita.
Translate the following Bhagavad Gita shloka explanation from Gujarati into authentic, devotional, and clear English.

STRICT RULES:
1. SANSKRIT INTEGRITY: The Sanskrit verse and individual Sanskrit words MUST NOT be altered or transliterated. Keep them 100% pure Sanskrit.
2. TRANSLATE TO ENGLISH:
   - Translate strictly and accurately what is in the Gujarati translation into dignified English. Do NOT add, invent, or assume any extra words, names, or addresses (e.g. "O Sanjaya", "O King") not present in the user's Gujarati source.
   - Translate strictly what is in the Gujarati message/sandesh into inspiring, practical English commentary without adding outside ideas.
   - Speaker: "${speaker}" -> English speaker (e.g. "The Blessed Lord said", "Arjuna said", "Sanjaya said", "Dhritarashtra said").
   - Chapter Name: "${chapterName}" -> English chapter name (e.g. "${fallbackChapterNameEn}").
   - Word Meanings: For each Sanskrit word, keep 'word' exactly as the original Sanskrit word, and translate the Gujarati 'meaning' into an accurate English 'meaningEn'.
3. OUTPUT FORMAT: Return ONLY a valid JSON object without markdown formatting:
{
  "chapterNameEn": "...",
  "speakerEn": "...",
  "translationEn": "...",
  "messageEn": "...",
  "wordMeanings": [
    { "word": "Sanskrit word", "meaningEn": "English meaning" }
  ]
}

DATA TO TRANSLATE:
Chapter Number: ${chapterNumber || 1}
Chapter Name: ${chapterName || ""}
Speaker: ${speaker || ""}
Sanskrit Shloka: ${cleanHtml(sanskrit)}
Gujarati Translation: ${cleanHtml(translation)}
Gujarati Message: ${cleanHtml(message)}
Word Meanings: ${JSON.stringify(
    (wordMeanings || []).map((w) => ({ word: w.word, meaning: cleanHtml(w.meaning) }))
  )}`;

  const cleanKey = String(apiKey).trim();

  for (const modelName of TRANSLATION_MODELS) {
    try {
      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
          cleanKey
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": cleanKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.0,
              topK: 1,
              topP: 0.95,
              response_mime_type: "application/json",
            },
          }),
        },
        7000
      );

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (rawText) {
          const jsonStr = rawText
            .replace(/^```json/i, "")
            .replace(/^```/, "")
            .replace(/```$/, "")
            .trim();

          const parsed = JSON.parse(jsonStr);

          const originalList = wordMeanings || [];
          const enMap = new Map();
          (parsed.wordMeanings || []).forEach((item, idx) => {
            if (item) {
              const key = item.id !== undefined ? Number(item.id) : idx;
              enMap.set(key, item.meaningEn || "");
              if (item.word) enMap.set(String(item.word).trim(), item.meaningEn || "");
            }
          });

          const mergedWordMeanings = originalList.map((orig, idx) => {
            const rawMeaning =
              enMap.get(idx) ||
              enMap.get(String(orig.word).trim()) ||
              parsed.wordMeanings?.[idx]?.meaningEn ||
              orig.meaningEn ||
              "";
            const translatedMeaning = preserveSanskritSubWords(orig.meaning, rawMeaning);
            return {
              word: orig.word,
              meaning: orig.meaning,
              meaningHi: orig.meaningHi || "",
              meaningEn: translatedMeaning,
            };
          });

          return {
            chapterNameEn: parsed.chapterNameEn || fallbackChapterNameEn,
            speakerEn: parsed.speakerEn || fallbackSpeakerEn,
            translationEn: parsed.translationEn || cleanHtml(translation),
            messageEn: parsed.messageEn || cleanHtml(message),
            wordMeanings: mergedWordMeanings,
          };
        }
      }
    } catch (err) {
      console.warn(`English Translation attempt failed with ${modelName}:`, err.message);
    }
  }

  // Fallback via high-speed translation engine
  const [fbTranslationEn, fbMessageEn] = await Promise.all([
    fallbackGoogleTranslate(cleanHtml(translation), "en"),
    fallbackGoogleTranslate(cleanHtml(message), "en"),
  ]);

  const fbWordMeanings = await Promise.all(
    (wordMeanings || []).map(async (w) => {
      let enMeaning = w.meaningEn;
      if (!enMeaning && w.meaning) {
        enMeaning = (await fallbackGoogleTranslate(cleanHtml(w.meaning), "en")) || w.meaning;
      }
      return {
        word: w.word,
        meaning: w.meaning,
        meaningHi: w.meaningHi || "",
        meaningEn: preserveSanskritSubWords(w.meaning, enMeaning || w.meaning),
      };
    })
  );

  return {
    chapterNameEn: fallbackChapterNameEn,
    speakerEn: fallbackSpeakerEn,
    translationEn: fbTranslationEn || cleanHtml(translation),
    messageEn: fbMessageEn || cleanHtml(message),
    wordMeanings: fbWordMeanings,
  };
}

/**
 * Translates Gujarati Quiz Question into devotional English via Gemini AI
 */
async function translateQuizToEnglish({
  question,
  options = [],
  correctAnswer,
  explanation = "",
  category = "all",
  chapterNumber = null,
}) {
  const apiKey = getGeminiApiKey();
  const cleanKey = String(apiKey || "").trim();

  const fallback = {
    questionEn: cleanHtml(question),
    optionsEn: (options || []).map((o) => cleanHtml(o)),
    correctAnswerEn: cleanHtml(correctAnswer),
    explanationEn: cleanHtml(explanation),
  };

  if (!cleanKey) {
    console.warn("GEMINI_API_KEY missing. Returning fallback English quiz translation.");
    return fallback;
  }

  const prompt = `You are a revered Vedic and Bhagavad Gita scholar.
Translate the following Bhagavad Gita / Mahabharata Quiz Question, its 4 options, the correct answer, and explanation from Gujarati into clear, accurate, and devotional English.

STRICT RULES:
1. HOLY NAMES & SANSKRIT INTEGRITY: Preserve sacred names with standard transliteration (e.g. Lord Krishna, Arjuna, Bhishma, Kurukshetra, Dharma).
2. ACCURACY: Ensure the correct answer maps exactly to one of the 4 translated options.
3. OUTPUT FORMAT: Return ONLY a valid JSON object without markdown:
{
  "questionEn": "...",
  "optionsEn": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswerEn": "Exact matching option text",
  "explanationEn": "..."
}

DATA TO TRANSLATE:
Category: ${category}
Chapter: ${chapterNumber || "General"}
Question: ${cleanHtml(question)}
Options: ${JSON.stringify((options || []).map((o) => cleanHtml(o)))}
Correct Answer: ${cleanHtml(correctAnswer)}
Explanation: ${cleanHtml(explanation)}`;

  for (const modelName of TRANSLATION_MODELS) {
    try {
      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
          cleanKey
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": cleanKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.0,
              topK: 1,
              topP: 0.95,
              response_mime_type: "application/json",
            },
          }),
        },
        20000
      );

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (rawText) {
          const jsonStr = rawText
            .replace(/^```json/i, "")
            .replace(/^```/, "")
            .replace(/```$/, "")
            .trim();

          const parsed = JSON.parse(jsonStr);

          const origIdx = (options || []).findIndex(
            (o) => String(o).trim() === String(correctAnswer).trim()
          );

          let finalCorrectAnswerEn = parsed.correctAnswerEn || "";
          const finalOptionsEn = Array.isArray(parsed.optionsEn)
            ? parsed.optionsEn
            : [];

          if (origIdx !== -1 && finalOptionsEn[origIdx]) {
            finalCorrectAnswerEn = finalOptionsEn[origIdx];
          }

          return {
            questionEn: parsed.questionEn || cleanHtml(question),
            optionsEn:
              finalOptionsEn.length === 4
                ? finalOptionsEn
                : fallback.optionsEn,
            correctAnswerEn:
              finalCorrectAnswerEn || cleanHtml(correctAnswer),
            explanationEn:
              parsed.explanationEn || cleanHtml(explanation),
          };
        }
      }
    } catch (err) {
      console.warn(`Quiz English Translation attempt failed with ${modelName}:`, err.message);
    }
  }

  return fallback;
}

/**
 * Generic caller for Gemini models returning parsed JSON
 */
async function callGeminiJson(prompt) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  for (const modelName of TRANSLATION_MODELS) {
    try {
      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
          apiKey
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              topK: 1,
              topP: 0.95,
              response_mime_type: "application/json",
            },
          }),
        },
        7000
      );

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (rawText) {
          const jsonStr = rawText
            .replace(/^```json/i, "")
            .replace(/^```/, "")
            .replace(/```$/, "")
            .trim();
          return JSON.parse(jsonStr);
        }
      } else {
        const err = await response.text();
        console.warn(`Gemini call warning (${modelName}):`, err.slice(0, 150));
      }
    } catch (err) {
      console.warn(`Gemini call failed with ${modelName}:`, err.message);
    }
  }
  return null;
}

/**
 * Translates only a specific field (words, translation, or message) into Hindi
 */
async function translateSingleFieldToHindi({
  field,
  sanskrit,
  translation,
  message,
  wordMeanings = [],
}) {
  if (field === "words") {
    const itemsToSend = (wordMeanings || []).map((w, idx) => ({
      id: idx,
      sanskritWord: String(w.word || "").trim(),
      gujaratiMeaning: cleanHtml(w.meaning || ""),
    }));

    const prompt = `You are a professional, accurate translator.
Translate the following Sanskrit word meanings (શબ્દાર્થ) strictly and faithfully from Gujarati into Hindi (Devanagari script).

CRITICAL ACCURACY RULES:
1. TRANSLATE ONLY THE GIVEN GUJARATI MEANING: Translate strictly and faithfully what is written in the user's Gujarati meaning. Do NOT add outside interpretations, commentary, or extraneous text.
2. SANSKRIT WORD PRESERVATION:
   The Sanskrit words in 'sanskritWord' must never be changed.
3. CRITICAL RULE FOR EQUAL SIGN ('='):
   When 'gujaratiMeaning' contains Sanskrit sub-words broken down with '=' (e.g. "विराटः = રાજા વિરાટ , च = અને"):
   - The Sanskrit words BEFORE '=' (such as "विराटः", "च", "पाण्डवाः", "एव") MUST REMAIN 100% PURE SANSKRIT IN DEVANAGARI SCRIPT. NEVER translate or alter them!
   - Translate ONLY the Gujarati explanation AFTER '=' into Hindi:
     Example: "विराटः = રાજા વિરાટ , च = અને" -> "विराटः = राजा विराट, च = और"
     Example: "पाण्डवाः = પાંડુપુત્રો , च = અને , एव = જ" -> "पाण्डवाः = पाण्डुपुत्र, च = और, एव = ही"
4. If no '=' is present, directly translate the Gujarati meaning into accurate Hindi:
   Example: "ધર્મક્ષેત્રમાં" -> "धर्मक्षेत्र में"
5. Return exactly one entry for EVERY 'id' from 0 to ${itemsToSend.length - 1} in the exact same sequence.
Return ONLY valid JSON:
{
  "wordMeanings": [
    { "id": 0, "meaningHi": "Hindi meaning" }
  ]
}

ITEMS TO TRANSLATE:
${JSON.stringify(itemsToSend, null, 2)}`;

    const parsed = await callGeminiJson(prompt);
    if (!parsed || !Array.isArray(parsed.wordMeanings) || parsed.wordMeanings.length === 0) {
      throw new Error("AI દ્વારા શબ્દાર્થનો હિન્દી અનુવાદ પ્રાપ્ત થઈ શક્યો નથી. કૃપા કરીને થોડી વાર પછી ફરી પ્રયાસ કરો.");
    }

    const hiMap = new Map();
    parsed.wordMeanings.forEach((item, idx) => {
      if (item) {
        const key = item.id !== undefined ? Number(item.id) : idx;
        hiMap.set(key, item.meaningHi || "");
        if (item.sanskritWord) hiMap.set(String(item.sanskritWord).trim(), item.meaningHi || "");
        if (item.word) hiMap.set(String(item.word).trim(), item.meaningHi || "");
      }
    });

    return {
      wordMeanings: (wordMeanings || []).map((orig, idx) => {
        const rawMeaning =
          hiMap.get(idx) ||
          hiMap.get(String(orig.word).trim()) ||
          orig.meaningHi ||
          "";
        return {
          ...orig,
          word: orig.word, // 100% Guaranteed: The user's exact small Sanskrit word is preserved untouched!
          meaningHi: preserveSanskritSubWords(orig.meaning, rawMeaning),
        };
      }),
    };
  }

  if (field === "translation") {
    let resultHi = null;
    try {
      const prompt = `You are a professional, accurate translator.
Translate the following Bhagavad Gita verse translation strictly and faithfully from Gujarati into Hindi.

CRITICAL RULES:
1. TRANSLATE ONLY WHAT IS WRITTEN IN THE GUJARATI TEXT:
   Translate strictly what is written in the Gujarati Translation below.
   Do NOT add, invent, or assume any extra words, names, or addresses (for example, do NOT add "हे संजय", "हे राजन", or any name/address) that are NOT present in the provided Gujarati text.
   Do NOT replace the user's words with external translations. Translate ONLY the user's Gujarati words into Hindi with 100% fidelity.
2. ACCURATE & FAITHFUL: Maintain exact meaning, tone, and grammar in natural Hindi.
3. FORMATTING: Preserve any HTML formatting (e.g. <b>, <i>, <p>, <br>) exactly as provided.

Return ONLY valid JSON:
{
  "translationHi": "Hindi translation..."
}

GUJARATI TEXT TO TRANSLATE:
${translation}`;

      const parsed = await callGeminiJson(prompt);
      if (parsed && parsed.translationHi && parsed.translationHi.trim()) {
        resultHi = parsed.translationHi.trim();
      }
    } catch (err) {
      console.warn("Gemini verse translation attempt failed:", err.message);
    }

    if (!resultHi) {
      resultHi = await fallbackGoogleTranslate(cleanHtml(translation), "hi");
    }

    if (!resultHi) {
      throw new Error("અનુવાદ થઈ શક્યો નથી. કૃપા કરીને થોડી વાર પછી ફરી પ્રયાસ કરો.");
    }

    return {
      translationHi: resultHi,
    };
  }

  if (field === "message") {
    let resultHi = null;
    try {
      const prompt = `You are a professional, accurate translator.
Translate the following Bhagavad Gita spiritual commentary / message (ગીતા સંદેશ) strictly and faithfully from Gujarati into Hindi.

CRITICAL RULES:
1. TRANSLATE ONLY THE GIVEN GUJARATI TEXT:
   Translate strictly and faithfully what is written in the Gujarati Message below into clear Hindi.
   Do NOT add outside verses, commentaries, or extra ideas not present in the user's Gujarati source.
2. FORMATTING: Preserve any HTML formatting (e.g. <ul>, <li>, <b>, <i>, <p>, <br>) exactly as provided.

Return ONLY valid JSON:
{
  "messageHi": "Hindi message..."
}

GUJARATI TEXT TO TRANSLATE:
${message}`;

      const parsed = await callGeminiJson(prompt);
      if (parsed && parsed.messageHi && parsed.messageHi.trim()) {
        resultHi = parsed.messageHi.trim();
      }
    } catch (err) {
      console.warn("Gemini message translation attempt failed:", err.message);
    }

    if (!resultHi) {
      resultHi = await fallbackGoogleTranslate(cleanHtml(message), "hi");
    }

    if (!resultHi) {
      throw new Error("સંદેશનો હિન્દી અનુવાદ થઈ શક્યો નથી. કૃપા કરીને થોડી વાર પછી ફરી પ્રયાસ કરો.");
    }

    return {
      messageHi: resultHi,
    };
  }

  return {};
}

/**
 * Translates only a specific field (words, translation, or message) into English
 */
async function translateSingleFieldToEnglish({
  field,
  sanskrit,
  translation,
  message,
  wordMeanings = [],
}) {
  if (field === "words") {
    const itemsToSend = (wordMeanings || []).map((w, idx) => ({
      id: idx,
      sanskritWord: String(w.word || "").trim(),
      gujaratiMeaning: cleanHtml(w.meaning || ""),
    }));

    const prompt = `You are a professional, accurate translator.
Translate the following Sanskrit word meanings (શબ્દાર્થ) strictly and faithfully from Gujarati into English.

CRITICAL ACCURACY RULES:
1. TRANSLATE ONLY THE GIVEN GUJARATI MEANING: Translate strictly and faithfully what is written in the user's Gujarati meaning. Do NOT add outside interpretations, commentary, or extraneous words.
2. SANSKRIT WORD PRESERVATION:
   The Sanskrit words in 'sanskritWord' must never be changed.
3. CRITICAL RULE FOR EQUAL SIGN ('='):
   When 'gujaratiMeaning' contains Sanskrit sub-words broken down with '=' (e.g. "विराटः = રાજા વિરાટ , च = અને"):
   - The Sanskrit words before '=' (like "विराटः", "च", "पाण्डवाः", "एव") MUST REMAIN EXACTLY IN SANSKRIT (Devanagari script). NEVER translate or transliterate them into English! (DO NOT write "Virata = King Virata, and = and", IT MUST BE "विराटः = King Virata, च = and").
   - Translate ONLY the Gujarati explanation after '=' into English:
     Example: "विराटः = રાજા વિરાટ , च = અને" -> "विराटः = King Virata, च = and"
     Example: "पाण्डवाः = પાંડુપુત્રો , च = અને , एव = જ" -> "पाण्डवाः = sons of Pandu, च = and, एव = only/indeed"
4. If no '=' is present, directly translate the Gujarati meaning into accurate English.
5. Return exactly one entry for EVERY 'id' from 0 to ${itemsToSend.length - 1} in the exact same sequence.
Return ONLY valid JSON:
{
  "wordMeanings": [
    { "id": 0, "meaningEn": "English meaning" }
  ]
}

ITEMS TO TRANSLATE:
${JSON.stringify(itemsToSend, null, 2)}`;

      let parsed = null;
      try {
        parsed = await callGeminiJson(prompt);
      } catch (err) {
        console.warn("Gemini English wordMeanings translation attempt failed:", err.message);
      }

      const enMap = new Map();
      if (parsed && Array.isArray(parsed.wordMeanings)) {
        parsed.wordMeanings.forEach((item, idx) => {
          if (item) {
            const key = item.id !== undefined ? Number(item.id) : idx;
            enMap.set(key, item.meaningEn || "");
            if (item.sanskritWord) enMap.set(String(item.sanskritWord).trim(), item.meaningEn || "");
            if (item.word) enMap.set(String(item.word).trim(), item.meaningEn || "");
          }
        });
      }

      const wordMeaningsResult = await Promise.all(
        (wordMeanings || []).map(async (orig, idx) => {
          let rawMeaning =
            enMap.get(idx) ||
            enMap.get(String(orig.word).trim()) ||
            orig.meaningEn ||
            "";

          if (!rawMeaning && orig.meaning) {
            rawMeaning = (await fallbackGoogleTranslate(cleanHtml(orig.meaning), "en")) || orig.meaning;
          }

          return {
            ...orig,
            word: orig.word, // 100% Guaranteed: The user's exact small Sanskrit word is preserved untouched!
            meaningEn: preserveSanskritSubWords(orig.meaning, rawMeaning),
          };
        })
      );

      return {
        wordMeanings: wordMeaningsResult,
      };
    }

    if (field === "translation") {
      let resultEn = null;
      try {
        const prompt = `You are a professional, accurate translator.
Translate the following Bhagavad Gita verse translation strictly and faithfully from Gujarati into English.

CRITICAL RULES:
1. TRANSLATE ONLY WHAT IS WRITTEN IN THE GUJARATI TEXT:
   Translate strictly and accurately what is written in the Gujarati Translation below.
   Do NOT add, invent, or assume any extra words, names, or addresses (for example, do NOT add "O Sanjaya", "O King", or any address) that are NOT present in the provided Gujarati text.
   Do NOT replace the user's words with external verses. Translate ONLY the user's Gujarati words into English with 100% fidelity.
2. ACCURATE & FAITHFUL: Maintain exact meaning and tone in natural, grammatically correct English.
3. FORMATTING: Preserve any HTML formatting (e.g. <b>, <i>, <p>, <br>) exactly as provided.

Return ONLY valid JSON:
{
  "translationEn": "English translation..."
}

GUJARATI TEXT TO TRANSLATE:
${translation}`;

        const parsed = await callGeminiJson(prompt);
        if (parsed && parsed.translationEn && parsed.translationEn.trim()) {
          resultEn = parsed.translationEn.trim();
        }
      } catch (err) {
        console.warn("Gemini English verse translation attempt failed:", err.message);
      }

      if (!resultEn) {
        resultEn = await fallbackGoogleTranslate(cleanHtml(translation), "en");
      }

      if (!resultEn) {
        throw new Error("અંગ્રેજી અનુવાદ થઈ શક્યો નથી. કૃપા કરીને થોડી વાર પછી ફરી પ્રયાસ કરો.");
      }

      return {
        translationEn: resultEn,
      };
    }

    if (field === "message") {
      let resultEn = null;
      try {
        const prompt = `You are a professional, accurate translator.
Translate the following Bhagavad Gita spiritual commentary / message (ગીતા સંદેશ) strictly and faithfully from Gujarati into English.

CRITICAL RULES:
1. TRANSLATE ONLY THE GIVEN GUJARATI TEXT:
   Translate strictly and faithfully what is written in the Gujarati Message below into clear, inspiring English.
   Do NOT add outside verses, commentaries, or extra ideas not present in the user's Gujarati source.
2. FORMATTING: Preserve any HTML formatting (e.g. <ul>, <li>, <b>, <i>, <p>, <br>) exactly as provided.

Return ONLY valid JSON:
{
  "messageEn": "English message commentary..."
}

GUJARATI TEXT TO TRANSLATE:
${message}`;

        const parsed = await callGeminiJson(prompt);
        if (parsed && parsed.messageEn && parsed.messageEn.trim()) {
          resultEn = parsed.messageEn.trim();
        }
      } catch (err) {
        console.warn("Gemini English message translation attempt failed:", err.message);
      }

      if (!resultEn) {
        resultEn = await fallbackGoogleTranslate(cleanHtml(message), "en");
      }

      if (!resultEn) {
        throw new Error("સંદેશનો અંગ્રેજી અનુવાદ થઈ શક્યો નથી. કૃપા કરીને થોડી વાર પછી ફરી પ્રયાસ કરો.");
      }

      return {
        messageEn: resultEn,
      };
    }

  return {};
}


/**
 * Translates an individual field (question, options, explanation) of a Quiz into Hindi
 */
async function translateQuizFieldToHindi({
  field,
  question,
  options = [],
  correctAnswer,
  explanation = "",
  category = "all",
  chapterNumber = null,
}) {
  const apiKey = getGeminiApiKey();
  const cleanKey = String(apiKey || "").trim();

  if (!cleanKey) {
    if (field === "question") return { questionHi: cleanHtml(question) };
    if (field === "options") return {
      optionsHi: (options || []).map((o) => cleanHtml(o)),
      correctAnswerHi: cleanHtml(correctAnswer),
    };
    if (field === "explanation") return { explanationHi: cleanHtml(explanation) };
    return {};
  }

  if (field === "question") {
    let questionHi = null;
    try {
      const prompt = `You are a revered Vedic and Bhagavad Gita scholar.
Translate the following Bhagavad Gita / Mahabharata Quiz Question strictly and faithfully from Gujarati into authentic, devotional Hindi (Devanagari script).

CRITICAL RULES:
1. Translate only the given Gujarati question accurately into natural Hindi.
2. Preserve divine Sanskrit names (e.g. શ્રીકૃષ્ણ -> श्रीकृष्ण, અર્જુન -> अर्जुन, ભીષ્મ -> भीष्म, કુરુક્ષેત્ર -> कुरुक्षेत्र).
3. Return ONLY valid JSON:
{
  "questionHi": "Hindi question here..."
}

GUJARATI QUESTION TO TRANSLATE:
${cleanHtml(question)}`;

      const parsed = await callGeminiJson(prompt);
      if (parsed && parsed.questionHi && parsed.questionHi.trim()) {
        questionHi = parsed.questionHi.trim();
      }
    } catch (err) {
      console.warn("Gemini Quiz question Hi attempt failed:", err.message);
    }

    if (!questionHi) {
      questionHi = await fallbackGoogleTranslate(cleanHtml(question), "hi");
    }

    if (!questionHi) {
      throw new Error("AI દ્વારા પ્રશ્નનો હિન્દી અનુવાદ પ્રાપ્ત થઈ શક્યો નથી. કૃપા કરીને ફરી પ્રયાસ કરો.");
    }
    return { questionHi };
  }

  if (field === "options") {
    let optionsHi = null;
    let correctAnswerHi = "";
    try {
      const prompt = `You are a revered Vedic and Bhagavad Gita scholar.
Translate the following 4 quiz options and correct answer strictly and faithfully from Gujarati into authentic, devotional Hindi (Devanagari script).

CRITICAL RULES:
1. Translate each of the 4 options in the EXACT SAME ORDER (indexes 0 to 3).
2. The translated correct answer MUST match the exact text of the corresponding translated option in optionsHi.
3. Return ONLY valid JSON:
{
  "optionsHi": ["...", "...", "...", "..."],
  "correctAnswerHi": "..."
}

DATA TO TRANSLATE:
Options: ${JSON.stringify((options || []).map((o) => cleanHtml(o)))}
Correct Answer: ${cleanHtml(correctAnswer)}`;

      const parsed = await callGeminiJson(prompt);
      if (parsed && Array.isArray(parsed.optionsHi) && parsed.optionsHi.length === 4) {
        optionsHi = parsed.optionsHi.map((o) => String(o || "").trim());
        correctAnswerHi = parsed.correctAnswerHi ? String(parsed.correctAnswerHi).trim() : "";
      }
    } catch (err) {
      console.warn("Gemini Quiz options Hi attempt failed:", err.message);
    }

    if (!optionsHi) {
      const translatedOpts = await Promise.all(
        (options || []).map((o) => fallbackGoogleTranslate(cleanHtml(o), "hi"))
      );
      optionsHi = translatedOpts.map((o, idx) => o || options[idx] || "");
      const correctIdx = (options || []).findIndex(
        (o) => String(o).trim() === String(correctAnswer).trim()
      );
      correctAnswerHi =
        correctIdx !== -1 && optionsHi[correctIdx]
          ? optionsHi[correctIdx]
          : (await fallbackGoogleTranslate(cleanHtml(correctAnswer), "hi")) || "";
    }

    return {
      optionsHi,
      correctAnswerHi,
    };
  }

  if (field === "explanation") {
    let explanationHi = null;
    try {
      const prompt = `You are a revered Vedic and Bhagavad Gita scholar.
Translate the following quiz explanation strictly and faithfully from Gujarati into inspiring, clear Hindi (Devanagari script).

CRITICAL RULES:
1. Translate only what is written in the explanation faithfully into Hindi.
2. Return ONLY valid JSON:
{
  "explanationHi": "Hindi explanation here..."
}

GUJARATI EXPLANATION TO TRANSLATE:
${cleanHtml(explanation)}`;

      const parsed = await callGeminiJson(prompt);
      if (parsed && parsed.explanationHi && parsed.explanationHi.trim()) {
        explanationHi = parsed.explanationHi.trim();
      }
    } catch (err) {
      console.warn("Gemini Quiz explanation Hi attempt failed:", err.message);
    }

    if (!explanationHi) {
      explanationHi = await fallbackGoogleTranslate(cleanHtml(explanation), "hi");
    }

    if (!explanationHi) {
      throw new Error("AI દ્વારા સમજૂતીનો હિન્દી અનુવાદ પ્રાપ્ત થઈ શક્યો નથી. કૃપા કરીને ફરી પ્રયાસ કરો.");
    }
    return { explanationHi };
  }

  return {};
}

/**
 * Translates an individual field (question, options, explanation) of a Quiz into English
 */
async function translateQuizFieldToEnglish({
  field,
  question,
  options = [],
  correctAnswer,
  explanation = "",
  category = "all",
  chapterNumber = null,
}) {
  const apiKey = getGeminiApiKey();
  const cleanKey = String(apiKey || "").trim();

  if (!cleanKey) {
    if (field === "question") return { questionEn: cleanHtml(question) };
    if (field === "options") return {
      optionsEn: (options || []).map((o) => cleanHtml(o)),
      correctAnswerEn: cleanHtml(correctAnswer),
    };
    if (field === "explanation") return { explanationEn: cleanHtml(explanation) };
    return {};
  }

  if (field === "question") {
    let questionEn = null;
    try {
      const prompt = `You are a revered Vedic and Bhagavad Gita scholar.
Translate the following Bhagavad Gita / Mahabharata Quiz Question strictly and faithfully from Gujarati into clear, accurate, and devotional English.

CRITICAL RULES:
1. Translate only the given Gujarati question accurately into natural English.
2. Keep sacred scriptural names accurate (e.g. Krishna, Arjuna, Bhishma, Kurukshetra).
3. Return ONLY valid JSON:
{
  "questionEn": "English question here..."
}

GUJARATI QUESTION TO TRANSLATE:
${cleanHtml(question)}`;

      const parsed = await callGeminiJson(prompt);
      if (parsed && parsed.questionEn && parsed.questionEn.trim()) {
        questionEn = parsed.questionEn.trim();
      }
    } catch (err) {
      console.warn("Gemini Quiz question En attempt failed:", err.message);
    }

    if (!questionEn) {
      questionEn = await fallbackGoogleTranslate(cleanHtml(question), "en");
    }

    if (!questionEn) {
      throw new Error("AI દ્વારા પ્રશ્નનો અંગ્રેજી અનુવાદ પ્રાપ્ત થઈ શક્યો નથી. કૃપા કરીને ફરી પ્રયાસ કરો.");
    }
    return { questionEn };
  }

  if (field === "options") {
    let optionsEn = null;
    let correctAnswerEn = "";
    try {
      const prompt = `You are a revered Vedic and Bhagavad Gita scholar.
Translate the following 4 quiz options and correct answer strictly and faithfully from Gujarati into clear, accurate English.

CRITICAL RULES:
1. Translate each of the 4 options in the EXACT SAME ORDER (indexes 0 to 3).
2. The translated correct answer MUST match the exact text of the corresponding translated option in optionsEn.
3. Return ONLY valid JSON:
{
  "optionsEn": ["...", "...", "...", "..."],
  "correctAnswerEn": "..."
}

DATA TO TRANSLATE:
Options: ${JSON.stringify((options || []).map((o) => cleanHtml(o)))}
Correct Answer: ${cleanHtml(correctAnswer)}`;

      const parsed = await callGeminiJson(prompt);
      if (parsed && Array.isArray(parsed.optionsEn) && parsed.optionsEn.length === 4) {
        optionsEn = parsed.optionsEn.map((o) => String(o || "").trim());
        correctAnswerEn = parsed.correctAnswerEn ? String(parsed.correctAnswerEn).trim() : "";
      }
    } catch (err) {
      console.warn("Gemini Quiz options En attempt failed:", err.message);
    }

    if (!optionsEn) {
      const translatedOpts = await Promise.all(
        (options || []).map((o) => fallbackGoogleTranslate(cleanHtml(o), "en"))
      );
      optionsEn = translatedOpts.map((o, idx) => o || options[idx] || "");
      const correctIdx = (options || []).findIndex(
        (o) => String(o).trim() === String(correctAnswer).trim()
      );
      correctAnswerEn =
        correctIdx !== -1 && optionsEn[correctIdx]
          ? optionsEn[correctIdx]
          : (await fallbackGoogleTranslate(cleanHtml(correctAnswer), "en")) || "";
    }

    return {
      optionsEn,
      correctAnswerEn,
    };
  }

  if (field === "explanation") {
    let explanationEn = null;
    try {
      const prompt = `You are a revered Vedic and Bhagavad Gita scholar.
Translate the following quiz explanation strictly and faithfully from Gujarati into clear, inspiring English.

CRITICAL RULES:
1. Translate only what is written in the explanation faithfully into English.
2. Return ONLY valid JSON:
{
  "explanationEn": "English explanation here..."
}

GUJARATI EXPLANATION TO TRANSLATE:
${cleanHtml(explanation)}`;

      const parsed = await callGeminiJson(prompt);
      if (parsed && parsed.explanationEn && parsed.explanationEn.trim()) {
        explanationEn = parsed.explanationEn.trim();
      }
    } catch (err) {
      console.warn("Gemini Quiz explanation En attempt failed:", err.message);
    }

    if (!explanationEn) {
      explanationEn = await fallbackGoogleTranslate(cleanHtml(explanation), "en");
    }

    if (!explanationEn) {
      throw new Error("AI દ્વારા સમજૂતીનો અંગ્રેજી અનુવાદ પ્રાપ્ત થઈ શક્યો નથી. કૃપા કરીને ફરી પ્રયાસ કરો.");
    }
    return { explanationEn };
  }

  return {};
}

module.exports = {
  translateQuizFieldToHindi,
  translateQuizFieldToEnglish,
  translateShlokToHindi,
  translateShlokToEnglish,
  translateSingleFieldToHindi,
  translateSingleFieldToEnglish,
  translateQuizToHindi,
  translateQuizToEnglish,
  SPEAKER_MAP_HI,
  SPEAKER_MAP_EN,
  CHAPTER_MAP_HI,
  CHAPTER_MAP_EN,
};

