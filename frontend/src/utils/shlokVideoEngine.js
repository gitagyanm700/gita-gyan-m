/**
 * ====================================================================
 * BHAGAVAD GITA - 9:16 HD CINEMATIC SHLOKA VIDEO ENGINE
 * Multi-Language (Gujarati / Hindi / English)
 * Dynamic Story Scenes (Dhritarashtra, Arjuna, Krishna, Gita Wisdom)
 * Synchronized Typewriter / Karaoke Subtitles
 * Clean Scene Exits (Shloka fades out -> Translation fades out -> Message)
 * Pure Client-Side GPU Canvas + Web Audio + MediaRecorder (Zero Server Cost)
 * ====================================================================
 */

import { getValidToken } from "./authHelper.js";

// Scene background image paths
export const SCENE_IMAGES = {
  dhritarashtra: "/images/scenes/scene_dhritarashtra_sanjaya.jpg",
  arjuna: "/images/scenes/scene_arjuna_chariot.jpg",
  krishna: "/images/scenes/scene_krishna_updesh.jpg",
  wisdom: "/images/scenes/scene_gita_wisdom.jpg",
  defaultBg: "/images/gita-background-mobile.jpg",
  logo: "/icons/logo-circle.png",
};

/**
 * Determine the visual scene based on speaker and chapter context
 */
export function detectShlokScenes(shlok) {
  const speaker = String(shlok.speaker || shlok.speakerGu || "").toLowerCase();
  const chNum = Number(shlok.chapterNumber) || 1;

  // Scene 1 Background (Shloka Recitation)
  let scene1Bg = SCENE_IMAGES.krishna;
  let speakerRole = "શ્રીભગવાન";

  if (speaker.includes("ધૃતરાષ્ટ્ર") || speaker.includes("धृतराष्ट्र") || speaker.includes("dhritarashtra")) {
    scene1Bg = SCENE_IMAGES.dhritarashtra;
    speakerRole = "ધૃતરાષ્ટ્ર";
  } else if (speaker.includes("સંજય") || speaker.includes("संजय") || speaker.includes("sanjaya")) {
    scene1Bg = SCENE_IMAGES.arjuna;
    speakerRole = "સંજય";
  } else if (speaker.includes("અર્જુન") || speaker.includes("अर्जुन") || speaker.includes("arjuna")) {
    scene1Bg = SCENE_IMAGES.arjuna;
    speakerRole = "અર્જુન";
  } else {
    scene1Bg = SCENE_IMAGES.krishna;
    speakerRole = "શ્રીભગવાન";
  }

  // Scene 2 Background (Translation Context)
  let scene2Bg = SCENE_IMAGES.arjuna;
  if (chNum === 11) {
    scene2Bg = `/images/chapter-11.jpg`;
  } else if (scene1Bg === SCENE_IMAGES.dhritarashtra) {
    scene2Bg = SCENE_IMAGES.arjuna;
  } else {
    scene2Bg = `/images/chapter-${chNum}.jpg`;
  }

  // Scene 3 Background (Gita Life Message)
  let scene3Bg = SCENE_IMAGES.wisdom;
  if (chNum === 11) {
    scene3Bg = `/images/chapter-11.jpg`;
  } else if (chNum >= 2 && chNum <= 6) {
    scene3Bg = SCENE_IMAGES.wisdom;
  } else {
    scene3Bg = SCENE_IMAGES.krishna;
  }

  return {
    scene1: scene1Bg,
    scene2: scene2Bg,
    scene3: scene3Bg,
    speakerRole,
  };
}

/**
 * Preload an HTMLImageElement
 */
function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback to default background on error
      const fallback = new Image();
      fallback.crossOrigin = "anonymous";
      fallback.onload = () => resolve(fallback);
      fallback.onerror = () => resolve(null);
      fallback.src = SCENE_IMAGES.defaultBg;
    };
    img.src = src;
  });
}

/**
 * Fetch Audio Buffer from TTS API
 */
