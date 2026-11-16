// =====================================================
// BHAGAVAD GITA - SHARED CANVAS CARD THEMES & HELPERS
// Used by ShareShlokaModal and ShareQuizQuestionModal
// =====================================================

export const THEMES = [
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
    sanskritColor: "#ffffff",
    sanskritAccent: "#ffd54f",
    sanskritBoxBg: "rgba(255, 255, 255, 0.07)",
    sanskritBoxBorder: "rgba(245, 197, 66, 0.35)",
    boxBg: "rgba(255, 255, 255, 0.07)",
    boxBorder: "rgba(245, 197, 66, 0.35)",
    questionColor: "#ffffff",
    optionTextColor: "#f0f5ff",
    translationColor: "#f0f5ff",
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
    sanskritColor: "#ffffff",
    sanskritAccent: "#ffe082",
    sanskritBoxBg: "rgba(255, 255, 255, 0.08)",
    sanskritBoxBorder: "rgba(255, 213, 79, 0.4)",
    boxBg: "rgba(255, 255, 255, 0.08)",
    boxBorder: "rgba(255, 213, 79, 0.4)",
    questionColor: "#ffffff",
    optionTextColor: "#fff9f0",
    translationColor: "#fff9f0",
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
    sanskritColor: "#ffffff",
    sanskritAccent: "#ffd369",
    sanskritBoxBg: "rgba(255, 255, 255, 0.07)",
    sanskritBoxBorder: "rgba(247, 208, 112, 0.35)",
    boxBg: "rgba(255, 255, 255, 0.07)",
    boxBorder: "rgba(247, 208, 112, 0.35)",
    questionColor: "#ffffff",
    optionTextColor: "#fff0f3",
    translationColor: "#fff0f3",
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
    sanskritColor: "#ffffff",
    sanskritAccent: "#ffe082",
    sanskritBoxBg: "rgba(255, 255, 255, 0.08)",
    sanskritBoxBorder: "rgba(255, 229, 127, 0.35)",
    boxBg: "rgba(255, 255, 255, 0.08)",
    boxBorder: "rgba(255, 229, 127, 0.35)",
    questionColor: "#ffffff",
    optionTextColor: "#fffdf2",
    translationColor: "#fffdf2",
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
    sanskritColor: "#ffffff",
    sanskritAccent: "#e9d5ff",
    sanskritBoxBg: "rgba(255, 255, 255, 0.07)",
    sanskritBoxBorder: "rgba(253, 224, 71, 0.35)",
    boxBg: "rgba(255, 255, 255, 0.07)",
    boxBorder: "rgba(253, 224, 71, 0.35)",
    questionColor: "#ffffff",
    optionTextColor: "#faf5ff",
    translationColor: "#faf5ff",
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
    sanskritColor: "#ffffff",
    sanskritAccent: "#fbcfe8",
    sanskritBoxBg: "rgba(255, 255, 255, 0.07)",
    sanskritBoxBorder: "rgba(249, 210, 118, 0.35)",
    boxBg: "rgba(255, 255, 255, 0.07)",
    boxBorder: "rgba(249, 210, 118, 0.35)",
    questionColor: "#ffffff",
    optionTextColor: "#fff0f5",
    translationColor: "#fff0f5",
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
    sanskritColor: "#ffffff",
    sanskritAccent: "#f6c343",
    sanskritBoxBg: "rgba(255, 255, 255, 0.08)",
    sanskritBoxBorder: "rgba(255, 213, 79, 0.35)",
    boxBg: "rgba(255, 255, 255, 0.08)",
    boxBorder: "rgba(255, 213, 79, 0.35)",
    questionColor: "#ffffff",
    optionTextColor: "#fef8f0",
    translationColor: "#fef8f0",
    badgeBg: "rgba(255, 213, 79, 0.16)",
    badgeBorder: "#ffd54f",
    badgeColor: "#fff2cd",
    footerColor: "#fcd34d",
    glowColor: "rgba(234, 88, 12, 0.55)",
    sampleColor: "#6f3a18"
  },
  {
    id: "tulsi-emerald",
    name: "તુલસી શ્યામ",
    nameHi: "तुलसी श्याम",
    englishName: "Tulsi Emerald",
    primaryGrad: ["#0b3820", "#125431", "#052213"],
    borderGold: "#f5c542",
    innerBorder: "rgba(245, 197, 66, 0.45)",
    headerColor: "#d1fae5",
    titleAccent: "#6ee7b7",
    sanskritColor: "#ffffff",
    sanskritAccent: "#6ee7b7",
    sanskritBoxBg: "rgba(255, 255, 255, 0.07)",
    sanskritBoxBorder: "rgba(245, 197, 66, 0.35)",
    boxBg: "rgba(255, 255, 255, 0.07)",
    boxBorder: "rgba(245, 197, 66, 0.35)",
    questionColor: "#ffffff",
    optionTextColor: "#ecfdf5",
    translationColor: "#ecfdf5",
    badgeBg: "rgba(16, 185, 129, 0.2)",
    badgeBorder: "#34d399",
    badgeColor: "#d1fae5",
    footerColor: "#a7f3d0",
    glowColor: "rgba(16, 185, 129, 0.55)",
    sampleColor: "#125431"
  },
  {
    id: "peacock-teal",
    name: "મયૂર પંખ",
    nameHi: "मयૂર पंख",
    englishName: "Peacock Teal",
    primaryGrad: ["#083e47", "#0c5966", "#04252b"],
    borderGold: "#ffd54f",
    innerBorder: "rgba(255, 213, 79, 0.45)",
    headerColor: "#cffafe",
    titleAccent: "#67e8f9",
    sanskritColor: "#ffffff",
    sanskritAccent: "#67e8f9",
    sanskritBoxBg: "rgba(255, 255, 255, 0.07)",
    sanskritBoxBorder: "rgba(255, 213, 79, 0.35)",
    boxBg: "rgba(255, 255, 255, 0.07)",
    boxBorder: "rgba(255, 213, 79, 0.35)",
    questionColor: "#ffffff",
    optionTextColor: "#f0fdfa",
    translationColor: "#f0fdfa",
    badgeBg: "rgba(20, 184, 166, 0.2)",
    badgeBorder: "#2dd4bf",
    badgeColor: "#cffafe",
    footerColor: "#99f6e4",
    glowColor: "rgba(13, 148, 136, 0.55)",
    sampleColor: "#0c5966"
  },
  {
    id: "kashi-obsidian",
    name: "કાશી વિશ્વનાથ",
    nameHi: "काशी विश्वनाथ",
    englishName: "Kashi Obsidian",
    primaryGrad: ["#171921", "#242733", "#0e0f14"],
    borderGold: "#ffd700",
    innerBorder: "rgba(255, 215, 0, 0.5)",
    headerColor: "#fef08a",
    titleAccent: "#fde047",
    sanskritColor: "#ffffff",
    sanskritAccent: "#fde047",
    sanskritBoxBg: "rgba(255, 255, 255, 0.08)",
    sanskritBoxBorder: "rgba(255, 215, 0, 0.38)",
    boxBg: "rgba(255, 255, 255, 0.08)",
    boxBorder: "rgba(255, 215, 0, 0.38)",
    questionColor: "#ffffff",
    optionTextColor: "#f8fafc",
    translationColor: "#f8fafc",
    badgeBg: "rgba(255, 215, 0, 0.18)",
    badgeBorder: "#ffd700",
    badgeColor: "#fef08a",
    footerColor: "#e2e8f0",
    glowColor: "rgba(255, 215, 0, 0.5)",
    sampleColor: "#242733"
  },
  {
    id: "kailash-slate",
    name: "કૈલાશ નીલમ",
    nameHi: "कैलाश नीलम",
    englishName: "Kailash Slate",
    primaryGrad: ["#1c2938", "#2a3b50", "#111b26"],
    borderGold: "#f5c542",
    innerBorder: "rgba(245, 197, 66, 0.42)",
    headerColor: "#e0f2fe",
    titleAccent: "#7dd3fc",
    sanskritColor: "#ffffff",
    sanskritAccent: "#7dd3fc",
    sanskritBoxBg: "rgba(255, 255, 255, 0.07)",
    sanskritBoxBorder: "rgba(245, 197, 66, 0.32)",
    boxBg: "rgba(255, 255, 255, 0.07)",
    boxBorder: "rgba(245, 197, 66, 0.32)",
    questionColor: "#ffffff",
    optionTextColor: "#f0f9ff",
    translationColor: "#f0f9ff",
    badgeBg: "rgba(56, 189, 248, 0.18)",
    badgeBorder: "#38bdf8",
    badgeColor: "#e0f2fe",
    footerColor: "#bae6fd",
    glowColor: "rgba(14, 165, 233, 0.5)",
    sampleColor: "#2a3b50"
  },
  {
    id: "sacred-sandalwood",
    name: "ચંદન કાંતિ",
    nameHi: "चंदन कांति",
    englishName: "Sacred Sandalwood",
    primaryGrad: ["#442a18", "#5c3921", "#2e1c10"],
    borderGold: "#ffe082",
    innerBorder: "rgba(255, 224, 130, 0.45)",
    headerColor: "#fef3c7",
    titleAccent: "#fde68a",
    sanskritColor: "#ffffff",
    sanskritAccent: "#fde68a",
    sanskritBoxBg: "rgba(255, 255, 255, 0.08)",
    sanskritBoxBorder: "rgba(255, 224, 130, 0.35)",
    boxBg: "rgba(255, 255, 255, 0.08)",
    boxBorder: "rgba(255, 224, 130, 0.35)",
    questionColor: "#ffffff",
    optionTextColor: "#fffbeb",
    translationColor: "#fffbeb",
    badgeBg: "rgba(245, 158, 11, 0.18)",
    badgeBorder: "#fbbf24",
    badgeColor: "#fef3c7",
    footerColor: "#fcd34d",
    glowColor: "rgba(217, 119, 6, 0.55)",
    sampleColor: "#5c3921"
  },
  {
    id: "cosmic-indigo",
    name: "બ્રહ્માંડ નીલ",
    nameHi: "ब्रह्मांड नील",
    englishName: "Cosmic Indigo",
    primaryGrad: ["#22164e", "#332274", "#150d33"],
    borderGold: "#fcd34d",
    innerBorder: "rgba(252, 211, 77, 0.45)",
    headerColor: "#ede9fe",
    titleAccent: "#c4b5fd",
    sanskritColor: "#ffffff",
    sanskritAccent: "#c4b5fd",
    sanskritBoxBg: "rgba(255, 255, 255, 0.07)",
    sanskritBoxBorder: "rgba(252, 211, 77, 0.35)",
    boxBg: "rgba(255, 255, 255, 0.07)",
    boxBorder: "rgba(252, 211, 77, 0.35)",
    questionColor: "#ffffff",
    optionTextColor: "#f5f3ff",
    translationColor: "#f5f3ff",
    badgeBg: "rgba(139, 92, 246, 0.2)",
    badgeBorder: "#a78bfa",
    badgeColor: "#ede9fe",
    footerColor: "#ddd6fe",
    glowColor: "rgba(124, 58, 237, 0.55)",
    sampleColor: "#332274"
  },
  {
    id: "ocean-cyan",
    name: "સાગર ગંભીર",
    nameHi: "सागर गंभीर",
    englishName: "Ocean Cyan",
    primaryGrad: ["#053648", "#074c66", "#03232f"],
    borderGold: "#ffd54f",
    innerBorder: "rgba(255, 213, 79, 0.45)",
    headerColor: "#e0f2fe",
    titleAccent: "#38bdf8",
    sanskritColor: "#ffffff",
    sanskritAccent: "#38bdf8",
    sanskritBoxBg: "rgba(255, 255, 255, 0.07)",
    sanskritBoxBorder: "rgba(255, 213, 79, 0.35)",
    boxBg: "rgba(255, 255, 255, 0.07)",
    boxBorder: "rgba(255, 213, 79, 0.35)",
    questionColor: "#ffffff",
    optionTextColor: "#f0f9ff",
    translationColor: "#f0f9ff",
    badgeBg: "rgba(6, 182, 212, 0.2)",
    badgeBorder: "#22d3ee",
    badgeColor: "#cffafe",
    footerColor: "#7dd3fc",
    glowColor: "rgba(6, 182, 212, 0.55)",
    sampleColor: "#074c66"
  },
  {
    id: "rudra-crimson",
    name: "રુદ્ર અગ્નિ",
    nameHi: "रुद्र अग्नि",
    englishName: "Rudra Crimson",
    primaryGrad: ["#6b0b0b", "#941313", "#450505"],
    borderGold: "#ffd54f",
    innerBorder: "rgba(255, 213, 79, 0.48)",
    headerColor: "#fee2e2",
    titleAccent: "#fca5a5",
    sanskritColor: "#ffffff",
    sanskritAccent: "#fca5a5",
    sanskritBoxBg: "rgba(255, 255, 255, 0.08)",
    sanskritBoxBorder: "rgba(255, 213, 79, 0.38)",
    boxBg: "rgba(255, 255, 255, 0.08)",
    boxBorder: "rgba(255, 213, 79, 0.38)",
    questionColor: "#ffffff",
    optionTextColor: "#fef2f2",
    translationColor: "#fef2f2",
    badgeBg: "rgba(239, 68, 68, 0.2)",
    badgeBorder: "#f87171",
    badgeColor: "#fee2e2",
    footerColor: "#fca5a5",
    glowColor: "rgba(220, 38, 38, 0.6)",
    sampleColor: "#941313"
  }
];

export function drawRoundRect(ctx, x, y, w, h, radius, fillStyle, strokeStyle, lineWidth = 1) {
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

export function cleanHtmlText(htmlString) {
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
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
