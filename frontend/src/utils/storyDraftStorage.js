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

let isLocalBackendDead = false;

/**
 * Universal backend API fetch with automatic dual-endpoint fallback & auth
 */
async function apiRequest(path, options = {}, timeoutMs = 25000) {
  const token = getValidToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const endpoints = BACKEND_ENDPOINTS.filter(
    (base) => !(isLocalBackendDead && base.includes("localhost:5000"))
  );

  let lastError = null;

  for (const base of endpoints) {
    try {
      const isLocal = base.includes("localhost:5000");
      const effectiveTimeout = isLocal ? Math.min(timeoutMs, 2000) : timeoutMs;
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), effectiveTimeout);

      const res = await fetch(`${base}${path}`, {
        ...options,
        headers,
        signal: ctrl.signal,
      });

      clearTimeout(tid);

      if (res.ok) {
        const data = await res.json();
        return data;
      } else {
        const errData = await res.json().catch(() => null);
        console.warn(`API returned ${res.status} on ${base}${path}:`, errData);
        lastError = errData?.message || `સર્વર ક્ષતિ (${res.status})`;
      }
    } catch (err) {
      if (base.includes("localhost:5000")) {
        isLocalBackendDead = true;
      }
      console.warn(`API request failed on ${base}${path}:`, err.message);
      lastError = err.message || "નેટવર્ક જોડાણ ક્ષતિ";
    }
  }

  return { success: false, error: lastError };
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

/**
 * Helper: Automatically scale and compress scene images before cloud upload
 * Reduces 5MB-10MB raw photos to ~100KB-180KB JPEG (1280px max dimension),
 * preventing network payload timeouts and 413 errors!
 */