async function fetchAudioBuffer(audioCtx, chNum, sNum, type, lang) {
  try {
    const token = getValidToken();
    const isLocalHost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");
    const base = isLocalHost
      ? "http://localhost:5000"
      : "https://bhagavad-gita-backend-jy1a.onrender.com";

    const res = await fetch(
      `${base}/api/tts/download/shlok/${chNum}/${sNum}?type=${type}&lang=${lang}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );

    if (!res.ok) {
      throw new Error(`Audio fetch failed: ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } catch (err) {
    console.warn(`Could not load audio for ${type} (${lang}):`, err);
    return null;
  }
}

/**
 * Create a silent audio buffer fallback if network fails
 */
function createSilentBuffer(audioCtx, durationSec = 5) {
  const rate = audioCtx.sampleRate || 44100;
  return audioCtx.createBuffer(1, Math.floor(rate * durationSec), rate);
}

/**
 * Clean text into word tokens
 */
function tokenizeText(text) {
  if (!text) return [];
  // Split by whitespace
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

/**
 * Word wrap helper for canvas
 */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = words[0] || "";

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Floating Particle System for Celestial Golden Sparkles
 */
class ParticleSystem {
  constructor(count, width, height) {
    this.width = width;
    this.height = height;
    this.particles = Array.from({ length: count }, () => this.createParticle());
  }

  createParticle() {
    return {
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      radius: Math.random() * 2.2 + 0.8,
      speedY: -(Math.random() * 0.6 + 0.25),
      speedX: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.7 + 0.2,
      pulse: Math.random() * Math.PI * 2,
    };
  }

  update() {
    this.particles.forEach((p) => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.pulse += 0.04;
      if (p.y < -10) {
        p.y = this.height + 10;
        p.x = Math.random() * this.width;
      }
    });
  }

  draw(ctx) {
    ctx.save();
    this.particles.forEach((p) => {
      const a = p.alpha * (0.6 + 0.4 * Math.sin(p.pulse));
      ctx.fillStyle = `rgba(251, 191, 36, ${a})`;
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }
}

/**
 * MAIN SHLOKA VIDEO RENDERER
 */
export async function createShlokVideoRenderer({
  shlok,
  lang = "gu",
  width = 720,
  height = 1280, // 9:16 Aspect Ratio
  onProgress = () => {},
}) {
  onProgress({ stage: "init", percent: 5, message: "ઓડિયો અને દિવ્ય દ્રશ્યો લોડ થઈ રહ્યા છે..." });

  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioCtxClass();

  const chNum = shlok.chapterNumber;
  const sNum = shlok.shlokNumber;

  // 1. Scene detection
  const scenes = detectShlokScenes(shlok);

  // 2. Preload images
  onProgress({ stage: "images", percent: 15, message: "3D બેકગ્રાઉન્ડ આર્ટવર્ક લોડ થઈ રહ્યું છે..." });
  const [imgScene1, imgScene2, imgScene3, imgLogo] = await Promise.all([
    preloadImage(scenes.scene1),
    preloadImage(scenes.scene2),
    preloadImage(scenes.scene3),
    preloadImage(SCENE_IMAGES.logo),
  ]);

  // 3. Preload audio tracks for all 3 scenes
  onProgress({ stage: "audio", percent: 30, message: "સંસ્કૃત, અનુવાદ અને સંદેશ ઓડિયો તૈયાર થઈ રહ્યો છે..." });
  const [saBufRaw, trBufRaw, msgBufRaw] = await Promise.all([
    fetchAudioBuffer(audioCtx, chNum, sNum, "sanskrit", "sa"),
    fetchAudioBuffer(audioCtx, chNum, sNum, "translation", lang),
    fetchAudioBuffer(audioCtx, chNum, sNum, "message", lang),
  ]);

  const saBuf = saBufRaw || createSilentBuffer(audioCtx, 6);
  const trBuf = trBufRaw || createSilentBuffer(audioCtx, 8);
  const msgBuf = msgBufRaw || createSilentBuffer(audioCtx, 10);

  // Scene timing calculation (with clean exit padding)
  const SCENE_EXIT_PAUSE = 0.8; // Time given for text to exit cleanly
  const INTRO_PAD = 0.6;
  const OUTRO_DURATION = 2.2;

  const tIntroEnd = INTRO_PAD;
  const d1 = saBuf.duration;
  const tScene1End = tIntroEnd + d1;
  const tScene2Start = tScene1End + SCENE_EXIT_PAUSE;
  const d2 = trBuf.duration;
  const tScene2End = tScene2Start + d2;
  const tScene3Start = tScene2End + SCENE_EXIT_PAUSE;
  const d3 = msgBuf.duration;
  const tScene3End = tScene3Start + d3;
  const totalDuration = tScene3End + OUTRO_DURATION;

  // Extract texts based on selected language
  const sanskritText = String(shlok.sanskrit || "").trim();
  const translationText = String(
    lang === "hi"
      ? shlok.translationHi || shlok.translation
      : lang === "en"
      ? shlok.translationEn || shlok.translation
      : shlok.translation || ""
  ).trim();

  const messageText = String(
    lang === "hi"
      ? shlok.messageHi || shlok.message
      : lang === "en"
      ? shlok.messageEn || shlok.message
      : shlok.message || ""
  ).trim();

  const chapterName = String(
    lang === "hi"
      ? shlok.chapterNameHi || shlok.chapterName
      : lang === "en"
      ? shlok.chapterNameEn || shlok.chapterName
      : shlok.chapterName || ""
  ).trim();

  const speakerName = String(
    lang === "hi"
      ? shlok.speakerHi || shlok.speaker
      : lang === "en"
      ? shlok.speakerEn || shlok.speaker
      : shlok.speaker || ""
  ).trim();

  const saWords = tokenizeText(sanskritText);
  const trWords = tokenizeText(translationText);
  const msgWords = tokenizeText(messageText);

  // Setup offscreen / live canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const particles = new ParticleSystem(40, width, height);

  // UI labels per language
  const labels = {
    gu: {
      chapter: `અધ્યાય ${chNum} • ${chapterName}`,
      shlok: `શ્લોક ${sNum}`,
      shlokBadge: `॥ ${speakerName} ઉવાચ ॥`,
      transBadge: "ગુજરાતી અનુવાદ",
      msgBadge: "દિવ્ય ગીતા સંદેશ",
      outroTop: "॥ ૐ શ્રીકૃષ્ણાર્પણમસ્તુ ॥",
      outroBottom: "શ્રીમદ્ભગવદ્ગીતા • Gita Gyan",
    },
    hi: {
      chapter: `अध्याय ${chNum} • ${chapterName}`,
      shlok: `श्लोक ${sNum}`,
      shlokBadge: `॥ ${speakerName} उवाच ॥`,
      transBadge: "हिन्दी अनुवाद",
      msgBadge: "दिव्य गीता संदेश",
      outroTop: "॥ ॐ श्रीकृष्णार्पणमस्तु ॥",
      outroBottom: "श्रीमद्भगवद्गीता • Gita Gyan",
    },
    en: {
      chapter: `Chapter ${chNum} • ${chapterName}`,
      shlok: `Shloka ${sNum}`,
      shlokBadge: `${speakerName} Said:`,
      transBadge: "English Translation",
      msgBadge: "Gita Life Message",
      outroTop: "॥ Om Tat Sat ॥",
      outroBottom: "Bhagavad Gita • Gita Gyan",
    },
  }[lang] || labels.gu;

  /**
   * Draw a background image with 3D Ken Burns scale & pan
   */
  function drawKenBurnsImage(img, progress, alpha = 1) {
    if (!img) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // Ken burns zoom from 1.0 to 1.12
    const scale = 1.0 + progress * 0.12;
    const panY = -progress * 40;

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

    const drawX = (width - drawW) / 2;
    const drawY = (height - drawH) / 2 + panY;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Deep atmospheric gradient vignette
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "rgba(5, 12, 30, 0.72)");
    grad.addColorStop(0.35, "rgba(5, 12, 30, 0.40)");
    grad.addColorStop(0.65, "rgba(5, 12, 30, 0.75)");
    grad.addColorStop(1, "rgba(2, 6, 18, 0.94)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }

  /**
   * Draw Decorative Golden Border & Badges
   */
  function drawDecorations(currentTime) {
    ctx.save();

    // Outer border thin gold line
    ctx.strokeStyle = "rgba(251, 191, 36, 0.40)";
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    // Inner gold corner accents
    const cornerSize = 24;
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 3;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(22, 22 + cornerSize);
    ctx.lineTo(22, 22);
    ctx.lineTo(22 + cornerSize, 22);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(width - 22 - cornerSize, 22);
    ctx.lineTo(width - 22, 22);
    ctx.lineTo(width - 22, 22 + cornerSize);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(22, height - 22 - cornerSize);
    ctx.lineTo(22, height - 22);
    ctx.lineTo(22 + cornerSize, height - 22);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(width - 22 - cornerSize, height - 22);
    ctx.lineTo(width - 22, height - 22);
    ctx.lineTo(width - 22, height - 22 - cornerSize);
    ctx.stroke();

    // Top Header Pill: Chapter & Shlok
    ctx.fillStyle = "rgba(10, 30, 80, 0.75)";
    ctx.strokeStyle = "rgba(251, 191, 36, 0.50)";
    ctx.lineWidth = 1.5;

    const pillW = width - 80;
    const pillH = 46;
    const pillX = 40;
    const pillY = 38;

    roundRect(ctx, pillX, pillY, pillW, pillH, 23);
    ctx.fill();
    ctx.stroke();

    // Mini Logo Icon
    if (imgLogo) {
      ctx.drawImage(imgLogo, pillX + 8, pillY + 6, 34, 34);
    }

    // Header Text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 17px 'Noto Sans Gujarati', 'Mukta', sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 4;
    ctx.fillText(`${labels.chapter}  •  ${labels.shlok}`, width / 2 + 12, pillY + 29);

    // Bottom subtle brand label
    ctx.fillStyle = "rgba(251, 191, 36, 0.70)";
    ctx.font = "600 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("શ્રીમદ્ભગવદ્ગીતા • Gita Gyan", width / 2, height - 28);

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
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
   * Render single frame at exact timestamp `t`
   */
  function renderFrame(t) {
    ctx.clearRect(0, 0, width, height);

    // ==========================================
    // 1. SCENE SELECTION & BACKGROUND BLEND
    // ==========================================
    if (t < tScene2Start) {
      // SCENE 1: Shloka
      const p1 = Math.min(1, Math.max(0, t / tScene1End));
      drawKenBurnsImage(imgScene1, p1, 1);
    } else if (t < tScene3Start) {
      // SCENE 2: Translation
      const p2 = Math.min(1, Math.max(0, (t - tScene2Start) / d2));
      drawKenBurnsImage(imgScene2, p2, 1);
    } else if (t < tScene3End) {
      // SCENE 3: Message
      const p3 = Math.min(1, Math.max(0, (t - tScene3Start) / d3));
      drawKenBurnsImage(imgScene3, p3, 1);
    } else {
      // OUTRO
      const pOut = Math.min(1, Math.max(0, (t - tScene3End) / OUTRO_DURATION));
      drawKenBurnsImage(imgScene3, pOut, 1);
    }

    // Particles
    particles.update();
    particles.draw(ctx);

    // Header & Frame
    drawDecorations(t);

    // ==========================================
    // 2. TEXT ANIMATION & SCENE TRANSITIONS
    // ==========================================

    // ----- SCENE 1: SHLOKA RECITATION -----
    if (t >= tIntroEnd && t < tScene2Start) {
      const elapsed1 = t - tIntroEnd;
      const progress1 = Math.min(1, elapsed1 / d1);

      // Exit transition: during last SCENE_EXIT_PAUSE seconds, text fades & slides down
      let alpha1 = 1;
      let slideY1 = 0;
      if (t > tScene1End) {
        const exitProg = (t - tScene1End) / SCENE_EXIT_PAUSE;
        alpha1 = Math.max(0, 1 - exitProg);
        slideY1 = exitProg * 40;
      }

      ctx.save();
      ctx.globalAlpha = alpha1;

      // Badge: Speaker
      const badgeY = 130 + slideY1;
      ctx.fillStyle = "rgba(251, 191, 36, 0.20)";
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 1.5;
      roundRect(ctx, width / 2 - 130, badgeY, 260, 40, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 18px 'Noto Sans Devanagari', 'Mukta', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(labels.shlokBadge, width / 2, badgeY + 26);

      // Glass Card for Sanskrit Verse
      const cardX = 40;
      const cardY = 195 + slideY1;
      const cardW = width - 80;
      const cardH = 340;

      ctx.fillStyle = "rgba(6, 18, 48, 0.82)";
      ctx.strokeStyle = "rgba(251, 191, 36, 0.45)";
      ctx.lineWidth = 2;
      roundRect(ctx, cardX, cardY, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();

      // Word-by-Word Sanskrit Typewriter / Karaoke
      const wordsCount1 = Math.floor(progress1 * saWords.length);
      const visibleSanskrit = saWords.slice(0, wordsCount1 + 1).join(" ");

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px 'Noto Sans Devanagari', 'Yatra One', serif";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(251, 191, 36, 0.6)";
      ctx.shadowBlur = 12;

      // Split into 2 or 4 verse lines
      const rawLines = sanskritText.split(/[\n।॥]/).filter((l) => l.trim().length > 0);
      const lines = rawLines.length > 0 ? rawLines : wrapText(ctx, sanskritText, cardW - 50);

      const startY = cardY + 70;
      const lineSpacing = 48;

      lines.forEach((line, idx) => {
        const lineY = startY + idx * lineSpacing;
        // Check how much of this line is revealed
        const isRevealed = line.split(" ").some((w) => visibleSanskrit.includes(w));
        if (isRevealed) {
          ctx.fillStyle = "#fbbf24";
          ctx.fillText(line.trim() + " ॥", width / 2, lineY);
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
          ctx.fillText(line.trim(), width / 2, lineY);
        }
      });

      // Bottom audio pulse bar
      drawAudioWaveform(ctx, width / 2 - 120, cardY + cardH - 35, 240, 20, t);

      ctx.restore();
    }

    // ----- SCENE 2: TRANSLATION (Clean fade in -> Word reveal -> Clean fade out) -----
    if (t >= tScene2Start && t < tScene3Start) {
      const elapsed2 = t - tScene2Start;
      const progress2 = Math.min(1, elapsed2 / d2);

      // Entry fade in (0.4s) & Exit fade out (0.6s)
      let alpha2 = 1;
      let slideY2 = 0;
      if (elapsed2 < 0.4) {
        alpha2 = elapsed2 / 0.4;
      } else if (t > tScene2End) {
        const exitProg = (t - tScene2End) / SCENE_EXIT_PAUSE;
        alpha2 = Math.max(0, 1 - exitProg);
        slideY2 = exitProg * 40;
      }

      ctx.save();
      ctx.globalAlpha = alpha2;

      // Badge: Translation
      const badgeY = 130 + slideY2;
      ctx.fillStyle = "rgba(37, 99, 235, 0.28)";
      ctx.strokeStyle = "#60a5fa";
      ctx.lineWidth = 1.5;
      roundRect(ctx, width / 2 - 140, badgeY, 280, 40, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#93c5fd";
      ctx.font = "bold 17px 'Noto Sans Gujarati', 'Mukta', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`📖  ${labels.transBadge}`, width / 2, badgeY + 26);

      // Translation Glass Card
      const cardX = 40;
      const cardY = 195 + slideY2;
      const cardW = width - 80;
      const cardH = 380;

      ctx.fillStyle = "rgba(8, 24, 60, 0.86)";
      ctx.strokeStyle = "rgba(96, 165, 250, 0.50)";
      ctx.lineWidth = 2;
      roundRect(ctx, cardX, cardY, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();

      // Word-by-Word Translation Karaoke
      const wordsCount2 = Math.floor(progress2 * trWords.length);

      ctx.font = "600 23px 'Noto Sans Gujarati', 'Mukta', sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
      ctx.shadowBlur = 6;

      const lines = wrapText(ctx, translationText, cardW - 50);
      const startY = cardY + 65;
      const lineSpacing = 42;

      // Draw lines with active spoken word highlighting
      let cumulativeWordCount = 0;
      lines.forEach((line, idx) => {
        const lineY = startY + idx * lineSpacing;
        const lineWords = line.split(" ");

        if (cumulativeWordCount + lineWords.length <= wordsCount2) {
          // Fully spoken line
          ctx.fillStyle = "#ffffff";
          ctx.fillText(line, width / 2, lineY);
        } else if (cumulativeWordCount <= wordsCount2) {
          // Currently speaking line
          ctx.fillStyle = "#fbbf24";
          ctx.fillText(line, width / 2, lineY);
        } else {
          // Future line (faint)
          ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
          ctx.fillText(line, width / 2, lineY);
        }
        cumulativeWordCount += lineWords.length;
      });

      drawAudioWaveform(ctx, width / 2 - 120, cardY + cardH - 35, 240, 20, t);

      ctx.restore();
    }

    // ----- SCENE 3: GITA LIFE MESSAGE (Divine Guidance) -----
    if (t >= tScene3Start && t < tScene3End) {
      const elapsed3 = t - tScene3Start;
      const progress3 = Math.min(1, elapsed3 / d3);

      let alpha3 = 1;
      let slideY3 = 0;
      if (elapsed3 < 0.4) {
        alpha3 = elapsed3 / 0.4;
      }

      ctx.save();
      ctx.globalAlpha = alpha3;

      // Badge: Message
      const badgeY = 130 + slideY3;
      ctx.fillStyle = "rgba(245, 158, 11, 0.28)";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.5;
      roundRect(ctx, width / 2 - 145, badgeY, 290, 40, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 17px 'Noto Sans Gujarati', 'Mukta', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`✨  ${labels.msgBadge}`, width / 2, badgeY + 26);

      // Message Card
      const cardX = 40;
      const cardY = 195 + slideY3;
      const cardW = width - 80;
      const cardH = 430;

      ctx.fillStyle = "rgba(10, 25, 60, 0.88)";
      ctx.strokeStyle = "rgba(251, 191, 36, 0.55)";
      ctx.lineWidth = 2;
      roundRect(ctx, cardX, cardY, cardW, cardH, 20);
      ctx.fill();
      ctx.stroke();

      // Word-by-Word Message Reveal
      const wordsCount3 = Math.floor(progress3 * msgWords.length);

      ctx.font = "500 22px 'Noto Sans Gujarati', 'Mukta', sans-serif";
      ctx.textAlign = "center";

      const lines = wrapText(ctx, messageText, cardW - 50);
      const startY = cardY + 60;
      const lineSpacing = 38;

      let cumulativeWords = 0;
      lines.forEach((line, idx) => {
        const lineY = startY + idx * lineSpacing;
        const lineWords = line.split(" ");
        if (cumulativeWords + lineWords.length <= wordsCount3) {
          ctx.fillStyle = "#ffffff";
          ctx.fillText(line, width / 2, lineY);
        } else if (cumulativeWords <= wordsCount3) {
          ctx.fillStyle = "#fde047";
          ctx.fillText(line, width / 2, lineY);
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
          ctx.fillText(line, width / 2, lineY);
        }
        cumulativeWords += lineWords.length;
      });

      drawAudioWaveform(ctx, width / 2 - 120, cardY + cardH - 35, 240, 20, t);

      ctx.restore();
    }

    // ----- OUTRO (Final 2 seconds) -----
    if (t >= tScene3End) {
      const outElapsed = t - tScene3End;
      const outAlpha = Math.min(1, outElapsed / 0.6);

      ctx.save();
      ctx.globalAlpha = outAlpha;

      // Central glowing circle with Logo
      const logoSize = 110;
      const logoX = width / 2 - logoSize / 2;
      const logoY = height / 2 - 120;

      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = 25;
      if (imgLogo) {
        ctx.drawImage(imgLogo, logoX, logoY, logoSize, logoSize);
      }

      // Outro Titles
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 28px 'Noto Sans Devanagari', 'Mukta', sans-serif";
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 8;
      ctx.fillText(labels.outroTop, width / 2, logoY + logoSize + 50);

      ctx.fillStyle = "#ffffff";
      ctx.font = "600 20px 'Noto Sans Gujarati', 'Mukta', sans-serif";
      ctx.fillText(labels.outroBottom, width / 2, logoY + logoSize + 95);

      ctx.restore();
    }
  }

  function drawAudioWaveform(ctx, x, y, w, h, t) {
    ctx.save();
    const bars = 24;
    const barW = w / bars - 4;
    for (let i = 0; i < bars; i++) {
      const barH = Math.abs(Math.sin(t * 5 + i * 0.4)) * h;
      const barX = x + i * (barW + 4);
      const barY = y + (h - barH) / 2;
      ctx.fillStyle = "rgba(251, 191, 36, 0.70)";
      roundRect(ctx, barX, barY, barW, Math.max(3, barH), 2);
      ctx.fill();
    }
    ctx.restore();
  }

  onProgress({ stage: "ready", percent: 100, message: "રેન્ડરર તૈયાર છે!" });

  return {
    canvas,
    audioCtx,
    saBuf,
    trBuf,
    msgBuf,
    totalDuration,
    tScene1End,
    tScene2Start,
    tScene2End,
    tScene3Start,
    tScene3End,
    tIntroEnd,
    renderFrame,
    close: () => {
      try {
        audioCtx.close();
      } catch (e) {}
    },
  };
}

/**
 * Record and Export Shloka Canvas Video as MP4 / WebM
 */
export async function exportShlokVideoMP4({
  shlok,
  lang = "gu",
  width = 720,
  height = 1280,
  onProgress = () => {},
}) {
  const renderer = await createShlokVideoRenderer({
    shlok,
    lang,
    width,
    height,
    onProgress,
  });

  const {
    canvas,
    audioCtx,
    saBuf,
    trBuf,
    msgBuf,
    totalDuration,
    tIntroEnd,
    tScene2Start,
    tScene3Start,
    renderFrame,
    close,
  } = renderer;

  onProgress({ stage: "recording", percent: 0, message: "9:16 વિડીયો રેકોર્ડ થઈ રહ્યો છે..." });

  // Web Audio destination node for capturing audio stream
  const destNode = audioCtx.createMediaStreamDestination();

  // Create audio sources and schedule playback exactly at scene timestamps
  const saSource = audioCtx.createBufferSource();
  saSource.buffer = saBuf;
  saSource.connect(destNode);

  const trSource = audioCtx.createBufferSource();
  trSource.buffer = trBuf;
  trSource.connect(destNode);

  const msgSource = audioCtx.createBufferSource();
  msgSource.buffer = msgBuf;
  msgSource.connect(destNode);

  const startTime = audioCtx.currentTime + 0.1;
  saSource.start(startTime + tIntroEnd);
  trSource.start(startTime + tScene2Start);
  msgSource.start(startTime + tScene3Start);

  // Capture canvas video stream at 30 fps
  const canvasStream = canvas.captureStream(30);

  // Combine audio tracks and video tracks
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...destNode.stream.getAudioTracks(),
  ]);

  // Determine supported mimeType (MP4 or WebM)
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
    videoBitsPerSecond: 3500000, // 3.5 Mbps for crisp HD
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
      const ext = mimeType.includes("mp4") ? "mp4" : "mp4"; // standard mp4 extension works universally
      const blob = new Blob(recordedChunks, { type: mimeType.split(";")[0] });
      resolve({ blob, ext, mimeType });
    };

    recorder.onerror = (e) => {
      close();
      reject(e);
    };

    recorder.start();

    const startPerfTime = performance.now();

    function renderLoop() {
      const now = (performance.now() - startPerfTime) / 1000;
      renderFrame(now);

      const percent = Math.min(99, Math.floor((now / totalDuration) * 100));
      onProgress({
        stage: "recording",
        percent,
        message: `વિડીયો રેન્ડર થઈ રહ્યો છે: ${percent}%...`,
      });

      if (now < totalDuration) {
        requestAnimationFrame(renderLoop);
      } else {
        setTimeout(() => {
          if (recorder.state === "recording") {
            recorder.stop();
          }
        }, 300);
      }
    }

    renderLoop();
  });
}
