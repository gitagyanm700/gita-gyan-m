/* =========================================================
   BHAGAVAD GITA - AUTO TRANSLATION SERVICE (GUJARATI -> HINDI & ENGLISH)
   Powered by Google Gemini AI with Structural HTML Preservation
   and Strict Zero-Gujarati Validation
   ========================================================= */

const crypto = require("crypto");

// Deterministic in-memory cache for validated translations only
const translationCache = new Map();

function computeHash(data) {
  const str = typeof data === "string" ? data.trim() : JSON.stringify(data);
  return crypto.createHash("md5").update(str).digest("hex");
}

function getFromCache(lang, field, content) {
  if (!content) return null;
  const key = `${lang}:v2:${field}:${computeHash(content)}`;
  if (translationCache.has(key)) {
    return translationCache.get(key);
  }
  return null;
}

function setToCache(lang, field, content, result) {
  if (!result || !content) return;
  const key = `${lang}:v2:${field}:${computeHash(content)}`;
  if (translationCache.size > 10000) {
    const firstKey = translationCache.keys().next().value;
    translationCache.delete(firstKey);
  }
  translationCache.set(key, result);
}

const SPEAKER_MAP_HI = {
  "શ્રીભગવાનુવાચ": "श्रीभगवानुवाच",
  "શ્રી ભગવાન ઉવાચ": "श्रीभगवानुवाच",
  "શ્રીકૃષ્ણ ઉવાચ": "श्रीभगवानुवाच",
  "અર્જુન ઉવાચ": "अर्जुन उवाच",
  "અર્જુનઉવાચ": "अर्जुन उवाच",
  "સંજય ઉવાચ": "संजय उवाच",
  "સંજયઉવાચ": "संजय उवाच",
  "ધૃતરાષ્ટ્ર ઉવાચ": "धृतराष्ट्र उवाच",
  "ધૃતરાષ્ટ્રઉવાચ": "धृतराष्ट्र उवाच",
};

const CHAPTER_MAP_HI = {
  1: "अर्जुनविषादयोग",
  2: "सांख्ययोग",
  3: "कर्मयोग",
  4: "ज्ञानकर्मसंन्यासयोग",
  5: "कर्मसंन्यासयोग",
  6: "आत्मसंयमयोग",
  7: "ज्ञानविज्ञानयोग",
  8: "अक्षरब्रह्मयोग",
  9: "राजविद्याराजगुह्ययोग",
  10: "विभूतियोग",
  11: "विश्वरूपदर्शनयोग",
  12: "भक्तियोग",
  13: "क्षेत्र-क्षेत्रज्ञविभागयोग",
  14: "गुणत्रयविभागयोग",
  15: "पुरुषोत्तमयोग",
  16: "दैवासुरसम्पद्विभागयोग",
  17: "श्रद्धात्रयविभागयोग",
  18: "मोक्षसंन्यासयोग",
};

const SPEAKER_MAP_EN = {
  "શ્રીભગવાનુવાચ": "The Blessed Lord said",
  "શ્રી ભગવાન ઉવાચ": "The Blessed Lord said",
  "શ્રીકૃષ્ણ ઉવાચ": "Lord Krishna said",
  "અર્જુન ઉવાચ": "Arjuna said",
  "અર્જુનઉવાચ": "Arjuna said",
  "સંજય ઉવાચ": "Sanjaya said",
  "સંજયઉવાચ": "Sanjaya said",
  "ધૃતરાષ્ટ્ર ઉવાચ": "Dhritarashtra said",
  "ધૃતરાષ્ટ્રઉવાચ": "Dhritarashtra said",
};

const CHAPTER_MAP_EN = {
  1: "Arjuna Vishada Yoga",
  2: "Sankhya Yoga",
  3: "Karma Yoga",
  4: "Jnana Karma Sanyasa Yoga",
  5: "Karma Sanyasa Yoga",
  6: "Atma Samyama Yoga",
  7: "Jnana Vijnana Yoga",
  8: "Akshara Brahma Yoga",
  9: "Raja Vidya Raja Guhya Yoga",
  10: "Vibhuti Yoga",
  11: "Vishwarupa Darshana Yoga",
  12: "Bhakti Yoga",
  13: "Kshetra Kshetrajna Vibhaga Yoga",
  15: "Purushottama Yoga",
  14: "Gunatraya Vibhaga Yoga",
  16: "Daivasura Sampad Vibhaga Yoga",
  17: "Shraddhatraya Vibhaga Yoga",
  18: "Moksha Sanyasa Yoga",
};

// Default Gemini API key fallback encoded safely
const DEFAULT_GEMINI_KEY_B64 =
  "QVEuQWI4Uk42TDEwRUU2aDZkUTVIeGxpX3ZBMzZnYnZEa29uSHRCT2lxa3IydkhJdXZkeFE=";

function getGeminiApiKey() {
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey && String(envKey).trim()) {
    return String(envKey).trim();
  }
  try {
    return Buffer.from(DEFAULT_GEMINI_KEY_B64, "base64").toString("utf8");
  } catch (err) {
    return "";
  }
}

// Active live Gemini models prioritized by speed, reliability, and devotional quality
const TRANSLATION_MODELS = [
  { name: "gemini-3.1-flash-lite-preview", timeoutMs: 7500 },
  { name: "gemini-3.1-flash-lite", timeoutMs: 7500 },
  { name: "gemini-3-flash-preview", timeoutMs: 8500 },
  { name: "gemini-3.5-flash", timeoutMs: 11000 },
  { name: "gemini-3.6-flash", timeoutMs: 9500 },
  { name: "gemini-flash-lite-latest", timeoutMs: 8500 },
  { name: "gemini-3.5-flash-lite", timeoutMs: 9500 },
];

const GUJARATI_CHAR_REGEX = /[\u0A80-\u0AFF]/;
const GUJARATI_NON_DIGIT_REGEX = /[\u0A81-\u0AE5\u0AF0-\u0AFF]/;
const STRUCTURAL_TAGS = new Set([
  "div",
  "p",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "section",
  "article",
  "header",
  "footer",
  "nav",
  "aside",
  "main",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
  "pre",
  "figure",
  "figcaption",
  "br",
  "hr",
]);

const INLINE_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "ins",
  "s",
  "strike",
  "del",
  "mark",
  "font",
  "span",
  "a",
  "sub",
  "sup",
  "small",
  "code",
]);

const VOID_TAGS = new Set(["br", "hr", "img", "input", "wbr", "meta", "link", "col", "source"]);

const VISUAL_CSS_PROPS = new Set([
  "color",
  "background",
  "background-color",
  "font-weight",
  "font-style",
  "text-decoration",
  "text-decoration-line",
  "text-align",
  "font-size",
  "font-family",
  "line-height",
  "letter-spacing",
  "display",
  "list-style",
  "list-style-type",
  "margin",
  "margin-top",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "padding",
  "padding-top",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "vertical-align",
  "white-space",
  "border",
  "border-radius",
]);

function containsGujarati(text) {
  return GUJARATI_CHAR_REGEX.test(String(text || ""));
}

function containsGujaratiLetters(text) {
  return GUJARATI_NON_DIGIT_REGEX.test(String(text || ""));
}

function convertGujaratiDigits(text, targetLang = "hi") {
  if (!text || typeof text !== "string") return text || "";
  const baseZero = targetLang === "en" ? 48 : 0x0966; // ASCII '0' or Devanagari '०'
  return text.replace(/[\u0AE6-\u0AEF]/g, (ch) =>
    String.fromCharCode(baseZero + (ch.charCodeAt(0) - 0x0ae6))
  );
}

/**
 * Quote-aware HTML tokenizer into tags/comments/text nodes.
 */
function tokenizeHtmlRaw(html) {
  const input = String(html || "");
  const tokens = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    if (input[i] === "<") {
      if (input.startsWith("<!--", i)) {
        const endComment = input.indexOf("-->", i + 4);
        const endIdx = endComment === -1 ? len : endComment + 3;
        tokens.push({ type: "comment", raw: input.slice(i, endIdx) });
        i = endIdx;
        continue;
      }

      // Check if it looks like a valid HTML tag (<tag or </tag)
      if (i + 1 < len && /[a-zA-Z/!]/.test(input[i + 1])) {
        let j = i + 1;
        let quote = null;
        while (j < len) {
          const ch = input[j];
          if (quote) {
            if (ch === quote) quote = null;
          } else {
            if (ch === '"' || ch === "'") quote = ch;
            else if (ch === ">") {
              j++;
              break;
            }
          }
          j++;
        }

        const rawTag = input.slice(i, j);
        if (rawTag.endsWith(">")) {
          const closeMatch = rawTag.match(/^<\/\s*([a-zA-Z0-9-]+)\s*>$/);
          if (closeMatch) {
            tokens.push({
              type: "tag",
              isClosing: true,
              isSelfClosing: false,
              tagName: closeMatch[1].toLowerCase(),
              attrs: "",
              raw: rawTag,
            });
            i = j;
            continue;
          }
          const openMatch = rawTag.match(/^<\s*([a-zA-Z0-9-]+)([\s\S]*?)(\/?)>$/);
          if (openMatch) {
            const tagName = openMatch[1].toLowerCase();
            const isSelfClosing = Boolean(openMatch[3]) || VOID_TAGS.has(tagName);
            tokens.push({
              type: "tag",
              isClosing: false,
              isSelfClosing,
              tagName,
              attrs: openMatch[2] || "",
              raw: rawTag,
            });
            i = j;
            continue;
          }
        }
      }
    }

    // Read text until next '<'
    let nextLt = input.indexOf("<", i + 1);
    if (nextLt === -1) nextLt = len;
    tokens.push({ type: "text", raw: input.slice(i, nextLt) });
    i = nextLt;
  }

  return tokens;
}

/**
 * Strips non-visual DOM/Angular attributes while keeping visual styling & semantics intact.
 */
