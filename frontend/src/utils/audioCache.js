// =========================================================
// BHAGAVAD GITA - INDEXEDDB AUDIO CACHE & BACKGROUND SYNC ENGINE
// Automatically downloads & saves Neural TTS audio for 100% offline playback
// =========================================================

import { isRunningInStandaloneApp } from "./pwaManager.js";

const DB_NAME = "GitaAudioCacheDB";
const DB_VERSION = 1;
const STORE_NAME = "audio_blobs";

const RENDER_BASE = "https://bhagavad-gita-backend-jy1a.onrender.com";
const LOCAL_BASE = "http://localhost:5000";

let dbInstance = null;
let localBackendDownUntil = 0;
let batchEndpointUnavailableUntil = 0;

function getCandidateBases() {
  const isLocal =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  if (!isLocal || Date.now() < localBackendDownUntil) {
    return [RENDER_BASE];
  }
  return [LOCAL_BASE, RENDER_BASE];
}

/**
 * Open or create the IndexedDB database
 */
function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by_chapter", "chapterNumber", { unique: false });
        store.createIndex("by_chapter_shloka", ["chapterNumber", "shlokNumber"], { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      dbInstance.onclose = () => {
        dbInstance = null;
      };
      dbInstance.onversionchange = () => {
        try {
          dbInstance?.close();
        } catch (e) {}
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.warn("Failed to open Gita Audio IndexedDB:", event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Generate unique cache key
 */
export function buildAudioKey(chapterNumber, shlokNumber, type, lang) {
  return `ch_${Number(chapterNumber)}_sh_${Number(shlokNumber)}_${type}_${lang || "gu"}`;
}

/**
 * Save an audio Blob into IndexedDB (In App Only!)
 */
export async function saveAudioToCache(chapterNumber, shlokNumber, type, lang, blob) {
  if (!chapterNumber || !shlokNumber || !type || !blob) return false;
  if (typeof window === "undefined" || !isRunningInStandaloneApp()) return false;
  try {
    const db = await openDB();
    const id = buildAudioKey(chapterNumber, shlokNumber, type, lang);

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      const record = {
        id,
        chapterNumber: Number(chapterNumber),
        shlokNumber: Number(shlokNumber),
        type,
        lang: lang || "gu",
        blob,
        savedAt: Date.now(),
      };

      const putRequest = store.put(record);
      putRequest.onsuccess = () => resolve(true);
      putRequest.onerror = (err) => {
        console.warn(`Could not save audio ${id} to cache:`, err);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn("saveAudioToCache error:", err);
    return false;
  }
}

/**
 * Save multiple audio records in a single atomic IndexedDB transaction for maximum throughput
 */
export async function saveAudioBatchToCache(records) {
  if (!Array.isArray(records) || records.length === 0) return false;
  if (typeof window === "undefined" || !isRunningInStandaloneApp()) return false;
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const now = Date.now();

      for (const rec of records) {
        if (!rec || !rec.chapterNumber || !rec.shlokNumber || !rec.type || !rec.blob) continue;
        store.put({
          id: rec.id || buildAudioKey(rec.chapterNumber, rec.shlokNumber, rec.type, rec.lang),
          chapterNumber: Number(rec.chapterNumber),
          shlokNumber: Number(rec.shlokNumber),
          type: rec.type,
          lang: rec.lang || "gu",
          blob: rec.blob,
          savedAt: now,
        });
      }

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });
  } catch (err) {
    console.warn("saveAudioBatchToCache error:", err);
    return false;
  }
}

/**
 * Retrieve an audio Blob from IndexedDB
 */
export async function getAudioFromCache(chapterNumber, shlokNumber, type, lang) {
  if (!chapterNumber || !shlokNumber || !type) return null;
  try {
    const db = await openDB();
    const id = buildAudioKey(chapterNumber, shlokNumber, type, lang);

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const result = getRequest.result;
        if (result && result.blob) {
          resolve(result.blob);
        } else {
          resolve(null);
        }
      };

      getRequest.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    return null;
  }
}

/**
 * Check if an audio is available in cache (fast count query without loading blob)
 */
export async function isAudioInCache(chapterNumber, shlokNumber, type, lang) {
  try {
    const db = await openDB();
    const id = buildAudioKey(chapterNumber, shlokNumber, type, lang);
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.count(id);
      req.onsuccess = () => resolve(req.result > 0);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
}

/**
 * Get all cached audio keys for a specific chapter in one quick indexed query
 */
export async function getChapterCachedKeys(chapterNumber) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("by_chapter");
      const request = index.getAllKeys(Number(chapterNumber));
      request.onsuccess = () => {
        resolve(new Set(request.result || []));
      };
      request.onerror = () => resolve(new Set());
    });
  } catch (e) {
    return new Set();
  }
}

