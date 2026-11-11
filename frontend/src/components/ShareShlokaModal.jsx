import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Download,
  Copy,
  Check,
  Sparkles,
  Palette,
  MessageCircle
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { isExclusiveSuperAdmin } from "../utils/permissionHelper.js";
import AdminShareSizeSelector from "./AdminShareSizeSelector.jsx";
import {
  DEFAULT_SHARE_CARD_SIZE_ID,
  getShareCardSizePreset
} from "../utils/shareCardSizes.js";
import "./ShareShlokaModal.css";

const THEMES = [
  {
    id: "royal-blue",
    name: "રોયલ બ્લુ",
    nameHi: "रॉयल ब्लू",
    englishName: "Royal Blue",
    primaryGrad: ["#0f2b5c", "#18458b", "#0a1d40"],
    borderGold: "#f5c542",
    innerBorder: "rgba(245, 197, 66, 0.45)",
    headerColor: "#ffe484",
    sanskritColor: "#ffffff",
    sanskritAccent: "#ffd54f",
    sanskritBoxBg: "rgba(255, 255, 255, 0.07)",
    sanskritBoxBorder: "rgba(245, 197, 66, 0.35)",
    translationColor: "#f0f5ff",
    footerColor: "#9bc5fa",
    glowColor: "rgba(37, 99, 235, 0.55)",
    sampleColor: "#18458b"
  },
  {
    id: "saffron-gold",
    name: "દિવ્ય ભગવો",
    nameHi: "दिव्य भगवा",
    englishName: "Divine Saffron",
    primaryGrad: ["#8f2c00", "#b83d02", "#661f00"],
    borderGold: "#ffd54f",
    innerBorder: "rgba(255, 213, 79, 0.5)",
    headerColor: "#fff0a6",
    sanskritColor: "#ffffff",
    sanskritAccent: "#ffe082",
    sanskritBoxBg: "rgba(255, 255, 255, 0.08)",
    sanskritBoxBorder: "rgba(255, 213, 79, 0.4)",
    translationColor: "#fff9f0",
    footerColor: "#ffcc80",
    glowColor: "rgba(249, 115, 22, 0.6)",
    sampleColor: "#b83d02"
  },
  {
    id: "vedic-maroon",
    name: "વેદિક મરૂન",
    nameHi: "वैदिक महरून",
    englishName: "Vedic Maroon",
    primaryGrad: ["#5e0d1b", "#801627", "#420610"],
    borderGold: "#f7d070",
    innerBorder: "rgba(247, 208, 112, 0.45)",
    headerColor: "#ffeaa7",
    sanskritColor: "#ffffff",
    sanskritAccent: "#ffd369",
    sanskritBoxBg: "rgba(255, 255, 255, 0.07)",
    sanskritBoxBorder: "rgba(247, 208, 112, 0.35)",
    translationColor: "#fff0f3",
    footerColor: "#f8b4be",
    glowColor: "rgba(225, 29, 72, 0.5)",
    sampleColor: "#801627"
  },
  {
    id: "surya-gold",
    name: "સૂર્ય પીતાંબર",
    nameHi: "सूर्य पीतांबर",
    englishName: "Surya Pitambar",
    primaryGrad: ["#5e3a00", "#8a5700", "#422800"],
    borderGold: "#ffe57f",
    innerBorder: "rgba(255, 229, 127, 0.45)",
    headerColor: "#fff8d6",
    sanskritColor: "#ffffff",
    sanskritAccent: "#ffe082",
    sanskritBoxBg: "rgba(255, 255, 255, 0.08)",
    sanskritBoxBorder: "rgba(255, 229, 127, 0.35)",
    translationColor: "#fffdf2",
    footerColor: "#ffe57f",
    glowColor: "rgba(245, 158, 11, 0.55)",
    sampleColor: "#8a5700"
  },
  {
    id: "royal-purple",
    name: "રાજવી પર્પલ",
    nameHi: "शाही पर्पल",
    englishName: "Royal Purple",
    primaryGrad: ["#381150", "#541b77", "#240835"],
    borderGold: "#fde047",
    innerBorder: "rgba(253, 224, 71, 0.45)",
    headerColor: "#fae8ff",
    sanskritColor: "#ffffff",
    sanskritAccent: "#e9d5ff",
    sanskritBoxBg: "rgba(255, 255, 255, 0.07)",
    sanskritBoxBorder: "rgba(253, 224, 71, 0.35)",
    translationColor: "#faf5ff",
    footerColor: "#d8b4fe",
    glowColor: "rgba(168, 85, 247, 0.55)",
    sampleColor: "#541b77"
  },
  {
    id: "lotus-rose",
    name: "દિવ્ય પદ્મ",
    nameHi: "दिव्य पद्म",
    englishName: "Divine Lotus",
    primaryGrad: ["#570b28", "#7d133c", "#3b0519"],
    borderGold: "#f9d276",
    innerBorder: "rgba(249, 210, 118, 0.45)",
    headerColor: "#ffe4ec",
    sanskritColor: "#ffffff",
    sanskritAccent: "#fbcfe8",
    sanskritBoxBg: "rgba(255, 255, 255, 0.07)",
    sanskritBoxBorder: "rgba(249, 210, 118, 0.35)",
    translationColor: "#fff0f5",
    footerColor: "#f472b6",
    glowColor: "rgba(225, 29, 100, 0.55)",
    sampleColor: "#7d133c"
  },
  {
    id: "mystic-copper",
    name: "દિવ્ય તાંબ્ર",
    nameHi: "दिव्य ताम्र",
    englishName: "Mystic Copper",
    primaryGrad: ["#4e2810", "#6f3a18", "#381c09"],
    borderGold: "#ffd54f",
    innerBorder: "rgba(255, 213, 79, 0.45)",
    headerColor: "#fff2cd",
    sanskritColor: "#ffffff",
    sanskritAccent: "#f6c343",
    sanskritBoxBg: "rgba(255, 255, 255, 0.08)",
    sanskritBoxBorder: "rgba(255, 213, 79, 0.35)",
    translationColor: "#fef8f0",
    footerColor: "#fcd34d",
    glowColor: "rgba(234, 88, 12, 0.55)",
    sampleColor: "#6f3a18"
  }
];

