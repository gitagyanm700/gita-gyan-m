const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

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

const CACHE_DIR = path.join(__dirname, "../audio_cache");
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (e) {
  console.warn("Could not create audio_cache dir:", e);
}

// In-memory audio buffer cache (stores up to 2000 shloka audio clips for zero latency and zero repeated timeouts)
const audioCache = new Map();
const MAX_CACHE_SIZE = 2000;

/**
 * Core synthesis helper with dual-layer caching (Memory + Disk)
 */
const synthesizeBuffer = async (text, lang = "gu", customRate = null) => {
  if (!text || typeof text !== "string" || !text.trim()) return null;

  let cleanText = text.trim();
  cleanText = cleanText.replace(/<[^>]*>/g, " ");
  cleanText = cleanText.replace(/&nbsp;/gi, " ");
  cleanText = cleanText.replace(/&amp;/gi, " and ");
  cleanText = cleanText.replace(/[&<>]/g, " ");
  cleanText = cleanText.replace(/\s*[:：]\s*/g, ". ... ");
  cleanText = cleanText.replace(/(\.\s*\.\.\.\s*)+/g, ". ... ");
  cleanText = cleanText.replace(/\s+/g, " ").trim();

  const voiceLang = VOICE_MAP[lang] ? lang : "gu";
  const selectedVoice = VOICE_MAP[voiceLang].male;
  const prosodyOptions = {
    rate: customRate !== null ? customRate : (lang === "sa" ? "-22%" : "-2%"),
    pitch: lang === "sa" ? "-2Hz" : "+0Hz",
  };

  const cacheKey = crypto
    .createHash("md5")
    .update(`${selectedVoice}:${prosodyOptions.rate}:${prosodyOptions.pitch}:${cleanText}`)
    .digest("hex");

  // 1. Check in-memory RAM cache (instant)
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey);
  }

  // 2. Check disk cache (5ms)
  const diskPath = path.join(CACHE_DIR, `${cacheKey}.mp3`);
  if (fs.existsSync(diskPath)) {
    try {
      const diskBuffer = fs.readFileSync(diskPath);
      if (diskBuffer && diskBuffer.length > 0) {
        audioCache.set(cacheKey, diskBuffer);
        return diskBuffer;
      }
    } catch (e) {}
  }

  // 3. Synthesize via MsEdgeTTS
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const tts = new MsEdgeTTS({ connectionTimeoutMs: 25000, synthesisTimeoutMs: 60000 });
      await tts.setMetadata(selectedVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(cleanText, prosodyOptions);

      const chunks = [];
      await new Promise((resolve, reject) => {
        audioStream.on("data", (chunk) => chunks.push(chunk));
        audioStream.on("end", resolve);
        audioStream.on("error", (err) => reject(err));
      });

      const audioBuffer = Buffer.concat(chunks);
      if (audioBuffer && audioBuffer.length > 0) {
        if (audioCache.size >= MAX_CACHE_SIZE) {
          const oldestKey = audioCache.keys().next().value;
          audioCache.delete(oldestKey);
        }
        audioCache.set(cacheKey, audioBuffer);
        try {
          fs.writeFileSync(diskPath, audioBuffer);
        } catch (e) {}
        return audioBuffer;
      }
    } catch (err) {
      if (attempt < 3) await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }
  return null;
};

const generateSpeech = async (req, res) => {
  try {
    const { text, lang = "gu", rate } = req.body || {};
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Text is required for speech synthesis.",
      });
    }

    const audioBuffer = await synthesizeBuffer(text, lang, rate);
    if (!audioBuffer) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate speech after retries.",
      });
    }

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.length,
      "Cache-Control": "public, max-age=86400",
      "Accept-Ranges": "bytes",
    });
    return res.send(audioBuffer);
  } catch (error) {
    console.error("TTS Controller Fatal Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to generate speech." });
    }
  }
};

/**
 * Automatically pre-caches audio when Admin adds or updates a shloka!
 * Runs completely non-blocking in background so Admin panel stays instantaneous.
 */