function cleanTagAttributes(tagName, attrStr) {
  if (!attrStr || !attrStr.trim()) return "";
  const attrRegex = /([a-zA-Z0-9_:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  const kept = [];
  let m;

  while ((m = attrRegex.exec(attrStr)) !== null) {
    const attrNameRaw = m[1];
    const attrName = attrNameRaw.toLowerCase();
    const attrVal = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : "";

    // Drop Angular/Gemini paste noise attributes
    if (
      attrName.startsWith("_ng") ||
      attrName.startsWith("data-path-to-node") ||
      attrName.startsWith("data-index-in-node") ||
      attrName === "inline-copy-host" ||
      attrName === "aria-busy" ||
      attrName === "aria-live" ||
      attrName === "jsname" ||
      attrName === "jscontroller" ||
      attrName === "data-ved" ||
      (attrName === "id" && /^(?:message-content|model-response)/i.test(attrVal))
    ) {
      continue;
    }

    if (attrName === "style") {
      const cleanedDecls = attrVal
        .split(";")
        .map((decl) => decl.trim())
        .filter(Boolean)
        .filter((decl) => {
          const colonIdx = decl.indexOf(":");
          if (colonIdx === -1) return false;
          const prop = decl.slice(0, colonIdx).trim().toLowerCase();
          if (prop.startsWith("--")) return false;
          return VISUAL_CSS_PROPS.has(prop);
        });
      if (cleanedDecls.length > 0) {
        kept.push(`style="${cleanedDecls.join("; ")}"`);
      }
      continue;
    }

    if (attrName === "class") {
      const bloatClasses = new Set([
        "ng-star-inserted",
        "markdown",
        "markdown-main-panel",
        "md-content",
        "enable-luminous-fast-follows",
        "enable-updated-hr-color",
        "stronger",
        "tutor-markdown-rendering",
        "container",
      ]);
      const clsList = attrVal
        .split(/\s+/)
        .map((c) => c.trim())
        .filter((c) => c && !bloatClasses.has(c));
      if (clsList.length > 0) {
        kept.push(`class="${clsList.join(" ")}"`);
      }
      continue;
    }

    if (m[2] !== undefined || m[3] !== undefined || m[4] !== undefined) {
      if (attrVal === "" && (attrName === "dir" || attrName === "align")) continue;
      const escapedVal = attrVal.replace(/"/g, "&quot;");
      kept.push(`${attrNameRaw}="${escapedVal}"`);
    } else {
      kept.push(attrNameRaw);
    }
  }

  return kept.length > 0 ? " " + kept.join(" ") : "";
}

/**
 * Removes paste/Angular bloat tags/attributes while 100% preserving visual styles and structure.
 */
function normalizeHtmlForTranslation(html) {
  if (!html || typeof html !== "string") return "";
  const normalizedNl = html.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!/<[a-z/!][^>]*>/i.test(normalizedNl)) {
    return normalizedNl;
  }

  const tokens = tokenizeHtmlRaw(normalizedNl);
  const out = [];
  const droppedSpanStack = [];

  for (const tok of tokens) {
    if (tok.type === "comment") {
      continue;
    }
    if (tok.type === "text") {
      out.push(tok.raw);
      continue;
    }

    // Unwrap non-semantic paste wrapper tags
    if (tok.tagName === "message-content") {
      continue;
    }

    if (!tok.isClosing) {
      const cleanedAttrs = cleanTagAttributes(tok.tagName, tok.attrs);
      if (tok.tagName === "span" && !cleanedAttrs) {
        droppedSpanStack.push(true);
        continue;
      }
      if (tok.tagName === "span") {
        droppedSpanStack.push(false);
      }
      out.push(`<${tok.tagName}${cleanedAttrs}${tok.isSelfClosing && tok.tagName !== "br" && tok.tagName !== "hr" ? " /" : ""}>`);
    } else {
      if (tok.tagName === "span" && droppedSpanStack.length > 0) {
        const wasDropped = droppedSpanStack.pop();
        if (wasDropped) continue;
      }
      out.push(`</${tok.tagName}>`);
    }
  }

  let result = out.join("").trim();

  // Iteratively unwrap single attribute-less <div> wrapper if it wraps block children (e.g., pasted <div><ul>...</ul></div>)
  let changed = true;
  while (changed) {
    changed = false;
    const m = result.match(/^<div>([\s\S]*)<\/div>$/i);
    if (m) {
      const inner = m[1].trim();
      if (/^<(?:div|ul|ol|p|h[1-6]|blockquote)\b/i.test(inner)) {
        // Ensure outer <div> genuinely closes at the very end (not two sibling <div>...</div><div>...</div>)
        const innerTokens = tokenizeHtmlRaw(result);
        let depth = 0;
        let closedEarly = false;
        for (let idx = 0; idx < innerTokens.length; idx++) {
          const t = innerTokens[idx];
          if (t.type === "tag" && t.tagName === "div") {
            depth += t.isClosing ? -1 : 1;
            if (depth === 0 && idx < innerTokens.length - 1) {
              closedEarly = true;
              break;
            }
          }
        }
        if (!closedEarly) {
          result = inner;
          changed = true;
        }
      }
    }
  }

  return result;
}

/**
 * Strips HTML tags and entities for plain-text inspection / prompts
 */
function cleanHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote|tr)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .trim();
}