/**
 * Clear all cached audio (called on logout)
 */
export async function clearAudioCache() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve(true);
      clearRequest.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
}

// =========================================================
// NEURAL TTS FETCH & TEXT FORMATTING UTILITIES
// =========================================================

/**
 * Clean HTML preserving line breaks
 */
export function removeHtml(text) {
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
 * Resiliently fetch Microsoft Neural AI speech audio
 */
export const fetchNeuralAudioBlob = async (text, lang, customRate = null, externalSignal = null) => {
  const candidateBases = getCandidateBases();

  const payload = {
    text,
    lang,
    voice: "male",
  };
  if (customRate) {
    payload.rate = customRate;
  }

  let lastFetchErr = null;
  for (const base of candidateBases) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (externalSignal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      try {
        const controller = new AbortController();
        const timeoutMs = base.includes("localhost") ? 1500 : 25000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const onExternalAbort = () => controller.abort();
        if (externalSignal) externalSignal.addEventListener("abort", onExternalAbort, { once: true });

        const response = await fetch(`${base}/api/tts/speak`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (externalSignal) externalSignal.removeEventListener("abort", onExternalAbort);

        if (response.ok) {
          return await response.blob();
        }
      } catch (err) {
        lastFetchErr = err;
        if (externalSignal?.aborted) throw err;
        if (base.includes("localhost")) {
          localBackendDownUntil = Date.now() + 60000;
          break;
        }
        if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
      }
    }
  }
  throw lastFetchErr || new Error("Failed to fetch audio from all endpoints");
};

/**
 * Parse binary packed audio stream returned by POST /api/tts/batch
 */
function parseBatchAudioResponse(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const decoder = new TextDecoder();
  const resultMap = new Map();
  let offset = 0;

  while (offset + 6 <= bytes.length) {
    const idLen = view.getUint16(offset, false);
    offset += 2;
    if (offset + idLen + 4 > bytes.length) break;
    const id = decoder.decode(bytes.subarray(offset, offset + idLen));
    offset += idLen;
    const audioLen = view.getUint32(offset, false);
    offset += 4;
    if (offset + audioLen > bytes.length) break;
    const blob = new Blob([bytes.subarray(offset, offset + audioLen)], { type: "audio/mpeg" });
    offset += audioLen;
    resultMap.set(id, blob);
  }

  return resultMap;
}

/**
 * Fetch a batch of up to 24 Neural TTS audio clips in a single HTTP request.
 * Returns Map<id, Blob> (empty map if endpoint unavailable or failed, triggering clean per-item fallback).
 */
async function fetchNeuralAudioBatch(items, externalSignal = null) {
  if (!Array.isArray(items) || items.length === 0) return new Map();
  if (Date.now() < batchEndpointUnavailableUntil) return new Map();

  const candidateBases = getCandidateBases();
  const payload = {
    items: items.map((item) => ({
      id: item.id,
      text: item.text,
      lang: item.lang,
      rate: item.rate,
    })),
  };

  for (const base of candidateBases) {
    if (externalSignal?.aborted) return new Map();
    try {
      const controller = new AbortController();
      const timeoutMs = base.includes("localhost") ? 15000 : 60000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const onExternalAbort = () => controller.abort();
      if (externalSignal) externalSignal.addEventListener("abort", onExternalAbort, { once: true });

      const response = await fetch(`${base}/api/tts/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (externalSignal) externalSignal.removeEventListener("abort", onExternalAbort);

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        return parseBatchAudioResponse(buffer);
      }

      if (response.status === 404 && !base.includes("localhost")) {
        batchEndpointUnavailableUntil = Date.now() + 60000;
      }
    } catch (err) {
      if (externalSignal?.aborted) return new Map();
      if (base.includes("localhost")) {
        localBackendDownUntil = Date.now() + 60000;
      }
    }
  }
  return new Map();
}

/**
 * Format Sanskrit text with natural poetic meter (rag/chandas pauses) for authentic recitation
 */
export function formatSanskritForSpeech(shlokObj) {
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
}

/**
 * Extract clean spoken text from HTML translation
 */
export function extractCleanTextForSpeech(htmlString) {
  if (!htmlString) return "";
  try {
    let preprocessed = String(htmlString)
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

// =========================================================
// AUTOMATIC BACKGROUND AUDIO PRE-CACHING ENGINE
// Saves audio without requiring the user to listen to it
// =========================================================

/**
 * Count how many shlokas in a chapter have all applicable audios cached
 * Optimized to use indexed Set for instant memory-speed calculation
 */
export async function getChapterCachedAudioCount(chapterNumber, shlokas, lang = "gu", cachedKeySet = null) {
  if (!Array.isArray(shlokas) || shlokas.length === 0) return 0;
  const keySet = cachedKeySet || (await getChapterCachedKeys(chapterNumber));
  let count = 0;
  for (const s of shlokas) {
    const sNum = Number(s.shlokNumber);
    const saText = formatSanskritForSpeech(s);
    const rawTr =
      (lang === "en" ? s.translationEn : lang === "hi" ? s.translationHi : s.translation) ||
      s.translation;
    const trText = extractCleanTextForSpeech(rawTr);
    const rawMsg =
      (lang === "en" ? s.messageEn : lang === "hi" ? s.messageHi : s.message) || s.message;
    const msgText = extractCleanTextForSpeech(rawMsg);

    const hasSa = saText ? keySet.has(buildAudioKey(chapterNumber, sNum, "sanskrit", "sa")) : true;
    const hasTr = trText ? keySet.has(buildAudioKey(chapterNumber, sNum, "translation", lang)) : true;
    const hasMsg = msgText ? keySet.has(buildAudioKey(chapterNumber, sNum, "message", lang)) : true;
    if (hasSa && hasTr && hasMsg) count++;
  }
  return count;
}

/**
 * Pre-cache Sanskrit, Translation, and Message audio for a single shloka (In App Only!)
 * Fetches all missing audio parts in PARALLEL via Promise.all for 3x-4x faster caching
 */
export async function cacheSingleShlokaAudio(chapterNumber, shlokaObj, lang = "gu", cachedKeySet = null) {
  if (!chapterNumber || !shlokaObj || typeof window === "undefined" || !navigator.onLine) return false;
  if (!isRunningInStandaloneApp()) return false;
  const sNum = Number(shlokaObj.shlokNumber);
  if (!sNum) return false;

  const saKey = buildAudioKey(chapterNumber, sNum, "sanskrit", "sa");
  const trKey = buildAudioKey(chapterNumber, sNum, "translation", lang);
  const rawMsg =
    (lang === "en" ? shlokaObj.messageEn : lang === "hi" ? shlokaObj.messageHi : shlokaObj.message) ||
    shlokaObj.message;
  const msgText = extractCleanTextForSpeech(rawMsg);
  const msgKey = msgText ? buildAudioKey(chapterNumber, sNum, "message", lang) : null;

  const fetchTasks = [];

  // 1. Sanskrit task
  const hasSa = cachedKeySet
    ? cachedKeySet.has(saKey)
    : await isAudioInCache(chapterNumber, sNum, "sanskrit", "sa");
  if (!hasSa) {
    const saText = formatSanskritForSpeech(shlokaObj);
    if (saText) {
      fetchTasks.push(
        (async () => {
          try {
            const saBlob = await fetchNeuralAudioBlob(saText, "sa", "-22%");
            if (saBlob) {
              await saveAudioToCache(chapterNumber, sNum, "sanskrit", "sa", saBlob);
              if (cachedKeySet) cachedKeySet.add(saKey);
              return true;
            }
          } catch (err) {}
          return false;
        })()
      );
    }
  }

  // 2. Translation task
  const hasTr = cachedKeySet
    ? cachedKeySet.has(trKey)
    : await isAudioInCache(chapterNumber, sNum, "translation", lang);
  if (!hasTr) {
    const rawText =
      (lang === "en" ? shlokaObj.translationEn : lang === "hi" ? shlokaObj.translationHi : shlokaObj.translation) ||
      shlokaObj.translation;
    const trText = extractCleanTextForSpeech(rawText);
    if (trText) {
      fetchTasks.push(
        (async () => {
          try {
            const trBlob = await fetchNeuralAudioBlob(trText, lang, "-2%");
            if (trBlob) {
              await saveAudioToCache(chapterNumber, sNum, "translation", lang, trBlob);
              if (cachedKeySet) cachedKeySet.add(trKey);
              return true;
            }
          } catch (err) {}
          return false;
        })()
      );
    }
  }

  // 3. Message task
  if (msgKey) {
    const hasMsg = cachedKeySet
      ? cachedKeySet.has(msgKey)
      : await isAudioInCache(chapterNumber, sNum, "message", lang);
    if (!hasMsg) {
      fetchTasks.push(
        (async () => {
          try {
            const msgBlob = await fetchNeuralAudioBlob(msgText, lang, "-2%");
            if (msgBlob) {
              await saveAudioToCache(chapterNumber, sNum, "message", lang, msgBlob);
              if (cachedKeySet) cachedKeySet.add(msgKey);
              return true;
            }
          } catch (err) {}
          return false;
        })()
      );
    }
  }

  if (fetchTasks.length === 0) return false;
  const results = await Promise.all(fetchTasks);
  return results.some(Boolean);
}

let activeSyncController = null;

export function stopAudioSync() {
  if (activeSyncController) {
    activeSyncController.abort();
    activeSyncController = null;
  }
}

/**
 * Collect ordered missing audio clip tasks for a chapter
 */
function buildMissingClipsForChapter(chapterNumber, shlokas, lang, startFromIndex, cachedKeySet) {
  const len = shlokas.length;
  const indices = [];
  for (let i = startFromIndex; i < len; i++) indices.push(i);
  for (let i = 0; i < startFromIndex; i++) indices.push(i);

  const missingClips = [];
  for (const idx of indices) {
    const s = shlokas[idx];
    if (!s) continue;
    const sNum = Number(s.shlokNumber);
    if (!sNum) continue;

    // 1. Sanskrit
    const saKey = buildAudioKey(chapterNumber, sNum, "sanskrit", "sa");
    if (!cachedKeySet.has(saKey)) {
      const saText = formatSanskritForSpeech(s);
      if (saText) {
        missingClips.push({
          id: saKey,
          chapterNumber: Number(chapterNumber),
          shlokNumber: sNum,
          type: "sanskrit",
          lang: "sa",
          text: saText,
          rate: "-22%",
        });
      }
    }

    // 2. Translation
    const trKey = buildAudioKey(chapterNumber, sNum, "translation", lang);
    if (!cachedKeySet.has(trKey)) {
      const rawTr =
        (lang === "en" ? s.translationEn : lang === "hi" ? s.translationHi : s.translation) ||
        s.translation;
      const trText = extractCleanTextForSpeech(rawTr);
      if (trText) {
        missingClips.push({
          id: trKey,
          chapterNumber: Number(chapterNumber),
          shlokNumber: sNum,
          type: "translation",
          lang,
          text: trText,
          rate: "-2%",
        });
      }
    }

    // 3. Message
    const msgKey = buildAudioKey(chapterNumber, sNum, "message", lang);
    if (!cachedKeySet.has(msgKey)) {
      const rawMsg =
        (lang === "en" ? s.messageEn : lang === "hi" ? s.messageHi : s.message) || s.message;
      const msgText = extractCleanTextForSpeech(rawMsg);
      if (msgText) {
        missingClips.push({
          id: msgKey,
          chapterNumber: Number(chapterNumber),
          shlokNumber: sNum,
          type: "message",
          lang,
          text: msgText,
          rate: "-2%",
        });
      }
    }
  }
  return missingClips;
}

/**
 * Sync one chapter using an explicit AbortSignal
 */
async function syncChapterInternal(
  chapterNumber,
  shlokas,
  lang = "gu",
  startFromIndex = 0,
  onProgress = null,
  signal = null
) {
  if (!Array.isArray(shlokas) || shlokas.length === 0) return;
  const len = shlokas.length;

  const cachedKeySet = await getChapterCachedKeys(chapterNumber);
  const initialCompleted = await getChapterCachedAudioCount(chapterNumber, shlokas, lang, cachedKeySet);

  if (typeof onProgress === "function") {
    onProgress({
      current: initialCompleted,
      total: len,
      percent: Math.round((initialCompleted / len) * 100),
    });
  }

  if (initialCompleted >= len) return;

  const missingClips = buildMissingClipsForChapter(
    chapterNumber,
    shlokas,
    lang,
    startFromIndex,
    cachedKeySet
  );
  if (missingClips.length === 0) return;

  // Group clips into compact binary batches (9 clips = 3 shlokas per batch)
  const BATCH_SIZE = 9;
  const chunks = [];
  for (let i = 0; i < missingClips.length; i += BATCH_SIZE) {
    chunks.push(missingClips.slice(i, i + BATCH_SIZE));
  }

  // Execute 3 parallel batch requests (~27 clips in flight with minimal HTTP overhead)
  const BATCH_CONCURRENCY = 3;
  let chunkIndex = 0;

  async function batchWorker() {
    while (chunkIndex < chunks.length) {
      if (signal?.aborted || !navigator.onLine) break;
      const chunk = chunks[chunkIndex++];
      if (!chunk || chunk.length === 0) break;

      const batchMap = await fetchNeuralAudioBatch(chunk, signal);
      if (signal?.aborted) break;

      const recordsToSave = [];
      const fallbackItems = [];

      for (const item of chunk) {
        const blob = batchMap.get(item.id);
        if (blob) {
          recordsToSave.push({ ...item, blob });
        } else {
          fallbackItems.push(item);
        }
      }

      // Clean fallback for any clip omitted by batch (or when older server doesn't have /batch yet)
      if (fallbackItems.length > 0 && !signal?.aborted && navigator.onLine) {
        const FALLBACK_CONCURRENCY = 4;
        let fbIdx = 0;
        async function fbWorker() {
          while (fbIdx < fallbackItems.length) {
            if (signal?.aborted || !navigator.onLine) break;
            const fbItem = fallbackItems[fbIdx++];
            try {
              const fbBlob = await fetchNeuralAudioBlob(
                fbItem.text,
                fbItem.lang,
                fbItem.rate,
                signal
              );
              if (fbBlob) {
                recordsToSave.push({ ...fbItem, blob: fbBlob });
              }
            } catch (e) {}
          }
        }
        const fbWorkers = [];
        const count = Math.min(FALLBACK_CONCURRENCY, fallbackItems.length);
        for (let i = 0; i < count; i++) fbWorkers.push(fbWorker());
        await Promise.all(fbWorkers);
      }

      if (recordsToSave.length > 0 && !signal?.aborted) {
        await saveAudioBatchToCache(recordsToSave);
        for (const rec of recordsToSave) {
          cachedKeySet.add(rec.id);
        }
      }

      if (typeof onProgress === "function" && !signal?.aborted) {
        const currentCompleted = await getChapterCachedAudioCount(
          chapterNumber,
          shlokas,
          lang,
          cachedKeySet
        );
        onProgress({
          current: currentCompleted,
          total: len,
          percent: Math.round((currentCompleted / len) * 100),
        });
      }
    }
  }

  const workers = [];
  const workerCount = Math.min(BATCH_CONCURRENCY, chunks.length);
  for (let w = 0; w < workerCount; w++) {
    workers.push(batchWorker());
  }
  await Promise.all(workers);
}

/**
 * High-Speed background pre-cache for all shlokas in a chapter
 * Uses binary batched HTTP transport + single-transaction IndexedDB writes across ALL chapters 1-18.
 */
export async function autoSyncChapterAudios(
  chapterNumber,
  shlokas,
  lang = "gu",
  startFromIndex = 0,
  onProgress = null
) {
  if (typeof window === "undefined" || !navigator.onLine) return;
  if (!isRunningInStandaloneApp()) return;
  if (!Array.isArray(shlokas) || shlokas.length === 0) return;

  if (activeSyncController) {
    activeSyncController.abort();
  }
  const controller = new AbortController();
  activeSyncController = controller;

  try {
    await syncChapterInternal(
      chapterNumber,
      shlokas,
      lang,
      startFromIndex,
      onProgress,
      controller.signal
    );
  } catch (e) {
    // ignore abort
  } finally {
    if (activeSyncController === controller) {
      activeSyncController = null;
    }
  }
}

/**
 * Background queue to sync multiple offline chapters sequentially (e.g. after "Download All 18 Chapters").
 * Automatically yields/aborts if the user opens any specific chapter in ChapterReader.
 */
export async function autoSyncMultipleChaptersAudios(chapterEntries, lang = "gu") {
  if (typeof window === "undefined" || !navigator.onLine) return;
  if (!isRunningInStandaloneApp()) return;
  if (!Array.isArray(chapterEntries) || chapterEntries.length === 0) return;

  if (activeSyncController) {
    activeSyncController.abort();
  }
  const controller = new AbortController();
  activeSyncController = controller;

  try {
    for (const entry of chapterEntries) {
      if (controller.signal.aborted || !navigator.onLine) break;
      if (!entry || !entry.chapterNumber || !Array.isArray(entry.shlokas) || entry.shlokas.length === 0) {
        continue;
      }
      await syncChapterInternal(
        entry.chapterNumber,
        entry.shlokas,
        lang,
        0,
        null,
        controller.signal
      );
    }
  } catch (e) {
    // ignore abort
  } finally {
    if (activeSyncController === controller) {
      activeSyncController = null;
    }
  }
}
