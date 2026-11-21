import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";
import {
  ArrowLeft,
  Video,
  Music,
  Plus,
  Trash2,
  Play,
  Square,
  Download,
  Sparkles,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Monitor,
  Smartphone,
  Sliders,
  Eye,
  X,
  Volume2,
  FolderArchive,
  PlusCircle,
  Save,
  Clock,
  Calendar,
  Check,
  AlertCircle,
  FileText,
} from "lucide-react";
import {
  ASPECT_RATIOS,
  SUPPORTED_LANGUAGES,
  fetchSceneAudio,
  exportStoryVideo,
  exportStoryAudioWav,
  createStoryVideoRenderer,
} from "../utils/storyVideoEngine.js";
import {
  saveStoryDraft,
  loadStoryDraft,
  clearStoryDraft,
  saveStoryProject,
  listStoryProjects,
  getStoryProject,
  deleteStoryProject,
} from "../utils/storyDraftStorage.js";
import "./StoryVideoCreator.css";

const INITIAL_SCENES = [
  {
    id: "sc_1",
    sceneTitle: "સીન ૧",
    text: "",
    imageSrc: null,
    audioBuffer: null,
    audioDuration: 0,
  },
  {
    id: "sc_2",
    sceneTitle: "સીન ૨",
    text: "",
    imageSrc: null,
    audioBuffer: null,
    audioDuration: 0,
  },
];

