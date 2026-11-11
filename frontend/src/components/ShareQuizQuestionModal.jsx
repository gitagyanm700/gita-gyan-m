import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Download,
  Copy,
  Check,
  Sparkles,
  Palette,
  Share2
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { isExclusiveSuperAdmin } from "../utils/permissionHelper.js";
import AdminShareSizeSelector from "./AdminShareSizeSelector.jsx";
import {
  DEFAULT_SHARE_CARD_SIZE_ID,
  getShareCardSizePreset
} from "../utils/shareCardSizes.js";
import "./ShareQuizQuestionModal.css";

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
    titleAccent: "#ffd54f",
    boxBg: "rgba(255, 255, 255, 0.07)",
    boxBorder: "rgba(245, 197, 66, 0.35)",
    questionColor: "#ffffff",
    optionTextColor: "#f0f5ff",
    badgeBg: "rgba(245, 197, 66, 0.15)",
    badgeBorder: "#f5c542",
    badgeColor: "#ffe484",
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
    titleAccent: "#ffe082",
    boxBg: "rgba(255, 255, 255, 0.08)",
    boxBorder: "rgba(255, 213, 79, 0.4)",
    questionColor: "#ffffff",
    optionTextColor: "#fff9f0",
    badgeBg: "rgba(255, 213, 79, 0.16)",
    badgeBorder: "#ffd54f",
    badgeColor: "#fff0a6",
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
    titleAccent: "#ffd369",
    boxBg: "rgba(255, 255, 255, 0.07)",
    boxBorder: "rgba(247, 208, 112, 0.35)",
    questionColor: "#ffffff",
    optionTextColor: "#fff0f3",
    badgeBg: "rgba(247, 208, 112, 0.15)",
    badgeBorder: "#f7d070",
    badgeColor: "#ffeaa7",
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
    titleAccent: "#ffe082",
    boxBg: "rgba(255, 255, 255, 0.08)",
    boxBorder: "rgba(255, 229, 127, 0.35)",
    questionColor: "#ffffff",
    optionTextColor: "#fffdf2",
    badgeBg: "rgba(255, 229, 127, 0.16)",
    badgeBorder: "#ffe57f",
    badgeColor: "#fff8d6",
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
    titleAccent: "#e9d5ff",
    boxBg: "rgba(255, 255, 255, 0.07)",
    boxBorder: "rgba(253, 224, 71, 0.35)",
    questionColor: "#ffffff",
    optionTextColor: "#faf5ff",
    badgeBg: "rgba(253, 224, 71, 0.15)",
    badgeBorder: "#fde047",
    badgeColor: "#fae8ff",
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
    titleAccent: "#fbcfe8",
    boxBg: "rgba(255, 255, 255, 0.07)",
    boxBorder: "rgba(249, 210, 118, 0.35)",
    questionColor: "#ffffff",
    optionTextColor: "#fff0f5",
    badgeBg: "rgba(249, 210, 118, 0.15)",
    badgeBorder: "#f9d276",
    badgeColor: "#ffe4ec",
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
    titleAccent: "#f6c343",
    boxBg: "rgba(255, 255, 255, 0.08)",
    boxBorder: "rgba(255, 213, 79, 0.35)",
    questionColor: "#ffffff",
    optionTextColor: "#fef8f0",
    badgeBg: "rgba(255, 213, 79, 0.16)",
    badgeBorder: "#ffd54f",
    badgeColor: "#fff2cd",
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

  const converted = String(htmlString)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|li|blockquote|h[1-6]|tr)>/gi, "\n")
    .replace(/<(div|p|li|blockquote|h[1-6]|tr)[^>]*>/gi, "\n");

  const temp = document.createElement("div");
  temp.innerHTML = converted;

  let text = temp.textContent || temp.innerText || "";
  text = text.replace(/<[^>]*>/g, "");

  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\s+\n/g, "\n")
    .trim();
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
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > maxWidth && currentLine) {
        allLines.push(currentLine);
        currentLine = word;
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

export default function ShareQuizQuestionModal({
  isOpen,
  onClose,
  questionData
}) {
  const { txt } = useLanguage();
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
  const [copiedText, setCopiedText] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const activeSizePreset = isSuperAdmin
    ? getShareCardSizePreset(selectedSizeId)
    : getShareCardSizePreset(DEFAULT_SHARE_CARD_SIZE_ID);

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
      if (isOpen && questionData) {
        renderCanvasCard();
      }
    };
    if (img.complete && img.naturalWidth > 0) {
      logoImageRef.current = img;
    }
  }, [isOpen, questionData]);

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
    if (!isOpen || !questionData) return;

    const timer = setTimeout(() => {
      renderCanvasCard();
    }, 16);

    return () => clearTimeout(timer);
  }, [isOpen, questionData, selectedThemeId, activeSizePreset.id, isSuperAdmin]);

  const renderCanvasCard = (presetOverride = null) => {
    const canvas = canvasRef.current;
    if (!canvas || !questionData) return "";

    const preset = isSuperAdmin
      ? presetOverride || activeSizePreset
      : getShareCardSizePreset(DEFAULT_SHARE_CARD_SIZE_ID);

    setIsGenerating(true);
    try {
      const ctx = canvas.getContext("2d");

      const targetWidth = preset.width;
      const targetHeight = preset.height;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const layoutMode = preset.layoutMode || "9:16";
      const isLandscape = layoutMode === "16:9";
      const isSquare = layoutMode === "1:1";
      const isPortrait45 = layoutMode === "4:5";

      const vWidth = isLandscape ? 1920 : 1080;
      const vHeight = isLandscape ? 1080 : isSquare ? 1080 : isPortrait45 ? 1350 : 1920;
      const scaleRatioX = targetWidth / vWidth;
      const scaleRatioY = targetHeight / vHeight;

      ctx.save();
      if (scaleRatioX !== 1 || scaleRatioY !== 1) {
        ctx.scale(scaleRatioX, scaleRatioY);
      }

      const outerMargin = layoutMode === "9:16" ? 38 : isSquare ? 28 : 32;
      const innerMargin = layoutMode === "9:16" ? 52 : isSquare ? 40 : 44;

      // 1. Prepare Question & Options Data
      const cleanGuQuestion = cleanHtmlText(questionData.question || "");
      const rawGuOptions = (questionData.options || []).map((o) => cleanHtmlText(o));
      while (rawGuOptions.length < 4) rawGuOptions.push("");

      const cleanEnQuestion = cleanHtmlText(questionData.questionEn || questionData.question || "");
      const rawEnOptions = (questionData.optionsEn && questionData.optionsEn.some(Boolean))
        ? questionData.optionsEn.map((o) => cleanHtmlText(o))
        : rawGuOptions;
      while (rawEnOptions.length < 4) rawEnOptions.push("");

      const chNum = questionData.chapterNumber;
      const shlNum = questionData.shlokaNumber;
      const qNum = questionData.shlokaQuestionNumber || 1;
      let badgeLabel = "શ્રીમદ્ભગવદ્ગીતા ક્વિઝ";
      if (chNum) {
        badgeLabel = `અધ્યાય ${chNum}${shlNum ? ` • શ્લોક ${shlNum}` : ""} • પ્રશ્ન ${qNum}`;
      } else if (questionData.category === "mahabharata") {
        badgeLabel = `સમગ્ર મહાભારત ક્વિઝ • પ્રશ્ન ${qNum}`;
      } else if (questionData.category) {
        badgeLabel = `${questionData.category} • પ્રશ્ન ${qNum}`;
      } else {
        badgeLabel = `શ્રીમદ્ભગવદ્ગીતા ક્વિઝ • પ્રશ્ન ${qNum}`;
      }

      // Header & Footer boundaries
      const headingFontSize = layoutMode === "9:16" ? 44 : isSquare ? 38 : 40;
      const headingCenterY =
        layoutMode === "9:16" ? innerMargin + 64 : isSquare ? innerMargin + 38 : innerMargin + 42;
      const badgeCenterY =
        layoutMode === "9:16" ? headingCenterY + 68 : headingCenterY + 50;
      const bH = layoutMode === "9:16" ? 46 : 38;
      const headerDividerY =
        layoutMode === "9:16" ? badgeCenterY + 44 : badgeCenterY + 33;

      const footerDividerY =
        layoutMode === "9:16"
          ? vHeight - innerMargin - 66
          : isSquare
          ? vHeight - innerMargin - 48
          : vHeight - innerMargin - 50;

      const availableH = footerDividerY - headerDividerY - (layoutMode === "9:16" ? 24 : 18);

      // Helper to measure a single language block (stacked or 2x2 option grid)
      const measureLangSection = (
        qText,
        opts,
        fontFamily,
        boxW,
        qWrapW,
        scale,
        useGrid,
        minFonts
      ) => {
        const sectionHeaderH = Math.max(22, Math.round(36 * scale));
        const qFontSize = Math.max(minFonts.qMin, Math.round(34 * scale));
        const qLineH = Math.round(qFontSize * (layoutMode === "9:16" ? 1.55 : 1.48));
        const qBoxPad = Math.max(10, Math.round(18 * scale));
        const optFontSize = Math.max(minFonts.oMin, Math.round(27 * scale));
        const optLineH = Math.round(optFontSize * (layoutMode === "9:16" ? 1.45 : 1.38));
        const optPadY = Math.max(8, Math.round(14 * scale));
        const optBoxGap = Math.max(7, Math.round(13 * scale));

        ctx.font = `bold ${qFontSize}px ${fontFamily}`;
        const wrappedQ = wrapText(ctx, qText, qWrapW - qBoxPad * 2);
        const qBoxH = wrappedQ.length * qLineH + qBoxPad * 2;

        const badgeR = Math.max(13, Math.round(18 * scale));
        const colGap = 14;
        const halfBoxW = (boxW - colGap) / 2;
        const badgeOffset = useGrid ? 28 : 40;
        const textMaxW = useGrid
          ? halfBoxW - (badgeOffset + badgeR + 28)
          : boxW - (badgeOffset + badgeR + 36);

        ctx.font = `600 ${optFontSize}px ${fontFamily}`;
        const optBoxes = opts.map((opt) => {
          const lines = wrapText(ctx, opt, textMaxW);
          const h = Math.max(
            Math.round((useGrid ? 50 : 58) * scale),
            lines.length * optLineH + optPadY * 2
          );
          return { lines, h };
        });

        let totalOptH = 0;
        let row1H = 0;
        let row2H = 0;
        if (useGrid) {
          row1H = Math.max(optBoxes[0].h, optBoxes[1].h);
          row2H = Math.max(optBoxes[2].h, optBoxes[3].h);
          totalOptH = row1H + optBoxGap + row2H;
        } else {
          totalOptH =
            optBoxes.reduce((acc, o) => acc + o.h, 0) +
            (optBoxes.length - 1) * optBoxGap;
        }

        const headerGap = layoutMode === "9:16" ? 12 : 10;
        const qOptGap = layoutMode === "9:16" ? 16 : 12;
        const totalSectionH = sectionHeaderH + headerGap + qBoxH + qOptGap + totalOptH;

        return {
          sectionHeaderH,
          qFontSize,
          qLineH,
          qBoxPad,
          optFontSize,
          optLineH,
          optPadY,
          optBoxGap,
          badgeR,
          badgeOffset,
          colGap,
          halfBoxW,
          headerGap,
          qOptGap,
          wrappedQ,
          qBoxH,
          optBoxes,
          row1H,
          row2H,
          totalSectionH,
          useGrid,
        };
      };

      const guFont = '"Noto Sans Gujarati", sans-serif';
      const enFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      let bestLayout = null;

      if (layoutMode === "9:16") {
        const contentMaxW = vWidth - 140;
        const optionBoxW = vWidth - 130;
        const minFonts = { qMin: 22, oMin: 19 };
        for (let s = 1.0; s >= 0.52; s -= 0.02) {
          const sc = Number(s.toFixed(2));
          const gu = measureLangSection(cleanGuQuestion, rawGuOptions, guFont, optionBoxW, contentMaxW, sc, false, minFonts);
          const en = measureLangSection(cleanEnQuestion, rawEnOptions, enFont, optionBoxW, contentMaxW, sc, false, minFonts);
          const dividerGap = Math.round(30 * sc);
          const totalRequiredH = gu.totalSectionH + dividerGap + en.totalSectionH;
          if (totalRequiredH <= availableH || s <= 0.54) {
            bestLayout = {
              mode: "vertical",
              scale: sc,
              boxW: optionBoxW,
              gu,
              en,
              dividerGap,
              totalRequiredH,
            };
            break;
          }
        }
      } else if (layoutMode === "4:5") {
        const optionBoxW = vWidth - 110; // 970px
        const minFonts = { qMin: 16, oMin: 14 };
        // Try stacked first down to 0.58; if too tight, use 2x2 grid so fonts stay larger
        for (let s = 0.94; s >= 0.58; s -= 0.02) {
          const sc = Number(s.toFixed(2));
          const gu = measureLangSection(cleanGuQuestion, rawGuOptions, guFont, optionBoxW, optionBoxW, sc, false, minFonts);
          const en = measureLangSection(cleanEnQuestion, rawEnOptions, enFont, optionBoxW, optionBoxW, sc, false, minFonts);
          const dividerGap = Math.round(24 * sc);
          const totalRequiredH = gu.totalSectionH + dividerGap + en.totalSectionH;
          if (totalRequiredH <= availableH) {
            bestLayout = {
              mode: "vertical",
              scale: sc,
              boxW: optionBoxW,
              gu,
              en,
              dividerGap,
              totalRequiredH,
            };
            break;
          }
        }
        if (!bestLayout) {
          for (let s = 0.92; s >= 0.34; s -= 0.02) {
            const sc = Number(s.toFixed(2));
            const gu = measureLangSection(cleanGuQuestion, rawGuOptions, guFont, optionBoxW, optionBoxW, sc, true, minFonts);
            const en = measureLangSection(cleanEnQuestion, rawEnOptions, enFont, optionBoxW, optionBoxW, sc, true, minFonts);
            const dividerGap = Math.round(24 * sc);
            const totalRequiredH = gu.totalSectionH + dividerGap + en.totalSectionH;
            if (totalRequiredH <= availableH || s <= 0.36) {
              bestLayout = {
                mode: "vertical",
                scale: sc,
                boxW: optionBoxW,
                gu,
                en,
                dividerGap,
                totalRequiredH,
              };
              break;
            }
          }
        }
      } else if (layoutMode === "1:1") {
        const optionBoxW = vWidth - 104; // 976px
        const minFonts = { qMin: 15, oMin: 13 };
        for (let s = 0.94; s >= 0.32; s -= 0.02) {
          const sc = Number(s.toFixed(2));
          const gu = measureLangSection(cleanGuQuestion, rawGuOptions, guFont, optionBoxW, optionBoxW, sc, true, minFonts);
          const en = measureLangSection(cleanEnQuestion, rawEnOptions, enFont, optionBoxW, optionBoxW, sc, true, minFonts);
          const dividerGap = Math.round(20 * sc);
          const totalRequiredH = gu.totalSectionH + dividerGap + en.totalSectionH;
          if (totalRequiredH <= availableH || s <= 0.34) {
            bestLayout = {
              mode: "vertical",
              scale: sc,
              boxW: optionBoxW,
              gu,
              en,
              dividerGap,
              totalRequiredH,
            };
            break;
          }
        }
      } else {
        // 16:9 Landscape: Side-by-Side 2 Columns (Gujarati Left, English Right)
        const colBoxW = 845;
        const minFonts = { qMin: 17, oMin: 15 };
        for (let s = 1.0; s >= 0.34; s -= 0.02) {
          const sc = Number(s.toFixed(2));
          const gu = measureLangSection(cleanGuQuestion, rawGuOptions, guFont, colBoxW, colBoxW, sc, false, minFonts);
          const en = measureLangSection(cleanEnQuestion, rawEnOptions, enFont, colBoxW, colBoxW, sc, false, minFonts);
          const maxColH = Math.max(gu.totalSectionH, en.totalSectionH);
          if (maxColH <= availableH || s <= 0.36) {
            bestLayout = {
              mode: "two-column",
              scale: sc,
              boxW: colBoxW,
              gu,
              en,
              totalRequiredH: maxColH,
            };
            break;
          }
        }
      }

      if (!bestLayout) {
        const fallbackW = isLandscape ? 845 : vWidth - 110;
        const fallbackFonts = { qMin: 15, oMin: 13 };
        const gu = measureLangSection(cleanGuQuestion, rawGuOptions, guFont, fallbackW, fallbackW, 0.48, !isLandscape && layoutMode !== "9:16", fallbackFonts);
        const en = measureLangSection(cleanEnQuestion, rawEnOptions, enFont, fallbackW, fallbackW, 0.48, !isLandscape && layoutMode !== "9:16", fallbackFonts);
        bestLayout = {
          mode: isLandscape ? "two-column" : "vertical",
          scale: 0.48,
          boxW: fallbackW,
          gu,
          en,
          dividerGap: 18,
          totalRequiredH: isLandscape
            ? Math.max(gu.totalSectionH, en.totalSectionH)
            : gu.totalSectionH + 18 + en.totalSectionH,
        };
      }

      // 2. Render Background & Frames
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

      // Top Ambient Glow
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

      // 3. Subtle Website Link Repeating Background Watermark
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
      ctx.fillStyle = currentTheme.borderGold || "#f5c542";
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

      // Subtle App Logo in center
      if (hasLogo) {
        ctx.save();
        ctx.globalAlpha = 0.085;
        const logoX = logoCenterX - logoSize / 2;
        const logoY = logoCenterY - logoSize / 2;
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      }

      // Ornamental Gold Borders
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

      // Corner Ornaments
      const cornerSize = 22;
      const drawCorner = (cx, cy) => {
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
      drawCorner(innerMargin, innerMargin);
      drawCorner(vWidth - innerMargin, innerMargin);
      drawCorner(innerMargin, vHeight - innerMargin);
      drawCorner(vWidth - innerMargin, vHeight - innerMargin);

      // Divider Helper
      const drawDivider = (yPos, divW = 540, centerX = vWidth / 2) => {
        ctx.save();
        const half = divW / 2;
        const divGrad = ctx.createLinearGradient(centerX - half, yPos, centerX + half, yPos);
        divGrad.addColorStop(0, "transparent");
        divGrad.addColorStop(0.35, currentTheme.innerBorder);
        divGrad.addColorStop(0.5, currentTheme.borderGold);
        divGrad.addColorStop(0.65, currentTheme.innerBorder);
        divGrad.addColorStop(1, "transparent");

        ctx.strokeStyle = divGrad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(centerX - half, yPos);
        ctx.lineTo(centerX + half, yPos);
        ctx.stroke();

        ctx.fillStyle = currentTheme.borderGold;
        ctx.beginPath();
        ctx.arc(centerX, yPos, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
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
        ctx.arc(xPos, midY, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      // 4. Header: Top Title & Chapter/Category Badge
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.font = `bold ${headingFontSize}px "Noto Sans Devanagari", "Noto Sans Gujarati", serif`;
      ctx.fillStyle = currentTheme.headerColor;
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 10;
      ctx.fillText("॥ શ્રીમદ્ભગવદ્ગીતા ક્વિઝ ॥", vWidth / 2, headingCenterY);
      ctx.shadowBlur = 0;

      ctx.font = `bold ${layoutMode === "9:16" ? 24 : 21}px "Noto Sans Gujarati", sans-serif`;
      const bMetrics = ctx.measureText(badgeLabel);
      const bPadX = 32;
      const bW = Math.min(vWidth - 200, bMetrics.width + bPadX * 2);

      drawRoundRect(
        ctx,
        vWidth / 2 - bW / 2,
        badgeCenterY - bH / 2,
        bW,
        bH,
        Math.round(bH / 2),
        "rgba(0, 0, 0, 0.42)",
        currentTheme.innerBorder,
        1.3
      );
      ctx.fillStyle = currentTheme.titleAccent;
      ctx.fillText(badgeLabel, vWidth / 2, badgeCenterY);

      drawDivider(headerDividerY, isLandscape ? 780 : 560);

      const optLetters = ["A", "B", "C", "D"];

      // Helper to render one language section cleanly at (boxX, startY)
      const drawLangSection = (boxX, startY, boxW, sec, titleText, fontFamily) => {
        const centerX = boxX + boxW / 2;
        let currY = startY;

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `bold ${sec.sectionHeaderH}px ${fontFamily}`;
        ctx.fillStyle = currentTheme.titleAccent;
        ctx.fillText(titleText, centerX, currY + sec.sectionHeaderH / 2);
        currY += sec.sectionHeaderH + sec.headerGap;

        // Question Box
        drawRoundRect(
          ctx,
          boxX,
          currY,
          boxW,
          sec.qBoxH,
          16,
          "rgba(255, 255, 255, 0.06)",
          currentTheme.boxBorder,
          1.2
        );

        ctx.font = `bold ${sec.qFontSize}px ${fontFamily}`;
        ctx.fillStyle = currentTheme.questionColor;
        ctx.textAlign = "center";
        let qTextY = currY + sec.qBoxPad + sec.qLineH / 2;
        sec.wrappedQ.forEach((line) => {
          ctx.fillText(line, centerX, qTextY);
          qTextY += sec.qLineH;
        });
        currY += sec.qBoxH + sec.qOptGap;

        const drawOptionBox = (ox, oy, ow, oh, optBox, idx) => {
          drawRoundRect(
            ctx,
            ox,
            oy,
            ow,
            oh,
            14,
            currentTheme.boxBg,
            currentTheme.boxBorder,
            1
          );

          const badgeX = ox + sec.badgeOffset;
          const badgeY = oy + oh / 2;
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, sec.badgeR, 0, Math.PI * 2);
          ctx.fillStyle = currentTheme.badgeBg;
          ctx.fill();
          ctx.strokeStyle = currentTheme.badgeBorder;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.font = `bold ${Math.round(sec.optFontSize * 0.95)}px -apple-system, sans-serif`;
          ctx.fillStyle = currentTheme.badgeColor;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(optLetters[idx], badgeX, badgeY);

          ctx.font = `600 ${sec.optFontSize}px ${fontFamily}`;
          ctx.fillStyle = currentTheme.optionTextColor;
          ctx.textAlign = "left";
          const optTextStartX = badgeX + sec.badgeR + (sec.useGrid ? 14 : 20);
          let optTextY =
            oy + (oh - (optBox.lines.length - 1) * sec.optLineH) / 2;
          optBox.lines.forEach((line) => {
            ctx.fillText(line, optTextStartX, optTextY);
            optTextY += sec.optLineH;
          });
        };

        if (sec.useGrid) {
          // 2x2 Option Grid: Row 1 (A, B), Row 2 (C, D)
          const rightColX = boxX + sec.halfBoxW + sec.colGap;
          drawOptionBox(boxX, currY, sec.halfBoxW, sec.row1H, sec.optBoxes[0], 0);
          drawOptionBox(rightColX, currY, sec.halfBoxW, sec.row1H, sec.optBoxes[1], 1);
          currY += sec.row1H + sec.optBoxGap;

          drawOptionBox(boxX, currY, sec.halfBoxW, sec.row2H, sec.optBoxes[2], 2);
          drawOptionBox(rightColX, currY, sec.halfBoxW, sec.row2H, sec.optBoxes[3], 3);
        } else {
          sec.optBoxes.forEach((optBox, idx) => {
            drawOptionBox(boxX, currY, boxW, optBox.h, optBox, idx);
            currY += optBox.h + sec.optBoxGap;
          });
        }
      };

      // 5. Render Main Question Sections
      if (bestLayout.mode === "two-column") {
        // 16:9 Landscape: Left Gujarati, Right English
        drawVerticalDivider(vWidth / 2, headerDividerY + 22, footerDividerY - 22);

        const guSlack = Math.max(0, availableH - bestLayout.gu.totalSectionH);
        const enSlack = Math.max(0, availableH - bestLayout.en.totalSectionH);
        const guStartY = headerDividerY + 10 + Math.floor(guSlack * 0.48);
        const enStartY = headerDividerY + 10 + Math.floor(enSlack * 0.48);

        drawLangSection(
          70,
          guStartY,
          bestLayout.boxW,
          bestLayout.gu,
          `✦ પ્રશ્ન ${qNum} (ગુજરાતી) ✦`,
          guFont
        );
        drawLangSection(
          1005,
          enStartY,
          bestLayout.boxW,
          bestLayout.en,
          `✦ Question ${qNum} (English) ✦`,
          enFont
        );
      } else {
        // Vertical Stacked Mode (9:16, 4:5, 1:1)
        const totalSlack = Math.max(0, availableH - bestLayout.totalRequiredH);
        const topSpacing = Math.min(26, Math.floor(totalSlack * 0.25));
        const midSpacing = Math.min(48, Math.floor(totalSlack * 0.5));

        const qBoxX = (vWidth - bestLayout.boxW) / 2;
        let currY = headerDividerY + (layoutMode === "9:16" ? 20 : 12) + topSpacing;

        drawLangSection(
          qBoxX,
          currY,
          bestLayout.boxW,
          bestLayout.gu,
          `✦ પ્રશ્ન ${qNum} (ગુજરાતી) ✦`,
          guFont
        );

        currY += bestLayout.gu.totalSectionH + 6 + midSpacing / 2;
        drawDivider(currY, 680);
        currY += (layoutMode === "9:16" ? 20 : 14) + midSpacing / 2;

        drawLangSection(
          qBoxX,
          currY,
          bestLayout.boxW,
          bestLayout.en,
          `✦ Question ${qNum} (English) ✦`,
          enFont
        );
      }

      // 8. Footer: Divider & Website Pill
      drawDivider(footerDividerY, isLandscape ? 720 : 520);

      const siteUrl = "gita-gyan-m.vercel.app";
      const pillText = `🔗 ${siteUrl}`;
      ctx.font = '700 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const pillMetrics = ctx.measureText(pillText);
      const pillW = Math.min(vWidth - 200, pillMetrics.width + 56);
      const pillH = layoutMode === "9:16" ? 46 : 38;
      const pillY = footerDividerY + (layoutMode === "9:16" ? 36 : 27);

      drawRoundRect(
        ctx,
        vWidth / 2 - pillW / 2,
        pillY - pillH / 2,
        pillW,
        pillH,
        Math.round(pillH / 2),
        "rgba(0, 0, 0, 0.48)",
        currentTheme.innerBorder,
        1.4
      );

      ctx.fillStyle = currentTheme.headerColor;
      ctx.fillText(pillText, vWidth / 2, pillY);

      ctx.restore();

      // Export preview
      const dataUrl = canvas.toDataURL("image/png");
      setPreviewUrl(dataUrl);
      setIsGenerating(false);
      return dataUrl;
    } catch (err) {
      console.error("Error generating quiz question canvas:", err);
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
    const ch = questionData.chapterNumber || "general";
    const shl = questionData.shlokaNumber ? `_Shl${questionData.shlokaNumber}` : "";
    const qNum = questionData.shlokaQuestionNumber || 1;
    link.download = isSuperAdmin
      ? `Gita_Quiz_Question_Ch${ch}${shl}_Q${qNum}_${targetPreset.width}x${targetPreset.height}.png`
      : `Gita_Quiz_Question_Ch${ch}${shl}_Q${qNum}.png`;
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
    const qNum = questionData.shlokaQuestionNumber || 1;
    const shareText = `શ્રીમદ્ભગવદ્ગીતા ક્વિઝ - પ્રશ્ન ${qNum}\nસાચો ઉત્તર આપવા માટે વેબસાઇટની મુલાકાત લો:\nhttps://gita-gyan-m.vercel.app`;

    if (canvas && navigator.canShare) {
      try {
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        const ch = questionData.chapterNumber || "general";
        const shl = questionData.shlokaNumber ? `_Shl${questionData.shlokaNumber}` : "";
        const file = new File(
          [blob],
          `Gita_Quiz_Question_Ch${ch}${shl}_Q${qNum}.png`,
          { type: "image/png" }
        );

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `શ્રીમદ્ભગવદ્ગીતા ક્વિઝ - પ્રશ્ન ${qNum}`,
            text: shareText
          });
          return;
        }
      } catch (err) {
        console.log("Web Share API fallback:", err);
      }
    }

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyText = () => {
    const qNum = questionData.shlokaQuestionNumber || 1;
    const qGu = cleanHtmlText(questionData.question || "");
    const qEn = cleanHtmlText(questionData.questionEn || questionData.question || "");
    const optsGu = (questionData.options || []).map((o, i) => `(${String.fromCharCode(65 + i)}) ${cleanHtmlText(o)}`).join("\n");
    const optsEn = (questionData.optionsEn && questionData.optionsEn.some(Boolean))
      ? questionData.optionsEn.map((o, i) => `(${String.fromCharCode(65 + i)}) ${cleanHtmlText(o)}`).join("\n")
      : optsGu;

    const chStr = questionData.chapterNumber
      ? `📌 અધ્યાય ${questionData.chapterNumber}${questionData.shlokaNumber ? ` • શ્લોક ${questionData.shlokaNumber}` : ""} • પ્રશ્ન ${qNum}\n`
      : `📌 પ્રશ્ન ${qNum}\n`;

    const textToCopy = `॥ શ્રીમદ્ભગવદ્ગીતા ક્વિઝ ॥\n${chStr}\n❓ પ્રશ્ન ${qNum} (ગુજરાતી):\n${qGu}\n\n${optsGu}\n\n━━━━━━━━━━━━━━━━━━━━\n\n❓ Question ${qNum} (English):\n${qEn}\n\n${optsEn}\n\n🌐 સાચો ઉત્તર આપવા માટે વેબસાઇટ જુઓ:\nhttps://gita-gyan-m.vercel.app`;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    });
  };

  if (!isOpen || !questionData) return null;

  return createPortal(
    <div className="share-quiz-modal-overlay" onClick={onClose}>
      <div
        className="share-quiz-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Share Quiz Question Card"
      >
        {/* Hidden Canvas for High-Resolution Export */}
        <canvas
          ref={canvasRef}
          style={{ display: "none" }}
          width={1080}
          height={1920}
        />

        {/* Modal Header */}
        <div className="share-quiz-modal-header">
          <div className="share-quiz-modal-title">
            <Sparkles size={18} className="share-quiz-sparkle-icon" />
            <h3>Share Question Card</h3>
            {questionData.shlokaQuestionNumber && (
              <span className="share-quiz-admin-tag" style={{ background: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" }}>
                {questionData.shlokaNumber ? `શ્લોક ${questionData.shlokaNumber} • Q#${questionData.shlokaQuestionNumber}` : `Q#${questionData.shlokaQuestionNumber}`}
              </span>
            )}
            <span className="share-quiz-admin-tag">Admin Only</span>
          </div>

          <button
            type="button"
            className="share-quiz-close-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="share-quiz-modal-body">
          {/* Live Card Preview */}
          <div className="share-quiz-preview-wrapper">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Quiz Question Card Preview"
                className="share-quiz-card-img"
                style={{
                  aspectRatio: `${activeSizePreset.width} / ${activeSizePreset.height}`
                }}
              />
            ) : (
              <div className="share-quiz-preview-loading">
                <Sparkles size={24} className="animate-spin" />
                <span>કાર્ડ તૈયાર થઈ રહ્યું છે...</span>
              </div>
            )}
          </div>

          {/* Theme Color Selector */}
          <div className="share-quiz-theme-section">
            <div className="share-quiz-theme-header">
              <Palette size={15} color="#ffd54f" />
              <span>થીમ પસંદ કરો (Theme Color):</span>
            </div>

            <div className="share-quiz-theme-grid">
              {THEMES.map((theme) => {
                const isActive = theme.id === selectedThemeId;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    className={`share-quiz-theme-circle-btn ${isActive ? "active" : ""}`}
                    onClick={() => setSelectedThemeId(theme.id)}
                    title={theme.name}
                    aria-label={theme.name}
                  >
                    <span
                      className="share-quiz-theme-color-dot"
                      style={{ background: theme.sampleColor }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Super-Admin-Only Export Size Picker */}
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

          {/* Action Buttons: 3 options in 1 single row */}
          <div className="share-quiz-actions">
            <div className="share-quiz-btn-row">
              <button
                type="button"
                className="share-quiz-action-btn share-quiz-download-btn"
                onClick={handleDownload}
                disabled={isGenerating || !previewUrl}
                title="ડાઉનલોડ કાર્ડ (PNG)"
              >
                <Download size={15} />
                <span>ડાઉનલોડ</span>
              </button>

              <button
                type="button"
                className="share-quiz-action-btn share-quiz-whatsapp-btn"
                onClick={handleShareWhatsApp}
                disabled={isGenerating || !previewUrl}
                title="શેર કરો (WhatsApp / Social Share)"
              >
                <Share2 size={15} />
                <span>શેર</span>
              </button>

              <button
                type="button"
                className="share-quiz-action-btn share-quiz-copy-btn"
                onClick={handleCopyText}
                title="પ્રશ્નનું લખાણ કોપી કરો"
              >
                {copiedText ? <Check size={15} color="#10b981" /> : <Copy size={15} />}
                <span>{copiedText ? "કોપી થયું!" : "લખાણ કોપી"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

