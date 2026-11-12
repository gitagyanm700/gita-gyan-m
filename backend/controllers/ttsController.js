const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const {
  VOICE_MAP,
  extractCleanTextForSpeech,
  formatSanskritForSpeech,
  getTtsSynthesisParams,
  buildShlokTtsTasks,
} = require("../utils/ttsTextUtils");

const CACHE_DIR = path.join(__dirname, "../audio_cache");
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (e) {
  console.warn("Could not create audio_cache dir:", e);
}

// Byte-capped in-memory LRU cache (~40 MB max so Render 512MB container never OOMs)
const audioCache = new Map();
let audioCacheBytes = 0;
const MAX_CACHE_BYTES = 40 * 1024 * 1024;

// Deduplicate concurrent synthesis requests for the exact same audio clip
const inFlightSynthesis = new Map();
const activeWarmups = new Set();

function setMemoryCache(cacheKey, buffer) {
  if (!buffer || !buffer.length) return;
  if (audioCache.has(cacheKey)) {
    const existing = audioCache.get(cacheKey);
    audioCacheBytes -= existing.length;
    audioCache.delete(cacheKey);
  }
  while (audioCacheBytes + buffer.length > MAX_CACHE_BYTES && audioCache.size > 0) {
    const oldestKey = audioCache.keys().next().value;
    const oldestBuf = audioCache.get(oldestKey);
    audioCache.delete(oldestKey);
    if (oldestBuf) audioCacheBytes -= oldestBuf.length;
  }
  if (buffer.length <= MAX_CACHE_BYTES) {
    audioCache.set(cacheKey, buffer);
    audioCacheBytes += buffer.length;
  }
}

/**
 * Core synthesis helper with non-blocking dual-layer caching (Memory + Disk) & in-flight deduplication
 */
const synthesizeBuffer = async (text, lang = "gu", customRate = null, { cacheInMemory = true } = {}) => {
  const params = getTtsSynthesisParams(text, lang, customRate);
  if (!params) return null;

  const { cleanText, selectedVoice, prosodyOptions, cacheKey } = params;

  // 1. Check in-memory LRU RAM cache (instant)
  if (audioCache.has(cacheKey)) {
    const hit = audioCache.get(cacheKey);
    // Refresh LRU order
    audioCache.delete(cacheKey);
    audioCache.set(cacheKey, hit);
    return hit;
  }

  // 2. Check disk cache asynchronously (non-blocking ~2-5ms)
  const diskPath = path.join(CACHE_DIR, `${cacheKey}.mp3`);
  try {
    const diskBuffer = await fs.promises.readFile(diskPath);
    if (diskBuffer && diskBuffer.length > 0) {
      if (cacheInMemory) setMemoryCache(cacheKey, diskBuffer);
      return diskBuffer;
    }
  } catch (e) {
    // Disk miss — continue to synthesis
  }

  // 3. Reuse in-flight synthesis promise if already running for the exact same cacheKey
  if (inFlightSynthesis.has(cacheKey)) {
    return inFlightSynthesis.get(cacheKey);
  }

  const synthPromise = (async () => {
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
          if (cacheInMemory) setMemoryCache(cacheKey, audioBuffer);
          fs.promises.writeFile(diskPath, audioBuffer).catch(() => {});
          return audioBuffer;
        }
      } catch (err) {
        if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
    return null;
  })();

  inFlightSynthesis.set(cacheKey, synthPromise);
  try {
    return await synthPromise;
  } finally {
    inFlightSynthesis.delete(cacheKey);
  }
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
 * High-speed Binary Batch TTS Endpoint for Offline Sync
 * POST /api/tts/batch
 * Body: { items: [{ id, text, lang, rate }, ...] } (up to 24 items per request)
 * Response: Compact binary stream [uint16 idLen][idBytes][uint32 mp3Len][mp3Bytes]...
 */
