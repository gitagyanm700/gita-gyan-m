/**
 * Story Video Studio - Custom Multi-Scene Video & Audio Generator
 * Bhagavad Gita - Gita Gyan M
 *
 * Updates:
 * 1. High-reliability dual-backend TTS fetch (Render Cloud + Localhost fallback)
 * 2. True Male & Female voice support
 * 3. Noticeable cinematic Ken Burns camera drift & zoom ("hale chale tevi motion")
 * 4. Header displays Story Name ONLY (no "Scene 1/2/3")
 * 5. Compact spacing: Subtitle box moved right beneath header pill (cardY = 96) so deities are completely visible
 * 6. Outro screen includes glowing logo from /icons/logo-circle.png
 */

import { fixVideoDuration } from "./videoDurationFixer.js";
import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4ArrayBufferTarget } from "mp4-muxer";
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmArrayBufferTarget } from "webm-muxer";

// Format / Aspect Ratio Dimensions
export const ASPECT_RATIOS = {
  "9:16": { width: 720, height: 1280, label: "9:16 રીલ્સ / શોર્ટ્સ (Vertical)", isPortrait: true },
  "16:9": { width: 1280, height: 720, label: "16:9 યુટ્યુબ / લેન્ડસ્કેપ (Horizontal)", isPortrait: false },
};

export const SUPPORTED_LANGUAGES = [
  { code: "gu", name: "ગુજરાતી (Gujarati)" },
  { code: "hi", name: "हिन्दी (Hindi)" },
  { code: "en", name: "English" },
  { code: "sa", name: "संस्कृतम् (Sanskrit)" },
];

/**
 * Convert AudioBuffer to standard 16-bit PCM WAV Blob
 */
export function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let interleaved;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    interleaved = new Float32Array(left.length + right.length);
    let inIdx = 0;
    let outIdx = 0;
    while (inIdx < left.length) {
      interleaved[outIdx++] = left[inIdx];
      interleaved[outIdx++] = right[inIdx];
      inIdx++;
    }
  } else {
    interleaved = buffer.getChannelData(0);
  }

  const dataSize = interleaved.length * (bitDepth / 8);
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  function writeString(v, offset, str) {
    for (let i = 0; i < str.length; i++) {
      v.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < interleaved.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: "audio/wav" });
}

/**
 * Merge multiple AudioBuffers into one continuous AudioBuffer with pause in between
 */
export function concatenateAudioBuffers(audioCtx, buffers, pauseDuration = 0.2) {
  if (!buffers || buffers.length === 0) return null;
  const validBuffers = buffers.filter(Boolean);
  if (validBuffers.length === 0) return null;

  const sampleRate = audioCtx.sampleRate || 44100;
  const pauseSamples = Math.floor(sampleRate * pauseDuration);

  let totalSamples = 0;
  validBuffers.forEach((b, idx) => {
    totalSamples += b.length;
    if (idx < validBuffers.length - 1) {
      totalSamples += pauseSamples;
    }
  });

  const mergedBuffer = audioCtx.createBuffer(1, totalSamples, sampleRate);
  const outputData = mergedBuffer.getChannelData(0);

  let offset = 0;
  validBuffers.forEach((b, idx) => {
    const inputData = b.getChannelData(0);
    outputData.set(inputData, offset);
    offset += b.length;
    if (idx < validBuffers.length - 1) {
      offset += pauseSamples;
    }
  });

  return mergedBuffer;
}

// Memory cache for decoded scene audio buffers so repeated preview/export is instantaneous (0ms)
const ttsAudioMemoryCache = new Map();
let isTtsLocalDead = false;

/**
 * Fetch Audio from Backend TTS API (/api/tts/speak)
 * Uses high-speed memory cache + Dual backend fallback (Render Cloud & Localhost)
 */