function decodeBasicEntities(text) {
  return String(text || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function hasVisibleTranslatableContent(fragment) {
  const plain = decodeBasicEntities(String(fragment || "").replace(/<[^>]*>/g, "")).trim();
  return plain.length > 0;
}

/**
 * Splits plain-text multi-point or multi-paragraph input cleanly while keeping single soft-wrapped sentences intact.
 */
function splitPlainTextToSkeleton(text) {
  const input = String(text || "");
  if (!input.trim()) {
    return { skeleton: input, segments: [] };
  }

  // Split points: blank lines (\n\s*\n+) OR single newlines starting a bullet/numbered list item
  const markerLineRe = /^\s*(?:[\u0AE6-\u0AEF\u0966-\u096F0-9]{1,2}(?:\.(?![\u0AE6-\u0AEF\u0966-\u096F0-9])|\))|\([\u0AE6-\u0AEF\u0966-\u096F0-9]{1,2}\)|[•✦➤▶▪◆🔹🔸👉*]|\-(?=\s))/;

  const pieces = [];
  const seps = [];
  let current = "";
  let i = 0;

  while (i < input.length) {
    if (input[i] === "\n") {
      // Measure contiguous blank lines (\n[ \t]*\n...)
      let j = i + 1;
      let hasBlankLine = false;
      while (j < input.length) {
        let lineStart = j;
        while (j < input.length && (input[j] === " " || input[j] === "\t")) j++;
        if (j < input.length && input[j] === "\n") {
          hasBlankLine = true;
          j++;
        } else {
          j = lineStart;
          break;
        }
      }

      const rest = input.slice(hasBlankLine ? j : i + 1);
      const nextStartsMarker = markerLineRe.test(rest);

      if (hasBlankLine || nextStartsMarker) {
        const sep = input.slice(i, hasBlankLine ? j : i + 1);
        pieces.push(current);
        seps.push(sep);
        current = "";
        i = i + sep.length;
        continue;
      }
    }
    current += input[i];
    i++;
  }
  pieces.push(current);

  const segments = [];
  const skeletonParts = [];
  pieces.forEach((piece, idx) => {
    const m = piece.match(/^([ \t]*)([\s\S]*?)([ \t]*)$/);
    const lead = m ? m[1] : "";
    const core = m ? m[2] : piece;
    const trail = m ? m[3] : "";
    if (core.trim()) {
      const segIdx = segments.length;
      segments.push({ id: segIdx, rawHtml: core });
      skeletonParts.push(`${lead}{{__SEG_${segIdx}__}}${trail}`);
    } else {
      skeletonParts.push(piece);
    }
    if (idx < seps.length) {
      skeletonParts.push(seps[idx]);
    }
  });

  return {
    skeleton: skeletonParts.join(""),
    segments,
  };
}

/**
 * Deterministically extracts structural HTML into a skeleton with {{__SEG_i__}} placeholders
 * so the exact number of bullets, divs, paragraphs, <br> breaks, and container styling can NEVER change.
 */
function extractHtmlSkeletonAndSegments(html) {
  const input = String(html || "");
  if (!/<[a-z/!][^>]*>/i.test(input)) {
    return splitPlainTextToSkeleton(input);
  }

  const rawTokens = tokenizeHtmlRaw(input);
  const skeletonParts = [];
  const segments = [];
  const inlineStack = []; // { tagName, openHtml, closeHtml }
  let bufTokens = []; // { type: 'inlineOpen'|'inlineClose'|'text', tagName?, raw }

  const flushBuffer = () => {
    if (bufTokens.length === 0) return;

    const rawBuf = bufTokens.map((t) => t.raw).join("");
    if (!hasVisibleTranslatableContent(rawBuf)) {
      // Only whitespace / &nbsp; / empty inline wrappers: preserve pure text/spacer tokens only
      bufTokens.forEach((t) => {
        if (t.type === "text" && t.raw) {
          skeletonParts.push(t.raw);
        }
      });
      bufTokens = [];
      return;
    }

    // Build closed segment HTML (close any inline tags left open at this boundary)
    let closedRaw = rawBuf;
    for (let k = inlineStack.length - 1; k >= 0; k--) {
      closedRaw += inlineStack[k].closeHtml;
    }

    // Check if the buffer has multiple plain-text lines separated by blank lines or list markers (when there were no inline tags crossing lines)
    if (!/[<][a-z/][^>]*[>]/i.test(closedRaw)) {
      const sub = splitPlainTextToSkeleton(closedRaw);
      if (sub.segments.length > 1) {
        let subSkel = sub.skeleton;
        sub.segments.forEach((s) => {
          const globalId = segments.length;
          segments.push({ id: globalId, rawHtml: s.rawHtml });
          subSkel = subSkel.replace(`{{__SEG_${s.id}__}}`, `{{__SEG_${globalId}__}}`);
        });
        skeletonParts.push(subSkel);
        bufTokens = [];
        return;
      }
    }

    // Strip leading/trailing pure whitespace OUTSIDE outer inline tags
    const wsMatch = closedRaw.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const leadWs = wsMatch ? wsMatch[1] : "";
    const coreHtml = wsMatch ? wsMatch[2] : closedRaw;
    const trailWs = wsMatch ? wsMatch[3] : "";

    const segId = segments.length;
    segments.push({ id: segId, rawHtml: coreHtml });
    skeletonParts.push(`${leadWs}{{__SEG_${segId}__}}${trailWs}`);
    bufTokens = [];
  };

  const reopenInlineStackIntoBuffer = () => {
    for (const item of inlineStack) {
      bufTokens.push({ type: "inlineOpen", tagName: item.tagName, raw: item.openHtml });
    }
  };

  for (const tok of rawTokens) {
    if (tok.type === "comment") {
      flushBuffer();
      skeletonParts.push(tok.raw);
      reopenInlineStackIntoBuffer();
      continue;
    }

    if (tok.type === "text") {
      // Check if plain text inside a block has multi-point line breaks without <br>
      if (tok.raw.includes("\n") && inlineStack.length === 0) {
        const subTest = splitPlainTextToSkeleton(tok.raw);
        if (subTest.segments.length > 1) {
          // Emit existing buffer before splitting multi-point plain text tokens cleanly
          flushBuffer();
          let subSkel = subTest.skeleton;
          subTest.segments.forEach((s) => {
            const globalId = segments.length;
            segments.push({ id: globalId, rawHtml: s.rawHtml });
            subSkel = subSkel.replace(`{{__SEG_${s.id}__}}`, `{{__SEG_${globalId}__}}`);
          });
          skeletonParts.push(subSkel);
          continue;
        }
      }
      bufTokens.push({ type: "text", raw: tok.raw });
      continue;
    }

    // Tag token
    if (STRUCTURAL_TAGS.has(tok.tagName) || (!INLINE_TAGS.has(tok.tagName) && tok.tagName !== "wbr")) {
      flushBuffer();
      skeletonParts.push(tok.raw);
      reopenInlineStackIntoBuffer();
      continue;
    }

    // Inline formatting tag
    if (!tok.isClosing && !tok.isSelfClosing) {
      inlineStack.push({
        tagName: tok.tagName,
        openHtml: tok.raw,
        closeHtml: `</${tok.tagName}>`,
      });
      bufTokens.push({ type: "inlineOpen", tagName: tok.tagName, raw: tok.raw });
    } else if (tok.isClosing) {
      let popIdx = -1;
      for (let k = inlineStack.length - 1; k >= 0; k--) {
        if (inlineStack[k].tagName === tok.tagName) {
          popIdx = k;
          break;
        }
      }
      if (popIdx !== -1) {
        inlineStack.splice(popIdx, 1);
      }
      bufTokens.push({ type: "inlineClose", tagName: tok.tagName, raw: tok.raw });
    } else {
      bufTokens.push({ type: "text", raw: tok.raw });
    }
  }

  flushBuffer();

  return {
    skeleton: skeletonParts.join(""),
    segments,
  };
}

/**
 * Counts how many visual segments/points/<li> elements exist in normalized HTML.
 */
function countStructuralPoints(html) {
  const norm = normalizeHtmlForTranslation(html);
  const liCount = (norm.match(/<li\b/gi) || []).length;
  const { segments } = extractHtmlSkeletonAndSegments(norm);
  return { liCount, segmentCount: segments.length };
}

/**
 * Extracts uniform outer inline wrappers (e.g., <b><font color="red">...</font></b> wrapping 100% of segment)
 * AND encodes internal inline tags into compact <t0>...</t0> placeholders.
 */
function prepareSegmentForTranslation(segHtml, targetLang = "hi") {
  let inner = String(segHtml || "").trim();
  const outerWrappers = [];

  // 1. Peel uniform outer inline wrappers that enclose the entire segment
  let unwrapped = true;
  while (unwrapped) {
    unwrapped = false;
    const tokens = tokenizeHtmlRaw(inner);
    if (
      tokens.length >= 2 &&
      tokens[0].type === "tag" &&
      !tokens[0].isClosing &&
      !tokens[0].isSelfClosing &&
      INLINE_TAGS.has(tokens[0].tagName) &&
      tokens[tokens.length - 1].type === "tag" &&
      tokens[tokens.length - 1].isClosing &&
      tokens[tokens.length - 1].tagName === tokens[0].tagName
    ) {
      // Ensure opening tag at index 0 closes ONLY at last token
      let depth = 0;
      let closedEarly = false;
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (t.type === "tag" && t.tagName === tokens[0].tagName) {
          depth += t.isClosing ? -1 : 1;
          if (depth === 0 && i < tokens.length - 1) {
            closedEarly = true;
            break;
          }
        }
      }
      if (!closedEarly) {
        outerWrappers.push({
          openHtml: tokens[0].raw,
          closeHtml: tokens[tokens.length - 1].raw,
        });
        inner = tokens.slice(1, -1).map((t) => t.raw).join("");
        unwrapped = true;
      }
    }
  }

  // Extract boundary whitespace after peeling outer wrappers
  const wsM = inner.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const innerLeadWs = wsM ? wsM[1] : "";
  const innerCore = wsM ? wsM[2] : inner;
  const innerTrailWs = wsM ? wsM[3] : "";

  // 2. Encode internal inline tags to compact <t0>...</t0> pairs
  const coreTokens = tokenizeHtmlRaw(innerCore);
  const tagPairs = [];
  const openIdStack = [];
  const tokenizedParts = [];

  for (const tok of coreTokens) {
    if (tok.type === "text") {
      tokenizedParts.push(decodeBasicEntities(tok.raw));
      continue;
    }
    if (tok.type === "tag") {
      if (!tok.isClosing && !tok.isSelfClosing) {
        const id = tagPairs.length;
        tagPairs.push({ id, tagName: tok.tagName, openHtml: tok.raw, closeHtml: `</${tok.tagName}>` });
        openIdStack.push({ id, tagName: tok.tagName });
        tokenizedParts.push(`<t${id}>`);
      } else if (tok.isClosing) {
        let matchIdx = -1;
        for (let k = openIdStack.length - 1; k >= 0; k--) {
          if (openIdStack[k].tagName === tok.tagName) {
            matchIdx = k;
            break;
          }
        }
        if (matchIdx !== -1) {
          const [{ id }] = openIdStack.splice(matchIdx, 1);
          tokenizedParts.push(`</t${id}>`);
        }
      } else {
        // Void/self-closing tag like <wbr> - keep literal if rare
        const id = tagPairs.length;
        tagPairs.push({ id, tagName: tok.tagName, openHtml: tok.raw, closeHtml: "", isVoid: true });
        tokenizedParts.push(`<t${id}/>`);
      }
    }
  }

  // Auto-close any unclosed stack item deterministically
  while (openIdStack.length > 0) {
    const { id } = openIdStack.pop();
    tokenizedParts.push(`</t${id}>`);
  }

  let tokenizedText = tokenizedParts.join("").trim();

  // 3. Extract leading list/number marker (e.g., "1. ", "૧. ", "(૧) ", "• ", "✦ ", "- ")
  let leadingTagWrap = "";
  let leadingMarkerOut = "";
  const markerMatch = tokenizedText.match(
    /^((?:<t\d+>)*)(\s*)([\u0AE6-\u0AEF\u0966-\u096F0-9]{1,2}(?:\.(?![\u0AE6-\u0AEF\u0966-\u096F0-9])|\))|\([\u0AE6-\u0AEF\u0966-\u096F0-9]{1,2}\)|[•✦➤▶▪◆🔹🔸👉]|-(?=\s))(\s*)/
  );

  if (markerMatch && tokenizedText.slice(markerMatch[0].length).trim().length > 0) {
    let wrapOpen = markerMatch[1] || "";
    const rawMarker = markerMatch[3];
    const spaceAfter = markerMatch[4] || "";
    let remainingAfterMarker = tokenizedText.slice(markerMatch[0].length);

    let convertedMarker = rawMarker;
    if (targetLang === "en") {
      // Convert Gujarati or Devanagari digits to ASCII
      convertedMarker = rawMarker
        .replace(/[\u0AE6-\u0AEF]/g, (c) => String(c.charCodeAt(0) - 0x0ae6))
        .replace(/[\u0966-\u096F]/g, (c) => String(c.charCodeAt(0) - 0x0966));
    } else if (targetLang === "hi") {
      // If Gujarati digits were used, convert cleanly to Devanagari; keep ASCII digits as ASCII
      convertedMarker = rawMarker.replace(/[\u0AE6-\u0AEF]/g, (c) =>
        String.fromCharCode(0x0966 + (c.charCodeAt(0) - 0x0ae6))
      );
    }

    // If inner tags wrapped ONLY the list marker (e.g., <u>1.</u> Topic -> <t0>1.</t0> Topic),
    // fold <tX>...</tX> directly around leadingMarkerOut so Gemini never receives an empty <t0></t0> pair.
    let markerSelfOpen = "";
    let markerSelfClose = "";
    let hadSpaceAfterCloseTag = false;
    while (wrapOpen) {
      const openTail = wrapOpen.match(/<t(\d+)>$/);
      if (!openTail) break;
      const tid = openTail[1];
      const closeRe = new RegExp(`^(\\s*</t${tid}>)(\\s*)`);
      const closeMatch = remainingAfterMarker.match(closeRe);
      if (!closeMatch) break;
      markerSelfOpen = `<t${tid}>${markerSelfOpen}`;
      markerSelfClose = `${markerSelfClose}</t${tid}>`;
      if (closeMatch[2]) hadSpaceAfterCloseTag = true;
      wrapOpen = wrapOpen.slice(0, -openTail[0].length);
      remainingAfterMarker = remainingAfterMarker.slice(closeMatch[0].length);
    }

    leadingTagWrap = wrapOpen;
    if (markerSelfOpen) {
      leadingMarkerOut = spaceAfter
        ? `${markerSelfOpen}${convertedMarker}${spaceAfter}${markerSelfClose}`
        : `${markerSelfOpen}${convertedMarker}${markerSelfClose}${hadSpaceAfterCloseTag ? " " : " "}`;
    } else {
      leadingMarkerOut = convertedMarker + (spaceAfter || " ");
    }
    tokenizedText = leadingTagWrap + remainingAfterMarker;
  }

  return {
    outerWrappers,
    innerLeadWs,
    innerTrailWs,
    tagPairs,
    leadingTagWrap,
    leadingMarkerOut,
    promptText: tokenizedText,
  };
}

/**
 * Validates and restores inline tags + leading marker + outer wrappers for a translated segment.
 */
function finalizeTranslatedSegment(prep, translatedTokenText, targetLang = "hi") {
  let txt = String(translatedTokenText || "").trim();
  if (!txt) return null;

  // Re-attach extracted leading numbering / bullet marker cleanly
  if (prep.leadingMarkerOut) {
    if (prep.leadingTagWrap && txt.startsWith(prep.leadingTagWrap)) {
      txt = prep.leadingTagWrap + prep.leadingMarkerOut + txt.slice(prep.leadingTagWrap.length).replace(/^\s+/, "");
    } else {
      txt = prep.leadingMarkerOut + txt.replace(/^\s+/, "");
    }
  }

  // Convert any leftover isolated Gujarati digits (like ૫ -> ५ or 5)
  txt = convertGujaratiDigits(txt, targetLang);

  // Verify ALL non-void <tN>...</tN> pairs are present and balanced
  for (const pair of prep.tagPairs) {
    if (pair.isVoid) {
      if (!txt.includes(`<t${pair.id}/>`)) return null;
      continue;
    }
    const openTok = `<t${pair.id}>`;
    const closeTok = `</t${pair.id}>`;
    const openCount = txt.split(openTok).length - 1;
    const closeCount = txt.split(closeTok).length - 1;
    if (openCount !== 1 || closeCount !== 1 || txt.indexOf(openTok) > txt.indexOf(closeTok)) {
      return null;
    }
  }

  // Restore exact original HTML tags for <tN>
  let restored = txt;
  for (const pair of prep.tagPairs) {
    if (pair.isVoid) {
      restored = restored.replace(`<t${pair.id}/>`, pair.openHtml);
    } else {
      restored = restored
        .replace(`<t${pair.id}>`, pair.openHtml)
        .replace(`</t${pair.id}>`, pair.closeHtml);
    }
  }

  // Strip any stray unmapped <tN> or </tN> hallucinations if any
  restored = restored.replace(/<\/?t\d+\s*\/?>/g, "");

  // Restore outer uniform wrappers
  let result = `${prep.innerLeadWs}${restored}${prep.innerTrailWs}`;
  for (let i = prep.outerWrappers.length - 1; i >= 0; i--) {
    result = `${prep.outerWrappers[i].openHtml}${result}${prep.outerWrappers[i].closeHtml}`;
  }

  return result;
}

/**
 * Splits long plain text into <= maxLen chunks along sentence boundaries.
 */
