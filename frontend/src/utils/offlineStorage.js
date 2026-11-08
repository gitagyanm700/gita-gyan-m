// =========================================================
// BHAGAVAD GITA - OFFLINE STORAGE & PRE-CACHE ENGINE
// Enables 100% offline reading and device-speech playback
// Full offline access requires user login
// =========================================================

import { getValidToken } from "./authHelper.js";
import { autoSyncChapterAudios } from "./audioCache.js";
import { isRunningInStandaloneApp } from "./pwaManager.js";

const API_BASE = "https://bhagavad-gita-backend-jy1a.onrender.com/api/shloks";

/**
 * Minify a shloka to essential fields to prevent localStorage QuotaExceededError
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

/**
 * Save a single chapter and its shlokas to offline storage
 * NOTE: Only full chapters (shlokas with sanskrit) are saved.
 * Stripped shlokas from logged-out users are NOT saved offline.
 */
export function saveChapterOffline(chapterNumber, shlokas, chapterName = "") {
  if (!chapterNumber || !Array.isArray(shlokas) || shlokas.length === 0) return false;
  try {
    const key = `gita_offline_ch_${chapterNumber}`;

    // Never save stripped shlokas (from guest users) to offline storage
    const isStripped = shlokas.some((s) => Number(s.shlokNumber) > 5 && !s.sanskrit);
    if (isStripped) {
      return false;
    }

    // Prevent overwriting full content with empty content
    const rawExisting = localStorage.getItem(key);
    if (rawExisting) {
      try {
        const parsedExisting = JSON.parse(rawExisting);
        const hasFullExisting =
          parsedExisting &&
          Array.isArray(parsedExisting.shlokas) &&
          parsedExisting.shlokas.some((s) => Number(s.shlokNumber) > 5 && Boolean(s.sanskrit));
        if (hasFullExisting && isStripped) {
          return false;
        }
      } catch (e) {}
    }

    const cleanShlokas = shlokas.map(minifyShlokaForOffline).filter(Boolean);
    const payload = {
      chapterNumber: Number(chapterNumber),
      chapterName: chapterName || `અધ્યાય ${chapterNumber}`,
      shlokas: cleanShlokas.length > 0 ? cleanShlokas : shlokas,
      count: cleanShlokas.length || shlokas.length,
      savedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(payload));

    // Update index catalog
    updateOfflineCatalog(Number(chapterNumber), cleanShlokas.length || shlokas.length);
    return true;
  } catch (err) {
    console.warn(`Could not save Chapter ${chapterNumber} offline:`, err);
    return false;
  }
}

/**
 * Get a cached chapter from offline storage
 */