export default function StoryVideoCreator() {
  const { txt } = useLanguage();

  // Settings
  const [title, setTitle] = useState("");
  const [lang, setLang] = useState("gu");
  const [aspectRatio, setAspectRatio] = useState("9:16"); // "9:16" or "16:9"
  const [subtitlePos, setSubtitlePos] = useState("auto");
  const [voice, setVoice] = useState("male");

  // Scenes
  const [scenes, setScenes] = useState(INITIAL_SCENES);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Restore draft from IndexedDB on page load (so refresh never loses user data!)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const draft = await loadStoryDraft();
      if (isMounted && draft) {
        if (draft.title) setTitle(draft.title);
        if (draft.lang) setLang(draft.lang);
        if (draft.aspectRatio) setAspectRatio(draft.aspectRatio);
        if (draft.subtitlePos) setSubtitlePos(draft.subtitlePos);
        if (draft.voice) setVoice(draft.voice);
        if (Array.isArray(draft.scenes) && draft.scenes.length > 0) {
          setScenes(draft.scenes);
        }
      }
      if (isMounted) setDraftLoaded(true);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Debounced auto-save to IndexedDB whenever user edits anything
  useEffect(() => {
    if (!draftLoaded) return;
    const timer = setTimeout(() => {
      saveStoryDraft({
        title,
        lang,
        aspectRatio,
        subtitlePos,
        voice,
        scenes,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [title, lang, aspectRatio, subtitlePos, voice, scenes, draftLoaded]);

  // Audio preview per scene
  const [playingSceneId, setPlayingSceneId] = useState(null);
  const audioCtxRef = useRef(null);
  const activeSourceRef = useRef(null);

  // Modal / Progress states
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState(null); // "video" | "audio"
  const [progress, setProgress] = useState({ percent: 0, message: "" });
  const [exportResult, setExportResult] = useState(null);

  // Auto Split Story Modal
  const [showAutoSplitModal, setShowAutoSplitModal] = useState(false);
  const [rawStoryText, setRawStoryText] = useState("");
  const [splitMode, setSplitMode] = useState("paragraph"); // "paragraph" or "sentence"

  // Live Canvas Preview
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const previewCanvasRef = useRef(null);
  const previewRendererRef = useRef(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewAnimFrameRef = useRef(null);

  // Project Library States (Client-side IndexedDB - ZERO Server Space)
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [savedProjects, setSavedProjects] = useState([]);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  async function refreshProjectsList() {
    const list = await listStoryProjects();
    setSavedProjects(list);
  }

  // Load projects list on mount
  useEffect(() => {
    refreshProjectsList();
  }, []);

  // Auto clear toast notification after 4s
  useEffect(() => {
    if (toastMsg) {
      const t = setTimeout(() => setToastMsg(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toastMsg]);

  // Lock body scroll whenever modal is open so preview stays locked in screen center
  const isAnyModalOpen =
    showPreviewModal || showAutoSplitModal || isExporting || showProjectsModal;
  useEffect(() => {
    if (isAnyModalOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [isAnyModalOpen]);

  // Explicitly Save Current Project to Shared Library (Synchronized across all Admins)
  async function handleSaveProject() {
    try {
      const savedId = await saveStoryProject({
        id: activeProjectId,
        title,
        lang,
        aspectRatio,
        subtitlePos,
        voice,
        scenes,
      });
      if (savedId) {
        setActiveProjectId(savedId);
        await refreshProjectsList();
        setToastMsg(`પ્રોજેક્ટ "${title || "વાર્તા"}" તમામ એડમિન માટે સફળતાપૂર્વક સાચવવામાં આવ્યો છે!`);
      }
    } catch (err) {
      console.error("Save project failed:", err);
      alert("પ્રોજેક્ટ સાચવવામાં ક્ષતિ આવી.");
    }
  }

  // Create New Project (auto-saves existing project if it has content!)
  async function handleNewProject() {
    const hasContent = scenes.some((s) => s.text.trim() || s.imageSrc);
    if (hasContent) {
      const savedId = await saveStoryProject({
        id: activeProjectId,
        title,
        lang,
        aspectRatio,
        subtitlePos,
        voice,
        scenes,
      });
      if (savedId) {
        setToastMsg(`જૂનો પ્રોજેક્ટ "${title || "વાર્તા"}" તમામ એડમિન માટે સુરક્ષિત સાચવવામાં આવ્યો છે!`);
      }
    }

    // Reset to brand new project template
    setActiveProjectId(null);
    setTitle("");
    setScenes(INITIAL_SCENES);
    await clearStoryDraft();
    await refreshProjectsList();
  }

  // Open Projects Library
  async function handleOpenProjectsLibrary() {
    await refreshProjectsList();
    setShowProjectsModal(true);
  }

  // Load a Saved Project
  async function handleLoadProject(projectId) {
    // Autosave current project before switching if it has unsaved work
    const hasContent = scenes.some((s) => s.text.trim() || s.imageSrc);
    if (hasContent && activeProjectId !== projectId) {
      await saveStoryProject({
        id: activeProjectId,
        title,
        lang,
        aspectRatio,
        subtitlePos,
        voice,
        scenes,
      });
    }

    const proj = await getStoryProject(projectId);
    if (proj) {
      setActiveProjectId(proj.id);
      setTitle(proj.title);
      setLang(proj.lang);
      setAspectRatio(proj.aspectRatio);
      setSubtitlePos(proj.subtitlePos);
      setVoice(proj.voice);
      setScenes(proj.scenes);
      setShowProjectsModal(false);
      setToastMsg(`"${proj.title}" પ્રોજેક્ટ સફળતાપૂર્વક લોડ થઈ ગયો છે!`);
    }
  }

  // Delete a Saved Project
  async function handleDeleteProject(projectId, projectTitle, e) {
    e.stopPropagation();
    if (!window.confirm(`શું તમે ખરેખર "${projectTitle}" પ્રોજેક્ટ ડિલીટ કરવા માંગો છો?`)) {
      return;
    }

    await deleteStoryProject(projectId);
    if (activeProjectId === projectId) {
      setActiveProjectId(null);
    }
    await refreshProjectsList();
    setToastMsg(`"${projectTitle}" પ્રોજેક્ટ ડિલીટ કરવામાં આવ્યો છે.`);
  }

  // Invalidate cached scene audio buffers if language or voice changes so chosen voice is always used
  useEffect(() => {
    setScenes((prev) =>
      prev.map((s) => ({ ...s, audioBuffer: null, audioDuration: 0 }))
    );
  }, [lang, voice]);

  // Cleanup blob URLs and AudioContext on unmount
  useEffect(() => {
    return () => {
      stopAudioPreview();
      if (previewRendererRef.current) {
        previewRendererRef.current.close();
      }
      if (previewAnimFrameRef.current) {
        cancelAnimationFrame(previewAnimFrameRef.current);
      }
      scenes.forEach((sc) => {
        if (sc.imageSrc && sc.imageSrc.startsWith("blob:")) {
          URL.revokeObjectURL(sc.imageSrc);
        }
      });
    };
  }, []);

  function stopAudioPreview() {
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
      } catch (e) {
        // ignore
      }
      activeSourceRef.current = null;
    }
    setPlayingSceneId(null);
  }

  // Handle single scene audio playback preview
  async function handlePlaySceneAudio(scene) {
    if (playingSceneId === scene.id) {
      stopAudioPreview();
      return;
    }

    stopAudioPreview();
    setPlayingSceneId(scene.id);

    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioCtxClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      let buf = scene.audioBuffer;
      if (!buf) {
        buf = await fetchSceneAudio(ctx, scene.text, lang, voice);
        // Cache in scene state
        setScenes((prev) =>
          prev.map((s) =>
            s.id === scene.id
              ? { ...s, audioBuffer: buf, audioDuration: Math.round(buf.duration * 10) / 10 }
              : s
          )
        );
      }

      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.connect(ctx.destination);
      activeSourceRef.current = source;

      source.onended = () => {
        setPlayingSceneId(null);
        activeSourceRef.current = null;
      };

      source.start();
    } catch (err) {
      console.error("Audio preview failed:", err);
      alert("ઓડિયો પ્રીવ્યૂ નિષ્ફળ રહ્યો. કૃપા કરીને ફરી પ્રયાસ કરો.");
      setPlayingSceneId(null);
    }
  }

  // Handle Image Upload for a Scene
  function handleImageUpload(sceneId, file) {
    if (!file) return;

    // Create in-memory Blob URL for instant canvas display & keep file Blob for IndexedDB persistence
    const objectUrl = URL.createObjectURL(file);

    setScenes((prev) =>
      prev.map((sc) => {
        if (sc.id === sceneId) {
          if (sc.imageSrc && sc.imageSrc.startsWith("blob:")) {
            URL.revokeObjectURL(sc.imageSrc);
          }
          return { ...sc, imageSrc: objectUrl, imageBlob: file };
        }
        return sc;
      })
    );
  }

  // Scene CRUD
  function addScene() {
    const newId = `sc_${Date.now()}`;
    setScenes((prev) => [
      ...prev,
      {
        id: newId,
        sceneTitle: `સીન ${prev.length + 1}`,
        text: "",
        imageSrc: null,
        audioBuffer: null,
        audioDuration: 0,
      },
    ]);
  }

  function updateSceneText(sceneId, text) {
    setScenes((prev) =>
      prev.map((s) => (s.id === sceneId ? { ...s, text, audioBuffer: null } : s))
    );
  }

  function deleteScene(sceneId) {
    if (scenes.length <= 1) {
      alert("ઓછામાં ઓછો એક સીન હોવો જરૂરી છે.");
      return;
    }
    const sc = scenes.find((s) => s.id === sceneId);
    if (sc?.imageSrc && sc.imageSrc.startsWith("blob:")) {
      URL.revokeObjectURL(sc.imageSrc);
    }
    setScenes((prev) => prev.filter((s) => s.id !== sceneId));
  }

  function moveScene(index, direction) {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= scenes.length) return;
    const updated = [...scenes];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    setScenes(updated);
  }

  // Auto Split Story into Scenes
  function applyAutoSplit() {
    if (!rawStoryText.trim()) return;

    let parts = [];
    if (splitMode === "paragraph") {
      parts = rawStoryText
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean);
    } else {
      // Split by sentence (Hindi/Sanskrit danda । or English/Gujarati period .)
      parts = rawStoryText
        .split(/(?<=[।\.!\?])\s+/)
        .map((p) => p.trim())
        .filter(Boolean);
    }

    if (parts.length === 0) return;

    const newScenes = parts.map((partText, idx) => ({
      id: `sc_${Date.now()}_${idx}`,
      sceneTitle: `સીન ${idx + 1}`,
      text: partText,
      imageSrc: null,
      audioBuffer: null,
      audioDuration: 0,
    }));

    setScenes(newScenes);
    setShowAutoSplitModal(false);
    setRawStoryText("");
  }

  // Export Full Audio (.WAV)
  async function handleExportAudio() {
    const emptyScene = scenes.find((s) => !s.text.trim());
    if (emptyScene) {
      alert("કૃપા કરીને દરેક સીન માટે લખાણ/સ્ક્રિપ્ટ દાખલ કરો.");
      return;
    }

    setIsExporting(true);
    setExportType("audio");
    setProgress({ percent: 10, message: "ઓડિયો તૈયાર થઈ રહ્યો છે..." });

    try {
      const wavBlob = await exportStoryAudioWav({
        scenes,
        lang,
        voice,
        onProgress: (p) => setProgress(p),
      });

      const url = URL.createObjectURL(wavBlob);
      const filename = `${title.replace(/\s+/g, "_")}_audio.wav`;

      // Trigger instant download
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setExportResult({
        type: "audio",
        url,
        filename,
        message: "ઓડિયો સફળતાપૂર્વક ડાઉનલોડ થઈ ગયો છે!",
      });
    } catch (err) {
      console.error("Audio export failed:", err);
      const errMsg =
        err?.message ||
        err?.name ||
        (typeof err === "string" ? err : JSON.stringify(err)) ||
        "અજ્ઞાત ક્ષતિ આવી";
      alert(`ઓડિયો એક્સપોર્ટ નિષ્ફળ: ${errMsg}`);
      setIsExporting(false);
    }
  }

  // Export Video (.MP4 / .WEBM)
  async function handleExportVideo() {
    const emptyScene = scenes.find((s) => !s.text.trim());
    if (emptyScene) {
      alert("કૃપા કરીને દરેક સીન માટે લખાણ/સ્ક્રિપ્ટ દાખલ કરો.");
      return;
    }

    setIsExporting(true);
    setExportType("video");
    setProgress({ percent: 5, message: "વિડીયો રેન્ડરિંગ શરૂ થઈ રહ્યું છે..." });

    try {
      const result = await exportStoryVideo({
        scenes,
        aspectRatio,
        subtitlePos,
        title,
        lang,
        voice,
        logoSrc: "/icons/logo-circle.png",
        onProgress: (p) => setProgress(p),
      });

      const url = URL.createObjectURL(result.blob);
      const filename = `${title.replace(/\s+/g, "_")}_${aspectRatio.replace(":", "x")}.${result.ext}`;

      // Trigger instant download
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setExportResult({
        type: "video",
        url,
        filename,
        message: "વિડીયો સફળતાપૂર્વક ડાઉનલોડ થઈ ગયો છે!",
      });
    } catch (err) {
      console.error("Video export failed:", err);
      const errMsg =
        err?.message ||
        err?.name ||
        (typeof err === "string" ? err : JSON.stringify(err)) ||
        "અજ્ઞાત ક્ષતિ આવી";
      alert(`વિડીયો એક્સપોર્ટ નિષ્ફળ: ${errMsg}`);
      setIsExporting(false);
    }
  }

  // Open Live Preview
  async function handleOpenPreview() {
    const emptyScene = scenes.find((s) => !s.text.trim());
    if (emptyScene) {
      alert("પ્રીવ્યૂ જોવા માટે દરેક સીનમાં લખાણ હોવું જરૂરી છે.");
      return;
    }

    setShowPreviewModal(true);
    setIsPreviewPlaying(true);

    try {
      const renderer = await createStoryVideoRenderer({
        scenes,
        aspectRatio,
        subtitlePos,
        title,
        lang,
        voice,
        logoSrc: "/icons/logo-circle.png",
        onProgress: () => {},
      });

      previewRendererRef.current = renderer;
      const { canvas, audioCtx, loadedScenes, totalDuration, renderFrame } = renderer;

      // Cache loaded audio buffers in state so subsequent preview and export are INSTANT!
      if (loadedScenes && Array.isArray(loadedScenes)) {
        setScenes((prev) =>
          prev.map((sc, idx) => ({
            ...sc,
            audioBuffer: loadedScenes[idx]?.audioBuffer || sc.audioBuffer,
            audioDuration: loadedScenes[idx]?.duration || sc.audioDuration,
          }))
        );
      }

      // Ensure AudioContext is active and not suspended by browser autoplay policy
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      // Mount canvas into DOM container and strictly constrain size so preview fits on screen with zero scrolling
      const container = previewCanvasRef.current;
      if (container) {
        container.innerHTML = "";
        canvas.style.maxWidth = "100%";
        canvas.style.maxHeight =
          aspectRatio === "9:16" ? "min(58vh, 460px)" : "min(50vh, 380px)";
        canvas.style.width = "auto";
        canvas.style.height = "auto";
        canvas.style.objectFit = "contain";
        canvas.style.display = "block";
        canvas.style.borderRadius = "12px";
        container.appendChild(canvas);
      }

      // Schedule Audio Sources
      const startTime = audioCtx.currentTime + 0.1;
      loadedScenes.forEach((sc) => {
        if (sc.audioBuffer) {
          const src = audioCtx.createBufferSource();
          src.buffer = sc.audioBuffer;
          src.connect(audioCtx.destination);
          src.start(startTime + sc.startTime);
        }
      });

      const startPerf = performance.now();

      function animLoop() {
        const now = (performance.now() - startPerf) / 1000;
        renderFrame(now);

        if (now < totalDuration) {
          previewAnimFrameRef.current = requestAnimationFrame(animLoop);
        } else {
          setIsPreviewPlaying(false);
        }
      }

      animLoop();
    } catch (err) {
      console.error("Preview failed:", err);
      alert("પ્રીવ્યૂ શરૂ કરવામાં સમસ્યા આવી: " + err.message);
      setShowPreviewModal(false);
    }
  }

  function handleClosePreview() {
    if (previewRendererRef.current) {
      previewRendererRef.current.close();
      previewRendererRef.current = null;
    }
    if (previewAnimFrameRef.current) {
      cancelAnimationFrame(previewAnimFrameRef.current);
    }
    setShowPreviewModal(false);
    setIsPreviewPlaying(false);
  }

  return (
    <div className="story-studio-page">
      <div className="story-studio-container">
        {/* Header */}
        <header className="story-studio-header">
          <div className="story-studio-header-left">
            <Link to="/admin" className="studio-back-btn">
              <ArrowLeft size={18} />
              <span>{txt("એડમિન પેનલ", "एडमिन पैनल", "Admin Panel")}</span>
            </Link>
            <div className="story-studio-title-block">
              <h1>{txt("વિડીયો સ્ટુડિયો (Story Video Studio)", "वीडियो स्टूडियो (Story Video Studio)", "Story Video Studio")}</h1>
            </div>
          </div>

          {/* New Project & Project Library Actions */}
          <div className="story-studio-header-actions">
            <button
              type="button"
              className="studio-header-btn save-project"
              onClick={handleSaveProject}
              title="ચાલુ પ્રોજેક્ટ તમામ એડમિન માટે સાચવો"
            >
              <Save size={18} />
              <span>{activeProjectId ? "પ્રોજેક્ટ અપડેટ" : "પ્રોજેક્ટ સાચવો"}</span>
            </button>
            <button
              type="button"
              className="studio-header-btn new-project"
              onClick={handleNewProject}
              title="હાલનો પ્રોજેક્ટ સાચવીને નવો પ્રોજેક્ટ શરૂ કરો"
            >
              <PlusCircle size={18} />
              <span>નવો પ્રોજેક્ટ</span>
            </button>
            <button
              type="button"
              className="studio-header-btn projects-lib"
              onClick={handleOpenProjectsLibrary}
              title="સાચવેલા બધા પ્રોજેક્ટ્સ જુઓ, એડિટ કરો કે ડિલીટ કરો"
            >
              <FolderArchive size={18} />
              <span>પ્રોજેક્ટ્સ ({savedProjects.length})</span>
            </button>
          </div>
        </header>

        {/* Toast Notification Banner */}
        {toastMsg && (
          <div className="studio-toast-banner">
            <CheckCircle2 size={18} />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Global Video Settings Card */}
        <section className="studio-settings-card">
          <div className="studio-settings-grid">
            {/* Title */}
            <div className="studio-field">
              <label>વિડીયો / વાર્તાનું શીર્ષક</label>
              <input
                type="text"
                className="studio-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="વાર્તાનું નામ દાખલ કરો..."
              />
            </div>

            {/* Language */}
            <div className="studio-field">
              <label>ઓડિયો ભાષા (Language)</label>
              <select
                className="studio-select"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Voice Gender */}
            <div className="studio-field">
              <label>અવાજ (Voice Tone)</label>
              <select
                className="studio-select"
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
              >
                <option value="male">પુરુષ અવાજ (Male Voice - Deep & Divine)</option>
                <option value="female">સ્ત્રી અવાજ (Female Voice - Sweet & Clear)</option>
              </select>
            </div>

            {/* Aspect Ratio Switcher */}
            <div className="studio-field">
              <label>વિડીયો સાઇઝ (Aspect Ratio)</label>
              <div className="aspect-toggle-group">
                <button
                  type="button"
                  className={`aspect-toggle-btn ${aspectRatio === "9:16" ? "active" : ""}`}
                  onClick={() => setAspectRatio("9:16")}
                >
                  <Smartphone size={16} />
                  <span>9:16 રીલ્સ</span>
                </button>
                <button
                  type="button"
                  className={`aspect-toggle-btn ${aspectRatio === "16:9" ? "active" : ""}`}
                  onClick={() => setAspectRatio("16:9")}
                >
                  <Monitor size={16} />
                  <span>16:9 યુટ્યુબ</span>
                </button>
              </div>
            </div>

            {/* Subtitle Position */}
            <div className="studio-field">
              <label>લખાણની સ્થિતિ (Subtitles)</label>
              <select
                className="studio-select"
                value={subtitlePos}
                onChange={(e) => setSubtitlePos(e.target.value)}
              >
                <option value="auto">ઓટોમેટિક (શ્રેષ્ઠ વાંચન ઝોન)</option>
                <option value="top">ઉપર (Top Card)</option>
                <option value="bottom">નીચે (Bottom Subtitle Bar)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Quick Tools Bar */}
        <div className="studio-quick-tools">
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className="quick-tool-btn"
              onClick={() => setShowAutoSplitModal(true)}
            >
              <Sparkles size={16} />
              <span>આખી વાર્તા ઓટો-વિભાજિત કરો (Auto-Split Story)</span>
            </button>
          </div>

          <span style={{ fontSize: "13px", color: "#94a3b8" }}>
            કુલ સીન: <strong>{scenes.length}</strong> | ફોર્મેટ: <strong>{aspectRatio}</strong>
          </span>
        </div>

        {/* Scenes List */}
        <div className="studio-scenes-list">
          {scenes.map((scene, idx) => (
            <div key={scene.id} className="scene-card">
              <div className="scene-header">
                <div className="scene-number-badge">
                  <span>સીન #{idx + 1}</span>
                </div>

                <div className="scene-actions">
                  <button
                    type="button"
                    className="scene-action-btn"
                    onClick={() => moveScene(idx, -1)}
                    disabled={idx === 0}
                    title="ઉપર ખસેડો"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    className="scene-action-btn"
                    onClick={() => moveScene(idx, 1)}
                    disabled={idx === scenes.length - 1}
                    title="નીચે ખસેડો"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    className="scene-action-btn danger"
                    onClick={() => deleteScene(scene.id)}
                    title="સીન ડિલીટ કરો"
                  >
                    <Trash2 size={14} />
                    <span>ડિલીટ</span>
                  </button>
                </div>
              </div>

              <div className="scene-body">
                {/* Image Dropzone */}
                <div className="scene-image-box">
                  <label
                    className={`image-dropzone ${aspectRatio === "16:9" ? "landscape-preview" : ""}`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(scene.id, e.target.files?.[0])}
                    />
                    {scene.imageSrc ? (
                      <>
                        <img
                          src={scene.imageSrc}
                          alt={`Scene ${idx + 1}`}
                          className="image-preview-img"
                        />
                        <div className="change-img-overlay">ચિત્ર બદલો</div>
                      </>
                    ) : (
                      <div className="dropzone-placeholder">
                        <ImageIcon size={28} />
                        <span>ચિત્ર પસંદ કરો</span>
                        <small>({aspectRatio} ફિટ)</small>
                      </div>
                    )}
                  </label>
                </div>

                {/* Script Box */}
                <div className="scene-script-box">
                  <textarea
                    className="scene-textarea"
                    value={scene.text}
                    onChange={(e) => updateSceneText(scene.id, e.target.value)}
                    placeholder="આ સીન માટે વાર્તા / સંવાદ / લખાણ અહીં દાખલ કરો..."
                  />

                  <div className="scene-audio-preview-row">
                    <button
                      type="button"
                      className="play-scene-audio-btn"
                      onClick={() => handlePlaySceneAudio(scene)}
                    >
                      {playingSceneId === scene.id ? (
                        <>
                          <Square size={14} fill="#fbbf24" />
                          <span>બંધ કરો</span>
                        </>
                      ) : (
                        <>
                          <Play size={14} fill="#fbbf24" />
                          <span>ઓડિયો સાંભળો</span>
                        </>
                      )}
                    </button>

                    {scene.audioDuration > 0 && (
                      <span className="audio-duration-tag">
                        ⏱️ {scene.audioDuration} સેકન્ડ
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add Scene Button */}
          <button type="button" className="add-scene-btn" onClick={addScene}>
            <Plus size={20} />
            <span>➕ નવો સીન ઉમેરો (Add New Scene)</span>
          </button>
        </div>

        {/* Sticky Action Dock */}
        <div className="studio-action-dock">
          <div className="dock-info">
            <span className="dock-badge">
              {aspectRatio === "9:16" ? "📱 9:16 રીલ્સ" : "🖥️ 16:9 લેન્ડસ્કેપ"}
            </span>
          </div>

          <div className="dock-buttons">
            <button
              type="button"
              className="dock-btn audio-btn"
              onClick={handleExportAudio}
              disabled={isExporting}
            >
              <Music size={16} />
              <span>ખાલિ ઓડિયો ડાઉનલોડ (.WAV)</span>
            </button>

            <button
              type="button"
              className="dock-btn video-btn"
              onClick={handleExportVideo}
              disabled={isExporting}
            >
              <Video size={16} />
              <span>વિડીયો બનાવો અને ડાઉનલોડ કરો</span>
            </button>

            <button
              type="button"
              className="dock-btn"
              style={{ background: "rgba(255, 255, 255, 0.1)", color: "#ffffff" }}
              onClick={handleOpenPreview}
              disabled={isExporting}
            >
              <Eye size={16} />
              <span>લાઇવ પ્રીવ્યૂ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Auto Split Story Modal */}
      {showAutoSplitModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="studio-modal-overlay">
            <div className="studio-modal-card">
              <div className="studio-modal-header">
                <h3>✨ આખી વાર્તા ઓટો-વિભાજિત કરો</h3>
                <button
                  type="button"
                  className="studio-modal-close-btn"
                  onClick={() => setShowAutoSplitModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: 0 }}>
                તમારી આખી વાર્તા અહીં પેસ્ટ કરો. સિસ્ટમ આપોઆપ તેને અલગ-અલગ સીનમાં વિભાજિત કરી દેશે,
                જેથી તમારે માત્ર દરેક સીનના ચિત્રો જ મૂકવાના રહેશે!
              </p>

              <textarea
                className="scene-textarea"
                style={{ minHeight: "180px", marginBottom: "16px" }}
                value={rawStoryText}
                onChange={(e) => setRawStoryText(e.target.value)}
                placeholder="અહીં આખી વાર્તા પેસ્ટ કરો..."
              />

              <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="split"
                    checked={splitMode === "paragraph"}
                    onChange={() => setSplitMode("paragraph")}
                  />
                  <span>પેરેગ્રાફ મુજબ (દર નવી લાઇન પર નવો સીન)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="split"
                    checked={splitMode === "sentence"}
                    onChange={() => setSplitMode("sentence")}
                  />
                  <span>વાક્ય મુજબ (પૂર્ણવિરામ પર નવો સીન)</span>
                </label>
              </div>

              <button
                type="button"
                className="dock-btn video-btn"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={applyAutoSplit}
              >
                <span>સીનમાં વિભાજિત કરો</span>
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* Export Progress Modal */}
      {isExporting &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="studio-modal-overlay">
            <div className="studio-modal-card" style={{ textAlign: "center" }}>
              <h3 style={{ marginBottom: "8px" }}>
                {exportResult
                  ? "તૈયાર છે!"
                  : exportType === "video"
                  ? "🎬 વિડીયો રેન્ડરિંગ ચાલુ છે..."
                  : "🎵 ઓડિયો તૈયાર થઈ રહ્યો છે..."}
              </h3>

              {!exportResult ? (
                <>
                  <div className="studio-progress-bar-track">
                    <div
                      className="studio-progress-bar-fill"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <p className="studio-progress-msg">{progress.message}</p>
                  <small style={{ color: "#64748b", display: "block", marginTop: "12px" }}>
                    કૃપા કરીને આ ટેબ બંધ કરશો નહીં.
                  </small>
                </>
              ) : (
                <div style={{ marginTop: "20px" }}>
                  <CheckCircle2 size={48} color="#10b981" style={{ margin: "0 auto 14px" }} />
                  <p style={{ color: "#e2e8f0", fontSize: "15px", marginBottom: "20px" }}>
                    {exportResult.message}
                  </p>
                  <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                    <a
                      href={exportResult.url}
                      download={exportResult.filename}
                      className="dock-btn video-btn"
                    >
                      <Download size={16} />
                      <span>ફરી ડાઉનલોડ કરો</span>
                    </a>
                    <button
                      type="button"
                      className="dock-btn"
                      style={{ background: "rgba(255, 255, 255, 0.1)", color: "#ffffff" }}
                      onClick={() => {
                        setIsExporting(false);
                        setExportResult(null);
                      }}
                    >
                      બંધ કરો
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Live Preview Modal - Center Pinned with Zero Scroll */}
      {showPreviewModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="studio-modal-overlay">
            <div
              className={`studio-modal-card ${aspectRatio === "16:9" ? "wide-modal" : ""}`}
            >
              <div className="studio-modal-header">
                <h3>લાઇવ વિડીયો પ્રીવ્યૂ ({aspectRatio})</h3>
                <button
                  type="button"
                  className="studio-modal-close-btn"
                  onClick={handleClosePreview}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="preview-canvas-wrap" ref={previewCanvasRef} />

              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <button
                  type="button"
                  className="dock-btn video-btn"
                  onClick={handleClosePreview}
                >
                  પ્રીવ્યૂ બંધ કરો
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Projects Library Modal - Zero Server Storage (Local IndexedDB) */}
      {showProjectsModal &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="studio-modal-overlay">
            <div className="studio-modal-card projects-modal-card">
              <div className="studio-modal-header">
                <div>
                  <h3>મારા સાચવેલા પ્રોજેક્ટ્સ (Client Library)</h3>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#94a3b8" }}>
                    બધા પ્રોજેક્ટ્સ તમારા બ્રાઉઝરમાં સુરક્ષિત સંગ્રહિત છે (વેબસાઇટ સર્વર પર 0 KB સ્પેસ)
                  </p>
                </div>
                <button
                  type="button"
                  className="studio-modal-close-btn"
                  onClick={() => setShowProjectsModal(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="projects-modal-body">
                {savedProjects.length === 0 ? (
                  <div className="projects-empty-state">
                    <FolderArchive size={48} className="projects-empty-icon" />
                    <h4 style={{ margin: "8px 0 4px", color: "#f8fafc" }}>
                      હજુ સુધી કોઈ પ્રોજેક્ટ સાચવેલ નથી
                    </h4>
                    <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>
                      નવી વાર્તા કે સ્ક્રિપ્ટ બનાવીને "નવો પ્રોજેક્ટ" પર ક્લિક કરશો એટલે તમારો જૂનો પ્રોજેક્ટ આપોઆપ અહીં સાચવાઈ જશે!
                    </p>
                  </div>
                ) : (
                  <div className="projects-grid">
                    {savedProjects.map((p) => {
                      const isActive = activeProjectId === p.id;
                      const dateStr = p.updatedAt
                        ? new Date(p.updatedAt).toLocaleDateString("gu-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "";

                      return (
                        <div
                          key={p.id}
                          className={`project-card ${isActive ? "active-project" : ""}`}
                        >
                          <div className="project-thumb-wrap">
                            {p.thumbUrl ? (
                              <img
                                src={p.thumbUrl}
                                alt={p.title}
                                className="project-thumb-img"
                              />
                            ) : (
                              <div className="project-thumb-placeholder">
                                <ImageIcon size={28} />
                                <span>ચિત્ર નથી</span>
                              </div>
                            )}
                            <div className="project-aspect-tag">{p.aspectRatio}</div>
                          </div>

                          <div className="project-card-info">
                            <h4 className="project-card-title">{p.title}</h4>
                            <div className="project-card-meta">
                              <span>{p.sceneCount} સીન</span>
                              <span>{dateStr}</span>
                            </div>

                            <div className="project-card-actions">
                              <button
                                type="button"
                                className="project-btn-load"
                                onClick={() => handleLoadProject(p.id)}
                              >
                                <Play size={13} />
                                <span>{isActive ? "હાલમાં સક્રિય" : "એડિટ / લોડ કરો"}</span>
                              </button>
                              <button
                                type="button"
                                className="project-btn-delete"
                                onClick={(e) => handleDeleteProject(p.id, p.title, e)}
                                title="પ્રોજેક્ટ ડિલીટ કરો"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ textAlign: "right", marginTop: "14px", flexShrink: 0 }}>
                <button
                  type="button"
                  className="dock-btn"
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#ffffff",
                    padding: "8px 20px",
                  }}
                  onClick={() => setShowProjectsModal(false)}
                >
                  બંધ કરો
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