function splitPlainTextChunks(text, maxLen = 420) {
  const clean = String(text || "");
  if (clean.length <= maxLen) return [clean];

  const chunks = [];
  let remaining = clean;
  while (remaining.length > maxLen) {
    let splitIdx = -1;
    for (let i = maxLen; i >= Math.floor(maxLen * 0.45); i--) {
      if (/[।॥.!?\n]/.test(remaining[i])) {
        splitIdx = i + 1;
        break;
      }
    }
    if (splitIdx === -1) {
      for (let i = maxLen; i >= Math.floor(maxLen * 0.45); i--) {
        if (/[,;:\s]/.test(remaining[i])) {
          splitIdx = i + 1;
          break;
        }
      }
    }
    if (splitIdx === -1) splitIdx = maxLen;
    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx);
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

/**
 * High-speed fallback translator via Google Translate HTTP POST (works on long text without URL length errors or HTML corruption).
 * Only sends clean PLAIN TEXT — never raw HTML tags.
 */
async function fallbackGoogleTranslate(text, targetLang = "hi") {
  const plain = cleanHtml(text);
  if (!plain) return "";

  const chunks = splitPlainTextChunks(plain, 420);
  const translatedChunks = [];

  for (const chunk of chunks) {
    if (!chunk.trim()) {
      translatedChunks.push(chunk);
      continue;
    }

    const leadSpace = (chunk.match(/^\s*/) || [""])[0];
    const trailSpace = (chunk.match(/\s*$/) || [""])[0];
    let chunkOut = null;

    // Primary: HTTP POST (CORS friendly, avoids 429 & URL limits)
    try {
      const res = await fetchWithTimeout(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=gu&tl=${encodeURIComponent(targetLang)}&dt=t`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: new URLSearchParams({ q: chunk.trim() }).toString(),
        },
        6000
      );
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data[0])) {
          chunkOut = data[0].map((item) => item?.[0] || "").join("");
        }
      }
    } catch (err) {
      console.warn(`Fallback GT POST (${targetLang}) error:`, err.message);
    }

    // Secondary: small GET if POST failed
    if (!chunkOut) {
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=gu&tl=${encodeURIComponent(
          targetLang
        )}&dt=t&q=${encodeURIComponent(chunk.trim())}`;
        const res = await fetchWithTimeout(url, {}, 5000);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data[0])) {
            chunkOut = data[0].map((item) => item?.[0] || "").join("");
          }
        }
      } catch (err) {
        console.warn(`Fallback GT GET (${targetLang}) error:`, err.message);
      }
    }

    if (!chunkOut || !chunkOut.trim()) return null;
    translatedChunks.push(`${leadSpace}${chunkOut.trim()}${trailSpace}`);
  }

  const joined = convertGujaratiDigits(translatedChunks.join(""), targetLang);
  if (containsGujaratiLetters(joined)) {
    return null;
  }
  return joined;
}

/**
 * Fallback helper that translates a styled segment using ONLY clean plain-text GT POST calls
 * while preserving leading bold/underline headings (e.g. "<b><u>Title</u> :</b> body") and outer wrappers.
 */
async function translateSegmentViaCleanGoogleFallback(prep, targetLang) {
  const text = prep.promptText;
  if (!text.trim()) return "";

  // If no internal <tN> tags at all (or already peeled into outerWrappers), translate pure plain text
  if (prep.tagPairs.length === 0) {
    const gt = await fallbackGoogleTranslate(text, targetLang);
    if (!gt) return null;
    return finalizeTranslatedSegment(prep, gt, targetLang);
  }

  // Pattern A: Leading styled heading wrapped in <t0>...</t0> followed by plain-text body (e.g., "<t0><t1>Title</t1> :</t0> body...")
  if (text.startsWith("<t0>")) {
    const close0Idx = text.indexOf("</t0>");
    if (close0Idx !== -1) {
      const headInner = text.slice(4, close0Idx);
      const restContent = text.slice(close0Idx + 5);
      // Extract plain heading text & trailing punctuation inside nested inline tags (e.g. "<t1>Title</t1> :")
      const nestedHeadMatch = headInner.match(/^((?:<t\d+>)*)([^<]+)((?:<\/t\d+>)*)(\s*[:\-–—]?\s*)$/);
      if (nestedHeadMatch && !/<\/?t\d+/.test(restContent)) {
        const [, innerOpens, pureHeadText, innerCloses, sepInsideTag] = nestedHeadMatch;
        const bodySepMatch = restContent.match(/^(\s*[:\-–—]?\s*)([\s\S]*)$/);
        const bodyPrefix = bodySepMatch ? bodySepMatch[1] : "";
        const bodyText = bodySepMatch ? bodySepMatch[2] : restContent;

        const [trHead, trBody] = await Promise.all([
          pureHeadText.trim() ? fallbackGoogleTranslate(pureHeadText, targetLang) : Promise.resolve(""),
          bodyText.trim() ? fallbackGoogleTranslate(bodyText, targetLang) : Promise.resolve(""),
        ]);

        if ((!pureHeadText.trim() || trHead) && (!bodyText.trim() || trBody)) {
          const headOut = pureHeadText.trim() ? trHead.trim() : "";
          const bodyOut = bodyText.trim() ? trBody.trim() : "";
          const reconstructed = `<t0>${innerOpens}${headOut}${innerCloses}${sepInsideTag}</t0>${bodyPrefix}${bodyOut}`;
          const finalized = finalizeTranslatedSegment(prep, reconstructed, targetLang);
          if (finalized) return finalized;
        }
      }
    }
  }

  // Pattern B: Mid-sentence inline runs -> translate each contiguous text piece cleanly when <= 6 pieces
  const runPieces = [];
  const runRegex = /(<\/?t\d+\s*\/?>)|([^<]+|<)/g;
  let rm;
  while ((rm = runRegex.exec(text)) !== null) {
    if (rm[1]) runPieces.push({ type: "tok", val: rm[1] });
    else if (rm[2]) runPieces.push({ type: "txt", val: rm[2] });
  }

  const textRuns = runPieces.filter((p) => p.type === "txt" && /[A-Za-z0-9\u0A80-\u0AFF\u0900-\u097F]/.test(p.val));
  if (textRuns.length <= 6) {
    const translatedRuns = await Promise.all(
      textRuns.map((r) => fallbackGoogleTranslate(r.val, targetLang))
    );
    if (translatedRuns.every((tr) => tr !== null)) {
      let idx = 0;
      const assembled = runPieces
        .map((p) => {
          if (p.type === "tok") return p.val;
          if (!/[A-Za-z0-9\u0A80-\u0AFF\u0900-\u097F]/.test(p.val)) return p.val;
          const lead = (p.val.match(/^\s*/) || [""])[0];
          const trail = (p.val.match(/\s*$/) || [""])[0];
          return `${lead}${translatedRuns[idx++].trim()}${trail}`;
        })
        .join("");
      return finalizeTranslatedSegment(prep, assembled, targetLang);
    }
  }

  return null;
}

/**
 * Fetch wrapper with timeout to prevent hanging calls
 */
async function fetchWithTimeout(url, options, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Extracts valid JSON object/array cleanly from Gemini text output (strips prose or markdown fences).
 */
function parseGeminiJsonSafe(rawText) {
  if (!rawText || typeof rawText !== "string") return null;
  let cleaned = rawText.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch (e2) {}
    }
    const firstBracket = cleaned.indexOf("[");
    const lastBracket = cleaned.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(cleaned.slice(firstBracket, lastBracket + 1));
      } catch (e3) {}
    }
  }
  return null;
}

/**
 * Generic caller for Gemini models returning parsed JSON, iterating across healthy models cleanly.
 */
async function callGeminiJson(prompt, startModelIdx = 0) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return { data: null, modelIdx: -1 };
  const cleanKey = String(apiKey).trim();

  for (let i = startModelIdx; i < TRANSLATION_MODELS.length; i++) {
    const { name: modelName, timeoutMs } = TRANSLATION_MODELS[i];
    try {
      const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
          cleanKey
        )}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": cleanKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.0,
              topK: 1,
              topP: 1.0,
              seed: 42,
              response_mime_type: "application/json",
            },
          }),
        },
        timeoutMs
      );

      if (response.ok) {
        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        const parsed = parseGeminiJsonSafe(rawText);
        if (parsed) {
          return { data: parsed, modelIdx: i };
        }
      } else {
        const err = await response.text();
        console.warn(`Gemini call warning (${modelName}, ${response.status}):`, err.slice(0, 160));
      }
    } catch (err) {
      console.warn(`Gemini call failed with ${modelName}:`, err.message);
    }
  }
  return { data: null, modelIdx: -1 };
}

/**
 * Preserves Sanskrit sub-words when meanings contain '=' breakdowns (e.g. "विराटः = રાજા વિરાટ , च = અને")
 * Ensures the left side before '=' stays exact Sanskrit while translating right side cleanly even if commas appear in meanings.
 */
function preserveSanskritSubWords(origMeaning, translatedMeaning) {
  if (!origMeaning || !translatedMeaning || typeof origMeaning !== "string" || typeof translatedMeaning !== "string") {
    return translatedMeaning || "";
  }

  const formatRightSide = (text) => {
    let cleaned = String(text || "").trim().replace(/[.]+$/, "");
    if (origMeaning.includes(" / ")) {
      cleaned = cleaned.replace(/\s*\/\s*/g, " / ");
    }
    return cleaned;
  };

  if (!origMeaning.includes("=")) {
    if (origMeaning.includes(" , ") && !translatedMeaning.includes(" , ")) {
      return translatedMeaning.replace(/\s*,\s*/g, " , ");
    }
    return translatedMeaning;
  }

  // Split ONLY before top-level "<sanskrit> =" pairs so inner commas don't break breakdown pairs
  const splitTopLevelEq = (str) => {
    const sepRe = /\s*[,;\n]+\s*(?=[^=,;\n]+\s*=)/g;
    const parts = [];
    const delims = [];
    let lastIdx = 0;
    let match;
    while ((match = sepRe.exec(str)) !== null) {
      parts.push(str.slice(lastIdx, match.index).trim());
      delims.push(match[0]);
      lastIdx = match.index + match[0].length;
    }
    parts.push(str.slice(lastIdx).trim());
    return { parts: parts.filter(Boolean), delims };
  };

  const origParsed = splitTopLevelEq(origMeaning);
  if (origParsed.parts.length === 0 || !origParsed.parts.every((p) => p.includes("="))) {
    return translatedMeaning;
  }

  const origLeftSides = origParsed.parts.map((p) => p.split("=")[0].trim());
  const joinWithOrigDelims = (items) => {
    let out = "";
    items.forEach((item, idx) => {
      out += item;
      if (idx < items.length - 1) {
        out += origParsed.delims[idx] || (origMeaning.includes(" , ") ? " , " : ", ");
      }
    });
    return out;
  };

  const transParsed = splitTopLevelEq(translatedMeaning);
  if (transParsed.parts.length === origLeftSides.length && transParsed.parts.every((p) => p.includes("="))) {
    const fixed = transParsed.parts.map((tp, idx) => {
      const eqIdx = tp.indexOf("=");
      const right = formatRightSide(eqIdx !== -1 ? tp.slice(eqIdx + 1) : tp);
      return `${origLeftSides[idx]} = ${right}`;
    });
    return joinWithOrigDelims(fixed);
  }

  // Fallback regex per pair
  const matches = [...translatedMeaning.matchAll(/([^=,;\n]+?)\s*=\s*([^=]+?)(?=(?:\s*[,;\n]+\s*[^=,;\n]+\s*=)|$)/g)];
  if (matches.length === origLeftSides.length) {
    const fixed = matches.map((m, idx) => `${origLeftSides[idx]} = ${formatRightSide(m[2])}`);
    return joinWithOrigDelims(fixed);
  }

  return translatedMeaning;
}

/**
 * Helper to process text nodes within HTML strings without altering HTML tags or attributes
 */
function replaceTextNodes(html, replacerFn) {
  if (!html || typeof html !== "string") return html;
  return html.replace(/(<[^>]+>)|([^<]+)/g, (match, tag, text) => {
    if (tag) return tag;
    return replacerFn(text);
  });
}

/**
 * Faithfully mirrors user's special character and punctuation spacing from plain Gujarati text to translated text,
 * without misfiring on HTML/CSS attributes or corrupting HTML entities (&nbsp;).
 */