const generateSpeechBatch = async (req, res) => {
  try {
    const items = req.body?.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items array is required for batch speech synthesis.",
      });
    }

    const boundedItems = items.slice(0, 24);
    const results = new Array(boundedItems.length).fill(null);

    const WORKER_CONCURRENCY = 6;
    let nextIdx = 0;

    async function worker() {
      while (nextIdx < boundedItems.length) {
        const idx = nextIdx++;
        const item = boundedItems[idx];
        if (!item || !item.id || typeof item.text !== "string" || !item.text.trim()) {
          continue;
        }
        try {
          const buf = await synthesizeBuffer(item.text, item.lang || "gu", item.rate ?? null);
          if (buf && buf.length > 0) {
            results[idx] = { id: String(item.id), buffer: buf };
          }
        } catch (e) {
          // Leave missing item null; frontend retries missing IDs individually
        }
      }
    }

    const workerCount = Math.min(WORKER_CONCURRENCY, boundedItems.length);
    const workers = [];
    for (let i = 0; i < workerCount; i++) {
      workers.push(worker());
    }
    await Promise.all(workers);

    const binaryChunks = [];
    for (const entry of results) {
      if (!entry) continue;
      const idBuf = Buffer.from(entry.id, "utf8");
      if (idBuf.length > 65535) continue;
      const header = Buffer.allocUnsafe(6 + idBuf.length);
      header.writeUInt16BE(idBuf.length, 0);
      idBuf.copy(header, 2);
      header.writeUInt32BE(entry.buffer.length, 2 + idBuf.length);
      binaryChunks.push(header, entry.buffer);
    }

    const payload = Buffer.concat(binaryChunks);
    res.set({
      "Content-Type": "application/octet-stream",
      "Content-Length": payload.length,
      "Cache-Control": "no-store",
    });
    return res.send(payload);
  } catch (error) {
    console.error("TTS Batch Controller Fatal Error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: "Batch speech synthesis failed." });
    }
  }
};

/**
 * Helper to synthesize missing tasks concurrently on server disk
 */
async function warmTasksPool(tasks, concurrency = 4) {
  if (!Array.isArray(tasks) || tasks.length === 0) return;

  // Skip already cached disk files quickly before opening workers
  const missing = [];
  for (const t of tasks) {
    const diskPath = path.join(CACHE_DIR, `${t.cacheKey}.mp3`);
    if (!fs.existsSync(diskPath)) {
      missing.push(t);
    }
  }
  if (missing.length === 0) return;

  let index = 0;
  async function worker() {
    while (index < missing.length) {
      const task = missing[index++];
      if (!task) break;
      try {
        await synthesizeBuffer(task.text, task.lang, task.rate, { cacheInMemory: false });
      } catch (e) {}
    }
  }

  const workers = [];
  const count = Math.min(concurrency, missing.length);
  for (let i = 0; i < count; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
}

/**
 * Automatically pre-caches audio (Sanskrit + Gujarati + Hindi + English)
 * using the exact canonical frontend text format when Admin adds or updates a shloka!
 */
const precacheSingleShlokAudio = (shloka) => {
  if (!shloka) return;
  setImmediate(async () => {
    try {
      const tasks = buildShlokTtsTasks(shloka, ["gu", "hi", "en"]);
      await warmTasksPool(tasks, 4);
    } catch (e) {
      console.warn("[TTS] Automatic shloka precache error:", e.message);
    }
  });
};

/**
 * Warm up an entire chapter's audio in the background on demand (deduplicated & parallelized)
 * Query: ?lang=gu|hi|en|all (default: gu)
 */
const warmupChapterAudios = async (req, res) => {
  try {
    const Shlok = require("../models/Shlok");
    const chapterNumber = Number(req.params.chapterNumber);
    if (!chapterNumber || chapterNumber < 1 || chapterNumber > 18) {
      return res.status(400).json({ success: false, message: "Invalid chapter number." });
    }

    const reqLang = String(req.query.lang || req.body?.lang || "gu").toLowerCase();
    const languages =
      reqLang === "all" ? ["gu", "hi", "en"] : [VOICE_MAP[reqLang] ? reqLang : "gu"];
    const warmupKey = `${chapterNumber}:${languages.join(",")}`;

    const shlokas = await Shlok.find({ chapterNumber }).sort({ shlokNumber: 1 }).lean();
    if (!shlokas || shlokas.length === 0) {
      return res.status(404).json({ success: false, message: "No shlokas found for this chapter." });
    }

    res.status(200).json({
      success: true,
      message: `અધ્યાય ${chapterNumber} ના ${shlokas.length} શ્લોકનો ઑડિયો સર્વર પર બેકગ્રાઉન્ડમાં તૈયાર થઈ રહ્યો છે.`,
      totalShlokas: shlokas.length,
    });

    if (activeWarmups.has(warmupKey)) return;
    activeWarmups.add(warmupKey);

    setImmediate(async () => {
      try {
        const tasks = [];
        for (const s of shlokas) {
          tasks.push(...buildShlokTtsTasks(s, languages));
        }
        await warmTasksPool(tasks, 4);
      } catch (e) {
        console.warn(`[TTS] Warmup error ch ${chapterNumber}:`, e.message);
      } finally {
        activeWarmups.delete(warmupKey);
      }
    });
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Warmup error" });
    }
  }
};