function drawRoundRect(ctx, x, y, w, h, radius, fillStyle, strokeStyle, lineWidth = 1) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function cleanHtmlText(htmlString) {
  if (!htmlString) return "";

  // Replace <br> and block elements with newlines first so lines are never merged together
  const converted = String(htmlString)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li|blockquote|h[1-6]|tr)>/gi, "\n")
    .replace(/<(div|p|li|blockquote|h[1-6]|tr)[^>]*>/gi, "\n");

  const temp = document.createElement("div");
  temp.innerHTML = converted;

  let text = temp.textContent || temp.innerText || "";

  // Strip any remaining HTML tags
  text = text.replace(/<[^>]*>/g, "");

  // Unescape standard HTML entities
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

  // Normalize line endings and duplicate whitespace
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function preserveUnderlinesInHtml(htmlString) {
  if (!htmlString) return "";
  const str = String(htmlString);
  if (!/<u\b|<ins\b|underline/i.test(str)) {
    return str;
  }

  if (typeof document !== "undefined") {
    try {
      const container = document.createElement("div");
      container.innerHTML = str;

      const allElements = Array.from(container.querySelectorAll("*"));
      const underlineNodes = allElements.filter((el) => {
        const tag = el.tagName.toUpperCase();
        if (tag === "U" || tag === "INS") return true;
        const style = (el.getAttribute("style") || "").toLowerCase();
        return /text-decoration(-line)?\s*:\s*[^;]*underline/i.test(style);
      });

      // Keep only top-level underline nodes to prevent nested markers
      const topLevelUnderlines = underlineNodes.filter((el) => {
        return !underlineNodes.some((other) => other !== el && other.contains(el));
      });

      topLevelUnderlines.forEach((el) => {
        el.innerHTML = `\uE000${el.innerHTML}\uE001`;
      });

      return container.innerHTML;
    } catch (e) {
      console.warn("Error preserving underlines via DOM:", e);
    }
  }

  // Regex fallback with word boundary \b
  return str
    .replace(/<(u|ins)\b[^>]*>([\s\S]*?)<\/\1>/gi, "\uE000$2\uE001")
    .replace(
      /<span\b[^>]*style=["'][^"']*text-decoration(-line)?\s*:\s*[^"']*underline[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
      "\uE000$2\uE001"
    );
}

function parseLineSegments(line) {
  if (!line || !line.includes("\uE000")) {
    return [{ text: line || "", underline: false }];
  }

  const segments = [];
  const parts = line.split(/(\uE000[^\uE001]*\uE001)/g);

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("\uE000") && part.endsWith("\uE001")) {
      const text = part.slice(1, -1);
      if (text) {
        segments.push({ text, underline: true });
      }
    } else {
      const text = part.replace(/[\uE000\uE001]/g, "");
      if (text) {
        segments.push({ text, underline: false });
      }
    }
  }

  return segments;
}

function wrapText(ctx, text, maxWidth) {
  if (!text) return [];
  const paragraphs = String(text).split("\n");
  const allLines = [];

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    const words = trimmed.split(" ");
    let currentLine = "";

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? currentLine + " " + word : word;
      const cleanTestLine = testLine.replace(/[\uE000\uE001]/g, "");
      const testWidth = ctx.measureText(cleanTestLine).width;

      if (testWidth > maxWidth && currentLine) {
        const starts = (currentLine.match(/\uE000/g) || []).length;
        const ends = (currentLine.match(/\uE001/g) || []).length;
        const lineUnderlineOpen = starts > ends;

        if (lineUnderlineOpen) {
          allLines.push(currentLine + "\uE001");
          currentLine = "\uE000" + word;
        } else {
          allLines.push(currentLine);
          currentLine = word;
        }
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      allLines.push(currentLine);
    }
  }

  return allLines;
}

function extractMessagePoints(htmlOrText) {
  if (!htmlOrText) return [];

  // Preserve underline styling before stripping HTML
  const marked = preserveUnderlinesInHtml(htmlOrText);
  const clean = cleanHtmlText(marked);
  if (!clean) return [];

  // 1. Split by newlines from paragraphs, lists, divs, or breaks
  const byNewlines = clean
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/[\uE000\uE001]/g, "").length > 3);

  if (byNewlines.length > 1) {
    return byNewlines;
  }

  // 2. Look for topic breaks like "1. ", "2. ", "•", "✦", or "Title : " following sentence end
  const byTopic = clean.split(/(?<=[.!?।॥])\s+(?=[^.:?!]{2,30}\s*:\s*)/g);
  if (byTopic.length > 1) {
    return byTopic
      .map((s) => s.trim())
      .filter((s) => s.replace(/[\uE000\uE001]/g, "").length > 3);
  }

  return [clean];
}

