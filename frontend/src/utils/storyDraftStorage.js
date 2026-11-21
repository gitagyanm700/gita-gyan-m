/**
 * Story Draft & Shared Admin Projects Library
 * Bhagavad Gita - Gita Gyan M
 *
 * Capabilities:
 * 1. Global Admin Sync: All saved story projects are shared across ALL admin dashboards & devices (Mobile & Desktop).
 * 2. Zero Server Disk Storage: Local images are uploaded to Cloudinary CDN so they take 0 bytes of server disk.
 * 3. Client-Side Offline Cache (IndexedDB): Ensures instant recovery, offline capability, and zero latency.
 */

import { getValidToken } from "./authHelper.js";

const DB_NAME = "GitaStoryStudioDB";
const DB_VERSION = 2;
const STORE_DRAFTS = "drafts";
const STORE_PROJECTS = "projects";
const DRAFT_KEY = "active_story_draft";

const isLocalHost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const BACKEND_ENDPOINTS = isLocalHost
  ? ["http://localhost:5000", "https://bhagavad-gita-backend-jy1a.onrender.com"]
  : ["https://bhagavad-gita-backend-jy1a.onrender.com", "http://localhost:5000"];

/**
 * Universal backend API fetch with automatic dual-endpoint fallback & auth
 */
async function apiRequest(path, options = {}) {
  const token = getValidToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  for (const base of BACKEND_ENDPOINTS) {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 12000);

      const res = await fetch(`${base}${path}`, {
        ...options,
        headers,
        signal: ctrl.signal,
      });

      clearTimeout(tid);

      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (err) {
      console.warn(`API request failed on ${base}${path}:`, err.message);
    }
  }

  return null;
}

/**
 * Helper: Convert Blob / File to base64 DataURL
 */
function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    if (!blob || !(blob instanceof Blob)) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

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
        imageSrc: s.imageSrc && !s.imageSrc.startsWith("blob:") ? s.imageSrc : null,
      };
    })
  );
}

/**
 * Helper: Reconstruct scenes from persisted Blobs or Cloudinary URLs
 */
function deserializeScenes(scenes) {
  return (scenes || []).map((s, idx) => {
    let imageSrc = s.imageSrc || null;
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
      audioDuration: s.audioDuration || 0,
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
// SHARED ADMIN PROJECT LIBRARY (Database + Cloudinary + Local Fallback)
// =========================================================================

/**
 * Save a Story Project (Synchronized across all Admin accounts & devices)
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
    // 1. Prepare scenes with Cloudinary or base64 dataUrls
    const processedScenes = await Promise.all(
      (scenes || []).map(async (s) => {
        let imgSrc = s.imageSrc || null;

        if (s.imageBlob instanceof Blob) {
          const dataUrl = await blobToDataUrl(s.imageBlob);
          if (dataUrl) imgSrc = dataUrl;
        } else if (imgSrc && imgSrc.startsWith("blob:")) {
          try {
            const res = await fetch(imgSrc);
            const b = await res.blob();
            const dataUrl = await blobToDataUrl(b);
            if (dataUrl) imgSrc = dataUrl;
          } catch (e) {
            // ignore
          }
        }

        return {
          id: s.id,
          sceneTitle: s.sceneTitle || "",
          text: s.text || "",
          imageSrc: imgSrc,
          audioDuration: s.audioDuration || 0,
        };
      })
    );

    // 2. Post to backend API so all admin accounts get this project
    const apiRes = await apiRequest("/api/story-projects", {
      method: "POST",
      body: JSON.stringify({
        id: id && id.length === 24 ? id : undefined,
        title: (title || "").trim() || "અનામી વાર્તા પ્રોજેક્ટ",
        lang: lang || "gu",
        aspectRatio: aspectRatio || "9:16",
        subtitlePos: subtitlePos || "auto",
        voice: voice || "male",
        scenes: processedScenes,
      }),
    });

    const savedId = apiRes?.project?.id || id || `proj_${Date.now()}`;

    // 3. Also update local IndexedDB cache
    const db = await openDB();
    if (db) {
      const serializable = await serializeScenes(scenes);
      const firstImgScene = serializable.find((s) => s.imageBlob instanceof Blob);
      const thumbnailBlob = firstImgScene ? firstImgScene.imageBlob : null;

      const projectData = {
        id: savedId,
        title: (title || "").trim() || "અનામી વાર્તા પ્રોજેક્ટ",
        lang: lang || "gu",
        aspectRatio: aspectRatio || "9:16",
        subtitlePos: subtitlePos || "auto",
        voice: voice || "male",
        scenes: serializable,
        sceneCount: serializable.length,
        thumbnailBlob,
        updatedAt: Date.now(),
      };

      const tx = db.transaction(STORE_PROJECTS, "readwrite");
      tx.objectStore(STORE_PROJECTS).put(projectData);
    }

    return savedId;
  } catch (err) {
    console.warn("Failed to save project:", err);
    return id || null;
  }
}

/**
 * List all saved Story Projects (From database across all Admins with local cache fallback)
 */
export async function listStoryProjects() {
  try {
    // 1. Try fetching from Backend API (All admin accounts shared)
    const apiRes = await apiRequest("/api/story-projects", { method: "GET" });
    if (apiRes && apiRes.success && Array.isArray(apiRes.projects)) {
      return apiRes.projects;
    }

    // 2. Fallback to local IndexedDB if offline or API unreachable
    const db = await openDB();
    if (!db) return [];

    const tx = db.transaction(STORE_PROJECTS, "readonly");
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.getAll();

    return new Promise((resolve) => {
      req.onsuccess = () => {
        const rawList = req.result || [];
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
    console.warn("Failed to list projects:", err);
    return [];
  }
}

/**
 * Get a specific Story Project by ID
 */
export async function getStoryProject(projectId) {
  try {
    // 1. Try fetching from Backend API
    const apiRes = await apiRequest(`/api/story-projects/${projectId}`, { method: "GET" });
    if (apiRes && apiRes.success && apiRes.project) {
      const p = apiRes.project;
      return {
        id: p.id || p._id,
        title: p.title,
        lang: p.lang,
        aspectRatio: p.aspectRatio,
        subtitlePos: p.subtitlePos,
        voice: p.voice,
        scenes: (p.scenes || []).map((s, idx) => ({
          id: s.id || `sc_${Date.now()}_${idx}`,
          sceneTitle: s.sceneTitle || `સીન ${idx + 1}`,
          text: s.text || "",
          imageSrc: s.imageSrc || null,
          imageBlob: null,
          audioBuffer: null,
          audioDuration: s.audioDuration || 0,
        })),
        updatedAt: p.updatedAt,
      };
    }

    // 2. Fallback to local IndexedDB
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
    console.warn("Failed to get project:", err);
    return null;
  }
}

/**
 * Delete a Story Project (From database & local cache)
 */
export async function deleteStoryProject(projectId) {
  try {
    // 1. Delete on backend API
    await apiRequest(`/api/story-projects/${projectId}`, { method: "DELETE" });

    // 2. Delete in local IndexedDB
    const db = await openDB();
    if (db && projectId) {
      const tx = db.transaction(STORE_PROJECTS, "readwrite");
      tx.objectStore(STORE_PROJECTS).delete(projectId);
    }

    return true;
  } catch (err) {
    console.warn("Failed to delete project:", err);
    return false;
  }
}