const precacheSingleShlokAudio = (shloka) => {
  if (!shloka) return;
  setImmediate(async () => {
    try {
      // 1. Sanskrit
      let plainSa = String(shloka.sanskrit || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/[॥\|]\s*[\d\.\-०-९]+\s*[॥\|]/g, "।")
        .trim();
      if (!plainSa && (shloka.sanskritLine1 || shloka.sanskritLine2)) {
        plainSa = [shloka.sanskritLine1, shloka.sanskritLine2].filter(Boolean).join("\n");
      }
      if (plainSa) await synthesizeBuffer(plainSa, "sa", "-22%");

      // 2. Translation (gu)
      let plainTr = String(shloka.translation || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .trim();
      if (plainTr) await synthesizeBuffer(plainTr, "gu", "-2%");

      // 3. Message (gu)
      let plainMsg = String(shloka.message || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .trim();
      if (plainMsg) await synthesizeBuffer(plainMsg, "gu", "-2%");
    } catch (e) {
      console.warn("[TTS] Automatic shloka precache error:", e.message);
    }
  });
};

/**
 * Warm up an entire chapter's audio in the background on demand
 */
const warmupChapterAudios = async (req, res) => {
  try {
    const Shlok = require("../models/Shlok");
    const chapterNumber = Number(req.params.chapterNumber);
    if (!chapterNumber || chapterNumber < 1 || chapterNumber > 18) {
      return res.status(400).json({ success: false, message: "Invalid chapter number." });
    }

    const shlokas = await Shlok.find({ chapterNumber }).sort({ shlokNumber: 1 });
    if (!shlokas || shlokas.length === 0) {
      return res.status(404).json({ success: false, message: "No shlokas found for this chapter." });
    }

    res.status(200).json({
      success: true,
      message: `અધ્યાય ${chapterNumber} ના ${shlokas.length} શ્લોકનો ઑડિયો સર્વર પર બેકગ્રાઉન્ડમાં તૈયાર થઈ રહ્યો છે.`,
      totalShlokas: shlokas.length,
    });

    setImmediate(async () => {
      for (const s of shlokas) {
        try {
          let plainSa = String(s.sanskrit || "")
            .replace(/<[^>]*>/g, " ")
            .replace(/[॥\|]\s*[\d\.\-०-९]+\s*[॥\|]/g, "।")
            .trim();
          if (!plainSa && (s.sanskritLine1 || s.sanskritLine2)) {
            plainSa = [s.sanskritLine1, s.sanskritLine2].filter(Boolean).join("\n");
          }
          if (plainSa) await synthesizeBuffer(plainSa, "sa", "-22%");

          let plainTr = String(s.translation || "").replace(/<[^>]*>/g, " ").trim();
          if (plainTr) await synthesizeBuffer(plainTr, "gu", "-2%");

          let plainMsg = String(s.message || "").replace(/<[^>]*>/g, " ").trim();
          if (plainMsg) await synthesizeBuffer(plainMsg, "gu", "-2%");
        } catch (e) {}
      }
    });
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Warmup error" });
    }
  }
};

/**
 * Super Admin Exclusive: Download Shlok Audio MP3
 * GET/POST /api/tts/download/shlok/:chapterNumber/:shlokNumber
 * Query or Body:
 *   - type: "full" | "sanskrit" | "translation" | "message"
 *   - lang: "gu" | "hi" | "en"
 */
const downloadShlokAudio = async (req, res) => {
  try {
    const chapterNumber = parseInt(req.params.chapterNumber, 10);
    const shlokNumber = parseInt(req.params.shlokNumber, 10);
    const type = (req.query.type || req.body?.type || "full").toLowerCase();
    const lang = (req.query.lang || req.body?.lang || "gu").toLowerCase();

    if (isNaN(chapterNumber) || isNaN(shlokNumber)) {
      return res.status(400).json({
        success: false,
        message: "Valid chapter and shlok numbers are required.",
      });
    }

    const Shlok = require("../models/Shlok");
    const shlok = await Shlok.findOne({ chapterNumber, shlokNumber });
    if (!shlok) {
      return res.status(404).json({
        success: false,
        message: `અધ્યાય ${chapterNumber}, શ્લોક ${shlokNumber} મળ્યો નથી.`,
      });
    }

    const cleanHtml = (str) => {
      if (!str) return "";
      return String(str)
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, " and ")
        .replace(/\s+/g, " ")
        .trim();
    };

    let plainSa = String(shlok.sanskrit || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/[॥\|]\s*[\d\.\-०-९]+\s*[॥\|]/g, "।")
      .replace(/[॥\|]+/g, "।")
      .replace(/[:：]/g, ". ")
      .replace(/\s+/g, " ")
      .trim();

    if (!plainSa && (shlok.sanskritLine1 || shlok.sanskritLine2)) {
      plainSa = [shlok.sanskritLine1, shlok.sanskritLine2].filter(Boolean).join("\n");
    }

    const translationText =
      lang === "hi"
        ? (shlok.translationHi || shlok.translation)
        : lang === "en"
        ? (shlok.translationEn || shlok.translation)
        : shlok.translation;
    const plainTr = cleanHtml(translationText);

    const messageText =
      lang === "hi"
        ? (shlok.messageHi || shlok.message)
        : lang === "en"
        ? (shlok.messageEn || shlok.message)
        : shlok.message;
    const plainMsg = cleanHtml(messageText);

    let audioBuffer = null;
    let filename = "";

    if (type === "sanskrit") {
      if (!plainSa) {
        return res.status(404).json({ success: false, message: "Sanskrit shloka text not found." });
      }
      audioBuffer = await synthesizeBuffer(plainSa, "sa", "-22%");
      filename = `Gita_Adhyay_${chapterNumber}_Shlok_${shlokNumber}_Sanskrit.mp3`;
    } else if (type === "translation") {
      if (!plainTr) {
        return res.status(404).json({ success: false, message: "Translation text not found." });
      }
      audioBuffer = await synthesizeBuffer(plainTr, lang, "-2%");
      filename = `Gita_Adhyay_${chapterNumber}_Shlok_${shlokNumber}_Anuvad_${lang.toUpperCase()}.mp3`;
    } else if (type === "message") {
      if (!plainMsg) {
        return res.status(404).json({ success: false, message: "Message text not found." });
      }
      audioBuffer = await synthesizeBuffer(plainMsg, lang, "-2%");
      filename = `Gita_Adhyay_${chapterNumber}_Shlok_${shlokNumber}_Sandesh_${lang.toUpperCase()}.mp3`;
    } else {
      // type === "full" (Combine Sanskrit + Translation + Message in one continuous MP3)
      const parts = [];
      if (plainSa) {
        const saBuf = await synthesizeBuffer(plainSa, "sa", "-22%");
        if (saBuf && saBuf.length > 0) parts.push(saBuf);
      }
      if (plainTr) {
        const trBuf = await synthesizeBuffer(plainTr, lang, "-2%");
        if (trBuf && trBuf.length > 0) parts.push(trBuf);
      }
      if (plainMsg) {
        const msgBuf = await synthesizeBuffer(plainMsg, lang, "-2%");
        if (msgBuf && msgBuf.length > 0) parts.push(msgBuf);
      }

      if (parts.length === 0) {
        return res.status(404).json({ success: false, message: "No audio content available for this shlok." });
      }

      audioBuffer = Buffer.concat(parts);
      filename = `Gita_Adhyay_${chapterNumber}_Shlok_${shlokNumber}_Sampurna_${lang.toUpperCase()}.mp3`;
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(500).json({ success: false, message: "Audio generation failed." });
    }

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": audioBuffer.length,
      "Cache-Control": "private, max-age=86400",
      "Accept-Ranges": "bytes",
    });

    return res.send(audioBuffer);
  } catch (error) {
    console.error("downloadShlokAudio Fatal Error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: "Failed to generate shlok audio download." });
    }
  }
};

module.exports = {
  generateSpeech,
  precacheSingleShlokAudio,
  warmupChapterAudios,
  downloadShlokAudio,
};
