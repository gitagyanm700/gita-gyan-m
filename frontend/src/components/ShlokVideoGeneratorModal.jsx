import React, { useState, useEffect, useRef } from "react";
import {
  Film,
  Download,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  X,
  Copy,
  Check,
  Globe,
  Loader2,
  Tv,
} from "lucide-react";
import {
  createShlokVideoRenderer,
  exportShlokVideoMP4,
  detectShlokScenes,
} from "../utils/shlokVideoEngine.js";
import "./ShlokVideoGeneratorModal.css";

export default function ShlokVideoGeneratorModal({ shlok, onClose }) {
  if (!shlok) return null;

  const chNum = shlok.chapterNumber;
  const sNum = shlok.shlokNumber;

  // Selected language for video text and voiceover
  const [lang, setLang] = useState("gu"); // "gu" | "hi" | "en"

  // Playback / Preview State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("ઓડિયો અને દ્રશ્યો લોડ થઈ રહ્યા છે...");

  // Recording / Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMsg, setExportMsg] = useState("");

  // Prompt copied state
  const [copiedPromptKey, setCopiedPromptKey] = useState(null);

  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const animFrameRef = useRef(null);
  const playStartTimeRef = useRef(0);
  const audioSourcesRef = useRef([]);

  // Detected scene info
  const detectedScenes = detectShlokScenes(shlok);

  // Initialize renderer when shlok or language changes
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setIsPlaying(false);
    setCurrentTime(0);

    // Stop any existing playback
    stopPreviewAudio();
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (rendererRef.current) {
      rendererRef.current.close();
      rendererRef.current = null;
    }

    createShlokVideoRenderer({
      shlok,
      lang,
      width: 720,
      height: 1280, // 9:16 Vertical format
      onProgress: ({ message }) => {
        if (!isCancelled) setLoadingMsg(message);
      },
    })
      .then((renderer) => {
        if (isCancelled) {
          renderer.close();
          return;
        }
        rendererRef.current = renderer;
        setTotalDuration(renderer.totalDuration);
        setIsLoading(false);

        // Draw initial frame at t = 0
        if (canvasRef.current) {
          copyOffscreenToDisplay(renderer.canvas, canvasRef.current);
          renderer.renderFrame(0);
          copyOffscreenToDisplay(renderer.canvas, canvasRef.current);
        }
      })
      .catch((err) => {
        console.error("Renderer initialization failed:", err);
        if (!isCancelled) {
          setIsLoading(false);
          setLoadingMsg("ઓડિયો લોડ કરવામાં સમસ્યા આવી.");
        }
      });

    return () => {
      isCancelled = true;
      stopPreviewAudio();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.close();
      }
    };
  }, [shlok, lang]);

  function copyOffscreenToDisplay(offCanvas, displayCanvas) {
    if (!offCanvas || !displayCanvas) return;
    const ctx = displayCanvas.getContext("2d");
    ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    ctx.drawImage(offCanvas, 0, 0, displayCanvas.width, displayCanvas.height);
  }

  function stopPreviewAudio() {
    audioSourcesRef.current.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {}
    });
    audioSourcesRef.current = [];
  }

  function startPlayback(fromTime = 0) {
    if (!rendererRef.current) return;
    const {
      audioCtx,
      saBuf,
      trBuf,
      msgBuf,
      totalDuration: dur,
      tIntroEnd,
      tScene2Start,
      tScene3Start,
      renderFrame,
      canvas: offCanvas,
    } = rendererRef.current;

    stopPreviewAudio();

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const sources = [];

    // Schedule Sanskrit Shloka audio
    if (fromTime < tScene2Start) {
      const saSrc = audioCtx.createBufferSource();
      saSrc.buffer = saBuf;
      saSrc.connect(audioCtx.destination);
      const saOffset = Math.max(0, fromTime - tIntroEnd);
      const saStartDelay = Math.max(0, tIntroEnd - fromTime);
      saSrc.start(now + saStartDelay, saOffset);
      sources.push(saSrc);
    }

    // Schedule Translation audio
    if (fromTime < tScene3Start) {
      const trSrc = audioCtx.createBufferSource();
      trSrc.buffer = trBuf;
      trSrc.connect(audioCtx.destination);
      const trOffset = Math.max(0, fromTime - tScene2Start);
      const trStartDelay = Math.max(0, tScene2Start - fromTime);
      trSrc.start(now + trStartDelay, trOffset);
      sources.push(trSrc);
    }

    // Schedule Message audio
    if (fromTime < dur) {
      const msgSrc = audioCtx.createBufferSource();
      msgSrc.buffer = msgBuf;
      msgSrc.connect(audioCtx.destination);
      const msgOffset = Math.max(0, fromTime - tScene3Start);
      const msgStartDelay = Math.max(0, tScene3Start - fromTime);
      msgSrc.start(now + msgStartDelay, msgOffset);
      sources.push(msgSrc);
    }

    audioSourcesRef.current = sources;

    playStartTimeRef.current = performance.now() - fromTime * 1000;
    setIsPlaying(true);

    function loop() {
      const elapsed = (performance.now() - playStartTimeRef.current) / 1000;
      setCurrentTime(elapsed);

      renderFrame(elapsed);
      if (canvasRef.current) {
        copyOffscreenToDisplay(offCanvas, canvasRef.current);
      }

      if (elapsed < dur) {
        animFrameRef.current = requestAnimationFrame(loop);
      } else {
        setIsPlaying(false);
        setCurrentTime(dur);
        stopPreviewAudio();
      }
    }

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(loop);
  }

  function pausePlayback() {
    stopPreviewAudio();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsPlaying(false);
  }

  function togglePlayPause() {
    if (isPlaying) {
      pausePlayback();
    } else {
      const startAt = currentTime >= totalDuration - 0.2 ? 0 : currentTime;
      startPlayback(startAt);
    }
  }

  function handleReplay() {
    pausePlayback();
    setCurrentTime(0);
    startPlayback(0);
  }

  // Handle Export / Download Video
  const handleDownloadVideo = async () => {
    if (isExporting) return;
    pausePlayback();
    setIsExporting(true);
    setExportProgress(0);
    setExportMsg("વિડીયો રેન્ડરિંગ શરૂ થઈ રહ્યું છે...");

    try {
      const { blob } = await exportShlokVideoMP4({
        shlok,
        lang,
        width: 720,
        height: 1280, // 9:16 Vertical Format
        onProgress: ({ percent, message }) => {
          setExportProgress(percent);
          setExportMsg(message);
        },
      });

      // Trigger instant MP4 download
      const langLabel = lang === "gu" ? "Gujarati" : lang === "hi" ? "Hindi" : "English";
      const filename = `Gita_Adhyay_${chNum}_Shlok_${sNum}_${langLabel}_9x16.mp4`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportMsg("વિડીયો સફળતાપૂર્વક ડાઉનલોડ થઈ ગયો! ✅");
      setTimeout(() => {
        setIsExporting(false);
      }, 1500);
    } catch (err) {
      console.error("Video export failed:", err);
      alert("વિડીયો ડાઉનલોડ કરવામાં સમસ્યા આવી. કૃપા કરીને ફરી પ્રયાસ કરો.");
      setIsExporting(false);
    }
  };

  // Dynamic AI Prompts for external tools (Luma, Kling, Leonardo, Runway)
  const aiPrompts = {
    scene1: `9:16 vertical portrait cinematic 3D render of Bhagavad Gita: ${detectedScenes.scene1Name}. Ancient Vedic atmosphere, dramatic volumetric lighting, ultra-detailed Unreal Engine 5 render, 8K masterpiece.`,
    scene2: `9:16 vertical portrait epic 3D scene of Kurukshetra battlefield: ${detectedScenes.scene2Name}. Golden armor, war banners, dust clouds, dramatic sky, photorealistic 8K mythological art.`,
    scene3: `9:16 vertical portrait spiritual 3D scene of Bhagavad Gita wisdom: ${detectedScenes.scene3Name}. Golden divine light, sacred Vedic symbols, serene transcendental energy, masterpiece.`,
  };

  const copyPrompt = (key, text) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptKey(key);
    setTimeout(() => setCopiedPromptKey(null), 2000);
  };

  // Format time MM:SS
  const formatTime = (sec) => {
    const s = Math.floor(sec || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem < 10 ? "0" : ""}${rem}`;
  };

  return (
    <div className="shlok-video-modal-overlay" onClick={onClose}>
      <div
        className="shlok-video-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="shlok-video-modal-header">
          <div className="header-title-box">
            <span className="video-badge">
              <Film size={15} /> 9:16 Video Generator
            </span>
            <h2>
              અધ્યાય {chNum} • શ્લોક {sNum}
            </h2>
            <p className="speaker-text">
              વક્તા: <strong>{shlok.speaker}</strong>
            </p>
          </div>

          <button
            type="button"
            className="video-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTROLS BAR: LANGUAGE SELECTOR & RATIO */}
        <div className="video-options-bar">
          <div className="option-group">
            <span className="option-label">
              <Globe size={15} /> ભાષા (Language):
            </span>
            <div className="lang-pill-buttons">
              <button
                type="button"
                className={`lang-pill ${lang === "gu" ? "active" : ""}`}
                onClick={() => setLang("gu")}
              >
                ગુજરાતી
              </button>
              <button
                type="button"
                className={`lang-pill ${lang === "hi" ? "active" : ""}`}
                onClick={() => setLang("hi")}
              >
                हिन्दी
              </button>
              <button
                type="button"
                className={`lang-pill ${lang === "en" ? "active" : ""}`}
                onClick={() => setLang("en")}
              >
                English
              </button>
            </div>
          </div>

          <div className="option-group format-badge-box">
            <span className="format-badge">
              <Tv size={14} /> 9:16 (Reels / Shorts / Status)
            </span>
          </div>
        </div>

        {/* MODAL BODY: PREVIEW & ACTION */}
        <div className="shlok-video-modal-body">
          {/* LEFT: 9:16 PHONE MOCKUP PREVIEW */}
          <div className="video-preview-col">
            <div className="phone-mockup-frame">
              <div className="phone-screen">
                {isLoading && (
                  <div className="preview-loading-overlay">
                    <Loader2 size={36} className="spin-icon" color="#fbbf24" />
                    <p>{loadingMsg}</p>
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  width={360}
                  height={640}
                  className="preview-canvas"
                />
              </div>

              {/* FLOATING PLAY OVERLAY IF PAUSED */}
              {!isLoading && !isPlaying && currentTime === 0 && (
                <button
                  type="button"
                  className="preview-center-play-btn"
                  onClick={togglePlayPause}
                  title="પ્લે કરો"
                >
                  <Play size={28} fill="#ffffff" color="#ffffff" />
                </button>
              )}
            </div>

            {/* PLAYER CONTROLS */}
            <div className="video-player-controls">
              <button
                type="button"
                className="control-btn play-pause-btn"
                onClick={togglePlayPause}
                disabled={isLoading || isExporting}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                <span>{isPlaying ? "Pause" : "Play"}</span>
              </button>

              <button
                type="button"
                className="control-btn replay-btn"
                onClick={handleReplay}
                disabled={isLoading || isExporting}
                title="ફરીથી શરૂ કરો"
              >
                <RotateCcw size={16} />
              </button>

              <div className="time-display">
                <span>{formatTime(currentTime)}</span> /{" "}
                <span>{formatTime(totalDuration)}</span>
              </div>
            </div>
          </div>

          {/* RIGHT: STORY SCRIPT INFO & DOWNLOAD BUTTON */}
          <div className="video-info-col">
            <div className="story-script-card">
              <h3>🎬 વિડીયો સ્ટોરી સીન (Script Flow)</h3>
              <div className="scene-step-list">
                <div className="scene-step-item">
                  <span className="step-num">1</span>
                  <div className="step-info">
                    <strong>શ્લોક ગાન & વક્તા દર્શન</strong>
                    <p>{detectedScenes.scene1Name}</p>
                    <span className="step-sub">
                      સંસ્કૃત શ્લોક બોલાતાની સાથે શબ્દો ચમકશે અને પૂર્ણ થતાં જ સ્ક્રીન પરથી હટી જશે.
                    </span>
                  </div>
                </div>

                <div className="scene-step-item">
                  <span className="step-num">2</span>
                  <div className="step-info">
                    <strong>અનુવાદ ({lang === "gu" ? "ગુજરાતી" : lang === "hi" ? "हिन्दी" : "English"})</strong>
                    <p>{detectedScenes.scene2Name}</p>
                    <span className="step-sub">
                      અવાજ મુજબ અનુવાદ લખાશે અને પૂર્ણ થતાં જ સ્ક્રીન પરથી હટી જશે.
                    </span>
                  </div>
                </div>

                <div className="scene-step-item">
                  <span className="step-num">3</span>
                  <div className="step-info">
                    <strong>દિવ્ય ગીતા સંદેશ (Life Guidance)</strong>
                    <p>{detectedScenes.scene3Name}</p>
                    <span className="step-sub">
                      જીવન માર્ગદર્શન સંદેશ અને પવિત્ર ઓટ્રો (Outro).
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* DOWNLOAD ACTION BOX */}
            <div className="download-action-card">
              <button
                type="button"
                className="export-video-btn"
                onClick={handleDownloadVideo}
                disabled={isLoading || isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 size={18} className="spin-icon" />
                    <span>{exportMsg}</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span>📥 9:16 Video MP4 ડાઉનલોડ કરો</span>
                  </>
                )}
              </button>

              {isExporting && (
                <div className="export-progress-bar-wrap">
                  <div
                    className="export-progress-bar-fill"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              )}

              <p className="export-note">
                ⚡ Instagram Reels, YouTube Shorts અને WhatsApp Status માટે ૧૦૦% તૈયાર 9:16 HD MP4 વિડીયો.
              </p>
            </div>

            {/* BONUS: AI 3D PROMPT COPIER */}
            <div className="ai-prompts-accordion">
              <div className="ai-prompts-header">
                <Sparkles size={16} color="#fbbf24" />
                <span>AI 3D Video Prompts (Free AI Tools માટે):</span>
              </div>
              <p className="prompt-help">
                જો તમારે Luma, Kling, Leonardo જેવા AI ટૂલ્સમાં વિડીયો બનાવવા હોય તો નીચેથી તૈયાર પ્રોમ્પ્ટ કોપી કરી શકો છો:
              </p>
              <div className="prompt-buttons-row">
                <button
                  type="button"
                  className="copy-prompt-pill"
                  onClick={() => copyPrompt("scene1", aiPrompts.scene1)}
                >
                  {copiedPromptKey === "scene1" ? (
                    <>
                      <Check size={14} color="#10b981" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Scene 1 (વક્તા)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="copy-prompt-pill"
                  onClick={() => copyPrompt("scene2", aiPrompts.scene2)}
                >
                  {copiedPromptKey === "scene2" ? (
                    <>
                      <Check size={14} color="#10b981" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Scene 2 (કુરુક્ષેત્ર)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="copy-prompt-pill"
                  onClick={() => copyPrompt("scene3", aiPrompts.scene3)}
                >
                  {copiedPromptKey === "scene3" ? (
                    <>
                      <Check size={14} color="#10b981" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Scene 3 (શ્રીકૃષ્ણ)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