/**
 * Quiet background startup cache verification:
 * Ensures any shloka in MongoDB added after last deployment has Sanskrit + Gujarati MP3s warm on disk.
 */
const scheduleStartupAudioPrecache = () => {
  setTimeout(async () => {
    try {
      if (mongoose.connection.readyState !== 1) return;
      const Shlok = require("../models/Shlok");
      const shlokas = await Shlok.find({}).sort({ chapterNumber: 1, shlokNumber: 1 }).lean();
      if (!shlokas || shlokas.length === 0) return;

      const tasks = [];
      for (const s of shlokas) {
        tasks.push(...buildShlokTtsTasks(s, ["gu"]));
      }
      await warmTasksPool(tasks, 2);
    } catch (e) {
      console.warn("[TTS] Startup precache note:", e.message);
    }
  }, 15000);
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

    const plainSa = formatSanskritForSpeech(shlok);

    const translationText =
      lang === "hi"
        ? (shlok.translationHi || shlok.translation)
        : lang === "en"
        ? (shlok.translationEn || shlok.translation)
        : shlok.translation;
    const plainTr = extractCleanTextForSpeech(translationText);

    const messageText =
      lang === "hi"
        ? (shlok.messageHi || shlok.message)
        : lang === "en"
        ? (shlok.messageEn || shlok.message)
        : shlok.message;
    const plainMsg = extractCleanTextForSpeech(messageText);

    const langLabel =
      lang === "hi"
        ? "hindi"
        : lang === "en"
        ? "english"
        : "guj";

    let audioBuffer = null;
    let filename = "";

    if (type === "sanskrit") {
      if (!plainSa) {
        return res.status(404).json({ success: false, message: "Sanskrit shloka text not found." });
      }
      audioBuffer = await synthesizeBuffer(plainSa, "sa", "-22%");
      filename = `adhyay ${chapterNumber}-${shlokNumber} sanskrit.mp3`;
    } else if (type === "translation") {
      if (!plainTr) {
        return res.status(404).json({ success: false, message: "Translation text not found." });
      }
      audioBuffer = await synthesizeBuffer(plainTr, lang, "-2%");
      filename = `adhyay ${chapterNumber}-${shlokNumber} anuvad ${langLabel}.mp3`;
    } else if (type === "message") {
      if (!plainMsg) {
        return res.status(404).json({ success: false, message: "Message text not found." });
      }
      audioBuffer = await synthesizeBuffer(plainMsg, lang, "-2%");
      filename = `adhyay ${chapterNumber}-${shlokNumber} sandesh ${langLabel}.mp3`;
    } else {
      // type === "full" (Combine Sanskrit + Translation + Message in one continuous MP3)
      const [saBuf, trBuf, msgBuf] = await Promise.all([
        plainSa ? synthesizeBuffer(plainSa, "sa", "-22%") : null,
        plainTr ? synthesizeBuffer(plainTr, lang, "-2%") : null,
        plainMsg ? synthesizeBuffer(plainMsg, lang, "-2%") : null,
      ]);

      const parts = [saBuf, trBuf, msgBuf].filter((b) => b && b.length > 0);
      if (parts.length === 0) {
        return res.status(404).json({ success: false, message: "No audio content available for this shlok." });
      }

      audioBuffer = Buffer.concat(parts);
      filename = `adhyay ${chapterNumber}-${shlokNumber} ${langLabel}.mp3`;
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
  generateSpeechBatch,
  precacheSingleShlokAudio,
  warmupChapterAudios,
  scheduleStartupAudioPrecache,
  downloadShlokAudio,
};
