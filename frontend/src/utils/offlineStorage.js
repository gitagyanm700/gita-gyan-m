// =========================================================
// BHAGAVAD GITA - OFFLINE STORAGE & PRE-CACHE ENGINE
// Hybrid IndexedDB (Unlimited Capacity) + In-Memory + Lightweight LocalStorage
// Enables 100% offline reading and Neural TTS playback
// Full offline access requires user login
// =========================================================

import { getValidToken } from "./authHelper.js";
import { autoSyncMultipleChaptersAudios } from "./audioCache.js";
import { isRunningInStandaloneApp } from "./pwaManager.js";

const API_BASE = "https://bhagavad-gita-backend-jy1a.onrender.com/api/shloks";

const OFFLINE_DB_NAME = "GitaOfflineChaptersDB";
const OFFLINE_DB_VERSION = 1;
const CHAPTERS_STORE = "chapters";
const META_STORE = "meta";
const DOWNLOADED_FLAG_KEY = "gita_18_chapters_downloaded";
const CATALOG_KEY = "gita_offline_catalog";

let offlineDbInstance = null;
let hydrationPromise = null;
let downloadedFlagMemory =
  typeof localStorage !== "undefined" &&
  localStorage.getItem(DOWNLOADED_FLAG_KEY) === "true";

// Fast in-memory mirror of offline chapters (populated from IndexedDB & writes)
const chapterMemoryCache = new Map();

/**
 * Minify a shloka to essential fields for compact storage
 */
function minifyShlokaForOffline(s) {
  if (!s) return null;
  return {
    _id: s._id,
    chapterNumber: Number(s.chapterNumber),
    chapterName: s.chapterName,
    chapterNameHi: s.chapterNameHi || "",
    chapterNameEn: s.chapterNameEn || "",
    shlokNumber: Number(s.shlokNumber),
    speaker: s.speaker || "",
    speakerHi: s.speakerHi || "",
    speakerEn: s.speakerEn || "",
    sanskrit: s.sanskrit || "",
    wordMeanings: Array.isArray(s.wordMeanings)
      ? s.wordMeanings.map((w) => ({
          word: w.word || "",
          meaning: w.meaning || "",
          meaningHi: w.meaningHi || "",
          meaningEn: w.meaningEn || "",
        }))
      : [],
    translation: s.translation || "",
    translationHi: s.translationHi || "",
    translationEn: s.translationEn || "",
    message: s.message || "",
    messageHi: s.messageHi || "",
    messageEn: s.messageEn || "",
  };
}

function hasStrippedShlokas(shlokas) {
  return (
    Array.isArray(shlokas) &&
    shlokas.some((s) => Number(s?.shlokNumber) > 5 && !s?.sanskrit)
  );
}

function isValidOfflinePayload(data) {
  if (!data || !Array.isArray(data.shlokas) || data.shlokas.length === 0) return false;
  if (hasStrippedShlokas(data.shlokas)) return false;
  return true;
}

/**
 * Safely write small critical keys to localStorage, evicting bulky legacy chapter blobs if quota is tight
 */
function safeLocalStorageSet(key, value) {
  if (typeof localStorage === "undefined") return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    try {
      for (let ch = 1; ch <= 18; ch++) {
        localStorage.removeItem(`gita_offline_ch_${ch}`);
      }
      localStorage.setItem(key, value);
      return true;
    } catch (retryErr) {
      return false;
    }
  }
}

/**
 * Open or create IndexedDB for unlimited offline chapter & flag persistence
 */