export function getChapterOffline(chapterNumber) {
  if (!chapterNumber) return null;
  try {
    const key = `gita_offline_ch_${chapterNumber}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.shlokas) && parsed.shlokas.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn(`Error reading offline Chapter ${chapterNumber}:`, err);
  }
  return null;
}

/**
 * Check if a chapter is available offline with full content
 */
export function isChapterOfflineAvailable(chapterNumber) {
  const data = getChapterOffline(chapterNumber);
  if (!data || !Array.isArray(data.shlokas) || data.shlokas.length === 0) return false;
  // If the chapter has shlokas after shloka 5, ensure at least one shloka > 5 has sanskrit!
  const hasShlokasAbove5 = data.shlokas.some((s) => Number(s.shlokNumber) > 5);
  if (hasShlokasAbove5) {
    const hasFullAbove5 = data.shlokas.some(
      (s) => Number(s.shlokNumber) > 5 && Boolean(s.sanskrit)
    );
    if (!hasFullAbove5) {
      return false;
    }
  }
  return true;
}

/**
 * Update offline catalog registry
 */
function updateOfflineCatalog(chapterNumber, count) {
  try {
    const raw = localStorage.getItem("gita_offline_catalog");
    const catalog = raw ? JSON.parse(raw) : {};
    catalog[chapterNumber] = {
      chapterNumber,
      count,
      savedAt: Date.now(),
    };
    localStorage.setItem("gita_offline_catalog", JSON.stringify(catalog));
  } catch (e) {}
}

/**
 * Clear all offline chapters (called on logout)
 */
export function clearAllOfflineChapters() {
  try {
    for (let ch = 1; ch <= 18; ch++) {
      localStorage.removeItem(`gita_offline_ch_${ch}`);
    }
    localStorage.removeItem("gita_offline_catalog");
    localStorage.removeItem("gita_18_chapters_downloaded");
  } catch (e) {}
}

/**
 * Get offline status summary
 */
export function getOfflineStatusSummary() {
  try {
    const isDownloadedFlag =
      typeof localStorage !== "undefined" &&
      localStorage.getItem("gita_18_chapters_downloaded") === "true";

    const cachedChapters = [];
    let totalShlokas = 0;
    for (let ch = 1; ch <= 18; ch++) {
      if (isChapterOfflineAvailable(ch)) {
        cachedChapters.push(ch);
        const data = getChapterOffline(ch);
        totalShlokas += data?.shlokas?.length || 0;
      }
    }

    const isFullyCached = isDownloadedFlag || cachedChapters.length >= 18;

    // If all 18 chapters are detected, persist the flag
    if (cachedChapters.length >= 18 && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("gita_18_chapters_downloaded", "true");
      } catch (e) {}
    }

    return {
      cachedChapters,
      cachedCount: cachedChapters.length,
      isFullyCached,
      totalShlokas,
    };
  } catch (e) {
    const isDownloadedFlag =
      typeof localStorage !== "undefined" &&
      localStorage.getItem("gita_18_chapters_downloaded") === "true";
    return {
      cachedChapters: [],
      cachedCount: 0,
      isFullyCached: Boolean(isDownloadedFlag),
      totalShlokas: 0,
    };
  }
}

/**
 * Download and cache all 18 chapters with progress callbacks
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

  const headers = { Authorization: `Bearer ${token}` };
  const results = [];
  let totalSavedShlokas = 0;

  for (let ch = 1; ch <= 18; ch++) {
    let savedOnline = false;
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${API_BASE}/chapter/${ch}`, { headers, signal: controller.signal });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        const shlokas = data.shlokas || [];
        if (shlokas.length > 0) {
          shlokas.sort((a, b) => Number(a.shlokNumber) - Number(b.shlokNumber));
          const chapterName = shlokas[0]?.chapterName || `અધ્યાય ${ch}`;
          saveChapterOffline(ch, shlokas, chapterName);
          totalSavedShlokas += shlokas.length;
          results.push(ch);
          savedOnline = true;
        }
      }
    } catch (err) {
      console.warn(`Failed to pre-cache Chapter ${ch} online:`, err.message);
    }

    if (!savedOnline) {
      // Bundled fallback
      try {
        const fallbackMod = await import("../data/fallbackShlokas.json");
        const fallbackMap = fallbackMod.default || fallbackMod;
        const shlokas = fallbackMap[String(ch)];
        if (Array.isArray(shlokas) && shlokas.length > 0) {
          const chapterName = shlokas[0]?.chapterName || `અધ્યાય ${ch}`;
          saveChapterOffline(ch, shlokas, chapterName);
          totalSavedShlokas += shlokas.length;
          results.push(ch);
        }
      } catch (e) {}
    }

    if (typeof onProgress === "function") {
      onProgress({
        current: ch,
        total: 18,
        percent: Math.round((ch / 18) * 100),
      });
    }

    // Small delay to prevent network congestion
    await new Promise((r) => setTimeout(r, 60));
  }

  if (results.length > 0) {
    try {
      localStorage.setItem("gita_18_chapters_downloaded", "true");
    } catch (e) {}
  }

  // After saving shlokas text, automatically start background audio sync for Chapter 1 (in App only)
  if (isRunningInStandaloneApp()) {
    try {
      const ch1 = getChapterOffline(1);
      if (ch1 && Array.isArray(ch1.shlokas)) {
        setTimeout(() => {
          autoSyncChapterAudios(1, ch1.shlokas, "gu");
        }, 600);
      }
    } catch (e) {}
  }

  return {
    success: results.length > 0,
    downloadedChapters: results,
    totalShlokas: totalSavedShlokas,
  };
}

/**
 * Quietly pre-cache missing chapters in background when online and idle
 * Also silently refreshes chapters to pull new shlokas added by Admin!
 * ONLY runs for logged-in users
 */
let isAutoSyncing = false;
export async function autoSyncOfflineChaptersQuietly() {
  if (isAutoSyncing) return;
  if (typeof window === "undefined" || !navigator.onLine) return;

  const token = getValidToken();
  if (!token) return; // Do not auto-cache full content for guests

  isAutoSyncing = true;
  try {
    const headers = { Authorization: `Bearer ${token}` };

    for (let ch = 1; ch <= 18; ch++) {
      const cached = getChapterOffline(ch);
      const isMissing = !isChapterOfflineAvailable(ch);
      // Silently refresh if chapter is missing OR cached > 6 hours ago (to sync newly added shlokas!)
      const isStale = Boolean(cached?.savedAt && Date.now() - cached.savedAt > 6 * 60 * 60 * 1000);

      if (isMissing || isStale) {
        try {
          const res = await fetch(`${API_BASE}/chapter/${ch}`, { headers });
          if (res.ok) {
            const data = await res.json();
            const shlokas = data.shlokas || [];
            if (shlokas.length > 0) {
              shlokas.sort((a, b) => Number(a.shlokNumber) - Number(b.shlokNumber));
              const chapterName = shlokas[0]?.chapterName || `અધ્યાય ${ch}`;
              // Always save if missing, or update if server has equal or more shlokas
              if (!cached || shlokas.length >= (cached.shlokas?.length || 0)) {
                saveChapterOffline(ch, shlokas, chapterName);
              }
            }
          }
        } catch (e) {
          // ignore background errors
        }
        // Polite delay
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  } finally {
    isAutoSyncing = false;
  }
}