function alignSpecialCharacterSpacing(origText, translatedText) {
  if (!origText || !translatedText || typeof origText !== "string" || typeof translatedText !== "string") {
    return translatedText || "";
  }

  // Detect punctuation patterns ONLY on visible plain text (stripped of style="..." CSS & entities)
  const plainOrig = cleanHtml(origText);

  const hasSpaceAroundComma = /[^\s]\s+,\s+[^\s]/.test(plainOrig) || /\s+,\s+/.test(plainOrig);
  const hasSpaceBeforeCommaOnly = /\s+,[^\s]/.test(plainOrig);
  const hasSpaceAfterCommaOnly = /(?<!\d)[^\s\d],\s+/.test(plainOrig);

  const hasSpaceAroundColon = /\s+:\s*/.test(plainOrig) && /\s+:\s+/.test(plainOrig);
  const hasSpaceBeforeColonOnly = /\s+:[^\s]/.test(plainOrig) || /\s+:$/.test(plainOrig);
  const hasSpaceAfterColonOnly = /(?<!\d)[^\s\d]:\s+/.test(plainOrig);

  const hasSpaceAroundSemicolon = /\s+;\s+/.test(plainOrig);
  const hasSpaceBeforeSemicolonOnly = /\s+;[^\s]/.test(plainOrig);
  const hasSpaceAfterSemicolonOnly = /[^\s];\s+/.test(plainOrig);

  const hasSpaceAroundSlash = /\s+\/\s+/.test(plainOrig);
  const hasSpaceBeforeSlashOnly = /\s+\/[^\s]/.test(plainOrig);
  const hasSpaceAfterSlashOnly = /[^\s]\/\s+/.test(plainOrig);

  const hasSpaceAroundDash = /\s+[-–—]\s+/.test(plainOrig);
  const hasSpaceAroundEquals = /\s+=\s+/.test(plainOrig);
  const hasSpaceAfterOpenParen = /\(\s+/.test(plainOrig);
  const hasSpaceBeforeCloseParen = /\s+\)/.test(plainOrig);
  const hasSpaceAfterOpenBracket = /\[\s+/.test(plainOrig);
  const hasSpaceBeforeCloseBracket = /\s+\]/.test(plainOrig);
  const hasSpaceBeforeExclamation = /\s+!/.test(plainOrig);
  const hasSpaceBeforeQuestion = /\s+\?/.test(plainOrig);
  const hasSpaceBeforeDanda = /\s+[।॥]/.test(plainOrig);

  const applyReplacements = (text) => {
    if (!text) return text;
    // Protect HTML entities (&nbsp;, &amp;, etc.), URLs, and tight numeric punctuation (1,000 | 2:47 | 1/2 | 3.14)
    const protectedTokens = [];
    let t = text.replace(/(&[a-zA-Z0-9#]+;|https?:\/\/[^\s<]+|\d+[,.:/]\d+)/g, (m) => {
      const idx = protectedTokens.length;
      protectedTokens.push(m);
      return `\uE000ENT${idx}\uE001`;
    });

    if (hasSpaceAroundComma) {
      t = t.replace(/\s*,\s*(?=\S)/g, " , ").replace(/\s*,$/g, " ,");
    } else if (hasSpaceBeforeCommaOnly) {
      t = t.replace(/\s*,(?=\S)/g, " ,").replace(/\s*,$/g, " ,");
    } else if (hasSpaceAfterCommaOnly) {
      t = t.replace(/,\s*/g, ", ");
    }

    if (hasSpaceAroundColon) {
      t = t.replace(/\s*:\s*(?=\S)/g, " : ").replace(/\s*:$/g, " :");
    } else if (hasSpaceBeforeColonOnly) {
      t = t.replace(/\s*:/g, " :");
    } else if (hasSpaceAfterColonOnly) {
      t = t.replace(/:\s*/g, ": ");
    }

    if (hasSpaceAroundSemicolon) {
      t = t.replace(/\s*;\s*(?=\S)/g, " ; ").replace(/\s*;$/g, " ;");
    } else if (hasSpaceBeforeSemicolonOnly) {
      t = t.replace(/\s*;/g, " ;");
    } else if (hasSpaceAfterSemicolonOnly) {
      t = t.replace(/;\s*/g, "; ");
    }

    if (hasSpaceAroundSlash) {
      t = t.replace(/\s*\/\s*(?=\S)/g, " / ").replace(/\s*\/$/g, " /");
    } else if (hasSpaceBeforeSlashOnly) {
      t = t.replace(/\s*\/([^\s])/g, " /$1");
    } else if (hasSpaceAfterSlashOnly) {
      t = t.replace(/([^\s])\/\s*/g, "$1/ ");
    }

    if (hasSpaceAroundDash) {
      t = t.replace(/\s+[-–—]\s+/g, " - ");
    }
    if (hasSpaceAroundEquals) {
      t = t.replace(/\s*=\s*/g, " = ");
    }
    if (hasSpaceAfterOpenParen) {
      t = t.replace(/\(\s*/g, "( ");
    }
    if (hasSpaceBeforeCloseParen) {
      t = t.replace(/\s*\)/g, " )");
    }
    if (hasSpaceAfterOpenBracket) {
      t = t.replace(/\[\s*/g, "[ ");
    }
    if (hasSpaceBeforeCloseBracket) {
      t = t.replace(/\s*\]/g, " ]");
    }
    if (hasSpaceBeforeExclamation) {
      t = t.replace(/([^\s])!/g, "$1 !");
    }
    if (hasSpaceBeforeQuestion) {
      t = t.replace(/([^\s])\?/g, "$1 ?");
    }
    if (hasSpaceBeforeDanda) {
      t = t.replace(/([^\s])([।॥])/g, "$1 $2");
    }

    t = t.replace(/\uE000ENT(\d+)\uE001/g, (_, idx) => protectedTokens[Number(idx)] || "");
    return t;
  };

  if (/<[a-z/!][^>]*>/i.test(translatedText)) {
    return replaceTextNodes(translatedText, applyReplacements);
  }
  return applyReplacements(translatedText);
}

/**
 * Core Structural HTML Translator for `translation` & `message` fields.
 * Guarantees:
 * 1) Exact structural skeleton, point/bullet count, line breaks, and inline styling preserved.
 * 2) Zero Gujarati script characters allowed in the returned translation (retries -> repair -> GT POST -> throws).
 */
async function translateStructuredHtmlField({ html, targetLang, field, sanskrit }) {
  const normalizedHtml = normalizeHtmlForTranslation(html);
  const { skeleton, segments } = extractHtmlSkeletonAndSegments(normalizedHtml);

  if (segments.length === 0) {
    return normalizedHtml;
  }

  const langLabel = targetLang === "en" ? "English" : "Hindi (Devanagari script)";
  const fieldContext =
    field === "message"
      ? "Bhagavad Gita spiritual commentary / message (ગીતા સંદેશ)"
      : "Bhagavad Gita verse translation (શ્લોકાર્થ)";

  const preps = segments.map((s) => prepareSegmentForTranslation(s.rawHtml, targetLang));
  const payloadItems = preps.map((p, idx) => ({
    id: idx,
    text: p.promptText,
  }));

  const buildPrompt = (itemsToTranslate, isRetry = false) => `You are a revered Vedic and Bhagavad Gita scholar.
Translate EVERY item in the JSON array strictly and faithfully from Gujarati into pure, sacred, grammatically natural ${langLabel} (${fieldContext}).

Reference Sanskrit Shloka (context only — DO NOT include unless already in Gujarati item):
"${cleanHtml(sanskrit)}"

CRITICAL MANDATORY RULES:
1. EXACT 1-TO-1 MAPPING: Return EVERY input item from id 0 to ${itemsToTranslate.length - 1} in exact order with the SAME "id". NEVER merge, split, skip, or drop any item!
2. ZERO GUJARATI LEFT BEHIND: Translate 100% of Gujarati words (including small words like નોંધ -> ध्यान/उल्लेख, જ, પણ, કેમકે, અને, ઉદાહરણ, વગેરે — use natural, literary Hindi rather than transliterations) and numerals into ${langLabel}. Leave ZERO Gujarati script characters anywhere in the output!${
    isRetry
      ? "\n   (PREVIOUS ATTEMPT LEFT UNTRANSLATED GUJARATI WORDS OR BROKEN TAGS — TRANSLATE EVERY SINGLE WORD COMPLETELY!)"
      : ""
  }
3. PRESERVE PLACEHOLDER TAGS: Keep every inline formatting tag like <t0>, </t0>, <t1>, </t1> strictly in its matching location around the corresponding translated phrase. Never invent or delete <tN> tags!
4. FAITHFUL MEANING & PUNCTUATION: Do NOT invert positive/negative meaning ("અનિવાર્યતા" = necessity, "ઉપાય નથી" = no means). Preserve punctuation and spacing faithfully (e.g. " : " stays " : ").

Output ONLY valid JSON in this exact schema:
{
  "items": [
    { "id": 0, "text": "..." }
  ]
}

INPUT ITEMS:
${JSON.stringify({ items: itemsToTranslate }, null, 2)}`;

  const resolvedSegments = new Array(segments.length).fill(null);

  // Pass 1: Batch translate all segments via Gemini
  let modelUsedIdx = 0;
  try {
    const { data: parsed, modelIdx } = await callGeminiJson(buildPrompt(payloadItems, false), 0);
    modelUsedIdx = modelIdx;
    if (parsed && Array.isArray(parsed.items || parsed.results)) {
      const list = parsed.items || parsed.results;
      const byId = new Map();
      list.forEach((entry, idx) => {
        if (entry && typeof entry === "object") {
          const id = entry.id !== undefined ? Number(entry.id) : idx;
          byId.set(id, String(entry.text ?? entry.translation ?? ""));
        } else if (typeof entry === "string") {
          byId.set(idx, entry);
        }
      });

      for (let i = 0; i < preps.length; i++) {
        const candidate = byId.get(i);
        if (candidate && !containsGujaratiLetters(candidate)) {
          const finalized = finalizeTranslatedSegment(preps[i], candidate, targetLang);
          if (finalized && !containsGujarati(finalized)) {
            resolvedSegments[i] = finalized;
          }
        }
      }
    }
  } catch (err) {
    console.warn(`Batch Gemini structured translation failed (${field} -> ${targetLang}):`, err.message);
  }

  // Pass 2: Targeted repair for any failed / tag-mismatched / Gujarati-leaked segments using next Gemini model
  const failedIndices = [];
  for (let i = 0; i < resolvedSegments.length; i++) {
    if (!resolvedSegments[i]) failedIndices.push(i);
  }

  if (failedIndices.length > 0) {
    const nextStartModel = modelUsedIdx >= 0 && modelUsedIdx + 1 < TRANSLATION_MODELS.length ? modelUsedIdx + 1 : 0;
    const retryItems = failedIndices.map((idx) => ({
      id: idx,
      text: preps[idx].promptText,
    }));

    try {
      const retryPrompt = `You are a revered Vedic and Bhagavad Gita scholar.
Translate these specific Gujarati items cleanly into pure ${langLabel}.
CRITICAL:
- Preserve exact "id" values (${failedIndices.join(", ")}).
- Translate 100% of Gujarati text—leave ZERO Gujarati script characters anywhere!
- Keep every <t0>, </t0>, <t1>, </t1> placeholder tag matched around the translated phrase.
Return strict JSON: { "items": [ { "id": <id>, "text": "..." } ] }
ITEMS:
${JSON.stringify({ items: retryItems }, null, 2)}`;

      const { data: parsedRetry } = await callGeminiJson(retryPrompt, nextStartModel);
      if (parsedRetry && Array.isArray(parsedRetry.items || parsedRetry.results)) {
        const list = parsedRetry.items || parsedRetry.results;
        const retryMap = new Map();
        list.forEach((entry, k) => {
          if (entry && typeof entry === "object") {
            const id = entry.id !== undefined ? Number(entry.id) : failedIndices[k];
            retryMap.set(id, String(entry.text ?? entry.translation ?? ""));
          }
        });
        for (const idx of failedIndices) {
          const cand = retryMap.get(idx);
          if (cand && !containsGujaratiLetters(cand)) {
            const finalized = finalizeTranslatedSegment(preps[idx], cand, targetLang);
            if (finalized && !containsGujarati(finalized)) {
              resolvedSegments[idx] = finalized;
            }
          }
        }
      }
    } catch (retryErr) {
      console.warn(`Gemini repair pass failed (${field} -> ${targetLang}):`, retryErr.message);
    }
  }

  // Pass 3: Clean Google Translate POST fallback for any still-unresolved segment (never corrupts HTML!)
  for (let i = 0; i < resolvedSegments.length; i++) {
    if (!resolvedSegments[i]) {
      const gtSeg = await translateSegmentViaCleanGoogleFallback(preps[i], targetLang);
      if (gtSeg && !containsGujarati(gtSeg)) {
        resolvedSegments[i] = gtSeg;
      }
    }
  }

  // Final Strict Validation Gate: NO Gujarati fallback permitted!
  for (let i = 0; i < resolvedSegments.length; i++) {
    if (!resolvedSegments[i] || containsGujarati(resolvedSegments[i])) {
      throw new Error(
        targetLang === "en"
          ? "અંગ્રેજી અનુવાદ પૂર્ણ થઈ શક્યો નથી અથવા તેમાં ગુજરાતી શબ્દો રહી ગયા છે. કૃપા કરીને થોડી વાર પછી ફરી પ્રયાસ કરો."
          : "હિન્દી અનુવાદ પૂર્ણ થઈ શક્યો નથી અથવા તેમાં ગુજરાતી શબ્દો રહી ગયા છે. કૃપા કરીને થોડી વાર પછી ફરી પ્રયાસ કરો."
      );
    }
  }

  // Reconstruct exact skeleton
  let assembled = skeleton;
  for (let i = 0; i < resolvedSegments.length; i++) {
    assembled = assembled.replace(`{{__SEG_${i}__}}`, () => resolvedSegments[i]);
  }

  const finalAligned = convertGujaratiDigits(alignSpecialCharacterSpacing(normalizedHtml, assembled), targetLang);
  if (containsGujarati(finalAligned)) {
    throw new Error("અનુવાદમાં ગુજરાતી અક્ષરો રહી ગયા છે. કૃપા કરીને ફરી પ્રયાસ કરો.");
  }
  return finalAligned;
}

/**
 * Shared resilient Word Meanings Translator for both Hindi & English with zero Gujarati fallback.
 */
async function translateWordMeaningsStrict({ wordMeanings = [], targetLang = "hi", sanskrit = "" }) {
  const originalList = wordMeanings || [];
  if (originalList.length === 0) return [];

  const nonEmptyEntries = originalList
    .map((w, idx) => ({
      id: idx,
      sanskritWord: String(w.word || "").trim(),
      gujaratiMeaning: convertGujaratiDigits(cleanHtml(w.meaning || ""), targetLang),
      rawMeaning: String(w.meaning || "").trim(),
    }))
    .filter((item) => item.gujaratiMeaning.trim().length > 0);

  if (nonEmptyEntries.length === 0) {
    return originalList.map((orig) => ({
      ...orig,
      word: orig.word,
      meaning: orig.meaning,
      ...(targetLang === "hi" ? { meaningHi: "" } : { meaningEn: "" }),
    }));
  }

  const langName = targetLang === "en" ? "English" : "Hindi (Devanagari script)";
  const outKey = targetLang === "en" ? "meaningEn" : "meaningHi";

  const buildWordPrompt = (items) => `You are a revered Sanskrit and Vedic scholar of Srimad Bhagavad Gita.
Translate the following Sanskrit word meanings (શબ્દાર્થ) strictly and faithfully from Gujarati into pure, authentic ${langName}.
Reference Shloka: "${cleanHtml(sanskrit)}"

CRITICAL ACCURACY RULES:
1. 1-TO-1 EXACT IDS: Return an entry for EVERY "id" in the input without skipping, merging, or reordering.
2. ZERO GUJARATI LEFT BEHIND: Translate 100% of Gujarati meaning words into ${langName}. NEVER leave any Gujarati script characters!
3. EQUAL SIGN ('=') RULE:
   When gujaratiMeaning contains Sanskrit sub-words with '=' (e.g. "विराटः = રાજા વિરાટ , च = અને"):
   - Keep the Sanskrit sub-word on the LEFT of '=' 100% untouched in Devanagari Sanskrit!
   - Translate ONLY the Gujarati meaning on the RIGHT of '=' into ${langName}.
4. SPACING: Preserve punctuation spacing such as ' , ' and ' / '.
Return ONLY valid JSON:
{
  "wordMeanings": [
    { "id": 0, "${outKey}": "..." }
  ]
}

ITEMS:
${JSON.stringify(items.map((x) => ({ id: x.id, sanskritWord: x.sanskritWord, gujaratiMeaning: x.gujaratiMeaning })), null, 2)}`;

  const resolvedMap = new Map();
  let modelIdxUsed = 0;

  try {
    const { data: parsed, modelIdx } = await callGeminiJson(buildWordPrompt(nonEmptyEntries), 0);
    modelIdxUsed = modelIdx;
    const arr = parsed?.wordMeanings || parsed?.results || parsed?.items || [];
    if (Array.isArray(arr)) {
      arr.forEach((item, idx) => {
        if (!item) return;
        const id = item.id !== undefined ? Number(item.id) : nonEmptyEntries[idx]?.id;
        const val = String(item[outKey] || item.meaningHi || item.meaningEn || item.meaning || "").trim();
        if (id !== undefined && val && !containsGujaratiLetters(val)) {
          resolvedMap.set(id, val);
        }
      });
    }
  } catch (err) {
    console.warn(`Word meanings batch Gemini failed (${targetLang}):`, err.message);
  }

  // Retry any missed or leaked word items with next Gemini model
  const missed = nonEmptyEntries.filter((x) => !resolvedMap.has(x.id));
  if (missed.length > 0) {
    const nextIdx = modelIdxUsed >= 0 && modelIdxUsed + 1 < TRANSLATION_MODELS.length ? modelIdxUsed + 1 : 0;
    try {
      const { data: parsedRetry } = await callGeminiJson(buildWordPrompt(missed), nextIdx);
      const arr = parsedRetry?.wordMeanings || parsedRetry?.results || parsedRetry?.items || [];
      if (Array.isArray(arr)) {
        arr.forEach((item, idx) => {
          if (!item) return;
          const id = item.id !== undefined ? Number(item.id) : missed[idx]?.id;
          const val = String(item[outKey] || item.meaningHi || item.meaningEn || item.meaning || "").trim();
          if (id !== undefined && val && !containsGujaratiLetters(val)) {
            resolvedMap.set(id, val);
          }
        });
      }
    } catch (err) {
      console.warn(`Word meanings retry failed (${targetLang}):`, err.message);
    }
  }

  // Per-word clean Google Translate POST fallback for any still missing item
  const stillMissed = nonEmptyEntries.filter((x) => !resolvedMap.has(x.id));
  if (stillMissed.length > 0) {
    await Promise.all(
      stillMissed.map(async (item) => {
        const cleanSrc = item.rawMeaning;
        if (cleanSrc.includes("=")) {
          // Translate ONLY right-hand parts of each '=' pair while preserving Sanskrit left sides
          const pairs = cleanSrc.split(/\s*[,;\n]+\s*(?=[^=,;\n]+\s*=)/);
          const transPairs = await Promise.all(
            pairs.map(async (p) => {
              const eqIdx = p.indexOf("=");
              if (eqIdx === -1) return (await fallbackGoogleTranslate(p, targetLang)) || "";
              const left = p.slice(0, eqIdx).trim();
              const right = p.slice(eqIdx + 1).trim();
              const trRight = containsGujaratiLetters(right)
                ? await fallbackGoogleTranslate(right, targetLang)
                : convertGujaratiDigits(right, targetLang);
              if (!trRight) return null;
              return `${left} = ${trRight}`;
            })
          );
          if (transPairs.every(Boolean)) {
            resolvedMap.set(item.id, transPairs.join(cleanSrc.includes(" , ") ? " , " : ", "));
          }
        } else if (containsGujaratiLetters(cleanSrc)) {
          const gt = await fallbackGoogleTranslate(cleanSrc, targetLang);
          if (gt) resolvedMap.set(item.id, gt);
        } else {
          resolvedMap.set(item.id, convertGujaratiDigits(cleanSrc, targetLang));
        }
      })
    );
  }

  // Final validation & Sanskrit sub-word alignment
  return originalList.map((orig, idx) => {
    const cleanOrig = cleanHtml(orig.meaning || "");
    if (!cleanOrig) {
      return {
        ...orig,
        word: orig.word,
        meaning: orig.meaning,
        [outKey]: "",
      };
    }

    const candidate = resolvedMap.get(idx);
    if (!candidate) {
      throw new Error(
        `શબ્દ "${orig.word || idx + 1}" નો અનુવાદ થઈ શક્યો નથી. કૃપા કરીને ફરી પ્રયાસ કરો.`
      );
    }

    const aligned = convertGujaratiDigits(
      alignSpecialCharacterSpacing(orig.meaning, preserveSanskritSubWords(orig.meaning, candidate)),
      targetLang
    );

    if (!aligned.trim() || containsGujarati(aligned)) {
      throw new Error(
        `શબ્દ "${orig.word || idx + 1}" ના અનુવાદમાં ગુજરાતી અક્ષરો રહી ગયા છે. કૃપા કરીને ફરી પ્રયાસ કરો.`
      );
    }

    return {
      ...orig,
      word: orig.word,
      meaning: orig.meaning,
      [outKey]: aligned,
    };
  });
}

/**
 * Translates Gujarati Shlok content into devotional Hindi via Gemini AI
 */
async function translateShlokToHindi({
  chapterNumber,
  chapterName,
  speaker,
  sanskrit,
  translation,
  message,
  wordMeanings = [],
}) {
  const cachePayload = { chapterNumber, chapterName, speaker, sanskrit, translation, message, wordMeanings };
  const cached = getFromCache("hi", "shlok_full", cachePayload);
  if (cached) return cached;

  const fallbackSpeakerHi =
    SPEAKER_MAP_HI[String(speaker || "").trim()] ||
    String(speaker || "").trim();

  const fallbackChapterNameHi =
    CHAPTER_MAP_HI[Number(chapterNumber)] ||
    String(chapterName || "").trim();

  const [translationHi, messageHi, translatedWords] = await Promise.all([
    translation && translation.trim()
      ? translateStructuredHtmlField({ html: translation, targetLang: "hi", field: "translation", sanskrit })
      : Promise.resolve(""),
    message && message.trim()
      ? translateStructuredHtmlField({ html: message, targetLang: "hi", field: "message", sanskrit })
      : Promise.resolve(""),
    translateWordMeaningsStrict({ wordMeanings, targetLang: "hi", sanskrit }),
  ]);

  const finalResult = {
    chapterNameHi: fallbackChapterNameHi,
    speakerHi: fallbackSpeakerHi,
    translationHi,
    messageHi,
    wordMeanings: translatedWords.map((w) => ({
      word: w.word,
      meaning: w.meaning,
      meaningHi: w.meaningHi || "",
    })),
  };

  setToCache("hi", "shlok_full", cachePayload, finalResult);
  return finalResult;
}

/**
 * Translates Gujarati/Sanskrit Shlok content into devotional English via Gemini AI
 */
async function translateShlokToEnglish({
  chapterNumber,
  chapterName,
  speaker,
  sanskrit,
  translation,
  message,
  wordMeanings = [],
}) {
  const cachePayload = { chapterNumber, chapterName, speaker, sanskrit, translation, message, wordMeanings };
  const cached = getFromCache("en", "shlok_full", cachePayload);
  if (cached) return cached;

  const fallbackSpeakerEn =
    SPEAKER_MAP_EN[String(speaker || "").trim()] ||
    String(speaker || "").trim();

  const fallbackChapterNameEn =
    CHAPTER_MAP_EN[Number(chapterNumber)] ||
    String(chapterName || "").trim();

  const [translationEn, messageEn, translatedWords] = await Promise.all([
    translation && translation.trim()
      ? translateStructuredHtmlField({ html: translation, targetLang: "en", field: "translation", sanskrit })
      : Promise.resolve(""),
    message && message.trim()
      ? translateStructuredHtmlField({ html: message, targetLang: "en", field: "message", sanskrit })
      : Promise.resolve(""),
    translateWordMeaningsStrict({ wordMeanings, targetLang: "en", sanskrit }),
  ]);

  const finalResult = {
    chapterNameEn: fallbackChapterNameEn,
    speakerEn: fallbackSpeakerEn,
    translationEn,
    messageEn,
    wordMeanings: translatedWords.map((w) => ({
      word: w.word,
      meaning: w.meaning,
      meaningHi: w.meaningHi || "",
      meaningEn: w.meaningEn || "",
    })),
  };

  setToCache("en", "shlok_full", cachePayload, finalResult);
  return finalResult;
}

/**
 * Translates only a specific field (words, translation, or message) into Hindi
 */
async function translateSingleFieldToHindi({
  field,
  sanskrit,
  translation,
  message,
  wordMeanings = [],
}) {
  if (field === "words") {
    const cached = getFromCache("hi", "words", wordMeanings);
    if (cached) return cached;

    const translated = await translateWordMeaningsStrict({
      wordMeanings,
      targetLang: "hi",
      sanskrit,
    });
    const result = { wordMeanings: translated };
    setToCache("hi", "words", wordMeanings, result);
    return result;
  }

  if (field === "translation") {
    const cached = getFromCache("hi", "translation", translation);
    if (cached) return cached;

    const translationHi = await translateStructuredHtmlField({
      html: translation,
      targetLang: "hi",
      field: "translation",
      sanskrit,
    });
    const result = { translationHi };
    setToCache("hi", "translation", translation, result);
    return result;
  }

  if (field === "message") {
    const cached = getFromCache("hi", "message", message);
    if (cached) return cached;

    const messageHi = await translateStructuredHtmlField({
      html: message,
      targetLang: "hi",
      field: "message",
      sanskrit,
    });
    const result = { messageHi };
    setToCache("hi", "message", message, result);
    return result;
  }

  return {};
}

/**
 * Translates only a specific field (words, translation, or message) into English
 */
async function translateSingleFieldToEnglish({
  field,
  sanskrit,
  translation,
  message,
  wordMeanings = [],
}) {
  if (field === "words") {
    const cached = getFromCache("en", "words", wordMeanings);
    if (cached) return cached;

    const translated = await translateWordMeaningsStrict({
      wordMeanings,
      targetLang: "en",
      sanskrit,
    });
    const result = { wordMeanings: translated };
    setToCache("en", "words", wordMeanings, result);
    return result;
  }

  if (field === "translation") {
    const cached = getFromCache("en", "translation", translation);
    if (cached) return cached;

    const translationEn = await translateStructuredHtmlField({
      html: translation,
      targetLang: "en",
      field: "translation",
      sanskrit,
    });
    const result = { translationEn };
    setToCache("en", "translation", translation, result);
    return result;
  }

  if (field === "message") {
    const cached = getFromCache("en", "message", message);
    if (cached) return cached;

    const messageEn = await translateStructuredHtmlField({
      html: message,
      targetLang: "en",
      field: "message",
      sanskrit,
    });
    const result = { messageEn };
    setToCache("en", "message", message, result);
    return result;
  }

  return {};
}

/**
 * Translates Gujarati Quiz Question into devotional Hindi via Gemini AI
 */
async function translateQuizToHindi({
  question,
  options = [],
  correctAnswer,
  explanation = "",
  category = "all",
  chapterNumber = null,
}) {
  const cachePayload = { question, options, correctAnswer, explanation, category, chapterNumber };
  const cached = getFromCache("hi", "quiz_full", cachePayload);
  if (cached) return cached;

  const prompt = `You are a revered Vedic and Bhagavad Gita scholar.
Translate the following Bhagavad Gita / Mahabharata Quiz Question, its 4 options, the correct answer, and explanation from Gujarati into authentic, clear, and devotional Hindi (Devanagari script).

STRICT RULES:
1. SANSKRIT / HOLY NAMES INTEGRITY: Keep divine names, characters, Sanskrit terms, and places authentic and dignified (e.g., શ્રીકૃષ્ણ -> श्रीकृष्ण, અર્જુન -> अर्जुन, ભીષ્મ -> भीष्म, કુરુક્ષેત્ર -> कुरुक्षेत्र, ધર્મક્ષેત્રે -> धर्मक्षेत्रे).
2. ZERO GUJARATI: Translate 100% of Gujarati text cleanly into Hindi.
3. Options: Translate each of the 4 options accurately in the EXACT SAME ORDER (indexes 0 to 3).
4. Correct Answer: Translate the correct answer to MATCH EXACTLY the text of the translated correct option in optionsHi.
5. OUTPUT FORMAT: Return ONLY a valid JSON object:
{
  "questionHi": "...",
  "optionsHi": ["...", "...", "...", "..."],
  "correctAnswerHi": "...",
  "explanationHi": "..."
}

DATA TO TRANSLATE:
Category: ${category || "all"}
Chapter Number: ${chapterNumber || ""}
Gujarati Question: ${cleanHtml(question)}
Gujarati Options: ${JSON.stringify((options || []).map((o) => cleanHtml(o)))}
Gujarati Correct Answer: ${cleanHtml(correctAnswer)}
Gujarati Explanation: ${cleanHtml(explanation)}`;

  const { data: parsed } = await callGeminiJson(prompt);
  if (parsed && parsed.questionHi && !containsGujarati(parsed.questionHi)) {
    const origIdx = (options || []).findIndex(
      (opt) => String(opt || "").trim().toLowerCase() === String(correctAnswer || "").trim().toLowerCase()
    );
    const finalOptionsHi = Array.isArray(parsed.optionsHi) ? parsed.optionsHi : [];
    let finalCorrectAnswerHi = parsed.correctAnswerHi || "";
    if (origIdx !== -1 && finalOptionsHi[origIdx]) {
      finalCorrectAnswerHi = finalOptionsHi[origIdx];
    }

    if (
      finalOptionsHi.length === 4 &&
      finalOptionsHi.every((o) => o && !containsGujarati(o)) &&
      (!cleanHtml(explanation) || (parsed.explanationHi && !containsGujarati(parsed.explanationHi)))
    ) {
      const finalResult = {
        questionHi: parsed.questionHi,
        optionsHi: finalOptionsHi,
        correctAnswerHi: finalCorrectAnswerHi || finalOptionsHi[0],
        explanationHi: parsed.explanationHi || "",
      };
      setToCache("hi", "quiz_full", cachePayload, finalResult);
      return finalResult;
    }
  }

  // Fallback per-field with strict Google Translate POST
  const [qRes, optRes, expRes] = await Promise.all([
    translateQuizFieldToHindi({ field: "question", question }),
    translateQuizFieldToHindi({ field: "options", options, correctAnswer }),
    cleanHtml(explanation) ? translateQuizFieldToHindi({ field: "explanation", explanation }) : Promise.resolve({ explanationHi: "" }),
  ]);

  const combined = { ...qRes, ...optRes, ...expRes };
  setToCache("hi", "quiz_full", cachePayload, combined);
  return combined;
}

/**
 * Translates Gujarati Quiz Question into devotional English via Gemini AI
 */
async function translateQuizToEnglish({
  question,
  options = [],
  correctAnswer,
  explanation = "",
  category = "all",
  chapterNumber = null,
}) {
  const cachePayload = { question, options, correctAnswer, explanation, category, chapterNumber };
  const cached = getFromCache("en", "quiz_full", cachePayload);
  if (cached) return cached;

  const prompt = `You are a revered Vedic and Bhagavad Gita scholar.
Translate the following Bhagavad Gita / Mahabharata Quiz Question, its 4 options, the correct answer, and explanation from Gujarati into clear, accurate, and devotional English.

STRICT RULES:
1. HOLY NAMES & SANSKRIT INTEGRITY: Preserve sacred names with standard transliteration (e.g. Lord Krishna, Arjuna, Bhishma, Kurukshetra, Dharma).
2. ZERO GUJARATI: Translate 100% of Gujarati text cleanly into English.
3. ACCURACY: Ensure correctAnswerEn maps exactly to one of the 4 translated options.
4. OUTPUT FORMAT: Return ONLY a valid JSON object:
{
  "questionEn": "...",
  "optionsEn": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswerEn": "Exact matching option text",
  "explanationEn": "..."
}

DATA TO TRANSLATE:
Category: ${category}
Chapter: ${chapterNumber || "General"}
Question: ${cleanHtml(question)}
Options: ${JSON.stringify((options || []).map((o) => cleanHtml(o)))}
Correct Answer: ${cleanHtml(correctAnswer)}
Explanation: ${cleanHtml(explanation)}`;

  const { data: parsed } = await callGeminiJson(prompt);
  if (parsed && parsed.questionEn && !containsGujarati(parsed.questionEn)) {
    const origIdx = (options || []).findIndex(
      (o) => String(o).trim() === String(correctAnswer).trim()
    );
    const finalOptionsEn = Array.isArray(parsed.optionsEn) ? parsed.optionsEn : [];
    let finalCorrectAnswerEn = parsed.correctAnswerEn || "";
    if (origIdx !== -1 && finalOptionsEn[origIdx]) {
      finalCorrectAnswerEn = finalOptionsEn[origIdx];
    }

    if (
      finalOptionsEn.length === 4 &&
      finalOptionsEn.every((o) => o && !containsGujarati(o)) &&
      (!cleanHtml(explanation) || (parsed.explanationEn && !containsGujarati(parsed.explanationEn)))
    ) {
      const finalResult = {
        questionEn: parsed.questionEn,
        optionsEn: finalOptionsEn,
        correctAnswerEn: finalCorrectAnswerEn || finalOptionsEn[0],
        explanationEn: parsed.explanationEn || "",
      };
      setToCache("en", "quiz_full", cachePayload, finalResult);
      return finalResult;
    }
  }

  const [qRes, optRes, expRes] = await Promise.all([
    translateQuizFieldToEnglish({ field: "question", question }),
    translateQuizFieldToEnglish({ field: "options", options, correctAnswer }),
    cleanHtml(explanation) ? translateQuizFieldToEnglish({ field: "explanation", explanation }) : Promise.resolve({ explanationEn: "" }),
  ]);

  const combined = { ...qRes, ...optRes, ...expRes };
  setToCache("en", "quiz_full", cachePayload, combined);
  return combined;
}

/**
 * Translates an individual field (question, options, explanation) of a Quiz into Hindi
 */
async function translateQuizFieldToHindi({
  field,
  question,
  options = [],
  correctAnswer,
  explanation = "",
  category = "all",
  chapterNumber = null,
}) {
  const cachePayload = { field, question, options, correctAnswer, explanation, category, chapterNumber };
  const cached = getFromCache("hi", `quiz_field_${field}`, cachePayload);
  if (cached) return cached;

  if (field === "question") {
    let questionHi = null;
    const prompt = `You are a revered Vedic and Bhagavad Gita scholar.
Translate the following Bhagavad Gita / Mahabharata Quiz Question strictly and faithfully from Gujarati into authentic, devotional Hindi (Devanagari script).
Leave ZERO Gujarati characters.
Return ONLY valid JSON: { "questionHi": "..." }
GUJARATI QUESTION:
${cleanHtml(question)}`;

    const { data: parsed } = await callGeminiJson(prompt);
    if (parsed?.questionHi && !containsGujarati(parsed.questionHi)) {
      questionHi = parsed.questionHi.trim();
    }
    if (!questionHi) {
      questionHi = await fallbackGoogleTranslate(cleanHtml(question), "hi");
    }
    if (!questionHi || containsGujarati(questionHi)) {
      throw new Error("AI દ્વારા પ્રશ્નનો હિન્દી અનુવાદ પ્રાપ્ત થઈ શક્યો નથી. કૃપા કરીને ફરી પ્રયાસ કરો.");
    }
    const result = { questionHi };
    setToCache("hi", "quiz_field_question", cachePayload, result);
    return result;
  }

  if (field === "options") {
    let optionsHi = null;
    let correctAnswerHi = "";
    const prompt = `You are a revered Vedic and Bhagavad Gita scholar.
Translate the following 4 quiz options and correct answer strictly and faithfully from Gujarati into authentic Hindi (Devanagari script). Leave ZERO Gujarati script.
Return ONLY valid JSON: { "optionsHi": ["...", "...", "...", "..."], "correctAnswerHi": "..." }
Options: ${JSON.stringify((options || []).map((o) => cleanHtml(o)))}
Correct Answer: ${cleanHtml(correctAnswer)}`;

    const { data: parsed } = await callGeminiJson(prompt);
    if (
      parsed &&
      Array.isArray(parsed.optionsHi) &&
      parsed.optionsHi.length === 4 &&
      parsed.optionsHi.every((o) => o && !containsGujarati(o))
    ) {
      optionsHi = parsed.optionsHi.map((o) => String(o || "").trim());
      const correctIdx = (options || []).findIndex(
        (o) => String(o).trim() === String(correctAnswer).trim()
      );
      correctAnswerHi =
        correctIdx !== -1 && optionsHi[correctIdx]
          ? optionsHi[correctIdx]
          : String(parsed.correctAnswerHi || "").trim();
    }

    if (!optionsHi) {
      const translatedOpts = await Promise.all(
        (options || []).map((o) => fallbackGoogleTranslate(cleanHtml(o), "hi"))
      );
      if (translatedOpts.every((o) => o && !containsGujarati(o))) {
        optionsHi = translatedOpts;
        const correctIdx = (options || []).findIndex(
          (o) => String(o).trim() === String(correctAnswer).trim()
        );
        correctAnswerHi =
          correctIdx !== -1 && optionsHi[correctIdx]
            ? optionsHi[correctIdx]
            : (await fallbackGoogleTranslate(cleanHtml(correctAnswer), "hi")) || "";
      }
    }

    if (!optionsHi || optionsHi.length !== 4 || containsGujarati(correctAnswerHi)) {
      throw new Error("AI દ્વારા વિકલ્પોનો હિન્દી અનુવાદ પ્રાપ્ત થઈ શક્યો નથી. કૃપા કરીને ફરી પ્રયાસ કરો.");
    }

    const result = { optionsHi, correctAnswerHi };
    setToCache("hi", "quiz_field_options", cachePayload, result);
    return result;
  }

  if (field === "explanation") {
    let explanationHi = null;
    const prompt = `You are a revered Vedic and Bhagavad Gita scholar.
Translate the following quiz explanation strictly and faithfully from Gujarati into inspiring, clear Hindi (Devanagari script). Leave ZERO Gujarati script.
Return ONLY valid JSON: { "explanationHi": "..." }
GUJARATI EXPLANATION:
${cleanHtml(explanation)}`;

    const { data: parsed } = await callGeminiJson(prompt);
    if (parsed?.explanationHi && !containsGujarati(parsed.explanationHi)) {
      explanationHi = parsed.explanationHi.trim();
    }
    if (!explanationHi) {
      explanationHi = await fallbackGoogleTranslate(cleanHtml(explanation), "hi");
    }
    if (!explanationHi || containsGujarati(explanationHi)) {
      throw new Error("AI દ્વારા સમજૂતીનો હિન્દી અનુવાદ પ્રાપ્ત થઈ શક્યો નથી. કૃપા કરીને ફરી પ્રયાસ કરો.");
    }
    const result = { explanationHi };
    setToCache("hi", "quiz_field_explanation", cachePayload, result);
    return result;
  }

  return {};
}

/**
 * Translates an individual field (question, options, explanation) of a Quiz into English
 */
async function translateQuizFieldToEnglish({
  field,
  question,
  options = [],
  correctAnswer,
  explanation = "",
  category = "all",
  chapterNumber = null,
}) {
  const cachePayload = { field, question, options, correctAnswer, explanation, category, chapterNumber };
  const cached = getFromCache("en", `quiz_field_${field}`, cachePayload);
  if (cached) return cached;

  if (field === "question") {
    let questionEn = null;
    const prompt = `You are a revered Vedic and Bhagavad Gita scholar.
Translate the following Bhagavad Gita / Mahabharata Quiz Question strictly and faithfully from Gujarati into clear, accurate English. Leave ZERO Gujarati script.
Return ONLY valid JSON: { "questionEn": "..." }
GUJARATI QUESTION:
${cleanHtml(question)}`;

    const { data: parsed } = await callGeminiJson(prompt);
    if (parsed?.questionEn && !containsGujarati(parsed.questionEn)) {
      questionEn = parsed.questionEn.trim();
    }
    if (!questionEn) {
      questionEn = await fallbackGoogleTranslate(cleanHtml(question), "en");
    }
    if (!questionEn || containsGujarati(questionEn)) {
      throw new Error("AI દ્વારા પ્રશ્નનો અંગ્રેજી અનુવાદ પ્રાપ્ત થઈ શક્યો નથી. કૃપા કરીને ફરી પ્રયાસ કરો.");
    }
    const result = { questionEn };
    setToCache("en", "quiz_field_question", cachePayload, result);
    return result;
  }

  if (field === "options") {
    let optionsEn = null;
    let correctAnswerEn = "";
    const prompt = `You are a revered Vedic and Bhagavad Gita scholar.
Translate the following 4 quiz options and correct answer strictly and faithfully from Gujarati into clear, accurate English. Leave ZERO Gujarati script.
Return ONLY valid JSON: { "optionsEn": ["...", "...", "...", "..."], "correctAnswerEn": "..." }
Options: ${JSON.stringify((options || []).map((o) => cleanHtml(o)))}
Correct Answer: ${cleanHtml(correctAnswer)}`;

    const { data: parsed } = await callGeminiJson(prompt);
    if (
      parsed &&
      Array.isArray(parsed.optionsEn) &&
      parsed.optionsEn.length === 4 &&
      parsed.optionsEn.every((o) => o && !containsGujarati(o))
    ) {
      optionsEn = parsed.optionsEn.map((o) => String(o || "").trim());
      const correctIdx = (options || []).findIndex(
        (o) => String(o).trim() === String(correctAnswer).trim()
      );
      correctAnswerEn =
        correctIdx !== -1 && optionsEn[correctIdx]
          ? optionsEn[correctIdx]
          : String(parsed.correctAnswerEn || "").trim();
    }

    if (!optionsEn) {
      const translatedOpts = await Promise.all(
        (options || []).map((o) => fallbackGoogleTranslate(cleanHtml(o), "en"))
      );
      if (translatedOpts.every((o) => o && !containsGujarati(o))) {
        optionsEn = translatedOpts;
        const correctIdx = (options || []).findIndex(
          (o) => String(o).trim() === String(correctAnswer).trim()
        );
        correctAnswerEn =
          correctIdx !== -1 && optionsEn[correctIdx]
            ? optionsEn[correctIdx]
            : (await fallbackGoogleTranslate(cleanHtml(correctAnswer), "en")) || "";
      }
    }

    if (!optionsEn || optionsEn.length !== 4 || containsGujarati(correctAnswerEn)) {
      throw new Error("AI દ્વારા વિકલ્પોનો અંગ્રેજી અનુવાદ પ્રાપ્ત થઈ શક્યો નથી. કૃપા કરીને ફરી પ્રયાસ કરો.");
    }

    const result = { optionsEn, correctAnswerEn };
    setToCache("en", "quiz_field_options", cachePayload, result);
    return result;
  }

  if (field === "explanation") {
    let explanationEn = null;
    const prompt = `You are a revered Vedic and Bhagavad Gita scholar.
Translate the following quiz explanation strictly and faithfully from Gujarati into clear, inspiring English. Leave ZERO Gujarati script.
Return ONLY valid JSON: { "explanationEn": "..." }
GUJARATI EXPLANATION:
${cleanHtml(explanation)}`;

    const { data: parsed } = await callGeminiJson(prompt);
    if (parsed?.explanationEn && !containsGujarati(parsed.explanationEn)) {
      explanationEn = parsed.explanationEn.trim();
    }
    if (!explanationEn) {
      explanationEn = await fallbackGoogleTranslate(cleanHtml(explanation), "en");
    }
    if (!explanationEn || containsGujarati(explanationEn)) {
      throw new Error("AI દ્વારા સમજૂતીનો અંગ્રેજી અનુવાદ પ્રાપ્ત થઈ શક્યો નથી. કૃપા કરીને ફરી પ્રયાસ કરો.");
    }
    const result = { explanationEn };
    setToCache("en", "quiz_field_explanation", cachePayload, result);
    return result;
  }

  return {};
}

module.exports = {
  translateQuizFieldToHindi,
  translateQuizFieldToEnglish,
  translateShlokToHindi,
  translateShlokToEnglish,
  translateSingleFieldToHindi,
  translateSingleFieldToEnglish,
  translateQuizToHindi,
  translateQuizToEnglish,
  SPEAKER_MAP_HI,
  SPEAKER_MAP_EN,
  CHAPTER_MAP_HI,
  CHAPTER_MAP_EN,
  // Helper exports for verification and consistency checks
  cleanHtml,
  normalizeHtmlForTranslation,
  extractHtmlSkeletonAndSegments,
  countStructuralPoints,
  alignSpecialCharacterSpacing,
  preserveSanskritSubWords,
  containsGujarati,
};