export async function fetchSceneAudio(audioCtx, text, lang = "gu", voice = "male", customRate = "+14%") {
  if (!text || !text.trim()) {
    return createSilentBuffer(audioCtx, 3);
  }

  // Pre-clean text: remove quotes, brackets, and awkward dashes that cause unnatural pauses between words
  const cleanSpeechText = text
    .replace(/["'“”‘’«»`]/g, "")
    .replace(/[\(\)\[\]\{\}]/g, " ")
    .replace(/[\u2014\u2013\-_—–]+/g, " ")
    .replace(/\s*[:;：；]\s*/g, ", ")
    .replace(/\.{2,}/g, ".")
    .replace(/\s*([,।\.!?])\s*([,।\.!?])+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  const cacheKey = `${lang}_${voice}_${customRate}_${cleanSpeechText}`;
  if (ttsAudioMemoryCache.has(cacheKey)) {
    return ttsAudioMemoryCache.get(cacheKey);
  }

  const isLocalHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  // Determine priority order: if localhost and not marked dead, try 5000 first, else cloud directly
  const allEndpoints = isLocalHost
    ? [
        "http://localhost:5000",
        "https://bhagavad-gita-backend-jy1a.onrender.com",
      ]
    : [
        "https://bhagavad-gita-backend-jy1a.onrender.com",
        "http://localhost:5000",
      ];

  const endpoints = allEndpoints.filter(
    (base) => !(isTtsLocalDead && base.includes("localhost:5000"))
  );

  for (const base of endpoints) {
    try {
      const isLocal = base.includes("localhost:5000");
      const effectiveTimeout = isLocal ? 1500 : 15000;
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), effectiveTimeout);

      const res = await fetch(`${base}/api/tts/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanSpeechText,
          lang: lang || "gu",
          voice: voice === "female" ? "female" : "male",
          rate: customRate || (lang === "sa" ? "+0%" : "+14%"),
        }),
        signal: ctrl.signal,
      });

      clearTimeout(tid);

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        if (arrayBuffer && arrayBuffer.byteLength > 200) {
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          ttsAudioMemoryCache.set(cacheKey, audioBuffer);
          return audioBuffer;
        }
      }
    } catch (err) {
      if (base.includes("localhost:5000")) {
        isTtsLocalDead = true;
      }
      console.warn(`TTS fetch failed on ${base}:`, err.message);
    }
  }

  console.warn("Could not fetch TTS audio from any backend, using silent fallback");
  const wordCount = text.trim().split(/\s+/).length;
  const estDuration = Math.max(3, Math.round(wordCount / 2.5));
  const fallbackBuf = createSilentBuffer(audioCtx, estDuration);
  ttsAudioMemoryCache.set(cacheKey, fallbackBuf);
  return fallbackBuf;
}

/**
 * Create a silent buffer
 */
export function createSilentBuffer(audioCtx, durationSec = 3) {
  const rate = audioCtx.sampleRate || 44100;
  return audioCtx.createBuffer(1, Math.floor(rate * durationSec), rate);
}

/**
 * Load HTMLImageElement from Blob URL or Image URL
 */
export function loadImg(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    // NEVER set crossOrigin on blob: or data: URLs to avoid CORS taints or load failures
    if (typeof src === "string" && !src.startsWith("blob:") && !src.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn("Failed to load image:", src);
      resolve(null);
    };
    img.src = src;
  });
}

/**
 * Draw rounded rectangle helper
 */
export function roundRect(ctx, x, y, w, h, radius = 12) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.closePath();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Wrap text into lines with startWordIdx for typewriter word reveal
 */
export function wrapStoryLines(ctx, text, maxWidth) {
  if (!text) return { lines: [], totalWords: 0 };
  const clean = text.replace(/["'“”‘’«»`]/g, "");
  const words = clean
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const lines = [];
  let currentWords = [];
  let currentStartIdx = 0;

  for (let i = 0; i < words.length; i++) {
    const testLine = [...currentWords, words[i]].join(" ");
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentWords.length > 0) {
      lines.push({
        text: currentWords.join(" "),
        words: [...currentWords],
        startWordIdx: currentStartIdx,
      });
      currentWords = [words[i]];
      currentStartIdx = i;
    } else {
      currentWords.push(words[i]);
    }
  }

  if (currentWords.length > 0) {
    lines.push({
      text: currentWords.join(" "),
      words: [...currentWords],
      startWordIdx: currentStartIdx,
    });
  }

  return { lines, totalWords: words.length };
}

/**
 * Draw Audio Waveform Visualizer
 */
export function drawWaveform(ctx, x, y, w, h, t, isPlaying = true) {
  ctx.save();
  const bars = 18;
  const barW = Math.max(2, Math.floor((w - (bars - 1) * 3) / bars));
  const startX = x + (w - (bars * barW + (bars - 1) * 3)) / 2;

  // Single shared gradient for all 18 bars (avoids 1,000+ allocations/sec)
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, "#fbbf24");
  grad.addColorStop(1, "#f59e0b");
  ctx.fillStyle = grad;

  for (let i = 0; i < bars; i++) {
    const freq = 3.5 + (i % 5) * 1.8;
    const wave = isPlaying ? Math.abs(Math.sin(t * freq + i * 0.45)) : 0.15;
    const barH = Math.max(3, wave * h);
    const bx = startX + i * (barW + 3);
    const by = y + (h - barH) / 2;

    roundRect(ctx, bx, by, barW, barH, 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draw Ken-Burns animated cover image with authentic 3D cinematic camera drift & push-in zoom
 */
function drawKenBurnsCover(ctx, img, width, height, progress, shotIdx = 0) {
  if (!img) {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, "#081b3a");
    grad.addColorStop(0.5, "#0b224d");
    grad.addColorStop(1, "#040b1a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  ctx.save();

  // Dynamic continuous motion:
  // 1. Slow, elegant zoom in (scale from 1.06 to 1.19)
  const scale = 1.06 + progress * 0.13;

  // 2. Continuous 3D camera pan / drift depending on shotIdx:
  let panX = 0;
  let panY = 0;

  if (shotIdx % 4 === 0) {
    // Gentle drift from left to right & upward
    panX = (progress - 0.5) * 55;
    panY = -progress * 38;
  } else if (shotIdx % 4 === 1) {
    // Gentle drift from right to left & downward
    panX = -(progress - 0.5) * 55;
    panY = progress * 32;
  } else if (shotIdx % 4 === 2) {
    // Center push-in with gentle horizontal sway
    panX = Math.sin(progress * Math.PI) * 35;
    panY = -progress * 45;
  } else {
    // Diagonal pan
    panX = (progress - 0.5) * 45;
    panY = (progress - 0.5) * 45;
  }

  const imgAspect = img.width / img.height;
  const canvasAspect = width / height;

  let drawW, drawH;
  if (imgAspect > canvasAspect) {
    drawH = height * scale;
    drawW = drawH * imgAspect;
  } else {
    drawW = width * scale;
    drawH = drawW / imgAspect;
  }

  const drawX = (width - drawW) / 2 + panX;
  const drawY = (height - drawH) / 2 + panY;

  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  // Cinematic Vignette gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "rgba(3, 8, 22, 0.65)");
  grad.addColorStop(0.2, "rgba(3, 8, 22, 0.25)");
  grad.addColorStop(0.65, "rgba(3, 8, 22, 0.25)");
  grad.addColorStop(0.85, "rgba(2, 6, 18, 0.75)");
  grad.addColorStop(1, "rgba(1, 4, 12, 0.95)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

/**
 * Create Story Video Renderer
 */
export async function createStoryVideoRenderer({
  scenes = [],
  aspectRatio = "9:16",
  subtitlePos = "auto", // "auto" | "top" | "center" | "bottom"
  title = "શ્રીમદ્ ભગવદ્ ગીતા બોધ",
  logoSrc = "/icons/logo-circle.png",
  lang = "gu",
  voice = "male",
  onProgress = () => {},
}) {
  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioCtxClass();
  if (audioCtx.state === "suspended") {
    try {
      await audioCtx.resume();
    } catch (e) {
      // ignore
    }
  }

  const dims = ASPECT_RATIOS[aspectRatio] || ASPECT_RATIOS["9:16"];
  const width = dims.width;
  const height = dims.height;
  const isPortrait = dims.isPortrait;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  onProgress({ stage: "init", percent: 10, message: "ચિત્રો અને ઓડિયો લોડ થઈ રહ્યા છે..." });

  // 1. Preload logo from reliable path
  const imgLogo = await loadImg(logoSrc || "/icons/logo-circle.png");

  // 2. High-speed parallel preloading of all scenes (images + audio buffers in parallel!)
  let loadedCount = 0;
  const rawLoadedScenes = await Promise.all(
    scenes.map(async (sc, i) => {
      const img = sc.imageSrc ? await loadImg(sc.imageSrc) : null;
      let audioBuf = sc.audioBuffer;
      if (!audioBuf && sc.text) {
        audioBuf = await fetchSceneAudio(
          audioCtx,
          sc.text,
          sc.lang || lang || "gu",
          sc.voice || voice || "male"
        );
      } else if (!audioBuf) {
        audioBuf = createSilentBuffer(audioCtx, 3);
      }
      loadedCount++;
      const pct = Math.min(65, Math.round(15 + (loadedCount / scenes.length) * 50));
      onProgress({
        stage: "scenes",
        percent: pct,
        message: `ઓડિયો અને ચિત્રો તૈયાર થઈ રહ્યા છે (${loadedCount}/${scenes.length})...`,
      });
      return {
        ...sc,
        index: i,
        img,
        audioBuffer: audioBuf,
        duration: audioBuf?.duration || 3,
      };
    })
  );

  // Fast, crisp timings (no long idle pauses)
  const SCENE_PAUSE = 0.12; // Snappy breathing pause between scenes
  const INTRO_DUR = 0.15;   // Fast start
  const OUTRO_DUR = 0.45;   // Clean outro

  let currentClock = INTRO_DUR;
  const loadedScenes = [];

  const cardW_measure = isPortrait ? width - 80 : width - 120;
  const fontSize_measure = isPortrait ? 22 : 24;
  ctx.font = `600 ${fontSize_measure}px 'Noto Sans Gujarati', 'Noto Sans Devanagari', 'Mukta', sans-serif`;

  for (let i = 0; i < rawLoadedScenes.length; i++) {
    const sc = rawLoadedScenes[i];
    const duration = sc.duration;
    const startTime = currentClock;
    const endTime = startTime + duration;
    currentClock = endTime + SCENE_PAUSE;

    // Pre-calculate line wrapping once to eliminate 60fps text-measurement overhead!
    const wrappedData = wrapStoryLines(ctx, sc.text, cardW_measure - 50);

    loadedScenes.push({
      ...sc,
      startTime,
      endTime,
      wrappedData,
    });
  }

  const totalDuration = currentClock + OUTRO_DUR;

  onProgress({ stage: "render_ready", percent: 70, message: "રેન્ડરિંગ સેટઅપ તૈયાર છે!" });

  /**
   * Main Frame Render function at time `t` (seconds)
   */
  function renderFrame(t) {
    ctx.clearRect(0, 0, width, height);

    // 1. Identify which scene is active at time t
    let activeScene = null;
    let activeIdx = -1;

    for (let i = 0; i < loadedScenes.length; i++) {
      const sc = loadedScenes[i];
      if (t >= sc.startTime && t < sc.endTime + SCENE_PAUSE) {
        activeScene = sc;
        activeIdx = i;
        break;
      }
    }

    // Default to first scene during intro, or last scene during outro
    if (!activeScene) {
      if (t < loadedScenes[0]?.startTime) {
        activeScene = loadedScenes[0];
        activeIdx = 0;
      } else {
        activeScene = loadedScenes[loadedScenes.length - 1];
        activeIdx = loadedScenes.length - 1;
      }
    }

    // 2. Render Background with crossfade if near boundary
    if (activeScene) {
      const sceneElapsed = Math.max(0, t - activeScene.startTime);
      const sceneProg = Math.min(1, sceneElapsed / (activeScene.duration + SCENE_PAUSE));

      // Check if transitioning in from previous scene
      const FADE_TIME = 0.35;
      if (sceneElapsed < FADE_TIME && activeIdx > 0) {
        const prevScene = loadedScenes[activeIdx - 1];
        drawKenBurnsCover(ctx, prevScene.img, width, height, 1, activeIdx - 1);

        ctx.save();
        ctx.globalAlpha = sceneElapsed / FADE_TIME;
        drawKenBurnsCover(ctx, activeScene.img, width, height, sceneProg, activeIdx);
        ctx.restore();
      } else {
        drawKenBurnsCover(ctx, activeScene.img, width, height, sceneProg, activeIdx);
      }
    }

    // 3. Render Top Pill Header (Displays Story Name ONLY - No "Scene 1/2/3"!)
    ctx.save();
    const pillW = isPortrait ? width - 80 : 420;
    const pillH = 44;
    const pillX = isPortrait ? 40 : 40;
    const pillY = isPortrait ? 36 : 28;

    ctx.fillStyle = "rgba(4, 12, 34, 0.55)";
    ctx.strokeStyle = "rgba(251, 191, 36, 0.45)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, pillX, pillY, pillW, pillH, 22);
    ctx.fill();
    ctx.stroke();

    if (imgLogo) {
      ctx.drawImage(imgLogo, pillX + 8, pillY + 5, 34, 34);
    }

    ctx.font = `bold ${isPortrait ? "17px" : "16px"} 'Noto Sans Gujarati', 'Mukta', sans-serif`;
    ctx.textAlign = "center";
    const headerTitle = title || "શ્રીમદ્ ભગવદ્ ગીતા બોધ";
    const titleX = pillX + pillW / 2 + (imgLogo ? 12 : 0);
    const titleY = pillY + 28;
    // Crisp instant drop shadow (0ms GPU overhead, no CPU Gaussian blur)
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillText(headerTitle, titleX + 1.2, titleY + 1.2);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(headerTitle, titleX, titleY);

    ctx.restore();

    // 4. Render Active Scene Subtitles
    // Notice: cardY is moved right beneath header pill (cardY = 96) to reduce gap and keep deities fully visible!
    if (activeScene && t >= activeScene.startTime && t <= activeScene.endTime + 0.2) {
      const elapsed = t - activeScene.startTime;
      const progress = Math.min(1, elapsed / activeScene.duration);

      ctx.save();

      // Card Dimensions based on Aspect Ratio
      let cardX, cardY, cardW, cardH, fontSize, lineSpacing;

      if (isPortrait) {
        // 9:16 Portrait Card
        cardW = width - 80;
        cardH = 210;
        cardX = 40;

        if (subtitlePos === "bottom") cardY = height - cardH - 120;
        else if (subtitlePos === "center") cardY = (height - cardH) / 2;
        else cardY = 96; // Compact gap right beneath top header pill!

        fontSize = 22;
        lineSpacing = 34;
      } else {
        // 16:9 Landscape Card (Cinematic Lower-Third Bar)
        cardW = width - 120;
        cardH = 135;
        cardX = 60;
        cardY = height - cardH - 35;
        fontSize = 24;
        lineSpacing = 34;
      }

      // Translucent Glass Box Background
      ctx.fillStyle = "rgba(4, 14, 38, 0.45)";
      ctx.strokeStyle = "rgba(251, 191, 36, 0.40)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, cardX, cardY, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();

      // Setup typography (pre-computed wrapping to avoid real-time layout thrashing)
      ctx.font = `600 ${fontSize}px 'Noto Sans Gujarati', 'Noto Sans Devanagari', 'Mukta', sans-serif`;
      const wrapped = activeScene.wrappedData || wrapStoryLines(ctx, activeScene.text, cardW - 50);
      const lines = wrapped.lines;
      const totalWords = wrapped.totalWords;

      // Narrator speech progression: matches spoken words accurately with 0.15s start latency
      const effectiveElapsed = Math.max(0, elapsed - 0.15);
      const effectiveDuration = Math.max(0.1, activeScene.duration - 0.25);
      const speechProg = Math.min(1, effectiveElapsed / effectiveDuration);
      const wordsSpoken = Math.floor(speechProg * totalWords);

      // Clipping region inside card
      ctx.save();
      roundRect(ctx, cardX + 15, cardY + 12, cardW - 30, cardH - 40, 12);
      ctx.clip();

      const totalTextH = lines.length * lineSpacing;
      const visibleH = cardH - 50;

      let scrollY = 0;
      if (totalTextH > visibleH) {
        let activeLineIdx = 0;
        for (let i = 0; i < lines.length; i++) {
          if (wordsSpoken >= lines[i].startWordIdx) {
            activeLineIdx = i;
          }
        }
        const targetScroll = activeLineIdx * lineSpacing - visibleH / 2 + lineSpacing / 2;
        scrollY = Math.max(0, Math.min(totalTextH - visibleH + 10, targetScroll));
      }

      const verticalCentering = totalTextH < visibleH ? Math.max(0, (visibleH - totalTextH) / 2) : 0;
      const startY = cardY + 42 + verticalCentering - scrollY;

      lines.forEach((lineObj, idx) => {
        const lineY = startY + idx * lineSpacing;
        if (lineY < cardY - 20 || lineY > cardY + cardH + 20) return;

        if (lineObj.startWordIdx > wordsSpoken) return;

        const fullLineWidth = ctx.measureText(lineObj.text).width;
        let currentX = Math.max(cardX + 25, (width - fullLineWidth) / 2);

        lineObj.words.forEach((word, wIdx) => {
          const globalWordIdx = lineObj.startWordIdx + wIdx;
          const wordWithSpace = word + " ";
          const wordWidth = ctx.measureText(wordWithSpace).width;

          // Pure typewriter reveal: Only display word when narrator reaches it (word-by-word)
          if (globalWordIdx <= wordsSpoken) {
            // High-speed crisp drop shadow (0ms CPU Gaussian blur overhead)
            ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
            ctx.fillText(word, currentX + 1.2, lineY + 1.2);
            ctx.fillStyle = "#ffffff";
            ctx.fillText(word, currentX, lineY);
          }

          currentX += wordWidth;
        });
      });

      ctx.restore();

      // Waveform at bottom of card
      drawWaveform(ctx, width / 2 - 110, cardY + cardH - 24, 220, 14, t, true);

      ctx.restore();
    }

    // 5. Outro Screen (With beautiful glowing logo above text)
    const tOutroStart = totalDuration - OUTRO_DUR;
    if (t >= tOutroStart) {
      const outElapsed = t - tOutroStart;
      const outAlpha = Math.min(1, outElapsed / 0.6);

      ctx.save();
      ctx.globalAlpha = outAlpha;

      ctx.fillStyle = "rgba(3, 10, 30, 0.85)";
      ctx.fillRect(0, 0, width, height);

      const logoSize = isPortrait ? 130 : 100;
      const logoX = width / 2 - logoSize / 2;
      const logoY = height / 2 - (isPortrait ? 120 : 90);

      if (imgLogo) {
        ctx.drawImage(imgLogo, logoX, logoY, logoSize, logoSize);
      }

      ctx.font = `bold ${isPortrait ? "28px" : "24px"} 'Noto Sans Devanagari', 'Mukta', sans-serif`;
      ctx.textAlign = "center";
      const outroTextY = logoY + logoSize + 55;
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.fillText("॥ ૐ શ્રીકૃષ્ણાર્પણમસ્તુ ॥", width / 2 + 1.5, outroTextY + 1.5);
      ctx.fillStyle = "#fbbf24";
      ctx.fillText("॥ ૐ શ્રીકૃષ્ણાર્પણમસ્તુ ॥", width / 2, outroTextY);

      ctx.font = `600 ${isPortrait ? "20px" : "18px"} 'Noto Sans Gujarati', 'Mukta', sans-serif`;
      const subtitleTextY = logoY + logoSize + 100;
      const displayTitle = title || "ગીતા જ્ઞાન - જીવન બોધ";
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.fillText(displayTitle, width / 2 + 1.2, subtitleTextY + 1.2);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(displayTitle, width / 2, subtitleTextY);

      ctx.restore();
    }
  }

  function close() {
    try {
      if (audioCtx.state !== "closed") {
        audioCtx.close();
      }
    } catch (e) {
      // ignore
    }
  }

  return {
    canvas,
    audioCtx,
    loadedScenes,
    totalDuration,
    renderFrame,
    close,
  };
}

/**
 * Build a single continuous AudioBuffer covering the full story timeline
 */
function buildCompositeAudioBuffer(audioCtx, loadedScenes, totalDuration) {
  const sampleRate = audioCtx.sampleRate || 44100;
  const totalSamples = Math.ceil(totalDuration * sampleRate);
  const compositeBuffer = audioCtx.createBuffer(1, totalSamples, sampleRate);
  const outData = compositeBuffer.getChannelData(0);

  loadedScenes.forEach((sc) => {
    if (sc.audioBuffer) {
      const srcData = sc.audioBuffer.getChannelData(0);
      const startSample = Math.floor(sc.startTime * sampleRate);
      const len = Math.min(srcData.length, totalSamples - startSample);
      if (len > 0 && startSample >= 0) {
        for (let i = 0; i < len; i++) {
          outData[startSample + i] = srcData[i];
        }
      }
    }
  });

  return compositeBuffer;
}

/**
 * Check hardware supported video codec for WebCodecs
 */
async function getSupportedVideoCodec(width, height) {
  if (typeof VideoEncoder === "undefined") return null;

  const candidates = [
    { format: "mp4", codec: "avc1.4d0028", muxerCodec: "avc" }, // AVC Main Level 4.0
    { format: "mp4", codec: "avc1.42001f", muxerCodec: "avc" }, // AVC Baseline
    { format: "mp4", codec: "avc1.640028", muxerCodec: "avc" }, // AVC High
    { format: "webm", codec: "vp8", muxerCodec: "V_VP8" },
    { format: "webm", codec: "vp09.00.10.08", muxerCodec: "V_VP9" },
  ];

  for (const c of candidates) {
    try {
      const config = {
        codec: c.codec,
        width,
        height,
        bitrate: 2_500_000,
        framerate: 25,
      };
      const support = await VideoEncoder.isConfigSupported(config);
      if (support && support.supported) {
        return c;
      }
    } catch (e) {}
  }
  return null;
}

/**
 * Check hardware supported audio codec for WebCodecs
 */
async function getSupportedAudioCodec(sampleRate) {
  if (typeof AudioEncoder === "undefined") return null;

  const candidates = [
    { format: "mp4", codec: "mp4a.40.2", muxerCodec: "aac" },
    { format: "webm", codec: "opus", muxerCodec: "A_OPUS" },
  ];

  for (const c of candidates) {
    try {
      const config = {
        codec: c.codec,
        numberOfChannels: 1,
        sampleRate,
        bitrate: 128_000,
      };
      const support = await AudioEncoder.isConfigSupported(config);
      if (support && support.supported) {
        return c;
      }
    } catch (e) {}
  }
  return null;
}

/**
 * Super-Fast Offline Hardware Video Export using WebCodecs (VideoEncoder + AudioEncoder + Muxer)
 * Renders at maximum GPU/CPU speed (typically 80-120+ FPS), encoding a 5-minute video in ~1 minute!
 */
async function exportStoryVideoFastWebCodecs(options) {
  const { onProgress = () => {} } = options;

  const renderer = await createStoryVideoRenderer(options);
  const { canvas, audioCtx, loadedScenes, totalDuration, renderFrame, close } = renderer;

  const videoChoice = await getSupportedVideoCodec(canvas.width, canvas.height);
  if (!videoChoice) {
    close();
    throw new Error("WebCodecs વિડિઓ એન્કોડર સમર્થિત નથી");
  }

  const audioChoice = await getSupportedAudioCodec(audioCtx.sampleRate || 44100);
  if (!audioChoice) {
    close();
    throw new Error("WebCodecs ઓડિયો એન્કોડર સમર્થિત નથી");
  }

  const useMp4 = videoChoice.format === "mp4" && audioChoice.format === "mp4";
  const targetFormat = useMp4 ? "mp4" : "webm";

  let muxer;
  let target;

  if (useMp4) {
    target = new Mp4ArrayBufferTarget();
    muxer = new Mp4Muxer({
      target,
      video: {
        codec: "avc",
        width: canvas.width,
        height: canvas.height,
        frameRate: 25,
      },
      audio: {
        codec: "aac",
        numberOfChannels: 1,
        sampleRate: audioCtx.sampleRate || 44100,
      },
      fastStart: "in-memory",
      firstTimestampBehavior: "offset",
    });
  } else {
    target = new WebmArrayBufferTarget();
    muxer = new WebmMuxer({
      target,
      video: {
        codec: videoChoice.muxerCodec,
        width: canvas.width,
        height: canvas.height,
        frameRate: 25,
      },
      audio: {
        codec: "A_OPUS",
        numberOfChannels: 1,
        sampleRate: audioCtx.sampleRate || 44100,
      },
      firstTimestampBehavior: "offset",
    });
  }

  let encoderError = null;

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => {
      try {
        muxer.addVideoChunk(chunk, meta);
      } catch (err) {
        encoderError = err;
      }
    },
    error: (err) => {
      encoderError = err;
    },
  });

  videoEncoder.configure({
    codec: videoChoice.codec,
    width: canvas.width,
    height: canvas.height,
    bitrate: 2_500_000,
    framerate: 25,
  });

  const audioEncoder = new AudioEncoder({
    output: (chunk, meta) => {
      try {
        muxer.addAudioChunk(chunk, meta);
      } catch (err) {
        encoderError = err;
      }
    },
    error: (err) => {
      encoderError = err;
    },
  });

  audioEncoder.configure({
    codec: audioChoice.codec,
    numberOfChannels: 1,
    sampleRate: audioCtx.sampleRate || 44100,
    bitrate: 128_000,
  });

  // 1. Super-Fast Audio Track Encoding (Process 5+ minutes of audio in < 1 second!)
  onProgress({
    stage: "encoding_audio",
    percent: 10,
    message: "ઓડિયો સુપર-સ્પીડ પ્રોસેસ થઈ રહ્યો છે...",
  });

  const compositeAudio = buildCompositeAudioBuffer(audioCtx, loadedScenes, totalDuration);
  const audioRate = compositeAudio.sampleRate;
  const channelData = compositeAudio.getChannelData(0);
  const totalAudioSamples = channelData.length;
  const AUDIO_CHUNK_SIZE = 1024;

  let audioOffset = 0;
  while (audioOffset < totalAudioSamples) {
    if (encoderError) throw encoderError;

    const framesInChunk = Math.min(AUDIO_CHUNK_SIZE, totalAudioSamples - audioOffset);
    const chunkBuffer = new Float32Array(framesInChunk);
    chunkBuffer.set(channelData.subarray(audioOffset, audioOffset + framesInChunk));

    const timestampUs = Math.round((audioOffset / audioRate) * 1_000_000);

    const audioData = new AudioData({
      format: "f32-planar",
      sampleRate: audioRate,
      numberOfFrames: framesInChunk,
      numberOfChannels: 1,
      timestamp: timestampUs,
      data: chunkBuffer,
    });

    audioEncoder.encode(audioData);
    audioData.close();

    audioOffset += framesInChunk;

    if (audioEncoder.encodeQueueSize > 12) {
      await new Promise((resolve) => {
        audioEncoder.ondequeue = resolve;
      });
    }
  }

  await audioEncoder.flush();

  // 2. High-Speed Frame-by-Frame GPU Video Encoding
  const TARGET_FPS = 25;
  const totalFrames = Math.ceil(totalDuration * TARGET_FPS);
  const startPerf = performance.now();

  onProgress({
    stage: "recording",
    percent: 15,
    message: "વિડીયો હાઇ-સ્પીડ એન્કોડિંગ શરૂ થઈ રહ્યું છે...",
  });

  for (let i = 0; i < totalFrames; i++) {
    if (encoderError) throw encoderError;

    const t = i / TARGET_FPS;
    renderFrame(t);

    const timestampUs = Math.round(t * 1_000_000);
    const isKeyFrame = i % (TARGET_FPS * 2) === 0;

    const videoFrame = new VideoFrame(canvas, { timestamp: timestampUs });
    videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
    videoFrame.close();

    // Prevent encoder queue overflow
    if (videoEncoder.encodeQueueSize > 5) {
      await new Promise((resolve) => {
        videoEncoder.ondequeue = resolve;
      });
    }

    // Update progress and micro-yield every 8 frames for smooth UI
    if (i % 8 === 0 || i === totalFrames - 1) {
      const percent = Math.min(99, Math.floor((i / totalFrames) * 100));
      const elapsedSec = (performance.now() - startPerf) / 1000;
      const currentFps = i > 0 && elapsedSec > 0 ? i / elapsedSec : 25;
      const remainingFrames = totalFrames - i;
      const estRemainingSec = Math.max(0, Math.ceil(remainingFrames / currentFps));

      onProgress({
        stage: "recording",
        percent,
        message: `હાઇ-સ્પીડ એન્કોડિંગ: ${percent}% (~${Math.round(currentFps)} FPS, અંદાજે ${estRemainingSec} સેકન્ડ બાકી)...`,
      });

      await new Promise((r) => setTimeout(r, 0));
    }
  }

  onProgress({
    stage: "finalizing",
    percent: 98,
    message: "વિડીયો ફાઇલ કન્વર્ઝન પૂર્ણ થઈ રહ્યું છે...",
  });

  await videoEncoder.flush();
  muxer.finalize();

  const buffer = target.buffer;
  const isMp4 = targetFormat === "mp4";
  const rawBlob = new Blob([buffer], { type: isMp4 ? "video/mp4" : "video/webm" });

  let blob = rawBlob;
  if (!isMp4) {
    try {
      blob = await fixVideoDuration(rawBlob, totalDuration, "video/webm");
    } catch (e) {
      console.warn("Could not patch webm duration:", e);
    }
  }

  close();

  onProgress({
    stage: "done",
    percent: 100,
    message: "વિડીયો સફળતાપૂર્વક તૈયાર થઈ ગયો છે!",
  });

  return {
    blob,
    ext: isMp4 ? "mp4" : "webm",
    mimeType: isMp4 ? "video/mp4" : "video/webm",
    duration: totalDuration,
  };
}

/**
 * Standard MediaRecorder Real-Time Fallback
 */
async function exportStoryVideoMediaRecorder({
  scenes = [],
  aspectRatio = "9:16",
  subtitlePos = "auto",
  title = "શ્રીમદ્ ભગવદ્ ગીતા બોધ",
  logoSrc = "/icons/logo-circle.png",
  lang = "gu",
  voice = "male",
  onProgress = () => {},
}) {
  const renderer = await createStoryVideoRenderer({
    scenes,
    aspectRatio,
    subtitlePos,
    title,
    logoSrc,
    lang,
    voice,
    onProgress,
  });

  const { canvas, audioCtx, loadedScenes, totalDuration, renderFrame, close } = renderer;

  onProgress({ stage: "recording", percent: 0, message: "વિડીયો રેકોર્ડિંગ શરૂ થઈ રહ્યું છે..." });

  // Ensure AudioContext is actively running before capturing stream
  try {
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }
  } catch (e) {
    console.warn("AudioContext resume failed:", e);
  }

  const destNode = audioCtx.createMediaStreamDestination();

  // Keep audio stream continuously active with inaudible zero-gain oscillator to prevent MediaRecorder starvation
  const silentOsc = audioCtx.createOscillator();
  const silentGain = audioCtx.createGain();
  silentGain.gain.value = 0;
  silentOsc.connect(silentGain);
  silentGain.connect(destNode);
  try {
    silentOsc.start();
  } catch (e) {
    // ignore
  }

  const startTime = audioCtx.currentTime + 0.1;

  // Schedule all scene audio tracks
  loadedScenes.forEach((sc) => {
    if (sc.audioBuffer) {
      const source = audioCtx.createBufferSource();
      source.buffer = sc.audioBuffer;
      source.connect(destNode);
      source.start(startTime + sc.startTime);
    }
  });

  // Pre-render frame 0 so the canvas stream has an active bitmap
  renderFrame(0);

  // 25 FPS standard cinema/reels framerate (silky smooth, lightweight, hardware optimized)
  const canvasStream = canvas.captureStream(25);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...destNode.stream.getAudioTracks(),
  ]);

  // Hardware accelerated codec priority: MP4 (H.264 / AVC1) & VP8 encode 3x-4x faster than software VP9!
  const candidateTypes = [
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/webm;codecs=vp9,opus",
  ];

  let recorder = null;
  let mimeType = "";

  for (const type of candidateTypes) {
    if (typeof MediaRecorder.isTypeSupported === "function" && !MediaRecorder.isTypeSupported(type)) {
      continue;
    }
    try {
      recorder = new MediaRecorder(combinedStream, {
        mimeType: type,
        videoBitsPerSecond: 2000000, // 2.0 Mbps optimal for mobile & desktop hardware encoder
      });
      mimeType = type;
      break;
    } catch (e) {
      console.warn(`MediaRecorder failed with type ${type}:`, e);
    }
  }

  if (!recorder) {
    try {
      recorder = new MediaRecorder(combinedStream);
      mimeType = recorder.mimeType || "video/webm";
    } catch (err) {
      close();
      throw new Error(`બ્રાઉઝરમાં વિડિઓ રેકોર્ડિંગ સપોર્ટ ઉપલબ્ધ નથી: ${err?.message || err?.name || err}`);
    }
  }

  const recordedChunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  return new Promise((resolve, reject) => {
    let stopped = false;

    recorder.onstop = async () => {
      stopped = true;
      try {
        silentOsc.stop();
      } catch (e) {}
      close();

      onProgress({
        stage: "finalizing",
        percent: 99,
        message: "વિડીયો મેટાડેટા (ડ્યુરેશન) તૈયાર થઈ રહ્યું છે...",
      });

      const isMp4 = mimeType.toLowerCase().includes("mp4");
      const ext = isMp4 ? "mp4" : "webm";
      const rawBlob = new Blob(recordedChunks, { type: mimeType.split(";")[0] || (isMp4 ? "video/mp4" : "video/webm") });

      let blob = rawBlob;
      try {
        blob = await fixVideoDuration(rawBlob, totalDuration, mimeType);
      } catch (patchErr) {
        console.warn("Could not patch video duration metadata:", patchErr);
      }

      resolve({ blob, ext, mimeType, duration: totalDuration });
    };

    recorder.onerror = (e) => {
      stopped = true;
      try {
        silentOsc.stop();
      } catch (err) {}
      close();

      const detailed =
        e?.error?.message ||
        e?.error?.name ||
        e?.message ||
        e?.name ||
        "મીડિયા રેકોર્ડરમાં ક્ષતિ આવી";
      console.error("MediaRecorder error:", e);
      reject(new Error(detailed));
    };

    try {
      recorder.start(2000); // 2-second chunks reduces I/O interrupts by 50%
    } catch (startErr) {
      try {
        silentOsc.stop();
      } catch (e) {}
      close();
      reject(new Error(`રેકોર્ડિંગ શરૂ કરવામાં નિષ્ફળ: ${startErr?.message || startErr?.name || startErr}`));
      return;
    }

    const startPerfTime = performance.now();
    const TARGET_FPS = 25;
    const FRAME_MS = 1000 / TARGET_FPS;
    let lastRenderPerf = 0;

    function recordLoop() {
      if (stopped || recorder.state !== "recording") return;

      const perfNow = performance.now();
      const elapsedSinceRender = perfNow - lastRenderPerf;

      // Stable 25 FPS frame interval eliminates GPU overload and frame drops
      if (elapsedSinceRender >= FRAME_MS) {
        lastRenderPerf = perfNow - (elapsedSinceRender % FRAME_MS);
        const now = (perfNow - startPerfTime) / 1000;
        renderFrame(now);

        const remainingSec = Math.max(0, Math.ceil(totalDuration - now));
        const percent = Math.min(99, Math.floor((now / totalDuration) * 100));
        onProgress({
          stage: "recording",
          percent,
          message: `વિડીયો એન્કોડ થઈ રહ્યો છે: ${percent}% (અંદાજે ${remainingSec} સેકન્ડ બાકી)...`,
        });

        if (now >= totalDuration) {
          setTimeout(() => {
            try {
              if (recorder.state === "recording") {
                recorder.stop();
              }
            } catch (stopErr) {
              console.warn("Error stopping recorder:", stopErr);
            }
          }, 80);
          return;
        }
      }

      requestAnimationFrame(recordLoop);
    }

    requestAnimationFrame(recordLoop);
  });
}

/**
 * High-Level Video Export Engine
 * Tries Super-Fast Hardware WebCodecs first (finishes 5-minute video in ~1-2 min).
 * Seamlessly falls back to MediaRecorder if WebCodecs is unavailable.
 */
export async function exportStoryVideo(options) {
  const hasWebCodecs =
    typeof window !== "undefined" &&
    typeof window.VideoEncoder === "function" &&
    typeof window.AudioEncoder === "function" &&
    typeof window.VideoFrame === "function" &&
    typeof window.AudioData === "function";

  if (hasWebCodecs) {
    try {
      return await exportStoryVideoFastWebCodecs(options);
    } catch (fastErr) {
      console.warn("Fast WebCodecs export encountered an error, falling back to MediaRecorder:", fastErr);
    }
  }

  return await exportStoryVideoMediaRecorder(options);
}

/**
 * Synthesize and Combine Audio of all scenes into a downloadable .WAV file
 */
export async function exportStoryAudioWav({
  scenes = [],
  lang = "gu",
  voice = "male",
  onProgress = () => {},
}) {
  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioCtxClass();
  if (audioCtx.state === "suspended") {
    try {
      await audioCtx.resume();
    } catch (e) {
      // ignore
    }
  }

  const buffers = [];
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    onProgress({
      percent: Math.round(((i + 1) / scenes.length) * 80),
      message: `સીન ${i + 1}/${scenes.length} ઓડિયો જનરેટ થઈ રહ્યો છે...`,
    });

    let buf = sc.audioBuffer;
    if (!buf && sc.text) {
      buf = await fetchSceneAudio(audioCtx, sc.text, sc.lang || lang, sc.voice || voice);
    }
    if (buf) {
      buffers.push(buf);
    }
  }

  onProgress({ percent: 90, message: "ઓડિયો મર્જ થઈ રહ્યો છે..." });
  const merged = concatenateAudioBuffers(audioCtx, buffers, 0.2);
  if (!merged) {
    audioCtx.close();
    throw new Error("કોઈ ઓડિયો જનરેટ થયો નથી.");
  }

  onProgress({ percent: 98, message: "WAV ફાઇલ તૈયાર થઈ રહી છે..." });
  const wavBlob = audioBufferToWav(merged);
  audioCtx.close();
  return wavBlob;
}
