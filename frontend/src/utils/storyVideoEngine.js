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
export function concatenateAudioBuffers(audioCtx, buffers, pauseDuration = 0.5) {
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

/**
 * Fetch Audio from Backend TTS API (/api/tts/speak)
 * Tries cloud Render backend and localhost with full male/female voice support
 */
export async function fetchSceneAudio(audioCtx, text, lang = "gu", voice = "male") {
  if (!text || !text.trim()) {
    return createSilentBuffer(audioCtx, 3);
  }

  const isLocalHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  // Determine priority order: if localhost, try 5000 first, else cloud first
  const endpoints = isLocalHost
    ? [
        "http://localhost:5000",
        "https://bhagavad-gita-backend-jy1a.onrender.com",
      ]
    : [
        "https://bhagavad-gita-backend-jy1a.onrender.com",
        "http://localhost:5000",
      ];

  for (const base of endpoints) {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 12000); // 12s timeout per endpoint

      const res = await fetch(`${base}/api/tts/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          lang: lang || "gu",
          voice: voice === "female" ? "female" : "male",
        }),
        signal: ctrl.signal,
      });

      clearTimeout(tid);

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        if (arrayBuffer && arrayBuffer.byteLength > 200) {
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          return audioBuffer;
        }
      }
    } catch (err) {
      // Continue to next endpoint
      console.warn(`TTS fetch failed on ${base}:`, err.message);
    }
  }

  console.warn("Could not fetch TTS audio from any backend, using silent fallback");
  const wordCount = text.trim().split(/\s+/).length;
  const estDuration = Math.max(3, Math.round(wordCount / 2.5));
  return createSilentBuffer(audioCtx, estDuration);
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
    img.crossOrigin = "anonymous";
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
  const words = text
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

  for (let i = 0; i < bars; i++) {
    const freq = 3.5 + (i % 5) * 1.8;
    const wave = isPlaying ? Math.abs(Math.sin(t * freq + i * 0.45)) : 0.15;
    const barH = Math.max(3, wave * h);
    const bx = startX + i * (barW + 3);
    const by = y + (h - barH) / 2;

    const grad = ctx.createLinearGradient(0, by, 0, by + barH);
    grad.addColorStop(0, "#fbbf24");
    grad.addColorStop(1, "#f59e0b");
    ctx.fillStyle = grad;
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

  // 2. Preload scene images and calculate timings
  const loadedScenes = [];
  const SCENE_PAUSE = 0.45; // 0.45s breathing pause between scenes
  const INTRO_DUR = 0.8;
  const OUTRO_DUR = 1.8;

  let currentClock = INTRO_DUR;

  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    onProgress({
      stage: "scenes",
      percent: Math.round(15 + (i / scenes.length) * 45),
      message: `સીન ${i + 1}/${scenes.length} ઓડિયો અને ચિત્ર તૈયાર થઈ રહ્યા છે...`,
    });

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

    const duration = audioBuf.duration || 3;
    const startTime = currentClock;
    const endTime = startTime + duration;
    currentClock = endTime + SCENE_PAUSE;

    loadedScenes.push({
      ...sc,
      index: i,
      img,
      audioBuffer: audioBuf,
      duration,
      startTime,
      endTime,
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

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${isPortrait ? "17px" : "16px"} 'Noto Sans Gujarati', 'Mukta', sans-serif`;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 6;
    const headerTitle = title || "શ્રીમદ્ ભગવદ્ ગીતા બોધ";
    ctx.fillText(headerTitle, pillX + pillW / 2 + (imgLogo ? 12 : 0), pillY + 28);

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
        lineSpacing = 40;
      } else {
        // 16:9 Landscape Card (Cinematic Lower-Third Bar)
        cardW = width - 120;
        cardH = 135;
        cardX = 60;
        cardY = height - cardH - 35;
        fontSize = 24;
        lineSpacing = 38;
      }

      // Translucent Glass Box Background
      ctx.fillStyle = "rgba(4, 14, 38, 0.45)";
      ctx.strokeStyle = "rgba(251, 191, 36, 0.40)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, cardX, cardY, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();

      // Setup typography & line wrapping
      ctx.font = `600 ${fontSize}px 'Noto Sans Gujarati', 'Noto Sans Devanagari', 'Mukta', sans-serif`;
      const { lines, totalWords } = wrapStoryLines(ctx, activeScene.text, cardW - 50);

      const wordsSpoken = Math.floor(progress * totalWords);

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

        lineObj.words.forEach((word) => {
          const wordWithSpace = word + " ";
          const wordWidth = ctx.measureText(wordWithSpace).width;

          // Pure typewriter reveal: crisp white with deep drop shadow (NO yellow/green highlight)
          if (lineObj.startWordIdx <= wordsSpoken) {
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
            ctx.shadowBlur = 8;
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

      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = 25;
      if (imgLogo) {
        ctx.drawImage(imgLogo, logoX, logoY, logoSize, logoSize);
      }

      ctx.fillStyle = "#fbbf24";
      ctx.font = `bold ${isPortrait ? "28px" : "24px"} 'Noto Sans Devanagari', 'Mukta', sans-serif`;
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
      ctx.shadowBlur = 8;
      ctx.fillText("॥ ૐ શ્રીકૃષ્ણાર્પણમસ્તુ ॥", width / 2, logoY + logoSize + 55);

      ctx.fillStyle = "#ffffff";
      ctx.font = `600 ${isPortrait ? "20px" : "18px"} 'Noto Sans Gujarati', 'Mukta', sans-serif`;
      ctx.fillText(title || "ગીતા જ્ઞાન - જીવન બોધ", width / 2, logoY + logoSize + 100);

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
 * Record & Export Video using MediaRecorder
 */
export async function exportStoryVideo({
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

  onProgress({ stage: "recording", percent: 0, message: "વિડીયો રેકોર્ડ થઈ રહ્યો છે..." });

  const destNode = audioCtx.createMediaStreamDestination();
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

  const canvasStream = canvas.captureStream(30);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...destNode.stream.getAudioTracks(),
  ]);

  let mimeType = "video/webm;codecs=vp9,opus";
  if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1,mp4a.40.2")) {
    mimeType = "video/mp4;codecs=avc1,mp4a.40.2";
  } else if (MediaRecorder.isTypeSupported("video/mp4")) {
    mimeType = "video/mp4";
  } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
    mimeType = "video/webm;codecs=vp8,opus";
  } else if (MediaRecorder.isTypeSupported("video/webm")) {
    mimeType = "video/webm";
  }

  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 3800000,
  });

  const recordedChunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      close();
      const ext = "mp4";
      const blob = new Blob(recordedChunks, { type: mimeType.split(";")[0] });
      resolve({ blob, ext, mimeType, duration: totalDuration });
    };

    recorder.onerror = (e) => {
      close();
      reject(e);
    };

    recorder.start();

    const startPerfTime = performance.now();

    function recordLoop() {
      const now = (performance.now() - startPerfTime) / 1000;
      renderFrame(now);

      const percent = Math.min(99, Math.floor((now / totalDuration) * 100));
      onProgress({
        stage: "recording",
        percent,
        message: `વિડીયો એન્કોડ થઈ રહ્યો છે: ${percent}%...`,
      });

      if (now < totalDuration) {
        requestAnimationFrame(recordLoop);
      } else {
        setTimeout(() => {
          if (recorder.state === "recording") {
            recorder.stop();
          }
        }, 300);
      }
    }

    recordLoop();
  });
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
  const merged = concatenateAudioBuffers(audioCtx, buffers, 0.45);
  if (!merged) {
    audioCtx.close();
    throw new Error("કોઈ ઓડિયો જનરેટ થયો નથી.");
  }

  onProgress({ percent: 98, message: "WAV ફાઇલ તૈયાર થઈ રહી છે..." });
  const wavBlob = audioBufferToWav(merged);
  audioCtx.close();
  return wavBlob;
}