async function compressImageForUpload(blobOrUrl) {
  if (!blobOrUrl) return null;

  // Remote Cloudinary or CDN URLs can be sent as is
  if (
    typeof blobOrUrl === "string" &&
    (blobOrUrl.startsWith("http://") || blobOrUrl.startsWith("https://")) &&
    !blobOrUrl.startsWith("data:")
  ) {
    return blobOrUrl;
  }

  return new Promise((resolve) => {
    try {
      let src = "";
      let needRevoke = false;

      if (blobOrUrl instanceof Blob) {
        src = URL.createObjectURL(blobOrUrl);
        needRevoke = true;
      } else if (typeof blobOrUrl === "string") {
        src = blobOrUrl;
      } else {
        return resolve(null);
      }

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          let { width, height } = img;
          const maxDim = 1280;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to compact JPEG dataURL (~100KB-180KB)
          const compressed = canvas.toDataURL("image/jpeg", 0.82);
          if (needRevoke) URL.revokeObjectURL(src);
          resolve(compressed);
        } catch {
          if (needRevoke) URL.revokeObjectURL(src);
          if (blobOrUrl instanceof Blob) {
            blobToDataUrl(blobOrUrl).then(resolve);
          } else {
            resolve(blobOrUrl);
          }
        }
      };

      img.onerror = () => {
        if (needRevoke) URL.revokeObjectURL(src);
        if (blobOrUrl instanceof Blob) {
          blobToDataUrl(blobOrUrl).then(resolve);
        } else {
          resolve(null);
        }
      };

      img.src = src;
    } catch {
      resolve(null);
    }
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
  activeProjectId,
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
      activeProjectId: activeProjectId || null,
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
          activeProjectId: data.activeProjectId || null,
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
    try {
      localStorage.removeItem("story_creator_active_project_id");
    } catch (e) {}
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
 * BLANK PROJECTS ARE STRICTLY DISALLOWED: Requires at least 1 scene with text or image
 */
export async function saveStoryProject({
  id,
  oldLocalId,
  title,
  lang,
  aspectRatio,
  subtitlePos,
  voice,
  scenes,
}) {
  try {
    // Strictly verify project is not blank
    const hasContent = (scenes || []).some(
      (s) =>
        (typeof s.text === "string" && s.text.trim().length > 0) ||
        Boolean(s.imageSrc) ||
        Boolean(s.imageBlob)
    );
    if (!hasContent) {
      console.warn("Blank project save prevented: no text or image provided.");
      return null;
    }

    // 1. Prepare scenes with optimized images for fast cloud sync (scales 5MB+ to ~120KB)
    const processedScenes = await Promise.all(
      (scenes || []).map(async (s) => {
        let imgSrc = s.imageSrc || null;

        if (s.imageBlob instanceof Blob) {
          const compressed = await compressImageForUpload(s.imageBlob);
          if (compressed) imgSrc = compressed;
        } else if (imgSrc) {
          const compressed = await compressImageForUpload(imgSrc);
          if (compressed) imgSrc = compressed;
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

    // 2. Post to backend API so all admin accounts get this project (90s timeout for cloud upload)
    const apiRes = await apiRequest(
      "/api/story-projects",
      {
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
      },
      90000
    );

    const isCloudSuccess = Boolean(apiRes && apiRes.success && apiRes.project);
    const savedId = apiRes?.project?.id || apiRes?.project?._id || id || `proj_${Date.now()}`;

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
      const store = tx.objectStore(STORE_PROJECTS);
      const toDelete = oldLocalId || (id && id !== savedId ? id : null);
      if (toDelete && toDelete !== savedId) {
        try {
          store.delete(toDelete);
        } catch (e) {
          // ignore
        }
      }
      store.put(projectData);
    }

    return {
      success: true,
      id: savedId,
      syncedToCloud: isCloudSuccess,
      message: isCloudSuccess
        ? "તમામ એડમિન અને તમામ ડિવાઇસ (મોબાઇલ & કોમ્પ્યુટર) માટે સફળતાપૂર્વક સાચવવામાં આવ્યો છે!"
        : (apiRes?.error ? `ક્લાઉડ સર્વર: ${apiRes.error}` : "પ્રોજેક્ટ લોકલ બ્રાઉઝરમાં સાચવાયો છે (ક્લાઉડ સર્વર સાથે કનેક્ટ થઈ શક્યું નથી)."),
    };
  } catch (err) {
    console.warn("Failed to save project:", err);
    return { success: false, message: err.message };
  }
}

/**
 * List all saved Story Projects (Merges Backend Database + Local IndexedDB so NO project is ever lost!)
 */
export async function listStoryProjects() {
  try {
    // 1. Fetch remote projects from Backend API (25s timeout for cold start)
    let remoteProjects = [];
    try {
      const apiRes = await apiRequest("/api/story-projects", { method: "GET" }, 25000);
      if (apiRes && apiRes.success && Array.isArray(apiRes.projects)) {
        remoteProjects = apiRes.projects;
      }
    } catch (apiErr) {
      console.warn("Failed fetching remote story projects:", apiErr);
    }

    // 2. Fetch local projects from IndexedDB
    let localProjects = [];
    const db = await openDB();
    if (db) {
      localProjects = await new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_PROJECTS, "readonly");
          const store = tx.objectStore(STORE_PROJECTS);
          const req = store.getAll();
          req.onsuccess = () => {
            const rawList = req.result || [];
            const mapped = rawList
              .filter((p) => {
                // Exclude any accidental completely blank projects
                const hasAny = (p.scenes || []).some(
                  (s) =>
                    (typeof s.text === "string" && s.text.trim().length > 0) ||
                    Boolean(s.imageSrc) ||
                    Boolean(s.imageBlob)
                );
                return hasAny || (p.title && p.title.trim() && p.title !== "અનામી વાર્તા પ્રોજેક્ટ");
              })
              .map((p) => {
                let thumbUrl = null;
                if (p.thumbnailBlob instanceof Blob) {
                  thumbUrl = URL.createObjectURL(p.thumbnailBlob);
                } else if (p.scenes && p.scenes.length > 0) {
                  const firstWithImg = p.scenes.find((s) => s.imageSrc);
                  if (firstWithImg) thumbUrl = firstWithImg.imageSrc;
                }
                return {
                  id: p.id,
                  title: p.title || "અનામી વાર્તા પ્રોજેક્ટ",
                  lang: p.lang || "gu",
                  aspectRatio: p.aspectRatio || "9:16",
                  voice: p.voice || "male",
                  sceneCount: p.sceneCount || (p.scenes?.length || 0),
                  updatedAt: p.updatedAt,
                  thumbUrl,
                  isLocalOnly: true,
                  scenes: p.scenes,
                };
              });
            resolve(mapped);
          };
          req.onerror = () => resolve([]);
        } catch (e) {
          resolve([]);
        }
      });
    }

    // 3. Merge remote and local lists without duplicates (Collapse duplicates with same title)
    const map = new Map();

    remoteProjects.forEach((p) => {
      const normTitle = (p.title || "").trim();
      const key =
        normTitle && normTitle !== "અનામી વાર્તા પ્રોજેક્ટ"
          ? `title_${normTitle}`
          : `id_${p.id}`;

      if (!map.has(key)) {
        map.set(key, p);
      } else {
        const existing = map.get(key);
        if (new Date(p.updatedAt || 0) > new Date(existing.updatedAt || 0)) {
          map.set(key, p);
        }
      }
    });

    localProjects.forEach((p) => {
      const normTitle = (p.title || "").trim();
      const key =
        normTitle && normTitle !== "અનામી વાર્તા પ્રોજેક્ટ"
          ? `title_${normTitle}`
          : `id_${p.id}`;

      if (!map.has(key)) {
        map.set(key, p);
      }
    });

    const combined = Array.from(map.values()).sort(
      (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
    );

    return combined;
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
    const isCloudId = typeof projectId === "string" && /^[0-9a-fA-F]{24}$/.test(projectId);

    // 1. Try fetching from Backend API ONLY if it is a 24-char cloud ObjectId
    if (isCloudId) {
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
    }

    // 2. Fallback to local IndexedDB (instant, 0 network wait)
    const db = await openDB();
    if (!db || !projectId) return null;

    const tx = db.transaction(STORE_PROJECTS, "readonly");
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.get(projectId);

    return new Promise((resolve) => {
      req.onsuccess = () => {
        let p = req.result;
        if (!p) {
          // Fallback: search all in case ID keying differs
          const allReq = store.getAll();
          allReq.onsuccess = () => {
            const list = allReq.result || [];
            p = list.find((item) => item.id === projectId || String(item.id).includes(String(projectId)));
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
          allReq.onerror = () => resolve(null);
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
export async function deleteStoryProject(projectId, projectTitle = "") {
  try {
    // 1. Delete on backend API (passing title query param so duplicates with matching title are also removed)
    const query = projectTitle ? `?title=${encodeURIComponent(projectTitle)}` : "";
    await apiRequest(`/api/story-projects/${projectId || "by-title"}${query}`, {
      method: "DELETE",
    });

    // 2. Completely clean from local IndexedDB
    const db = await openDB();
    if (db) {
      await new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_PROJECTS, "readwrite");
          const store = tx.objectStore(STORE_PROJECTS);

          if (projectId) {
            store.delete(projectId);
          }

          const allReq = store.getAll();
          allReq.onsuccess = () => {
            const list = allReq.result || [];
            list.forEach((item) => {
              const idMatches = item.id === projectId || item._id === projectId;
              const titleMatches =
                projectTitle &&
                item.title &&
                item.title.trim() === projectTitle.trim() &&
                projectTitle.trim() !== "અનામી વાર્તા પ્રોજેક્ટ";

              if (idMatches || titleMatches) {
                store.delete(item.id);
              }
            });
            resolve(true);
          };
          allReq.onerror = () => resolve(true);
        } catch (e) {
          resolve(true);
        }
      });
    }

    return true;
  } catch (err) {
    console.warn("Failed to delete project:", err);
    return false;
  }
}

/**
 * Delete a project record ONLY from local IndexedDB (used when migrating local temporary ID to cloud)
 */
export async function deleteLocalOnlyProject(localId) {
  try {
    const db = await openDB();
    if (!db || !localId) return;
    const tx = db.transaction(STORE_PROJECTS, "readwrite");
    const store = tx.objectStore(STORE_PROJECTS);
    store.delete(localId);
  } catch (err) {
    console.warn("Failed to delete local-only project from IndexedDB:", err);
  }
}