export default function ShareShlokaModal({
  isOpen,
  onClose,
  shlokaData
}) {
  const { isHindi, isEnglish, txt } = useLanguage();
  const { user, isLoggedIn } = useAuth();
  const isSuperAdmin = Boolean(isLoggedIn && isExclusiveSuperAdmin(user));

  const canvasRef = useRef(null);
  const logoImageRef = useRef(null);
  const [selectedThemeId, setSelectedThemeId] = useState("royal-blue");
  const [selectedSizeId, setSelectedSizeId] = useState(DEFAULT_SHARE_CARD_SIZE_ID);
  const [sizeSheetOpen, setSizeSheetOpen] = useState(false);
  const [sizeSheetMode, setSizeSheetMode] = useState("select");
  const [hasConfirmedSize, setHasConfirmedSize] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const activeSizePreset = isSuperAdmin
    ? getShareCardSizePreset(selectedSizeId)
    : getShareCardSizePreset(DEFAULT_SHARE_CARD_SIZE_ID);

  // Reset Super Admin size state cleanly if user is not one of the 2 Super Admins or modal closes
  useEffect(() => {
    if (!isSuperAdmin) {
      setSelectedSizeId(DEFAULT_SHARE_CARD_SIZE_ID);
      setSizeSheetOpen(false);
      setHasConfirmedSize(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isOpen) {
      setSizeSheetOpen(false);
      setHasConfirmedSize(false);
      setSelectedSizeId(DEFAULT_SHARE_CARD_SIZE_ID);
    }
  }, [isOpen]);

  // Pre-load App Logo for Background Watermark
  useEffect(() => {
    if (typeof window === "undefined") return;
    const img = new Image();
    img.src = "/icons/icon-512x512.png";
    img.onload = () => {
      logoImageRef.current = img;
      if (isOpen && shlokaData) {
        renderCanvasCard();
      }
    };
    if (img.complete && img.naturalWidth > 0) {
      logoImageRef.current = img;
    }
  }, [isOpen, shlokaData]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const currentTheme =
    THEMES.find((t) => t.id === selectedThemeId) || THEMES[0];

  useEffect(() => {
    if (!isOpen || !shlokaData) return;

    const timer = setTimeout(() => {
      renderCanvasCard();
    }, 16);

    return () => clearTimeout(timer);
  }, [isOpen, shlokaData, selectedThemeId, activeSizePreset.id, isSuperAdmin]);

  const renderCanvasCard = (presetOverride = null) => {
    const canvas = canvasRef.current;
    if (!canvas || !shlokaData) return "";

    const preset = isSuperAdmin
      ? presetOverride || activeSizePreset
      : getShareCardSizePreset(DEFAULT_SHARE_CARD_SIZE_ID);

    setIsGenerating(true);
    try {
      const ctx = canvas.getContext("2d");

      // Exact requested pixel output dimensions
      const targetWidth = preset.width;
      const targetHeight = preset.height;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const layoutMode = preset.layoutMode || "9:16";
      const isLandscape = layoutMode === "16:9";
      const isSquare = layoutMode === "1:1";
      const isPortrait45 = layoutMode === "4:5";

      // Virtual design space (for 1280x720, draws at 1920x1080 virtual and scales 2/3 cleanly)
      const vWidth = isLandscape ? 1920 : 1080;
      const vHeight = isLandscape ? 1080 : isSquare ? 1080 : isPortrait45 ? 1350 : 1920;
      const scaleRatioX = targetWidth / vWidth;
      const scaleRatioY = targetHeight / vHeight;

      ctx.save();
      if (scaleRatioX !== 1 || scaleRatioY !== 1) {
        ctx.scale(scaleRatioX, scaleRatioY);
      }

      // 1. Prepare Text & Measurements
      const chNum = shlokaData.chapterNumber || 1;
      const chName = shlokaData.chapterName ? cleanHtmlText(shlokaData.chapterName) : "";
      const shlokNum = shlokaData.shlokNumber || 1;
      const cleanSpeaker = cleanHtmlText(shlokaData.speaker || "");

      const cleanTranslation = cleanHtmlText(
        shlokaData.translation ||
        shlokaData.gujaratiSummary ||
        shlokaData.meaning ||
        ""
      );
      const messagePoints = extractMessagePoints(shlokaData.message);
      const hasMessage = messagePoints.length > 0;

      const cleanSanskrit = cleanHtmlText(
        shlokaData.sanskrit || shlokaData.sanskritExcerpt || ""
      );
      let rawSanskritLines = cleanSanskrit
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      if (
        rawSanskritLines.length === 1 &&
        (rawSanskritLines[0].includes("।") || rawSanskritLines[0].includes("|"))
      ) {
        const parts = rawSanskritLines[0]
          .split(/(?<=[।|]+)/g)
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.length > 1) {
          rawSanskritLines = parts;
        }
      }

      // 2. Chrome & Header/Footer Geometry per Layout Mode
      const outerMargin = layoutMode === "9:16" ? 38 : isSquare ? 28 : 32;
      const innerMargin = layoutMode === "9:16" ? 52 : isSquare ? 40 : 44;

      const headingFontSize = layoutMode === "9:16" ? 62 : isPortrait45 ? 52 : isLandscape ? 48 : 46;
      const headingCenterY =
        layoutMode === "9:16"
          ? innerMargin + 66
          : isPortrait45
          ? innerMargin + 48
          : innerMargin + 40;

      const badgeH = layoutMode === "9:16" ? 54 : isPortrait45 ? 44 : 40;
      const badgeFontSize = layoutMode === "9:16" ? 30 : isPortrait45 ? 25 : 23;
      const badgeCenterY =
        layoutMode === "9:16"
          ? headingCenterY + 74
          : isPortrait45
          ? headingCenterY + 58
          : headingCenterY + 48;

      const speakerFontSize = layoutMode === "9:16" ? 42 : isPortrait45 ? 34 : 28;
      const speakerCenterY = cleanSpeaker
        ? badgeCenterY + badgeH / 2 + (layoutMode === "9:16" ? 36 : isPortrait45 ? 28 : 23)
        : badgeCenterY + badgeH / 2;

      const headerDividerY = cleanSpeaker
        ? speakerCenterY + (layoutMode === "9:16" ? 52 : isPortrait45 ? 38 : 32)
        : badgeCenterY + badgeH / 2 + (layoutMode === "9:16" ? 32 : 22);

      const footerDividerY =
        layoutMode === "9:16"
          ? vHeight - innerMargin - 66
          : isPortrait45
          ? vHeight - innerMargin - 54
          : vHeight - innerMargin - 48;

      const maxContentBottom = footerDividerY - (layoutMode === "9:16" ? 26 : 16);
      const availableH = maxContentBottom - headerDividerY;

      // Helper to measure message points in a given max width & font size
      const measureMsgBlock = (maxW, scale, minFont, baseFont) => {
        if (!hasMessage) {
          return {
            totalMsgH: 0,
            mFontSize: baseFont,
            mLineH: Math.round(baseFont * 1.6),
            mPointGap: 14,
            mTitleH: 38,
            wrappedMsgPoints: [],
          };
        }
        const mFontSize = Math.max(minFont, Math.round(baseFont * scale));
        const mLineH = Math.round(mFontSize * 1.56);
        const mPointGap = Math.max(8, Math.round(20 * scale));
        const mTitleH = Math.max(26, Math.round(46 * scale));
        const wrappedMsgPoints = [];

        ctx.font = `bold ${mFontSize}px "Noto Sans Gujarati", sans-serif`;
        messagePoints.forEach((point) => {
          let prefix = "✦ ";
          const cleanCheck = point.replace(/[\uE000\uE001]/g, "").trim();
          if (/^[\d+.)•✦\-\*]/.test(cleanCheck)) {
            prefix = "";
          }
          const pointText = prefix ? `${prefix}${point}` : point;
          const lines = wrapText(ctx, pointText, maxW);
          if (lines.length > 0) {
            wrappedMsgPoints.push(lines);
          }
        });

        let totalMLines = 0;
        wrappedMsgPoints.forEach((lines) => {
          totalMLines += lines.length;
        });
        const pointsGaps = Math.max(0, wrappedMsgPoints.length - 1) * mPointGap;
        const totalMsgH = 14 + mTitleH + totalMLines * mLineH + pointsGaps;

        return {
          totalMsgH,
          mFontSize,
          mLineH,
          mPointGap,
          mTitleH,
          wrappedMsgPoints,
        };
      };

      // Helper to evaluate vertical single-column layout
      const evaluateSingleColumn = (scale, boxW, textMaxW, minFonts) => {
        const sMaxW = boxW - (layoutMode === "9:16" ? 50 : 44);
        let sFontSize = Math.max(
          minFonts.sMin,
          Math.round((hasMessage ? 42 : 48) * Math.min(1.0, scale + 0.08))
        );
        ctx.font = `bold ${sFontSize}px "Noto Sans Devanagari", "Noto Sans Gujarati", serif`;
        if (rawSanskritLines.length > 0) {
          let maxLineW = Math.max(...rawSanskritLines.map((l) => ctx.measureText(l).width));
          while (maxLineW > sMaxW && sFontSize > minFonts.sMin - 4) {
            sFontSize -= 1;
            ctx.font = `bold ${sFontSize}px "Noto Sans Devanagari", "Noto Sans Gujarati", serif`;
            maxLineW = Math.max(...rawSanskritLines.map((l) => ctx.measureText(l).width));
          }
        }
        const sLineH = Math.round(sFontSize * (layoutMode === "9:16" ? 1.62 : 1.54));
        const sVertPad = Math.round(sFontSize * (hasMessage ? 0.68 : 0.88));

        const wrappedS = [];
        if (rawSanskritLines.length > 0) {
          rawSanskritLines.forEach((line) => {
            wrappedS.push(...wrapText(ctx, line, sMaxW));
          });
        } else {
          wrappedS.push(...wrapText(ctx, cleanSanskrit, sMaxW));
        }
        const sToDisplay = wrappedS.length <= 3 ? wrappedS : wrappedS.slice(0, 2);
        const totalSLinesH = Math.max(0, sToDisplay.length - 1) * sLineH;
        const sBoxH = totalSLinesH + sVertPad * 2;
        const totalSH = sBoxH + 16;

        const tFontSize = Math.max(minFonts.tMin, Math.round((hasMessage ? 38 : 46) * scale));
        const tLineH = Math.round(tFontSize * (layoutMode === "9:16" ? 1.65 : 1.56));
        const tTitleH = Math.max(26, Math.round(52 * scale));
        ctx.font = `bold ${tFontSize}px "Noto Sans Gujarati", sans-serif`;
        const wrappedTrans = wrapText(ctx, cleanTranslation, textMaxW);
        const totalTransH = tTitleH + wrappedTrans.length * tLineH;

        const msgData = measureMsgBlock(textMaxW, scale, minFonts.mMin, 35);
        const numGaps = hasMessage ? 3 : 2;
        const baseGap = Math.max(minFonts.gapMin, Math.round(30 * scale));
        const totalRequiredH =
          totalSH + totalTransH + (hasMessage ? msgData.totalMsgH : 0) + numGaps * baseGap;

        return {
          mode: "single",
          scale,
          totalRequiredH,
          baseGap,
          numGaps,
          sanskritBoxW: boxW,
          sFontSize,
          sLineH,
          sVertPad,
          sBoxH,
          sToDisplay,
          totalSH,
          tFontSize,
          tLineH,
          tTitleH,
          wrappedTrans,
          totalTransH,
          ...msgData,
        };
      };

      // Helper to evaluate two-column layout (16:9 landscape or ultra-long 1:1)
      const evaluateTwoColumn = (scale, leftBoxW, leftTextMaxW, rightTextMaxW, minFonts) => {
        const sMaxW = leftBoxW - 40;
        let sFontSize = Math.max(
          minFonts.sMin,
          Math.round(38 * Math.min(1.0, scale + 0.08))
        );
        ctx.font = `bold ${sFontSize}px "Noto Sans Devanagari", "Noto Sans Gujarati", serif`;
        if (rawSanskritLines.length > 0) {
          let maxLineW = Math.max(...rawSanskritLines.map((l) => ctx.measureText(l).width));
          while (maxLineW > sMaxW && sFontSize > minFonts.sMin - 4) {
            sFontSize -= 1;
            ctx.font = `bold ${sFontSize}px "Noto Sans Devanagari", "Noto Sans Gujarati", serif`;
            maxLineW = Math.max(...rawSanskritLines.map((l) => ctx.measureText(l).width));
          }
        }
        const sLineH = Math.round(sFontSize * 1.52);
        const sVertPad = Math.round(sFontSize * 0.66);

        const wrappedS = [];
        if (rawSanskritLines.length > 0) {
          rawSanskritLines.forEach((line) => {
            wrappedS.push(...wrapText(ctx, line, sMaxW));
          });
        } else {
          wrappedS.push(...wrapText(ctx, cleanSanskrit, sMaxW));
        }
        const sToDisplay = wrappedS.length <= 3 ? wrappedS : wrappedS.slice(0, 2);
        const totalSLinesH = Math.max(0, sToDisplay.length - 1) * sLineH;
        const sBoxH = totalSLinesH + sVertPad * 2;

        const tFontSize = Math.max(minFonts.tMin, Math.round(33 * scale));
        const tLineH = Math.round(tFontSize * 1.54);
        const tTitleH = Math.max(28, Math.round(44 * scale));
        ctx.font = `bold ${tFontSize}px "Noto Sans Gujarati", sans-serif`;
        const wrappedTrans = wrapText(ctx, cleanTranslation, leftTextMaxW);
        const totalTransH = tTitleH + wrappedTrans.length * tLineH;

        const colGap = Math.max(14, Math.round(28 * scale));
        const leftTotalH = sBoxH + 14 + colGap + totalTransH;

        const msgData = measureMsgBlock(rightTextMaxW, scale, minFonts.mMin, 31);
        const rightTotalH = msgData.totalMsgH - 14; // No horizontal top divider gap needed on right

        return {
          mode: "two-column",
          scale,
          leftTotalH,
          rightTotalH,
          totalRequiredH: Math.max(leftTotalH, rightTotalH) + 24,
          colGap,
          sanskritBoxW: leftBoxW,
          sFontSize,
          sLineH,
          sVertPad,
          sBoxH,
          sToDisplay,
          tFontSize,
          tLineH,
          tTitleH,
          wrappedTrans,
          totalTransH,
          ...msgData,
        };
      };

      // Choose the best layout for the active aspect ratio
      let bestLayout = null;

      if (layoutMode === "9:16") {
        const sanskritBoxW = vWidth - 110;
        const mainTextMaxW = vWidth - 140;
        const minFonts = { sMin: 28, tMin: 20, mMin: 18, gapMin: 16 };
        for (let s = 1.0; s >= 0.46; s -= 0.02) {
          const layout = evaluateSingleColumn(Number(s.toFixed(2)), sanskritBoxW, mainTextMaxW, minFonts);
          if (layout.totalRequiredH <= availableH || s <= 0.48) {
            bestLayout = layout;
            break;
          }
        }
        if (!bestLayout) {
          bestLayout = evaluateSingleColumn(0.48, sanskritBoxW, mainTextMaxW, minFonts);
        }
      } else if (layoutMode === "4:5") {
        const sanskritBoxW = vWidth - 96;
        const mainTextMaxW = vWidth - 120;
        const minFonts = { sMin: 20, tMin: 16, mMin: 14, gapMin: 10 };
        for (let s = 0.96; s >= 0.28; s -= 0.02) {
          const layout = evaluateSingleColumn(Number(s.toFixed(2)), sanskritBoxW, mainTextMaxW, minFonts);
          if (layout.totalRequiredH <= availableH || s <= 0.30) {
            bestLayout = layout;
            break;
          }
        }
        if (!bestLayout) {
          bestLayout = evaluateSingleColumn(0.30, sanskritBoxW, mainTextMaxW, minFonts);
        }
      } else if (layoutMode === "1:1") {
        const sanskritBoxW = vWidth - 96;
        const mainTextMaxW = vWidth - 116;
        const minFonts = { sMin: 19, tMin: 15, mMin: 14, gapMin: 8 };
        let singleBest = null;
        for (let s = 0.92; s >= 0.28; s -= 0.02) {
          const layout = evaluateSingleColumn(Number(s.toFixed(2)), sanskritBoxW, mainTextMaxW, minFonts);
          if (layout.totalRequiredH <= availableH || s <= 0.30) {
            singleBest = layout;
            break;
          }
        }
        if (!singleBest) {
          singleBest = evaluateSingleColumn(0.30, sanskritBoxW, mainTextMaxW, minFonts);
        }

        // For long shlokas with message in 1:1, compare against 2-column and pick whichever keeps larger readable text
        if (hasMessage && singleBest.scale < 0.56) {
          let twoColBest = null;
          for (let s = 0.92; s >= 0.30; s -= 0.02) {
            const layout = evaluateTwoColumn(Number(s.toFixed(2)), 442, 442, 442, minFonts);
            if (layout.totalRequiredH <= availableH || s <= 0.32) {
              twoColBest = layout;
              break;
            }
          }
          if (twoColBest && twoColBest.mFontSize > singleBest.mFontSize) {
            bestLayout = twoColBest;
          } else {
            bestLayout = singleBest;
          }
        } else {
          bestLayout = singleBest;
        }
      } else {
        // 16:9 Landscape (1920x1080 or 1280x720 virtualized at 1920x1080)
        const minFonts = { sMin: 20, tMin: 16, mMin: 15, gapMin: 10 };
        if (hasMessage) {
          for (let s = 1.0; s >= 0.32; s -= 0.02) {
            const layout = evaluateTwoColumn(Number(s.toFixed(2)), 820, 800, 810, minFonts);
            if (layout.totalRequiredH <= availableH || s <= 0.34) {
              bestLayout = layout;
              break;
            }
          }
          if (!bestLayout) {
            bestLayout = evaluateTwoColumn(0.34, 820, 800, 810, minFonts);
          }
        } else {
          const sanskritBoxW = 1540;
          const mainTextMaxW = 1540;
          for (let s = 1.0; s >= 0.38; s -= 0.02) {
            const layout = evaluateSingleColumn(Number(s.toFixed(2)), sanskritBoxW, mainTextMaxW, minFonts);
            if (layout.totalRequiredH <= availableH || s <= 0.40) {
              bestLayout = layout;
              break;
            }
          }
          if (!bestLayout) {
            bestLayout = evaluateSingleColumn(0.40, sanskritBoxW, mainTextMaxW, minFonts);
          }
        }
      }

      // 3. Render Background & Frames
      const bgGrad = ctx.createRadialGradient(
        vWidth / 2,
        vHeight / 2,
        60,
        vWidth / 2,
        vHeight / 2,
        Math.max(vWidth, vHeight) * 0.75
      );
      bgGrad.addColorStop(0, currentTheme.primaryGrad[1]);
      bgGrad.addColorStop(0.55, currentTheme.primaryGrad[0]);
      bgGrad.addColorStop(1, currentTheme.primaryGrad[2]);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, vWidth, vHeight);

      // Celestial Ambient Glow (Top Center)
      const topGlow = ctx.createRadialGradient(
        vWidth / 2,
        110,
        10,
        vWidth / 2,
        110,
        vWidth * 0.45
      );
      topGlow.addColorStop(0, currentTheme.glowColor);
      topGlow.addColorStop(1, "transparent");
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, vWidth, vHeight);

      // Repeating Website Link Watermark (Excluding Logo Zone)
      const logoImg = logoImageRef.current;
      const hasLogo = logoImg && logoImg.complete && logoImg.naturalWidth > 0;
      const logoSize = layoutMode === "9:16" ? 650 : Math.round(Math.min(vWidth, vHeight) * 0.48);
      const logoCenterX = vWidth / 2;
      const logoCenterY =
        layoutMode === "9:16"
          ? (vHeight - logoSize) / 2 + 40 + logoSize / 2
          : (headerDividerY + footerDividerY) / 2;
      const exclusionRadius = layoutMode === "9:16" ? 355 : Math.round(logoSize * 0.56);

      ctx.save();
      ctx.beginPath();
      ctx.rect(
        outerMargin + 2,
        outerMargin + 2,
        vWidth - (outerMargin + 2) * 2,
        vHeight - (outerMargin + 2) * 2
      );
      ctx.arc(logoCenterX, logoCenterY, exclusionRadius, 0, Math.PI * 2);
      ctx.clip("evenodd");

      const watermarkText = "gita-gyan-m.vercel.app";
      const angle = -24 * (Math.PI / 180);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = currentTheme.borderGold || currentTheme.headerColor || "#f5c542";
      ctx.globalAlpha = 0.08;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.translate(vWidth / 2, vHeight / 2);
      ctx.rotate(angle);

      const stepX = 370;
      const stepY = 72;
      const bounds = layoutMode === "9:16" ? 1500 : Math.ceil(Math.hypot(vWidth, vHeight));

      for (let yRot = -bounds; yRot <= bounds; yRot += stepY) {
        const rowIndex = Math.round((yRot + bounds) / stepY);
        const xOffset = rowIndex % 2 === 1 ? stepX / 2 : 0;

        for (let xRot = -bounds; xRot <= bounds; xRot += stepX) {
          const curXRot = xRot + xOffset;
          const worldX = vWidth / 2 + curXRot * cosA - yRot * sinA;
          const worldY = vHeight / 2 + curXRot * sinA + yRot * cosA;
          const distToLogo = Math.hypot(worldX - logoCenterX, worldY - logoCenterY);
          if (distToLogo < exclusionRadius + 65) {
            continue;
          }
          ctx.fillText(watermarkText, curXRot, yRot);
        }
      }
      ctx.restore();

      // Subtle App Logo Background Watermark
      if (hasLogo) {
        ctx.save();
        ctx.globalAlpha = 0.085;
        const logoX = logoCenterX - logoSize / 2;
        const logoY = logoCenterY - logoSize / 2;
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      }

      // Ornamental Borders
      ctx.strokeStyle = currentTheme.borderGold;
      ctx.lineWidth = 3.5;
      ctx.strokeRect(
        outerMargin,
        outerMargin,
        vWidth - outerMargin * 2,
        vHeight - outerMargin * 2
      );

      ctx.strokeStyle = currentTheme.innerBorder;
      ctx.lineWidth = 1.4;
      ctx.strokeRect(
        innerMargin,
        innerMargin,
        vWidth - innerMargin * 2,
        vHeight - innerMargin * 2
      );

      const cornerSize = 22;
      const drawCornerOrnament = (cx, cy) => {
        ctx.fillStyle = currentTheme.borderGold;
        ctx.beginPath();
        ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = currentTheme.borderGold;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx - cornerSize, cy);
        ctx.lineTo(cx + cornerSize, cy);
        ctx.moveTo(cx, cy - cornerSize);
        ctx.lineTo(cx, cy + cornerSize);
        ctx.stroke();
      };

      drawCornerOrnament(innerMargin, innerMargin);
      drawCornerOrnament(vWidth - innerMargin, innerMargin);
      drawCornerOrnament(innerMargin, vHeight - innerMargin);
      drawCornerOrnament(vWidth - innerMargin, vHeight - innerMargin);

      const drawDivider = (yPos, widthSpan = 420, centerX = vWidth / 2) => {
        ctx.strokeStyle = currentTheme.innerBorder;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(centerX - widthSpan / 2, yPos);
        ctx.lineTo(centerX + widthSpan / 2, yPos);
        ctx.stroke();

        ctx.fillStyle = currentTheme.borderGold;
        ctx.beginPath();
        ctx.moveTo(centerX, yPos - 4.5);
        ctx.lineTo(centerX + 5, yPos);
        ctx.lineTo(centerX, yPos + 4.5);
        ctx.lineTo(centerX - 5, yPos);
        ctx.closePath();
        ctx.fill();
      };

      const drawVerticalDivider = (xPos, yTop, yBottom) => {
        const midY = (yTop + yBottom) / 2;
        ctx.save();
        const vGrad = ctx.createLinearGradient(xPos, yTop, xPos, yBottom);
        vGrad.addColorStop(0, "transparent");
        vGrad.addColorStop(0.15, currentTheme.innerBorder);
        vGrad.addColorStop(0.5, currentTheme.borderGold);
        vGrad.addColorStop(0.85, currentTheme.innerBorder);
        vGrad.addColorStop(1, "transparent");
        ctx.strokeStyle = vGrad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(xPos, yTop);
        ctx.lineTo(xPos, yBottom);
        ctx.stroke();

        ctx.fillStyle = currentTheme.borderGold;
        ctx.beginPath();
        ctx.moveTo(xPos, midY - 5.5);
        ctx.lineTo(xPos + 5.5, midY);
        ctx.lineTo(xPos, midY + 5.5);
        ctx.lineTo(xPos - 5.5, midY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };

      // Helper to render message lines with underline preservation centered around centerX
      const drawMessagePointsBlock = (centerX, startY, layoutObj) => {
        let y = startY;
        const msgHeadingSize = Math.max(22, Math.round(34 * (layoutObj.mFontSize / 35)));
        ctx.font = `bold ${msgHeadingSize}px "Noto Sans Gujarati", sans-serif`;
        ctx.fillStyle = currentTheme.sanskritAccent;
        ctx.textAlign = "center";
        ctx.fillText(
          txt("✨ દિવ્ય સંદેશ / જીવન બોધ ✨", "✨ दिव्य संदेश / जीवन बोध ✨", "✨ Divine Message / Life Wisdom ✨"),
          centerX,
          y + 10
        );
        y += layoutObj.mTitleH;

        ctx.font = `bold ${layoutObj.mFontSize}px "Noto Sans Gujarati", sans-serif`;
        ctx.fillStyle = currentTheme.translationColor;

        layoutObj.wrappedMsgPoints.forEach((lines, pIdx) => {
          lines.forEach((line) => {
            const segments = parseLineSegments(line);
            const hasUnderline = segments.some((s) => s.underline);

            if (!hasUnderline) {
              ctx.textAlign = "center";
              ctx.fillText(line.replace(/[\uE000\uE001]/g, ""), centerX, y + 8);
            } else {
              const cleanFullText = line.replace(/[\uE000\uE001]/g, "");
              const totalLineWidth = ctx.measureText(cleanFullText).width;
              let currentX = centerX - totalLineWidth / 2;
              const lineY = y + 8;
              const underlineY = lineY + Math.round(layoutObj.mFontSize * 0.58);
              const underlineThickness = Math.max(2, Math.round(layoutObj.mFontSize * 0.08));

              ctx.textAlign = "left";
              segments.forEach((seg) => {
                const segW = ctx.measureText(seg.text).width;
                ctx.fillText(seg.text, currentX, lineY);

                if (seg.underline) {
                  const trimmedText = seg.text.replace(/\s+$/, "");
                  const underlineW = trimmedText ? ctx.measureText(trimmedText).width : segW;

                  ctx.save();
                  ctx.beginPath();
                  ctx.strokeStyle =
                    currentTheme.borderGold ||
                    currentTheme.sanskritAccent ||
                    currentTheme.translationColor;
                  ctx.lineWidth = underlineThickness;
                  ctx.lineCap = "round";
                  ctx.moveTo(currentX, underlineY);
                  ctx.lineTo(currentX + underlineW, underlineY);
                  ctx.stroke();
                  ctx.restore();
                }

                currentX += segW;
              });
              ctx.textAlign = "center";
            }

            y += layoutObj.mLineH;
          });
          if (pIdx < layoutObj.wrappedMsgPoints.length - 1) {
            y += layoutObj.mPointGap;
          }
        });
      };

      // 4. Render Sacred Header Block
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.font = `bold ${headingFontSize}px "Noto Sans Devanagari", "Noto Sans Gujarati", serif`;
      ctx.fillStyle = currentTheme.headerColor;
      ctx.fillText(
        txt("॥ શ્રીમદ્ભગવદ્ગીતા ॥", "॥ श्रीमद्भगवद्गीता ॥", "॥ Shrimad Bhagavad Gita ॥"),
        vWidth / 2,
        headingCenterY
      );

      const badgeText = chName
        ? txt(`અધ્યાય ${chNum} (${chName}) • શ્લોક ${shlokNum}`, `अध्याय ${chNum} (${chName}) • श्लोक ${shlokNum}`, `Chapter ${chNum} (${chName}) • Shloka ${shlokNum}`)
        : txt(`અધ્યાય ${chNum} • શ્લોક ${shlokNum}`, `अध्याय ${chNum} • श्लोक ${shlokNum}`, `Chapter ${chNum} • Shloka ${shlokNum}`);
      ctx.font = `bold ${badgeFontSize}px "Noto Sans Gujarati", sans-serif`;
      const badgeMetrics = ctx.measureText(badgeText);
      const badgeW = Math.min(vWidth - 140, Math.max(320, badgeMetrics.width + 56));

      drawRoundRect(
        ctx,
        vWidth / 2 - badgeW / 2,
        badgeCenterY - badgeH / 2,
        badgeW,
        badgeH,
        Math.round(badgeH / 2),
        "rgba(0, 0, 0, 0.40)",
        currentTheme.innerBorder,
        1.5
      );

      ctx.fillStyle = currentTheme.footerColor;
      ctx.fillText(badgeText, vWidth / 2, badgeCenterY);

      if (cleanSpeaker) {
        ctx.font = `italic 700 ${speakerFontSize}px "Noto Sans Devanagari", "Noto Sans Gujarati", sans-serif`;
        ctx.fillStyle = currentTheme.sanskritAccent;
        ctx.fillText(`~ ${cleanSpeaker} ~`, vWidth / 2, speakerCenterY);
      }

      drawDivider(headerDividerY, isLandscape ? 760 : 520);

      // 5. Render Main Content
      if (bestLayout.mode === "two-column") {
        const leftCenterX = isLandscape ? 492 : 292;
        const rightCenterX = isLandscape ? 1428 : 788;
        const centerLineX = vWidth / 2;

        drawVerticalDivider(centerLineX, headerDividerY + 24, footerDividerY - 24);

        // Left Column: Sanskrit + Translation (vertically centered in availableH)
        const leftSlack = Math.max(0, availableH - bestLayout.leftTotalH);
        let leftY = headerDividerY + 12 + Math.floor(leftSlack * 0.45);
        const boxX = leftCenterX - bestLayout.sanskritBoxW / 2;

        drawRoundRect(
          ctx,
          boxX,
          leftY,
          bestLayout.sanskritBoxW,
          bestLayout.sBoxH,
          20,
          currentTheme.sanskritBoxBg || "rgba(255, 255, 255, 0.08)",
          currentTheme.sanskritBoxBorder || "rgba(245, 197, 66, 0.40)",
          1.8
        );

        ctx.font = `bold ${bestLayout.sFontSize}px "Noto Sans Devanagari", "Noto Sans Gujarati", serif`;
        ctx.fillStyle = currentTheme.sanskritColor;
        let sLineY = leftY + bestLayout.sVertPad;
        bestLayout.sToDisplay.forEach((line) => {
          ctx.fillText(line, leftCenterX, sLineY);
          sLineY += bestLayout.sLineH;
        });

        leftY += bestLayout.sBoxH + 14;
        drawDivider(leftY, isLandscape ? 420 : 280, leftCenterX);
        leftY += bestLayout.colGap;

        const transHeadingSize = Math.max(22, Math.round(34 * (bestLayout.tFontSize / 33)));
        ctx.font = `bold ${transHeadingSize}px "Noto Sans Gujarati", sans-serif`;
        ctx.fillStyle = currentTheme.headerColor;
        ctx.fillText(
          txt("• ગુજરાતી ભાવાર્થ •", "• हिन्दी भावार्थ •", "• English Translation •"),
          leftCenterX,
          leftY + 10
        );
        leftY += bestLayout.tTitleH;

        ctx.font = `bold ${bestLayout.tFontSize}px "Noto Sans Gujarati", sans-serif`;
        ctx.fillStyle = currentTheme.translationColor;
        bestLayout.wrappedTrans.forEach((line) => {
          ctx.fillText(line, leftCenterX, leftY + 8);
          leftY += bestLayout.tLineH;
        });

        // Right Column: Divine Message (vertically centered in availableH)
        const rightSlack = Math.max(0, availableH - bestLayout.rightTotalH);
        const rightStartY = headerDividerY + 12 + Math.floor(rightSlack * 0.45);
        drawMessagePointsBlock(rightCenterX, rightStartY, bestLayout);
      } else {
        // Single Column Mode (9:16, 4:5, standard 1:1, or 16:9 without message)
        const totalSlack = Math.max(0, availableH - bestLayout.totalRequiredH);
        const extraPerGap = Math.floor(totalSlack / (bestLayout.numGaps + 1));
        const maxGapCap = layoutMode === "9:16" ? 54 : 38;
        const sectionGap =
          bestLayout.totalRequiredH > availableH
            ? Math.max(
                6,
                Math.floor(
                  (availableH - (bestLayout.totalRequiredH - bestLayout.numGaps * bestLayout.baseGap)) /
                    bestLayout.numGaps
                )
              )
            : Math.min(maxGapCap, bestLayout.baseGap + extraPerGap);

        let currY = headerDividerY + sectionGap;

        const boxX = (vWidth - bestLayout.sanskritBoxW) / 2;
        const boxY = currY;

        drawRoundRect(
          ctx,
          boxX,
          boxY,
          bestLayout.sanskritBoxW,
          bestLayout.sBoxH,
          22,
          currentTheme.sanskritBoxBg || "rgba(255, 255, 255, 0.08)",
          currentTheme.sanskritBoxBorder || "rgba(245, 197, 66, 0.40)",
          1.8
        );

        ctx.font = `bold ${bestLayout.sFontSize}px "Noto Sans Devanagari", "Noto Sans Gujarati", serif`;
        ctx.fillStyle = currentTheme.sanskritColor;

        let sLineY = boxY + bestLayout.sVertPad;
        bestLayout.sToDisplay.forEach((line) => {
          ctx.fillText(line, vWidth / 2, sLineY);
          sLineY += bestLayout.sLineH;
        });

        currY = boxY + bestLayout.sBoxH + 16;
        drawDivider(currY, isLandscape ? 720 : 500);
        currY += sectionGap;

        const transHeadingSize = Math.max(22, Math.round(36 * (bestLayout.tFontSize / 38)));
        ctx.font = `bold ${transHeadingSize}px "Noto Sans Gujarati", sans-serif`;
        ctx.fillStyle = currentTheme.headerColor;
        ctx.fillText(
          txt("• ગુજરાતી ભાવાર્થ •", "• हिन्दी भावार्थ •", "• English Translation •"),
          vWidth / 2,
          currY + 12
        );
        currY += bestLayout.tTitleH;

        ctx.font = `bold ${bestLayout.tFontSize}px "Noto Sans Gujarati", sans-serif`;
        ctx.fillStyle = currentTheme.translationColor;

        bestLayout.wrappedTrans.forEach((line) => {
          ctx.fillText(line, vWidth / 2, currY + 10);
          currY += bestLayout.tLineH;
        });

        if (hasMessage && bestLayout.wrappedMsgPoints.length > 0) {
          currY += 16;
          drawDivider(currY, isLandscape ? 700 : 480);
          currY += sectionGap;
          drawMessagePointsBlock(vWidth / 2, currY, bestLayout);
        }
      }

      // 8. Footer Branding & Website Pill
      drawDivider(footerDividerY, isLandscape ? 700 : 480);

      const siteUrl = "gita-gyan-m.vercel.app";
      const pillText = `🔗 ${siteUrl}`;
      ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const pillMetrics = ctx.measureText(pillText);
      const pillW = Math.min(vWidth - 200, pillMetrics.width + 54);
      const pillH = layoutMode === "9:16" ? 44 : 38;
      const pillY = footerDividerY + (layoutMode === "9:16" ? 36 : 27);

      drawRoundRect(
        ctx,
        vWidth / 2 - pillW / 2,
        pillY - pillH / 2,
        pillW,
        pillH,
        Math.round(pillH / 2),
        "rgba(0, 0, 0, 0.45)",
        currentTheme.innerBorder,
        1.4
      );

      ctx.fillStyle = currentTheme.headerColor;
      ctx.fillText(pillText, vWidth / 2, pillY);

      ctx.restore();

      // Generate preview data URL
      const dataUrl = canvas.toDataURL("image/png");
      setPreviewUrl(dataUrl);
      setIsGenerating(false);
      return dataUrl;
    } catch (err) {
      console.error("Error generating canvas card:", err);
      setIsGenerating(false);
      return "";
    }
  };

  const triggerDownloadWithPreset = (preset) => {
    const targetPreset = isSuperAdmin
      ? preset || activeSizePreset
      : getShareCardSizePreset(DEFAULT_SHARE_CARD_SIZE_ID);

    const dataUrl = renderCanvasCard(targetPreset);
    if (!dataUrl) return;

    const link = document.createElement("a");
    const ch = shlokaData.chapterNumber || 1;
    const shl = shlokaData.shlokNumber || 1;
    link.download = isSuperAdmin
      ? `Bhagavad_Gita_Adhyay_${ch}_Shlok_${shl}_${targetPreset.width}x${targetPreset.height}.png`
      : `Bhagavad_Gita_Adhyay_${ch}_Shlok_${shl}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleDownload = () => {
    if (!previewUrl) return;
    if (isSuperAdmin && !hasConfirmedSize) {
      setSizeSheetMode("download");
      setSizeSheetOpen(true);
      return;
    }
    triggerDownloadWithPreset(activeSizePreset);
  };

  const handleSelectSize = (preset) => {
    if (!isSuperAdmin) return;
    setSelectedSizeId(preset.id);
    setHasConfirmedSize(true);
    setSizeSheetOpen(false);
  };

  const handleDownloadSize = (preset) => {
    if (!isSuperAdmin) return;
    setSelectedSizeId(preset.id);
    setHasConfirmedSize(true);
    setSizeSheetOpen(false);
    triggerDownloadWithPreset(preset);
  };

  const handleShareWhatsApp = async () => {
    const canvas = canvasRef.current;
    const websiteUrl = "https://gita-gyan-m.vercel.app";
    const shareTitle = txt("શ્રીમદ્ભગવદ્ગીતા", "श्रीमद्भगवद्गीता", "Shrimad Bhagavad Gita");
    const shareText = websiteUrl;

    if (canvas && navigator.canShare) {
      try {
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        const ch = shlokaData.chapterNumber || 1;
        const shl = shlokaData.shlokNumber || 1;
        const file = new File(
          [blob],
          `Bhagavad_Gita_Ch${ch}_Shlok${shl}.png`,
          { type: "image/png" }
        );

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: shareTitle,
            text: shareText
          });
          return;
        }
      } catch (err) {
        console.log("Web Share API fallback:", err);
      }
    }

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
      shareText
    )}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyText = () => {
    const ch = shlokaData.chapterNumber || 1;
    const shl = shlokaData.shlokNumber || 1;
    const chName = shlokaData.chapterName ? ` (${cleanHtmlText(shlokaData.chapterName)})` : "";
    const cleanSpeaker = cleanHtmlText(shlokaData.speaker || "");
    const cleanSanskrit = cleanHtmlText(shlokaData.sanskrit || shlokaData.sanskritExcerpt || "");
    const cleanTranslation = cleanHtmlText(
      shlokaData.translation ||
      shlokaData.gujaratiSummary ||
      shlokaData.meaning ||
      ""
    );
    const messagePoints = extractMessagePoints(shlokaData.message);

    let copyText = txt(
      `॥ શ્રીમદ્ભગવદ્ગીતા ॥\n📌 અધ્યાય ${ch}${chName} • શ્લોક ${shl}\n\n`,
      `॥ श्रीमद्भगवद्गीता ॥\n📌 अध्याय ${ch}${chName} • श्लोक ${shl}\n\n`,
      `॥ Shrimad Bhagavad Gita ॥\n📌 Chapter ${ch}${chName} • Shloka ${shl}\n\n`
    );
    if (cleanSpeaker) {
      copyText += `🎙️ ~ ${cleanSpeaker} ~\n\n`;
    }
    if (cleanSanskrit) {
      copyText += txt(
        `🕉️ સંસ્કૃત શ્લોક:\n${cleanSanskrit}\n\n`,
        `🕉️ संस्कृत श्लोक:\n${cleanSanskrit}\n\n`,
        `🕉️ Sanskrit Shloka:\n${cleanSanskrit}\n\n`
      );
    }
    if (cleanTranslation) {
      copyText += txt(
        `📖 ગુજરાતી ભાવાર્થ:\n${cleanTranslation}\n\n`,
        `📖 हिन्दी भावार्थ:\n${cleanTranslation}\n\n`,
        `📖 Translation:\n${cleanTranslation}\n\n`
      );
    }
    if (messagePoints && messagePoints.length > 0) {
      copyText += txt(
        `✨ દિવ્ય સંદેશ / જીવન બોધ:\n`,
        `✨ दिव्य संदेश / जीवन बोध:\n`,
        `✨ Divine Message / Life Wisdom:\n`
      );
      messagePoints.forEach((point) => {
        const cleanPt = point.replace(/[\uE000\uE001]/g, "").trim();
        let prefix = "• ";
        if (/^\d+[.)]/.test(cleanPt) || /^•/.test(cleanPt) || /^✦/.test(cleanPt)) {
          prefix = "";
        }
        copyText += `${prefix}${cleanPt}\n`;
      });
      copyText += `\n`;
    }
    copyText += `🔗 https://gita-gyan-m.vercel.app`;

    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  if (!isOpen || !shlokaData || typeof document === "undefined") return null;

  return createPortal(
    <div className="share-modal-overlay" onClick={onClose}>
      <div
        className="share-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="share-modal-header">
          <div className="modal-header-title">
            <Sparkles className="header-sparkle-icon" size={20} />
            <h2>{txt("શ્લોક કાર્ડ શેર કરો", "श्लोक कार्ड शेयर करें", "Share Shloka Card")}</h2>
          </div>
          <button
            type="button"
            className="share-modal-close-btn"
            onClick={onClose}
            aria-label={txt("બંધ કરો", "बंद करें", "Close")}
            title={txt("બંધ કરો", "बंद करें", "Close")}
          >
            <X size={20} />
          </button>
        </div>

        {/* HIDDEN WORKING CANVAS */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* MODAL BODY */}
        <div className="share-modal-body">
          {/* THEME PICKER */}
          <div className="theme-picker-section">
            <label className="picker-label">
              <Palette size={16} />
              <span>{txt("કાર્ડની થીમ પસંદ કરો:", "कार्ड की थीम चुनें:", "Select Card Theme:")}</span>
            </label>
            <div className="theme-options-grid">
              {THEMES.map((theme) => {
                const isActive = selectedThemeId === theme.id;
                const localizedThemeName = isEnglish ? theme.englishName : (isHindi ? theme.nameHi : theme.name);
                return (
                  <button
                    key={theme.id}
                    type="button"
                    className={`theme-color-btn ${isActive ? "active" : ""}`}
                    onClick={() => setSelectedThemeId(theme.id)}
                    title={localizedThemeName}
                    aria-label={localizedThemeName}
                    style={{
                      "--btn-bg": `linear-gradient(135deg, ${theme.primaryGrad[0]}, ${theme.primaryGrad[1]})`,
                      "--border-gold": theme.borderGold,
                      "--glow-color": theme.glowColor
                    }}
                  >
                    {isActive && (
                      <Check size={14} strokeWidth={3} className="theme-btn-check" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CARD PREVIEW */}
          <div className="share-card-preview-wrapper">
            {previewUrl ? (
              <a
                href="https://gita-gyan-m.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="share-card-preview-link"
                title={txt("વેબસાઇટ ખોલવા ક્લિક કરો", "वेबसाइट खोलने के लिए क्लिक करें", "Click to open website")}
              >
                <img
                  src={previewUrl}
                  alt="Bhagavad Gita Shloka Card Preview"
                  className="share-card-preview-img"
                  style={{
                    aspectRatio: `${activeSizePreset.width} / ${activeSizePreset.height}`
                  }}
                />
              </a>
            ) : (
              <div className="preview-loading">
                <span>{txt("કાર્ડ તૈયાર થઈ રહ્યું છે...", "कार्ड तैयार हो रहा है...", "Generating card...")}</span>
              </div>
            )}
          </div>

          {/* CLICKABLE LINK BAR */}
          <div className="share-preview-link-bar">
            <a
              href="https://gita-gyan-m.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="share-preview-clickable-link"
              title={txt("વેબસાઇટ પર સીધા જવા અહીં ક્લિક કરો", "वेबसाइट खोलने के लिए क्लिक करें", "Click to visit website")}
            >
              <span>🔗 gita-gyan-m.vercel.app</span>
            </a>
          </div>

          {/* SUPER ADMIN ONLY EXPORT SIZE PICKER */}
          <AdminShareSizeSelector
            isSuperAdmin={isSuperAdmin}
            selectedSizeId={activeSizePreset.id}
            isSheetOpen={sizeSheetOpen}
            sheetMode={sizeSheetMode}
            onOpenSheet={(mode) => {
              setSizeSheetMode(mode || "select");
              setSizeSheetOpen(true);
            }}
            onCloseSheet={() => setSizeSheetOpen(false)}
            onSelectSize={handleSelectSize}
            onDownloadSize={handleDownloadSize}
            disabled={isGenerating}
          />

          {/* ACTION BUTTONS */}
          <div className="share-modal-actions">
            {/* DOWNLOAD BUTTON */}
            <button
              type="button"
              className="action-btn download-btn"
              onClick={handleDownload}
              disabled={isGenerating || !previewUrl}
              title={txt("હાઈ-ક્વોલિટી PNG ઈમેજ ડાઉનલોડ કરો", "हाई-क्वालिटी PNG इमेज डाउनलोड करें", "Download high-quality PNG image")}
            >
              <Download size={18} />
              <span>{txt("ઈમેજ ડાઉનલોડ", "इमेज डाउनलोड", "Download Image")}</span>
            </button>

            {/* WHATSAPP SHARE */}
            <button
              type="button"
              className="action-btn whatsapp-btn"
              onClick={handleShareWhatsApp}
              disabled={isGenerating || !previewUrl}
              title={txt("WhatsApp પર શેર કરો", "WhatsApp पर शेयर करें", "Share on WhatsApp")}
            >
              <MessageCircle size={18} />
              <span>{txt("WhatsApp શેર", "WhatsApp शेयर", "WhatsApp Share")}</span>
            </button>

            {/* COPY TEXT */}
            <button
              type="button"
              className="action-btn copy-btn"
              onClick={handleCopyText}
              title={txt("શ્લોક અને ભાવાર્થ કોપી કરો", "श्लोक और अर्थ कॉपी करें", "Copy Shloka and Meaning")}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              <span>{copied ? txt("કોપી થઈ ગયું!", "कॉपी हो गया!", "Copied!") : txt("ટેક્સ્ટ કોપી", "टेक्स्ट कॉपी", "Copy Text")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