function openOfflineDB() {
  if (offlineDbInstance) return Promise.resolve(offlineDbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return reject(new Error("IndexedDB is not supported"));
    }

    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(CHAPTERS_STORE)) {
        db.createObjectStore(CHAPTERS_STORE, { keyPath: "chapterNumber" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => {
      offlineDbInstance = event.target.result;
      offlineDbInstance.onclose = () => {
        offlineDbInstance = null;
      };
      offlineDbInstance.onversionchange = () => {
        try {
          offlineDbInstance?.close();
        } catch (e) {}
        offlineDbInstance = null;
      };
      resolve(offlineDbInstance);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

async function putChapterToIDB(payload) {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(CHAPTERS_STORE, "readwrite");
      const store = tx.objectStore(CHAPTERS_STORE);
      store.put(payload);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
}

async function getChapterFromIDB(chapterNumber) {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(CHAPTERS_STORE, "readonly");
      const store = tx.objectStore(CHAPTERS_STORE);
      const req = store.get(Number(chapterNumber));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

async function getAllChaptersFromIDB() {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(CHAPTERS_STORE, "readonly");
      const store = tx.objectStore(CHAPTERS_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}

async function putDownloadedMetaToIDB(userId = null) {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(META_STORE, "readwrite");
      const store = tx.objectStore(META_STORE);
      store.put({
        id: "download_status",
        downloaded: true,
        downloadedAt: Date.now(),
        userId: userId || null,
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
}

async function getDownloadedMetaFromIDB() {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction(META_STORE, "readonly");
      const store = tx.objectStore(META_STORE);
      const req = store.get("download_status");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

async function clearIDBOfflineStores() {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve) => {
      const tx = db.transaction([CHAPTERS_STORE, META_STORE], "readwrite");
      tx.objectStore(CHAPTERS_STORE).clear();
      tx.objectStore(META_STORE).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
}

/**
 * Hydrate in-memory cache from IndexedDB and migrate any legacy localStorage chapter blobs
 * so localStorage never fills up and hits QuotaExceededError.
 */
export function hydrateOfflineStoreFromIDB() {
  if (typeof window === "undefined") return Promise.resolve();
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    try {
      // 1. Check durable download flag in IndexedDB & sync back to localStorage if missing
      const meta = await getDownloadedMetaFromIDB();
      if (meta && meta.downloaded === true) {
        downloadedFlagMemory = true;
        safeLocalStorageSet(DOWNLOADED_FLAG_KEY, "true");
      } else if (
        typeof localStorage !== "undefined" &&
        localStorage.getItem(DOWNLOADED_FLAG_KEY) === "true"
      ) {
        downloadedFlagMemory = true;
        await putDownloadedMetaToIDB();
      }

      // 2. Load IndexedDB chapters into fast memory cache
      const idbChapters = await getAllChaptersFromIDB();
      for (const chData of idbChapters) {
        if (chData && chData.chapterNumber && isValidOfflinePayload(chData)) {
          chapterMemoryCache.set(Number(chData.chapterNumber), chData);
          updateOfflineCatalog(Number(chData.chapterNumber), chData.shlokas.length);
        }
      }

      // 3. Migrate & clean legacy bulky localStorage chapters (gita_offline_ch_*) into IndexedDB
      if (typeof localStorage !== "undefined") {
        for (let ch = 1; ch <= 18; ch++) {
          const key = `gita_offline_ch_${ch}`;
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          try {
            const parsed = JSON.parse(raw);
            if (isValidOfflinePayload(parsed)) {
              const existing = chapterMemoryCache.get(ch);
              const existingCount = existing?.shlokas?.length || 0;
              if (!existing || parsed.shlokas.length >= existingCount) {
                chapterMemoryCache.set(ch, parsed);
                const saved = await putChapterToIDB(parsed);
                if (saved) {
                  localStorage.removeItem(key);
                }
              } else {
                // IndexedDB already has equal or newer/more complete data
                localStorage.removeItem(key);
              }
              updateOfflineCatalog(ch, Math.max(parsed.shlokas.length, existingCount));
            } else {
              localStorage.removeItem(key);
            }
          } catch (e) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (e) {
      // ignore hydration failure in restricted environments
    }
  })();

  return hydrationPromise;
}

// Kick off background hydration cleanly in browser
if (typeof window !== "undefined") {
  setTimeout(() => {
    hydrateOfflineStoreFromIDB().catch(() => {});
  }, 50);
}

/**
 * Synchronous check whether user has downloaded offline chapters at least once
 */
export function isOfflineDownloadedSync() {
  if (downloadedFlagMemory) return true;
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem(DOWNLOADED_FLAG_KEY) === "true") {
      downloadedFlagMemory = true;
      return true;
    }
  } catch (e) {}
  return false;
}

/**
 * Authoritative async check (Memory + localStorage + IndexedDB)
 */
export async function isOfflineDownloadedAsync() {
  if (isOfflineDownloadedSync()) return true;
  await hydrateOfflineStoreFromIDB();
  return isOfflineDownloadedSync();
}

/**
 * Persist "downloaded once" marker redundantly in Memory, localStorage, and IndexedDB
 */
export async function markOfflineDownloadComplete(userId = null) {
  downloadedFlagMemory = true;
  safeLocalStorageSet(DOWNLOADED_FLAG_KEY, "true");
  await putDownloadedMetaToIDB(userId);
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("gita-offline-download-complete"));
    }
  } catch (e) {}
  return true;
}

/**
 * Update lightweight offline catalog registry in localStorage (< 1 KB)
 */
function updateOfflineCatalog(chapterNumber, count) {
  try {
    if (typeof localStorage === "undefined") return;
    const raw = localStorage.getItem(CATALOG_KEY);
    const catalog = raw ? JSON.parse(raw) : {};
    catalog[chapterNumber] = {
      chapterNumber,
      count,
      savedAt: Date.now(),
    };
    safeLocalStorageSet(CATALOG_KEY, JSON.stringify(catalog));
  } catch (e) {}
}

/**
 * Build cleaned offline chapter payload
 */
function buildOfflineChapterPayload(chapterNumber, shlokas, chapterName = "") {
  if (!chapterNumber || !Array.isArray(shlokas) || shlokas.length === 0) return null;
  if (hasStrippedShlokas(shlokas)) return null;

  const chNum = Number(chapterNumber);
  const existing = chapterMemoryCache.get(chNum);
  if (existing && isValidOfflinePayload(existing) && hasStrippedShlokas(shlokas)) {
    return null;
  }

  const cleanShlokas = shlokas.map(minifyShlokaForOffline).filter(Boolean);
  const finalShlokas = cleanShlokas.length > 0 ? cleanShlokas : shlokas;

  return {
    chapterNumber: chNum,
    chapterName: chapterName || `અધ્યાય ${chNum}`,
    shlokas: finalShlokas,
    count: finalShlokas.length,
    savedAt: Date.now(),
  };
}

/**
 * Save a single chapter and its shlokas to offline storage (Memory + IndexedDB).
 * Synchronous return for backwards compatibility; IndexedDB write runs immediately.
 */
export function saveChapterOffline(chapterNumber, shlokas, chapterName = "") {
  try {
    const payload = buildOfflineChapterPayload(chapterNumber, shlokas, chapterName);
    if (!payload) return false;

    const chNum = payload.chapterNumber;
    chapterMemoryCache.set(chNum, payload);
    updateOfflineCatalog(chNum, payload.count);

    // Store cleanly in IndexedDB (never overflows localStorage!) and clean legacy blob
    putChapterToIDB(payload).then((ok) => {
      if (ok && typeof localStorage !== "undefined") {
        try {
          localStorage.removeItem(`gita_offline_ch_${chNum}`);
        } catch (e) {}
      }
    });

    return true;
  } catch (err) {
    console.warn(`Could not save Chapter ${chapterNumber} offline:`, err);
    return false;
  }
}

/**
 * Save a single chapter offline and await IndexedDB commit
 */
export async function saveChapterOfflineAsync(chapterNumber, shlokas, chapterName = "") {
  try {
    const payload = buildOfflineChapterPayload(chapterNumber, shlokas, chapterName);
    if (!payload) return false;

    const chNum = payload.chapterNumber;
    chapterMemoryCache.set(chNum, payload);
    updateOfflineCatalog(chNum, payload.count);

    const ok = await putChapterToIDB(payload);
    if (ok && typeof localStorage !== "undefined") {
      try {
        localStorage.removeItem(`gita_offline_ch_${chNum}`);
      } catch (e) {}
    }
    return true;
  } catch (err) {
    console.warn(`Could not save Chapter ${chapterNumber} offline:`, err);
    return false;
  }
}

/**
 * Get a cached chapter synchronously (Memory cache or legacy localStorage)
 */
export function getChapterOffline(chapterNumber) {
  if (!chapterNumber) return null;
  const chNum = Number(chapterNumber);

  const mem = chapterMemoryCache.get(chNum);
  if (isValidOfflinePayload(mem)) {
    return mem;
  }

  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(`gita_offline_ch_${chNum}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.shlokas) && parsed.shlokas.length > 0) {
          if (!hasStrippedShlokas(parsed.shlokas)) {
            chapterMemoryCache.set(chNum, parsed);
          }
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn(`Error reading offline Chapter ${chNum}:`, err);
  }
  return null;
}

/**
 * Get a cached chapter asynchronously (Memory -> legacy localStorage -> IndexedDB)
 */
export async function getChapterOfflineAsync(chapterNumber) {
  if (!chapterNumber) return null;
  const chNum = Number(chapterNumber);

  const syncData = getChapterOffline(chNum);
  if (isValidOfflinePayload(syncData)) {
    return syncData;
  }

  await hydrateOfflineStoreFromIDB();
  const afterHydrate = chapterMemoryCache.get(chNum);
  if (isValidOfflinePayload(afterHydrate)) {
    return afterHydrate;
  }

  const fromIdb = await getChapterFromIDB(chNum);
  if (isValidOfflinePayload(fromIdb)) {
    chapterMemoryCache.set(chNum, fromIdb);
    return fromIdb;
  }
  return null;
}

/**
 * Check if a chapter is available offline with full content (sync check)
 */
export function isChapterOfflineAvailable(chapterNumber) {
  const data = getChapterOffline(chapterNumber);
  if (!data || !Array.isArray(data.shlokas) || data.shlokas.length === 0) return false;
  return !hasStrippedShlokas(data.shlokas);
}

/**
 * Clear all offline chapters & download marker (called strictly on explicit user logout)
 */
export function clearAllOfflineChapters() {
  try {
    downloadedFlagMemory = false;
    hydrationPromise = null;
    chapterMemoryCache.clear();
    if (typeof localStorage !== "undefined") {
      for (let ch = 1; ch <= 18; ch++) {
        localStorage.removeItem(`gita_offline_ch_${ch}`);
      }
      localStorage.removeItem(CATALOG_KEY);
      localStorage.removeItem(DOWNLOADED_FLAG_KEY);
    }
    clearIDBOfflineStores();
  } catch (e) {}
}

/**
 * Get offline status summary synchronously
 */
export function getOfflineStatusSummary() {
  try {
    const isDownloadedFlag = isOfflineDownloadedSync();

    let catalog = {};
    try {
      const rawCat = typeof localStorage !== "undefined" ? localStorage.getItem(CATALOG_KEY) : null;
      if (rawCat) catalog = JSON.parse(rawCat) || {};
    } catch (e) {}

    const cachedChapters = [];
    let totalShlokas = 0;

    for (let ch = 1; ch <= 18; ch++) {
      const memOrLocal = getChapterOffline(ch);
      if (memOrLocal && isValidOfflinePayload(memOrLocal)) {
        cachedChapters.push(ch);
        totalShlokas += memOrLocal.shlokas.length;
      } else if (catalog[ch]?.count > 0) {
        cachedChapters.push(ch);
        totalShlokas += Number(catalog[ch].count) || 0;
      }
    }

    const isFullyCached = isDownloadedFlag || cachedChapters.length >= 18;

    if (cachedChapters.length >= 18) {
      downloadedFlagMemory = true;
      safeLocalStorageSet(DOWNLOADED_FLAG_KEY, "true");
    }

    return {
      cachedChapters,
      cachedCount: cachedChapters.length,
      isFullyCached,
      isDownloaded: isDownloadedFlag,
      totalShlokas,
    };
  } catch (e) {
    const isDownloadedFlag = isOfflineDownloadedSync();
    return {
      cachedChapters: [],
      cachedCount: 0,
      isFullyCached: Boolean(isDownloadedFlag),
      isDownloaded: Boolean(isDownloadedFlag),
      totalShlokas: 0,
    };
  }
}

/**
 * Authoritative async offline status summary (hydrates from IndexedDB first)
 */
export async function getOfflineStatusSummaryAsync() {
  await hydrateOfflineStoreFromIDB();
  const summary = getOfflineStatusSummary();
  if (summary.isDownloaded || summary.cachedCount >= 18) {
    await markOfflineDownloadComplete();
    return {
      ...summary,
      isFullyCached: true,
      isDownloaded: true,
    };
  }
  return summary;
}

/**
 * Download and cache all available chapters with progress callbacks.
 * Uses single bulk fetch /api/shloks (fast 1-request load) with per-chapter & fallback safety,
 * stores everything safely in IndexedDB (never overflowing localStorage quota),
 * and permanently persists the downloaded flag in BOTH localStorage and IndexedDB.
 * REQUIRES USER LOGIN (valid auth token)
 */
export async function downloadAllChaptersOffline(onProgress = null) {
  if (typeof window === "undefined" || !navigator.onLine) {
    return {
      success: false,
      error: "No internet connection. Please connect to internet to download.",
    };
  }

  const token = getValidToken();
  if (!token) {
    return {
      success: false,
      requireLogin: true,
      error: "ઑફલાઇન ડાઉનલોડ કરવા માટે Login કરવું જરૂરી છે.",
    };
  }

  // Ensure any pre-existing legacy localStorage chapter blobs are moved out before downloading
  await hydrateOfflineStoreFromIDB();

  const headers = { Authorization: `Bearer ${token}` };
  const results = [];
  let totalSavedShlokas = 0;

  // Step 1: Fast bulk fetch of all shlokas in one request
  const bulkMap = new Map();
  let bulkSuccess = false;
  let bulkUnauthorized = false;

  try {
    const bulkController = new AbortController();
    const bulkTimer = setTimeout(() => bulkController.abort(), 12000);
    const bulkRes = await fetch(API_BASE, {
      headers,
      signal: bulkController.signal,
    });
    clearTimeout(bulkTimer);

    if (bulkRes.ok) {
      const bulkData = await bulkRes.json();
      const allShlokas = Array.isArray(bulkData.shlokas) ? bulkData.shlokas : [];
      if (allShlokas.length > 0) {
        if (hasStrippedShlokas(allShlokas)) {
          // Token expired or invalid on server despite local check
          bulkUnauthorized = true;
        } else {
          for (const s of allShlokas) {
            const ch = Number(s?.chapterNumber);
            if (ch >= 1 && ch <= 18) {
              if (!bulkMap.has(ch)) bulkMap.set(ch, []);
              bulkMap.get(ch).push(s);
            }
          }
          bulkSuccess = bulkMap.size > 0;
        }
      }
    } else if (bulkRes.status === 401) {
      bulkUnauthorized = true;
    }
  } catch (err) {
    console.warn("Bulk chapter download fallback to per-chapter:", err.message);
  }

  if (bulkUnauthorized) {
    return {
      success: false,
      requireLogin: true,
      error: "તમારું સત્ર સમાપ્ત થઈ ગયું છે. કૃપા કરીને ફરી Login કરો.",
    };
  }

  // Lazy load bundled fallback only if needed
  let fallbackMapCache = null;
  const getFallbackForChapter = async (ch) => {
    try {
      if (!fallbackMapCache) {
        const fallbackMod = await import("../data/fallbackShlokas.json");
        fallbackMapCache = fallbackMod.default || fallbackMod;
      }
      const list = fallbackMapCache?.[String(ch)];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  };

  // Step 2: Process chapters 1..18 cleanly, awaiting IndexedDB persistence
  for (let ch = 1; ch <= 18; ch++) {
    let shlokasToSave = bulkSuccess ? bulkMap.get(ch) || [] : [];

    if (!bulkSuccess) {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${API_BASE}/chapter/${ch}`, {
          headers,
          signal: controller.signal,
        });
        clearTimeout(t);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data.shlokas) ? data.shlokas : [];
          if (list.length > 0 && !hasStrippedShlokas(list)) {
            shlokasToSave = list;
          }
        }
      } catch (err) {
        console.warn(`Failed to pre-cache Chapter ${ch} online:`, err.message);
      }
    }

    if (shlokasToSave.length === 0) {
      const fb = await getFallbackForChapter(ch);
      if (fb.length > 0 && !hasStrippedShlokas(fb)) {
        shlokasToSave = fb;
      }
    }

    if (shlokasToSave.length > 0 && !hasStrippedShlokas(shlokasToSave)) {
      shlokasToSave.sort((a, b) => Number(a.shlokNumber) - Number(b.shlokNumber));
      const chapterName = shlokasToSave[0]?.chapterName || `અધ્યાય ${ch}`;
      const saved = await saveChapterOfflineAsync(ch, shlokasToSave, chapterName);
      if (saved) {
        totalSavedShlokas += shlokasToSave.length;
        results.push(ch);
      }
    }

    if (typeof onProgress === "function") {
      onProgress({
        current: ch,
        total: 18,
        percent: Math.round((ch / 18) * 100),
      });
    }

    await new Promise((r) => setTimeout(r, bulkSuccess ? 15 : 40));
  }

  if (results.length > 0) {
    let uid = null;
    try {
      const rawUser = localStorage.getItem("user");
      if (rawUser) {
        const u = JSON.parse(rawUser);
        uid = u?._id || u?.id || u?.email || null;
      }
    } catch (e) {}

    await markOfflineDownloadComplete(uid);

    // Automatically start fast background audio sync for downloaded chapters (in App only)
    if (isRunningInStandaloneApp()) {
      try {
        const lang =
          (typeof localStorage !== "undefined" && localStorage.getItem("gita_language")) || "gu";
        const entries = [];
        for (const ch of results) {
          const chData = getChapterOffline(ch);
          if (chData && Array.isArray(chData.shlokas) && chData.shlokas.length > 0) {
            entries.push({ chapterNumber: ch, shlokas: chData.shlokas });
          }
        }
        if (entries.length > 0) {
          setTimeout(() => {
            autoSyncMultipleChaptersAudios(entries, lang);
          }, 300);
        }
      } catch (e) {}
    }
  }

  return {
    success: results.length > 0,
    downloadedChapters: results,
    totalShlokas: totalSavedShlokas,
  };
}

