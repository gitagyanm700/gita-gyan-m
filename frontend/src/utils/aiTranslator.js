/**
 * High-Speed Resilient AI Translator for Gita Shloka Management & Quiz Management
 *
 * Architecture:
 * - Tier 0: Validated In-Memory Cache (never stores partial/Gujarati-leaked outputs)
 * - Tier 1: Backend /auto-translate API (12s timeout) + strict post-response validation
 *           (rejects any Gujarati leakage, lost bullets/points, or stripped styling tags)
 * - Tier 2: Direct Client-Side Multi-Model Gemini API with deterministic HTML Skeletonizer
 *           & <tN> inline tag tokenizer (100% preserves lists, <br>, styles, and point counts)
 * - Tier 3: Clean Plain-Text Google Translate POST fallback (per segment/run, never corrupts HTML)
 *
 * Guarantees:
 * - NEVER returns Gujarati characters in Hindi/English translations (throws clear error if all tiers fail).
 * - NEVER collapses multi-point lists/blocks (3 points always stay 3 points).
 * - Strictly preserves bold, italic, underline, highlights, colors, alignments, <br>, and punctuation spacing.
 */

const DEFAULT_KEY_B64 =
  "QVEuQWI4Uk42TDEwRUU2aDZkUTVIeGxpX3ZBMzZnYnZEa29uSHRCT2lxa3IydkhJdXZkeFE=";

function getClientGeminiApiKey() {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY.trim();
  }
  if (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) {
    return String(process.env.GEMINI_API_KEY).trim();
  }
  try {
    return atob(DEFAULT_KEY_B64);
  } catch (err) {
    return "";
  }
}

// Active live Gemini models prioritized by speed, reliability, and devotional quality
const CLIENT_MODELS = [
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

// Purge any legacy stale plain-text translation cache from localStorage
try {
  if (typeof window !== "undefined" && window.localStorage) {
    const keysToRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("gita_tr_")) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  }
} catch (e) {}

export function containsGujarati(text) {
  return GUJARATI_CHAR_REGEX.test(String(text || ""));
}

export function containsGujaratiLetters(text) {
  return GUJARATI_NON_DIGIT_REGEX.test(String(text || ""));
}

export function convertGujaratiDigits(text, targetLang = "hi") {
  if (!text || typeof text !== "string") return text || "";
  const baseZero = targetLang === "en" ? 48 : 0x0966; // ASCII '0' or Devanagari '०'
  return text.replace(/[\u0AE6-\u0AEF]/g, (ch) =>
    String.fromCharCode(baseZero + (ch.charCodeAt(0) - 0x0ae6))
  );
}

/**
 * Strips HTML tags and entities while preserving block/line-break newlines for internal translation prompts
 */
