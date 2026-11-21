/**
 * Story Draft & Project Library Storage - Client-Side IndexedDB Persistence
 * Bhagavad Gita - Gita Gyan M
 *
 * Features:
 * 1. Automatic active draft recovery on page reload (zero data loss).
 * 2. Multi-project library: Save old project on "New Project", load/edit, or delete.
 * 3. 100% Client-side in local browser IndexedDB: ZERO BYTES on server or database!
 */

const DB_NAME = "GitaStoryStudioDB";
const DB_VERSION = 2;
const STORE_DRAFTS = "drafts";
const STORE_PROJECTS = "projects";
const DRAFT_KEY = "active_story_draft";

function openDB() {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS);
      }
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: "id" });
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
 * Helper: Convert scenes to serializable format with Blobs
 */
async function serializeScenes(scenes) {
  return Promise.all(
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
}

/**
 * Helper: Reconstruct scenes from persisted Blobs
 */
function deserializeScenes(scenes) {
  return (scenes || []).map((s, idx) => {
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
}

/**
 * Save active draft to browser IndexedDB
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

    const serializableScenes = await serializeScenes(scenes);

    const draftData = {
      title,
      lang,
      aspectRatio,
      subtitlePos,
      voice,
      scenes: serializableScenes,
      savedAt: Date.now(),
    };

    const tx = db.transaction(STORE_DRAFTS, "readwrite");
    const store = tx.objectStore(STORE_DRAFTS);
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
 * Load active draft from browser IndexedDB
 */
export async function loadStoryDraft() {
  try {
    const db = await openDB();
    if (!db) return null;

    const tx = db.transaction(STORE_DRAFTS, "readonly");
    const store = tx.objectStore(STORE_DRAFTS);
    const req = store.get(DRAFT_KEY);

    return new Promise((resolve) => {
      req.onsuccess = () => {
        const data = req.result;
        if (!data || !Array.isArray(data.scenes)) {
          resolve(null);
          return;
        }

        resolve({
          title: data.title || "",
          lang: data.lang || "gu",
          aspectRatio: data.aspectRatio || "9:16",
          subtitlePos: data.subtitlePos || "auto",
          voice: data.voice || "male",
          scenes: deserializeScenes(data.scenes),
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
    const tx = db.transaction(STORE_DRAFTS, "readwrite");
    const store = tx.objectStore(STORE_DRAFTS);
    store.delete(DRAFT_KEY);
  } catch (err) {
    console.warn("Could not clear story draft:", err);
  }
}

// =========================================================================
// PROJECT LIBRARY: Client-Side Multi-Project Management (0 Server Storage)
// =========================================================================

/**
 * Save a complete Story Project to local IndexedDB
 */
export async function saveStoryProject({
  id,
  title,
  lang,
  aspectRatio,
  subtitlePos,
  voice,
  scenes,
}) {
  try {
    const db = await openDB();
    if (!db) return null;

    const projectId = id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const serializableScenes = await serializeScenes(scenes);

    // Find first scene with a blob for thumbnail
    const firstImgScene = serializableScenes.find((s) => s.imageBlob instanceof Blob);
    const thumbnailBlob = firstImgScene ? firstImgScene.imageBlob : null;

    const projectData = {
      id: projectId,
      title: (title || "").trim() || "અનામી વાર્તા પ્રોજેક્ટ",
      lang: lang || "gu",
      aspectRatio: aspectRatio || "9:16",
      subtitlePos: subtitlePos || "auto",
      voice: voice || "male",
      scenes: serializableScenes,
      sceneCount: serializableScenes.length,
      thumbnailBlob,
      updatedAt: Date.now(),
    };

    const tx = db.transaction(STORE_PROJECTS, "readwrite");
    const store = tx.objectStore(STORE_PROJECTS);
    store.put(projectData);

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(projectId);
      tx.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn("Failed to save project to IndexedDB:", err);
    return null;
  }
}

/**
 * List all saved Story Projects (Metadata + Thumbnails)
 */
export async function listStoryProjects() {
  try {
    const db = await openDB();
    if (!db) return [];

    const tx = db.transaction(STORE_PROJECTS, "readonly");
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.getAll();

    return new Promise((resolve) => {
      req.onsuccess = () => {
        const rawList = req.result || [];
        // Map to lightweight cards with object URLs for thumbnails
        const projects = rawList
          .map((p) => {
            let thumbUrl = null;
            if (p.thumbnailBlob instanceof Blob) {
              thumbUrl = URL.createObjectURL(p.thumbnailBlob);
            }
            return {
              id: p.id,
              title: p.title,
              lang: p.lang,
              aspectRatio: p.aspectRatio,
              voice: p.voice,
              sceneCount: p.sceneCount || (p.scenes?.length || 0),
              updatedAt: p.updatedAt,
              thumbUrl,
            };
          })
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

        resolve(projects);
      };
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn("Failed to list projects from IndexedDB:", err);
    return [];
  }
}

/**
 * Get a specific Story Project by ID and reconstruct scene URLs
 */
export async function getStoryProject(projectId) {
  try {
    const db = await openDB();
    if (!db || !projectId) return null;

    const tx = db.transaction(STORE_PROJECTS, "readonly");
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.get(projectId);

    return new Promise((resolve) => {
      req.onsuccess = () => {
        const p = req.result;
        if (!p) {
          resolve(null);
          return;
        }

        resolve({
          id: p.id,
          title: p.title,
          lang: p.lang,
          aspectRatio: p.aspectRatio,
          subtitlePos: p.subtitlePos,
          voice: p.voice,
          scenes: deserializeScenes(p.scenes),
          updatedAt: p.updatedAt,
        });
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn("Failed to get project from IndexedDB:", err);
    return null;
  }
}

/**
 * Delete a Story Project from local IndexedDB
 */
export async function deleteStoryProject(projectId) {
  try {
    const db = await openDB();
    if (!db || !projectId) return false;

    const tx = db.transaction(STORE_PROJECTS, "readwrite");
    const store = tx.objectStore(STORE_PROJECTS);
    store.delete(projectId);

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn("Failed to delete project from IndexedDB:", err);
    return false;
  }
}