/**
 * Quietly pre-cache missing chapters in background when online and idle.
 * Also silently refreshes chapters > 6h old to pull new shlokas added by Admin.
 * ONLY runs for logged-in users.
 */
let isAutoSyncing = false;
export async function autoSyncOfflineChaptersQuietly() {
  if (isAutoSyncing) return;
  if (typeof window === "undefined" || !navigator.onLine) return;

  const token = getValidToken();
  if (!token) return; // Do not auto-cache full content for guests

  isAutoSyncing = true;
  try {
    await hydrateOfflineStoreFromIDB();
    const headers = { Authorization: `Bearer ${token}` };

    for (let ch = 1; ch <= 18; ch++) {
      const cached = await getChapterOfflineAsync(ch);
      const isMissing = !cached || hasStrippedShlokas(cached.shlokas);
      const isStale = Boolean(cached?.savedAt && Date.now() - cached.savedAt > 6 * 60 * 60 * 1000);

      if (isMissing || isStale) {
        try {
          const res = await fetch(`${API_BASE}/chapter/${ch}`, { headers });
          if (res.ok) {
            const data = await res.json();
            const shlokas = data.shlokas || [];
            if (shlokas.length > 0 && !hasStrippedShlokas(shlokas)) {
              shlokas.sort((a, b) => Number(a.shlokNumber) - Number(b.shlokNumber));
              const chapterName = shlokas[0]?.chapterName || `અધ્યાય ${ch}`;
              if (!cached || shlokas.length >= (cached.shlokas?.length || 0)) {
                await saveChapterOfflineAsync(ch, shlokas, chapterName);
              }
            }
          }
        } catch (e) {
          // ignore background errors
        }
        await new Promise((r) => setTimeout(r, 150));
      }
    }
  } finally {
    isAutoSyncing = false;
  }
}