export function cleanHtml(text) {
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

/**
 * HTML to single-line plain text conversion (works in both Browser & Node)
 */
export const htmlToPlainText = (html) => {
  if (!html) return "";
  if (typeof document !== "undefined") {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return (temp.textContent || temp.innerText || "").replace(/\s+/g, " ").trim();
  }
  return cleanHtml(html).replace(/\s+/g, " ").trim();
};

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
export function normalizeHtmlForTranslation(html) {
  if (!html || typeof html !== "string") return "";
  const normalizedNl = html.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!/<[a-z/!][^>]*>/i.test(normalizedNl)) {
    return normalizedNl;
  }

  const tokens = tokenizeHtmlRaw(normalizedNl);
  const out = [];
  const droppedSpanStack = [];

  for (const tok of tokens) {
    if (tok.type === "comment") continue;
    if (tok.type === "text") {
      out.push(tok.raw);
      continue;
    }
    if (tok.tagName === "message-content") continue;

    if (!tok.isClosing) {
      const cleanedAttrs = cleanTagAttributes(tok.tagName, tok.attrs);
      if (tok.tagName === "span" && !cleanedAttrs) {
        droppedSpanStack.push(true);
        continue;
      }
      if (tok.tagName === "span") {
        droppedSpanStack.push(false);
      }
      out.push(
        `<${tok.tagName}${cleanedAttrs}${tok.isSelfClosing && tok.tagName !== "br" && tok.tagName !== "hr" ? " /" : ""}>`
      );
    } else {
      if (tok.tagName === "span" && droppedSpanStack.length > 0) {
        const wasDropped = droppedSpanStack.pop();
        if (wasDropped) continue;
      }
      out.push(`</${tok.tagName}>`);
    }
  }

  let result = out.join("").trim();

  // Unwrap redundant single attribute-less <div> wrapper around block children
  let changed = true;
  while (changed) {
    changed = false;
    const m = result.match(/^<div>([\s\S]*)<\/div>$/i);
    if (m) {
      const inner = m[1].trim();
      if (/^<(?:div|ul|ol|p|h[1-6]|blockquote)\b/i.test(inner)) {
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
 * Splits plain-text multi-point or multi-paragraph input cleanly while keeping soft-wrapped prose intact.
 */
function splitPlainTextToSkeleton(text) {
  const input = String(text || "");
  if (!input.trim()) {
    return { skeleton: input, segments: [] };
  }

  const markerLineRe =
    /^\s*(?:[\u0AE6-\u0AEF\u0966-\u096F0-9]{1,2}(?:\.(?![\u0AE6-\u0AEF\u0966-\u096F0-9])|\))|\([\u0AE6-\u0AEF\u0966-\u096F0-9]{1,2}\)|[•✦➤▶▪◆🔹🔸👉*]|\-(?=\s))/;

  const pieces = [];
  const seps = [];
  let current = "";
  let i = 0;

  while (i < input.length) {
    if (input[i] === "\n") {
      let j = i + 1;
      let hasBlankLine = false;
      while (j < input.length) {
        const lineStart = j;
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
 * so exact bullet counts, divs, paragraphs, <br> breaks, and container styling never change.
 */
export function extractHtmlSkeletonAndSegments(html) {
  const input = String(html || "");
  if (!/<[a-z/!][^>]*>/i.test(input)) {
    return splitPlainTextToSkeleton(input);
  }

  const rawTokens = tokenizeHtmlRaw(input);
  const skeletonParts = [];
  const segments = [];
  const inlineStack = [];
  let bufTokens = [];

  const flushBuffer = () => {
    if (bufTokens.length === 0) return;

    const rawBuf = bufTokens.map((t) => t.raw).join("");
    if (!hasVisibleTranslatableContent(rawBuf)) {
      bufTokens.forEach((t) => {
        if (t.type === "text" && t.raw) {
          skeletonParts.push(t.raw);
        }
      });
      bufTokens = [];
      return;
    }

    let closedRaw = rawBuf;
    for (let k = inlineStack.length - 1; k >= 0; k--) {
      closedRaw += inlineStack[k].closeHtml;
    }

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
      if (tok.raw.includes("\n") && inlineStack.length === 0) {
        const subTest = splitPlainTextToSkeleton(tok.raw);
        if (subTest.segments.length > 1) {
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

    if (STRUCTURAL_TAGS.has(tok.tagName) || (!INLINE_TAGS.has(tok.tagName) && tok.tagName !== "wbr")) {
      flushBuffer();
      skeletonParts.push(tok.raw);
      reopenInlineStackIntoBuffer();
      continue;
    }

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
export function countStructuralPoints(html) {
  const norm = normalizeHtmlForTranslation(html);
  const liCount = (norm.match(/<li\b/gi) || []).length;
  const { segments } = extractHtmlSkeletonAndSegments(norm);
  return { liCount, segmentCount: segments.length };
}

function prepareSegmentForTranslation(segHtml, targetLang = "hi") {
  let inner = String(segHtml || "").trim();
  const outerWrappers = [];

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

  const wsM = inner.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const innerLeadWs = wsM ? wsM[1] : "";
  const innerCore = wsM ? wsM[2] : inner;
  const innerTrailWs = wsM ? wsM[3] : "";

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
        const id = tagPairs.length;
        tagPairs.push({ id, tagName: tok.tagName, openHtml: tok.raw, closeHtml: "", isVoid: true });
        tokenizedParts.push(`<t${id}/>`);
      }
    }
  }

  while (openIdStack.length > 0) {
    const { id } = openIdStack.pop();
    tokenizedParts.push(`</t${id}>`);
  }

  let tokenizedText = tokenizedParts.join("").trim();

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
      convertedMarker = rawMarker
        .replace(/[\u0AE6-\u0AEF]/g, (c) => String(c.charCodeAt(0) - 0x0ae6))
        .replace(/[\u0966-\u096F]/g, (c) => String(c.charCodeAt(0) - 0x0966));
    } else if (targetLang === "hi") {
      convertedMarker = rawMarker.replace(/[\u0AE6-\u0AEF]/g, (c) =>
        String.fromCharCode(0x0966 + (c.charCodeAt(0) - 0x0ae6))
      );
    }

    let markerSelfOpen = "";
    let markerSelfClose = "";
    while (wrapOpen) {
      const openTail = wrapOpen.match(/<t(\d+)>$/);
      if (!openTail) break;
      const tid = openTail[1];
      const closeRe = new RegExp(`^\\s*</t${tid}>\\s*`);
      const closeMatch = remainingAfterMarker.match(closeRe);
      if (!closeMatch) break;
      markerSelfOpen = `<t${tid}>${markerSelfOpen}`;
      markerSelfClose = `${markerSelfClose}</t${tid}>`;
      wrapOpen = wrapOpen.slice(0, -openTail[0].length);
      remainingAfterMarker = remainingAfterMarker.slice(closeMatch[0].length);
    }

    leadingTagWrap = wrapOpen;
    if (markerSelfOpen) {
      leadingMarkerOut = spaceAfter
        ? `${markerSelfOpen}${convertedMarker}${spaceAfter}${markerSelfClose}`
        : `${markerSelfOpen}${convertedMarker}${markerSelfClose} `;
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

function finalizeTranslatedSegment(prep, translatedTokenText, targetLang = "hi") {
  let txt = String(translatedTokenText || "").trim();
  if (!txt) return null;

  if (prep.leadingMarkerOut) {
    if (prep.leadingTagWrap && txt.startsWith(prep.leadingTagWrap)) {
      txt = prep.leadingTagWrap + prep.leadingMarkerOut + txt.slice(prep.leadingTagWrap.length).replace(/^\s+/, "");
    } else {
      txt = prep.leadingMarkerOut + txt.replace(/^\s+/, "");
    }
  }

  txt = convertGujaratiDigits(txt, targetLang);

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

  restored = restored.replace(/<\/?t\d+\s*\/?>/g, "");

  let result = `${prep.innerLeadWs}${restored}${prep.innerTrailWs}`;
  for (let i = prep.outerWrappers.length - 1; i >= 0; i--) {
    result = `${prep.outerWrappers[i].openHtml}${result}${prep.outerWrappers[i].closeHtml}`;
  }

  return result;
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
 * Preserves exact whitespace around special characters / punctuation based on visible plain text
 * without misfiring on HTML style attributes or breaking &nbsp; entities.
 */
export function alignSpecialCharacterSpacing(origText, translatedText) {
  if (
    !origText ||
    !translatedText ||
    typeof origText !== "string" ||
    typeof translatedText !== "string"
  ) {
    return translatedText || "";
  }

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
 * Ensures Sanskrit sub-words on left side of '=' remain 100% untouched,
 * even when Gujarati meanings contain inner commas.
 */
export function preserveSanskritSubWords(origMeaning, translatedMeaning) {
  if (
    !origMeaning ||
    !translatedMeaning ||
    typeof origMeaning !== "string" ||
    typeof translatedMeaning !== "string"
  ) {
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

  const matches = [...translatedMeaning.matchAll(/([^=,;\n]+?)\s*=\s*([^=]+?)(?=(?:\s*[,;\n]+\s*[^=,;\n]+\s*=)|$)/g)];
  if (matches.length === origLeftSides.length) {
    const fixed = matches.map((m, idx) => `${origLeftSides[idx]} = ${formatRightSide(m[2])}`);
    return joinWithOrigDelims(fixed);
  }

  return translatedMeaning;
}

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
 * Clean Plain-Text Google Translate fallback via HTTP POST (CORS compatible, avoids GET length limits & HTML breakage)
 */
async function clientGoogleTranslate(text, targetLang = "hi") {
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

    // Primary: HTTP POST
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=gu&tl=${encodeURIComponent(targetLang)}&dt=t`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          signal: ctrl.signal,
          body: new URLSearchParams({ q: chunk.trim() }).toString(),
        }
      );
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data[0])) {
          chunkOut = data[0].map((item) => item?.[0] || "").join("");
        }
      }
    } catch (err) {
      console.warn("Client GT POST error:", err.message);
    }

    // Secondary: small GET
    if (!chunkOut) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=gu&tl=${encodeURIComponent(
          targetLang
        )}&dt=t&q=${encodeURIComponent(chunk.trim())}`;
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data[0])) {
            chunkOut = data[0].map((item) => item?.[0] || "").join("");
          }
        }
      } catch (err) {
        console.warn("Client GT GET error:", err.message);
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

async function translateSegmentViaCleanGoogleFallback(prep, targetLang) {
  const text = prep.promptText;
  if (!text.trim()) return "";

  if (prep.tagPairs.length === 0) {
    const gt = await clientGoogleTranslate(text, targetLang);
    if (!gt) return null;
    return finalizeTranslatedSegment(prep, gt, targetLang);
  }

  // Pattern A: Leading styled heading (<t0>...</t0> body...)
  if (text.startsWith("<t0>")) {
    const close0Idx = text.indexOf("</t0>");
    if (close0Idx !== -1) {
      const headInner = text.slice(4, close0Idx);
      const restContent = text.slice(close0Idx + 5);
      const nestedHeadMatch = headInner.match(/^((?:<t\d+>)*)([^<]+)((?:<\/t\d+>)*)(\s*[:\-–—]?\s*)$/);
      if (nestedHeadMatch && !/<\/?t\d+/.test(restContent)) {
        const [, innerOpens, pureHeadText, innerCloses, sepInsideTag] = nestedHeadMatch;
        const bodySepMatch = restContent.match(/^(\s*[:\-–—]?\s*)([\s\S]*)$/);
        const bodyPrefix = bodySepMatch ? bodySepMatch[1] : "";
        const bodyText = bodySepMatch ? bodySepMatch[2] : restContent;

        const [trHead, trBody] = await Promise.all([
          pureHeadText.trim() ? clientGoogleTranslate(pureHeadText, targetLang) : Promise.resolve(""),
          bodyText.trim() ? clientGoogleTranslate(bodyText, targetLang) : Promise.resolve(""),
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

  // Pattern B: Mid-sentence inline runs (<= 6 pieces)
  const runPieces = [];
  const runRegex = /(<\/?t\d+\s*\/?>)|([^<]+|<)/g;
  let rm;
  while ((rm = runRegex.exec(text)) !== null) {
    if (rm[1]) runPieces.push({ type: "tok", val: rm[1] });
    else if (rm[2]) runPieces.push({ type: "txt", val: rm[2] });
  }

  const textRuns = runPieces.filter((p) => p.type === "txt" && /[A-Za-z0-9\u0A80-\u0AFF\u0900-\u097F]/.test(p.val));
  if (textRuns.length <= 6) {
    const translatedRuns = await Promise.all(textRuns.map((r) => clientGoogleTranslate(r.val, targetLang)));
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
 * Direct Multi-Model Gemini API caller from the browser
 */
async function callClientGeminiJson(prompt, startModelIdx = 0) {
  const apiKey = getClientGeminiApiKey();
  if (!apiKey) return { data: null, modelIdx: -1 };
  const cleanKey = String(apiKey).trim();

  for (let i = startModelIdx; i < CLIENT_MODELS.length; i++) {
    const { name: modelName, timeoutMs } = CLIENT_MODELS[i];
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(
        cleanKey
      )}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.0,
            topK: 1,
            topP: 1.0,
            seed: 42,
            responseMimeType: "application/json",
          },
        }),
      });
      clearTimeout(timer);

      if (res.ok) {
        const json = await res.json();
        const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = parseGeminiJsonSafe(rawText);
        if (parsed) {
          return { data: parsed, modelIdx: i };
        }
      }
    } catch (err) {
      clearTimeout(timer);
      console.warn(`Client Gemini (${modelName}) warning:`, err.message);
    }
  }

  return { data: null, modelIdx: -1 };
}

/**
 * Client-side Structural HTML Translator for `translation` & `message` fields
 */
async function translateStructuredHtmlClient({ html, targetLang, field, sanskrit }) {
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

  const buildPrompt = (itemsToTranslate) => `You are a revered Vedic and Bhagavad Gita scholar.
Translate EVERY item in the JSON array strictly and faithfully from Gujarati into pure, sacred, grammatically natural ${langLabel} (${fieldContext}).

Reference Sanskrit Shloka (context only — DO NOT include unless already in Gujarati item):
"${cleanHtml(sanskrit)}"

CRITICAL MANDATORY RULES:
1. EXACT 1-TO-1 MAPPING: Return EVERY input item from id 0 to ${itemsToTranslate.length - 1} in exact order with the SAME "id". NEVER merge, split, skip, or drop any item!
2. ZERO GUJARATI LEFT BEHIND: Translate 100% of Gujarati words (including small words like નોંધ -> ध्यान/उल्लेख, જ, પણ, કેમકે, અને, ઉદાહરણ, વગેરે — use natural, literary Hindi rather than transliterations) and numerals into ${langLabel}. Leave ZERO Gujarati script characters anywhere in the output!
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
  let modelUsedIdx = 0;

  try {
    const { data: parsed, modelIdx } = await callClientGeminiJson(buildPrompt(payloadItems), 0);
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
    console.warn("Client Gemini structured batch failed:", err.message);
  }

  // Pass 2: Repair failed / Gujarati-leaked / tag-broken segments with next Gemini model
  const failedIndices = [];
  for (let i = 0; i < resolvedSegments.length; i++) {
    if (!resolvedSegments[i]) failedIndices.push(i);
  }

  if (failedIndices.length > 0) {
    const nextStartModel = modelUsedIdx >= 0 && modelUsedIdx + 1 < CLIENT_MODELS.length ? modelUsedIdx + 1 : 0;
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

      const { data: parsedRetry } = await callClientGeminiJson(retryPrompt, nextStartModel);
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
      console.warn("Client Gemini repair pass failed:", retryErr.message);
    }
  }

  // Pass 3: Clean Plain-Text GT POST fallback per remaining segment
  for (let i = 0; i < resolvedSegments.length; i++) {
    if (!resolvedSegments[i]) {
      const gtSeg = await translateSegmentViaCleanGoogleFallback(preps[i], targetLang);
      if (gtSeg && !containsGujarati(gtSeg)) {
        resolvedSegments[i] = gtSeg;
      }
    }
  }

  for (let i = 0; i < resolvedSegments.length; i++) {
    if (!resolvedSegments[i] || containsGujarati(resolvedSegments[i])) {
      throw new Error(
        targetLang === "en"
          ? "અંગ્રેજી અનુવાદ પૂર્ણ થઈ શક્યો નથી અથવા તેમાં ગુજરાતી શબ્દો રહી ગયા છે. કૃપા કરીને ફરી પ્રયાસ કરો."
          : "હિન્દી અનુવાદ પૂર્ણ થઈ શક્યો નથી અથવા તેમાં ગુજરાતી શબ્દો રહી ગયા છે. કૃપા કરીને ફરી પ્રયાસ કરો."
      );
    }
  }

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
 * Client-side strict Word Meanings translator (preserves exact array indices and zero Gujarati)
 */
async function translateWordMeaningsClientStrict({ wordMeanings = [], targetLang = "hi", sanskrit = "" }) {
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

  const outKey = targetLang === "en" ? "meaningEn" : "meaningHi";
  if (nonEmptyEntries.length === 0) {
    return originalList.map((orig) => ({
      word: orig.word,
      meaning: orig.meaning,
      [outKey]: "",
    }));
  }

  const langName = targetLang === "en" ? "English" : "Hindi (Devanagari script)";

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
    const { data: parsed, modelIdx } = await callClientGeminiJson(buildWordPrompt(nonEmptyEntries), 0);
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
    console.warn("Client Gemini words batch failed:", err.message);
  }

  const missed = nonEmptyEntries.filter((x) => !resolvedMap.has(x.id));
  if (missed.length > 0) {
    const nextIdx = modelIdxUsed >= 0 && modelIdxUsed + 1 < CLIENT_MODELS.length ? modelIdxUsed + 1 : 0;
    try {
      const { data: parsedRetry } = await callClientGeminiJson(buildWordPrompt(missed), nextIdx);
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
      console.warn("Client Gemini words retry failed:", err.message);
    }
  }

  const stillMissed = nonEmptyEntries.filter((x) => !resolvedMap.has(x.id));
  if (stillMissed.length > 0) {
    await Promise.all(
      stillMissed.map(async (item) => {
        const cleanSrc = item.rawMeaning;
        if (cleanSrc.includes("=")) {
          const pairs = cleanSrc.split(/\s*[,;\n]+\s*(?=[^=,;\n]+\s*=)/);
          const transPairs = await Promise.all(
            pairs.map(async (p) => {
              const eqIdx = p.indexOf("=");
              if (eqIdx === -1) return (await clientGoogleTranslate(p, targetLang)) || "";
              const left = p.slice(0, eqIdx).trim();
              const right = p.slice(eqIdx + 1).trim();
              const trRight = containsGujaratiLetters(right)
                ? await clientGoogleTranslate(right, targetLang)
                : convertGujaratiDigits(right, targetLang);
              if (!trRight) return null;
              return `${left} = ${trRight}`;
            })
          );
          if (transPairs.every(Boolean)) {
            resolvedMap.set(item.id, transPairs.join(cleanSrc.includes(" , ") ? " , " : ", "));
          }
        } else if (containsGujaratiLetters(cleanSrc)) {
          const gt = await clientGoogleTranslate(cleanSrc, targetLang);
          if (gt) resolvedMap.set(item.id, gt);
        } else {
          resolvedMap.set(item.id, convertGujaratiDigits(cleanSrc, targetLang));
        }
      })
    );
  }

  return originalList.map((orig, idx) => {
    const cleanOrig = cleanHtml(orig.meaning || "");
    if (!cleanOrig) {
      return {
        word: orig.word,
        meaning: orig.meaning,
        [outKey]: "",
      };
    }

    const candidate = resolvedMap.get(idx);
    if (!candidate) {
      throw new Error(`શબ્દ "${orig.word || idx + 1}" નો અનુવાદ થઈ શક્યો નથી. કૃપા કરીને ફરી પ્રયાસ કરો.`);
    }

    const aligned = convertGujaratiDigits(
      alignSpecialCharacterSpacing(orig.meaning, preserveSanskritSubWords(orig.meaning, candidate)),
      targetLang
    );

    if (!aligned.trim() || containsGujarati(aligned)) {
      throw new Error(`શબ્દ "${orig.word || idx + 1}" ના અનુવાદમાં ગુજરાતી અક્ષરો રહી ગયા છે. કૃપા કરીને ફરી પ્રયાસ કરો.`);
    }

    return {
      word: orig.word,
      meaning: orig.meaning,
      [outKey]: aligned,
    };
  });
}

/**
 * Validates whether a Tier-1 backend response satisfies strict zero-Gujarati & exact structural integrity rules.
 */
export function validateTranslatedFieldResult({
  field,
  targetLang = "hi",
  result,
  sourceTranslation = "",
  sourceMessage = "",
  sourceWordMeanings = [],
}) {
  if (!result || typeof result !== "object") return false;

  if (field === "translation" || field === "message") {
    const sourceHtml = field === "message" ? sourceMessage : sourceTranslation;
    const outKey = field === "message" ? (targetLang === "en" ? "messageEn" : "messageHi") : (targetLang === "en" ? "translationEn" : "translationHi");
    const outHtml = result[outKey];

    const hasSourceText = cleanHtml(sourceHtml).trim().length > 0;
    if (!hasSourceText) return true;
    if (!outHtml || typeof outHtml !== "string" || !cleanHtml(outHtml).trim()) return false;

    // 1. Strict Zero-Gujarati Rule
    if (containsGujarati(outHtml)) return false;

    // 2. Strict Structural Point / List Integrity Rule (e.g. 3 points must never become 2)
    const srcNorm = normalizeHtmlForTranslation(sourceHtml);
    const srcCounts = countStructuralPoints(srcNorm);
    const outCounts = countStructuralPoints(outHtml);

    if (srcCounts.liCount > 0 && outCounts.liCount !== srcCounts.liCount) {
      return false;
    }
    if (srcCounts.segmentCount > 1 && outCounts.segmentCount < srcCounts.segmentCount) {
      return false;
    }

    // 3. Preserve Formatting Tags Rule
    const srcHasStyling = /<(?:b|strong|i|em|u|ins|mark|font)\b|style\s*=/i.test(srcNorm);
    const outHasHtmlTags = /<[a-z][^>]*>/i.test(outHtml);
    if (srcHasStyling && !outHasHtmlTags) {
      return false;
    }

    return true;
  }

  if (field === "words") {
    const outWords = result.wordMeanings;
    if (!Array.isArray(outWords) || outWords.length !== (sourceWordMeanings || []).length) {
      return false;
    }
    const outKey = targetLang === "en" ? "meaningEn" : "meaningHi";
    for (let i = 0; i < (sourceWordMeanings || []).length; i++) {
      const origMeaning = cleanHtml(sourceWordMeanings[i]?.meaning || "").trim();
      if (!origMeaning) continue;
      const transVal = String(outWords[i]?.[outKey] || "").trim();
      if (!transVal || containsGujarati(transVal)) return false;
      if (origMeaning.includes("=") && !transVal.includes("=")) return false;
    }
    return true;
  }

  return true;
}

/**
 * Direct Client-Side Shlok Field Translator
 */
async function translateFieldDirectClient({ field, targetLang, sanskrit, translation, message, wordMeanings }) {
  if (field === "words") {
    const translated = await translateWordMeaningsClientStrict({
      wordMeanings,
      targetLang,
      sanskrit,
    });
    return { wordMeanings: translated };
  }

  if (field === "translation") {
    if (!translation || !translation.trim()) return { translationHi: "", translationEn: "" };
    const out = await translateStructuredHtmlClient({
      html: translation,
      targetLang,
      field: "translation",
      sanskrit,
    });
    return targetLang === "en" ? { translationEn: out } : { translationHi: out };
  }

  if (field === "message") {
    if (!message || !message.trim()) return { messageHi: "", messageEn: "" };
    const out = await translateStructuredHtmlClient({
      html: message,
      targetLang,
      field: "message",
      sanskrit,
    });
    return targetLang === "en" ? { messageEn: out } : { messageHi: out };
  }

  return {};
}

/**
 * Main Entry Point: Resilient Shlok Field Auto-Translation
 */
export async function executeResilientFieldTranslation({
  field,
  targetLang = "hi",
  sanskrit = "",
  translation = "",
  message = "",
  wordMeanings = [],
  chapterNumber = 1,
  chapterName = "",
  speaker = "",
  apiUrl = "",
  token = "",
}) {
  const normalizedWords = (wordMeanings || []).map((item) => ({
    word: item.word?.trim() || "",
    meaning: item.meaning?.trim() || "",
    meaningHi: item.meaningHi?.trim() || "",
    meaningEn: item.meaningEn?.trim() || "",
  }));

  // Tier 1: Backend /auto-translate with 12s timeout + strict output validator
  if (apiUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(`${apiUrl}/auto-translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          chapterNumber: Number(chapterNumber),
          chapterName,
          speaker,
          sanskrit,
          translation,
          message,
          wordMeanings: normalizedWords,
          targetLang,
          field,
        }),
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const translated = data?.data || data?.translated;
        if (
          validateTranslatedFieldResult({
            field,
            targetLang,
            result: translated,
            sourceTranslation: translation,
            sourceMessage: message,
            sourceWordMeanings: normalizedWords,
          })
        ) {
          return translated;
        }
        console.warn("Backend /auto-translate response failed strict structural/zero-Gujarati validation; switching to client engine.");
      }
    } catch (backendErr) {
      console.warn(
        "Backend /auto-translate slow or unavailable, switching to strict client structural translation:",
        backendErr.message
      );
    }
  }

  // Tier 2 & Tier 3: Direct Client-Side Structural Skeleton + Multi-Model Gemini + Clean POST Google Translate
  const result = await translateFieldDirectClient({
    field,
    targetLang,
    sanskrit,
    translation,
    message,
    wordMeanings: normalizedWords,
  });

  if (
    !validateTranslatedFieldResult({
      field,
      targetLang,
      result,
      sourceTranslation: translation,
      sourceMessage: message,
      sourceWordMeanings: normalizedWords,
    })
  ) {
    throw new Error("અનુવાદ ગુણવત્તા ચકાસણીમાં નિષ્ફળ ગયો અથવા ગુજરાતી અક્ષરો રહી ગયા છે. કૃપા કરીને ફરી પ્રયાસ કરો.");
  }

  return result;
}

/**
 * Direct Client-Side Quiz Field Translator with strict zero-Gujarati checks
 */
async function translateQuizFieldDirectClient({ field, targetLang, question, options, correctAnswer, explanation }) {
  const langName = targetLang === "en" ? "English" : "Hindi (Devanagari script)";

  if (field === "all" || !field) {
    const [qRes, optRes, expRes] = await Promise.all([
      translateQuizFieldDirectClient({ field: "question", targetLang, question }),
      translateQuizFieldDirectClient({ field: "options", targetLang, options, correctAnswer }),
      cleanHtml(explanation)
        ? translateQuizFieldDirectClient({ field: "explanation", targetLang, explanation })
        : Promise.resolve(targetLang === "en" ? { explanationEn: "" } : { explanationHi: "" }),
    ]);
    return { ...qRes, ...optRes, ...expRes };
  }

  if (field === "question") {
    const outKey = targetLang === "en" ? "questionEn" : "questionHi";
    const plainQ = cleanHtml(question);
    const prompt = `Translate this Bhagavad Gita quiz question strictly and faithfully from Gujarati into ${langName}. Leave ZERO Gujarati script characters.
"${plainQ}"
Output ONLY valid JSON: { "${outKey}": "..." }`;
    const { data: parsed } = await callClientGeminiJson(prompt);
    let outVal = parsed?.[outKey] || (parsed ? Object.values(parsed)[0] : "") || "";
    if (!outVal || containsGujarati(outVal)) {
      outVal = (await clientGoogleTranslate(plainQ, targetLang)) || "";
    }
    outVal = convertGujaratiDigits(String(outVal).trim(), targetLang);
    if (!outVal || containsGujarati(outVal)) {
      throw new Error("પ્રશ્નનો અનુવાદ થઈ શક્યો નથી. કૃપા કરીને ફરી પ્રયાસ કરો.");
    }
    return { [outKey]: outVal };
  }

  if (field === "options") {
    const optsKey = targetLang === "en" ? "optionsEn" : "optionsHi";
    const ansKey = targetLang === "en" ? "correctAnswerEn" : "correctAnswerHi";
    const plainOpts = (options || []).map((o) => cleanHtml(o));
    const plainAns = cleanHtml(correctAnswer);
    const correctIdx = plainOpts.findIndex((o) => o.toLowerCase() === plainAns.toLowerCase());

    const prompt = `Translate these 4 quiz options and correct answer strictly and faithfully from Gujarati into ${langName}. Leave ZERO Gujarati script characters.
Options: ${JSON.stringify(plainOpts)}
Correct Answer: "${plainAns}"
Output ONLY valid JSON: { "${optsKey}": ["...", "...", "...", "..."], "${ansKey}": "..." }`;

    const { data: parsed } = await callClientGeminiJson(prompt);
    let translatedOpts = parsed?.[optsKey] || parsed?.options;
    let translatedAnswer = parsed?.[ansKey] || parsed?.correctAnswer || "";

    if (
      !Array.isArray(translatedOpts) ||
      translatedOpts.length !== plainOpts.length ||
      translatedOpts.some((o) => !o || containsGujarati(o))
    ) {
      translatedOpts = await Promise.all(plainOpts.map((opt) => clientGoogleTranslate(opt, targetLang)));
    }

    if (
      !Array.isArray(translatedOpts) ||
      translatedOpts.length !== plainOpts.length ||
      translatedOpts.some((o) => !o || containsGujarati(o))
    ) {
      throw new Error("વિકલ્પોનો અનુવાદ થઈ શક્યો નથી. કૃપા કરીને ફરી પ્રયાસ કરો.");
    }

    translatedOpts = translatedOpts.map((o) => convertGujaratiDigits(String(o).trim(), targetLang));
    if (correctIdx !== -1 && translatedOpts[correctIdx]) {
      translatedAnswer = translatedOpts[correctIdx];
    } else if (!translatedAnswer || containsGujarati(translatedAnswer)) {
      translatedAnswer = (await clientGoogleTranslate(plainAns, targetLang)) || "";
    }
    translatedAnswer = convertGujaratiDigits(String(translatedAnswer).trim(), targetLang);

    if (!translatedAnswer || containsGujarati(translatedAnswer)) {
      throw new Error("વિકલ્પોના સાચા જવાબનો અનુવાદ થઈ શક્યો નથી. કૃપા કરીને ફરી પ્રયાસ કરો.");
    }

    return { [optsKey]: translatedOpts, [ansKey]: translatedAnswer };
  }

  if (field === "explanation") {
    const outKey = targetLang === "en" ? "explanationEn" : "explanationHi";
    const plainExp = cleanHtml(explanation);
    if (!plainExp) return { [outKey]: "" };

    const prompt = `Translate this Bhagavad Gita quiz explanation faithfully from Gujarati into ${langName}. Leave ZERO Gujarati script characters.
"${plainExp}"
Output ONLY valid JSON: { "${outKey}": "..." }`;
    const { data: parsed } = await callClientGeminiJson(prompt);
    let outVal = parsed?.[outKey] || (parsed ? Object.values(parsed)[0] : "") || "";
    if (!outVal || containsGujarati(outVal)) {
      outVal = (await clientGoogleTranslate(plainExp, targetLang)) || "";
    }
    outVal = convertGujaratiDigits(String(outVal).trim(), targetLang);
    if (!outVal || containsGujarati(outVal)) {
      throw new Error("સમજૂતીનો અનુવાદ થઈ શક્યો નથી. કૃપા કરીને ફરી પ્રયાસ કરો.");
    }
    return { [outKey]: outVal };
  }

  return {};
}

/**
 * Main Entry Point: Resilient Quiz Field Auto-Translation
 */
export async function executeResilientQuizTranslation({
  field,
  targetLang = "hi",
  category = "all",
  chapterNumber = null,
  question = "",
  options = [],
  correctAnswer = "",
  explanation = "",
  apiUrl = "",
  token = "",
}) {
  if (apiUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${apiUrl}/admin/auto-translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
        body: JSON.stringify({
          category,
          chapterNumber,
          question,
          options,
          correctAnswer,
          explanation,
          targetLang,
          field,
        }),
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const translated = data?.data || data?.translated;
        if (translated && !containsGujarati(JSON.stringify(translated))) {
          return translated;
        }
      }
    } catch (backendErr) {
      console.warn("Backend quiz translate slow/down, using direct client AI:", backendErr.message);
    }
  }

  return await translateQuizFieldDirectClient({
    field,
    targetLang,
    question,
    options,
    correctAnswer,
    explanation,
  });
}
