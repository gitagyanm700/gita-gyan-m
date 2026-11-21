/**
 * Story Draft Storage - Client-Side IndexedDB Persistence
 * Bhagavad Gita - Gita Gyan M
 *
 * Guarantees zero data loss on page refresh:
 * 1. Automatically saves story title, language, aspect ratio, voice, scene texts, and images.
 * 2. Uses IndexedDB so high-res images (Blobs) can be safely stored without 5MB quota errors.
 * 3. Zero server space used: all data stays safely in the user's browser storage.
 */

const DB_NAME = "GitaStoryStudioDB";
const DB_VERSION = 1;
const STORE_NAME = "drafts";
const DRAFT_KEY = "active_story_draft";

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      console.warn("IndexedDB open error:", req.error);
      resolve(null);
    };
  });
}

/**
 * Save draft to browser IndexedDB
 */
export async function saveStoryDraft({
  title,
  lang,
  aspectRatio,
  subtitlePos,
  voice,
  scenes,
}) {
  try {
    const db = await openDB();
    if (!db) return false;

    // Convert scenes into serializable format with Blobs
    const serializableScenes = await Promise.all(
      (scenes || []).map(async (s) => {
        let blob = s.imageBlob || null;
        if (!blob && s.imageSrc && s.imageSrc.startsWith("blob:")) {
          try {
            const res = await fetch(s.imageSrc);
            blob = await res.blob();
          } catch (e) {
            // ignore
          }
        }
        return {
          id: s.id,
          sceneTitle: s.sceneTitle,
          text: s.text || "",
          imageBlob: blob,
        };
      })
    );

    const draftData = {
      title,
      lang,
      aspectRatio,
      subtitlePos,
      voice,
      scenes: serializableScenes,
      savedAt: Date.now(),
    };

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(draftData, DRAFT_KEY);

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn("Could not save story draft to IndexedDB:", err);
    return false;
  }
}

/**
 * Load draft from browser IndexedDB
 */
export async function loadStoryDraft() {
  try {
    const db = await openDB();
    if (!db) return null;

    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(DRAFT_KEY);

    return new Promise((resolve) => {
      req.onsuccess = () => {
        const data = req.result;
        if (!data || !Array.isArray(data.scenes)) {
          resolve(null);
          return;
        }

        // Reconstruct image URLs from persisted Blobs
        const restoredScenes = data.scenes.map((s, idx) => {
          let imageSrc = null;
          if (s.imageBlob instanceof Blob) {
            imageSrc = URL.createObjectURL(s.imageBlob);
          }
          return {
            id: s.id || `sc_${Date.now()}_${idx}`,
            sceneTitle: s.sceneTitle || `સીન ${idx + 1}`,
            text: s.text || "",
            imageBlob: s.imageBlob || null,
            imageSrc,
            audioBuffer: null,
            audioDuration: 0,
          };
        });

        resolve({
          title: data.title || "શ્રીકૃષ્ણ બોધ વાર્તા",
          lang: data.lang || "gu",
          aspectRatio: data.aspectRatio || "9:16",
          subtitlePos: data.subtitlePos || "auto",
          voice: data.voice || "male",
          scenes: restoredScenes,
        });
      };

      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn("Could not load story draft from IndexedDB:", err);
    return null;
  }
}

/**
 * Clear draft from browser IndexedDB
 */
export async function clearStoryDraft() {
  try {
    const db = await openDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(DRAFT_KEY);
  } catch (err) {
    console.warn("Could not clear story draft:", err);
  }
}
