import { getValidToken, clearAuthSession } from "../utils/authHelper.js";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  User,
  Send,
  RotateCcw,
  X,
  History,
  Copy,
  Check,
  Mic,
  MicOff,
  Undo2,
  Search,
  Trash2,
  MessageSquareText,
  MessageSquare,
  Clock,
  PanelLeft,
  MoreHorizontal,
  Share2,
  Pencil,
  Pin,
  PinOff,
  Archive,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";

import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { isRunningInStandaloneApp } from "../utils/pwaManager.js";
import {
  getAllConversations,
  saveConversation,
  setActiveConversationId,
  getConversationById,
  syncHistoryWithServer,
  deleteConversation,
  clearAllConversations,
  renameConversation,
  togglePinConversation,
  toggleArchiveConversation,
} from "../utils/gitaAiHistory";
import "./GitaAIAssistant.css";

const API_BASE = "https://bhagavad-gita-backend-jy1a.onrender.com";

const SUGGESTIONS_GU = [
  "મનને એકાગ્ર અને શાંત કેવી રીતે રાખવું?",
  "કર્મણ્યેવાધિકારસ્તે શ્લોકનો સાચો અર્થ શું છે?",
  "ચિંતા અને નિષ્ફળતાના ડરમાંથી મુક્તિ કેવી રીતે મેળવવી?",
  "સાચો અને ધર્મયુક્ત નિર્ણય કેવી રીતે લેવો?"
];

const SUGGESTIONS_HI = [
  "मन को एकाग्र और शांत कैसे रखें?",
  "कर्मण्येवाधिकारस्ते श्लोक का सही अर्थ क्या है?",
  "चिंता और असफलता के डर से मुक्ति कैसे पाएं?",
  "सही और धर्मयुक्त निर्णय कैसे लें?"
];

const SUGGESTIONS_EN = [
  "How to keep the mind calm and focused?",
  "What is the true meaning of the Karmanye Vadhikaraste shloka?",
  "How to overcome anxiety and fear of failure?",
  "How to make a righteous and truthful decision?"
];

// Google Gemini AI signature 4-pointed curved star sparkle icon
function GeminiIcon({ size = 22, className = "", style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
    >
      {/* Primary Gemini Curved Star */}
      <path
        d="M10.8 1.5C10.8 6.64 6.64 10.8 1.5 10.8C6.64 10.8 10.8 14.96 10.8 20.1C10.8 14.96 14.96 10.8 20.1 10.8C14.96 10.8 10.8 6.64 10.8 1.5Z"
        fill="currentColor"
      />
      {/* Secondary Companion Star */}
      <path
        d="M18.8 1.2C18.8 3.3 17.1 5 15 5C17.1 5 18.8 6.7 18.8 8.8C18.8 6.7 20.5 5 22.6 5C20.5 5 18.8 3.3 18.8 1.2Z"
        fill="currentColor"
        opacity={0.88}
      />
    </svg>
  );
}

// Helper to format inline markdown tokens into bold / highlighted words without raw symbols
function formatInlineText(text) {
  if (!text) return null;

  // Match bold/highlight/italic/code:
  // ***word***, **word**, __word__, ==word==, `word`, *word*, _word_
  const tokenRegex = /(\*\*\*[^*]+?\*\*\*|\*\*[^*]+?\*\*|__[^_]+?__|==[^=]+?==|`[^`]+?`|\*[^*\s][^*]*?[^*\s]\*|(?<!\w)_[^_\s][^_]*?[^_\s]_(?!\w))/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold + Italic: ***text***
    if (part.startsWith("***") && part.endsWith("***") && part.length > 6) {
      return (
        <strong key={index} className="gita-inline-highlight">
          {part.slice(3, -3)}
        </strong>
      );
    }

    // Bold: **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="gita-inline-highlight">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Underscore bold: __text__
    if (part.startsWith("__") && part.endsWith("__") && part.length > 4) {
      return (
        <strong key={index} className="gita-inline-highlight">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Highlight: ==text==
    if (part.startsWith("==") && part.endsWith("==") && part.length > 4) {
      return (
        <strong key={index} className="gita-inline-highlight">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Code/Pill: `text`
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <strong key={index} className="gita-inline-highlight">
          {part.slice(1, -1)}
        </strong>
      );
    }

    // Italic / single asterisk: *text*
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <strong key={index} className="gita-inline-highlight">
          {part.slice(1, -1)}
        </strong>
      );
    }

    // Italic / single underscore: _text_
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
      return (
        <strong key={index} className="gita-inline-highlight">
          {part.slice(1, -1)}
        </strong>
      );
    }

    // Strip any remaining unclosed asterisks or markdown artifacts
    const cleaned = part.replace(/\*\*/g, "").replace(/\*/g, "");
    return cleaned;
  });
}

// Helper to render entire AI/User message with clean lists, headings, quotes, and highlighted inline words
function renderMessageContent(rawText) {
  if (!rawText) return null;
  const lines = rawText.split("\n");

  return lines.map((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return <div key={idx} className="gita-msg-spacer" />;
    }

    // Heading: ### Heading or ## Heading
    if (/^#{1,4}\s+/.test(trimmed)) {
      const headingText = trimmed.replace(/^#{1,4}\s+/, "");
      return (
        <h5 key={idx} className="gita-msg-heading">
          {formatInlineText(headingText)}
        </h5>
      );
    }

    // Full bold line: **Heading/Important line**
    if (trimmed.startsWith("**") && trimmed.endsWith("**") && trimmed.length > 4) {
      return (
        <strong key={idx} className="gita-highlight-line">
          {formatInlineText(trimmed.slice(2, -2))}
        </strong>
      );
    }

    // Quote / Shloka: > *શ્લોક* or > શ્લોક
    if (trimmed.startsWith(">")) {
      const quoteText = trimmed
        .replace(/^>\s*/, "")
        .replace(/^\*+|\*+$/g, "");
      return (
        <blockquote key={idx} className="gita-shloka-quote">
          {formatInlineText(quoteText)}
        </blockquote>
      );
    }

    // Numbered list item: 1. or 1)
    const numMatch = trimmed.match(/^(\d+[\.\)])\s+(.*)$/);
    if (numMatch) {
      return (
        <div key={idx} className="gita-msg-list-item">
          <span className="gita-list-num">{numMatch[1]}</span>
          <span className="gita-list-content">
            {formatInlineText(numMatch[2])}
          </span>
        </div>
      );
    }

    // Bullet list item: * or - or •
    if (/^[-*•]\s+/.test(trimmed)) {
      const bulletContent = trimmed.replace(/^[-*•]\s+/, "");
      return (
        <div key={idx} className="gita-msg-list-item">
          <span className="gita-list-bullet">•</span>
          <span className="gita-list-content">
            {formatInlineText(bulletContent)}
          </span>
        </div>
      );
    }

    // Regular paragraph
    return (
      <p key={idx} className="gita-msg-para">
        {formatInlineText(line)}
      </p>
    );
  });
}

export default function GitaAIAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { isHindi, isEnglish, isGujarati, txt } = useLanguage();

  // Extract user's registered first name for ChatGPT style greeting
  const userFirstName = (() => {
    let rawUser = user;
    if (!rawUser) {
      try {
        const saved = localStorage.getItem("user");
        if (saved) rawUser = JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    if (!rawUser) return "";
    const rawName = (rawUser.name || rawUser.fullName || rawUser.displayName || rawUser.username || "").trim();
    if (!rawName) return "";
    return rawName.split(/\s+/)[0];
  })();

  const [isOpen, setIsOpen] = useState(false);
  const [isLabelExpanded, setIsLabelExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [activeConvId, setActiveConvId] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  const [menuOpenConvId, setMenuOpenConvId] = useState(null);
  const [editingConvId, setEditingConvId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Top header 3-dots menu & rename states
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isHeaderRenameOpen, setIsHeaderRenameOpen] = useState(false);
  const [headerRenameTitle, setHeaderRenameTitle] = useState("");

  const hasUserMessages = messages.some((m) => m.sender === "user");
  const hasAiAnswers = messages.some(
    (m) => m.sender === "ai" && !m.isGreetingPrompt && !m.id?.startsWith("greeting_")
  );

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2500);
  };

  // Check whether any initial/startup popups, splash screen, or modal dialogs are active or pending
  const areStartupModalsPending = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return false;

    const isStandalone = isRunningInStandaloneApp();

    // 1. Splash screen active or overlay in DOM
    if (isStandalone && sessionStorage.getItem("gita_splash_already_shown") !== "true") {
      return true;
    }
    if (document.querySelector(".app-splash-overlay")) {
      return true;
    }

    // 2. Language selection modal active or pending
    if (isStandalone) {
      if (localStorage.getItem("gita_app_lang_selected") !== "true") return true;
    } else {
      if (sessionStorage.getItem("gita_web_lang_selected") !== "true") return true;
    }
    if (document.querySelector(".mobile-lang-modal-overlay")) {
      return true;
    }

    // 3. App notification prompt overlay active in DOM
    if (document.querySelector(".app-notification-prompt-overlay")) {
      return true;
    }

    // 4. Feedback / Rating modal dialog active in DOM
    if (document.querySelector(".feedback-modal-overlay")) {
      return true;
    }

    // 5. Auth pages (/login, /register, etc.)
    const pathname = window.location.pathname;
    if (
      pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/forgot-password"
    ) {
      return true;
    }

    return false;
  };

  // WhatsApp-like pill expand & collapse sequence:
  // ONLY on first visit to HOME PAGE per session, AFTER all startup popups/modals close!
  useEffect(() => {
    // If already shown in this session (e.g. on page refresh), DO NOT PLAY AGAIN!
    const introAlreadyShown =
      typeof window !== "undefined" &&
      sessionStorage.getItem("gita_fab_intro_shown") === "true";

    if (introAlreadyShown) {
      setIsLabelExpanded(false);
      return;
    }

    let settleTimer = null;
    let expandTimer = null;
    let collapseTimer = null;
    let glideTimer = null;

    const runPillIntro = () => {
      // Re-verify intro not yet shown
      if (sessionStorage.getItem("gita_fab_intro_shown") === "true") return;

      // Must strictly be on Home page ("/")
      if (location.pathname !== "/") {
        setIsLabelExpanded(false);
        return;
      }

      // Must have zero startup modals pending or showing
      if (areStartupModalsPending()) return;

      // If chat assistant is already open, do not show pill
      if (isOpen) {
        setIsLabelExpanded(false);
        return;
      }

      // Mark as shown so refreshing the page NEVER plays the intro again!
      sessionStorage.setItem("gita_fab_intro_shown", "true");

      expandTimer = setTimeout(() => {
        setIsLabelExpanded(true);

        collapseTimer = setTimeout(() => {
          setIsLabelExpanded(false);
          // Wait for smooth collapse glide (500ms) to finish, then trigger rating pill!
          glideTimer = setTimeout(() => {
            try {
              window.dispatchEvent(new CustomEvent("gita-ai-pill-closed"));
            } catch (e) {}
          }, 500);
        }, 2800); // 2.8 seconds duration
      }, 300);
    };

    // Schedule check with a settle delay to allow any incoming modals/overlays to mount
    const scheduleCheck = (delay = 700) => {
      clearTimeout(settleTimer);

      if (sessionStorage.getItem("gita_fab_intro_shown") === "true") return;
      if (location.pathname !== "/") return;
      if (areStartupModalsPending()) return;
      if (isOpen) return;

      settleTimer = setTimeout(() => {
        runPillIntro();
      }, delay);
    };

    // Initial check on mount / route change
    scheduleCheck(800);

    // Listen to startup workflow completion events
    const handleStepDone = () => {
      scheduleCheck(700);
    };

    window.addEventListener("gita-splash-finished", handleStepDone);
    window.addEventListener("gita-language-selected", handleStepDone);
    window.addEventListener("gita-notification-prompt-done", handleStepDone);
    window.addEventListener("gita-login-prompt-done", handleStepDone);
    window.addEventListener("feedback-modal-closed", handleStepDone);

    // Automatically collapse and retract inside on user interaction (scroll, click, touch)
    const handleUserInteraction = () => {
      setIsLabelExpanded(false);
      try {
        window.dispatchEvent(new CustomEvent("gita-ai-pill-closed"));
      } catch (e) {}
    };

    window.addEventListener("scroll", handleUserInteraction, { passive: true });
    window.addEventListener("click", handleUserInteraction, { passive: true });
    window.addEventListener("touchstart", handleUserInteraction, { passive: true });

    return () => {
      window.removeEventListener("gita-splash-finished", handleStepDone);
      window.removeEventListener("gita-language-selected", handleStepDone);
      window.removeEventListener("gita-notification-prompt-done", handleStepDone);
      window.removeEventListener("gita-login-prompt-done", handleStepDone);
      window.removeEventListener("feedback-modal-closed", handleStepDone);
      window.removeEventListener("scroll", handleUserInteraction);
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);

      clearTimeout(settleTimer);
      clearTimeout(expandTimer);
      clearTimeout(collapseTimer);
      clearTimeout(glideTimer);
      // Guarantee the pill never stays stuck expanded on unmount or re-render!
      setIsLabelExpanded(false);
    };
  }, [location.pathname, isOpen]);

  // Retrieve or resolve the current active conversation object
  const getActiveConversation = () => {
    let conv =
      (activeConvId ? getConversationById(activeConvId) : null) ||
      historyList.find((c) => c.id === activeConvId);

    if (!conv && hasUserMessages) {
      const convId = activeConvId || `gita_chat_${Date.now()}`;
      if (!activeConvId) {
        setActiveConvId(convId);
      }
      const realMessages = messages.filter(
        (m) =>
          !m.isGreetingPrompt &&
          !m.id?.startsWith("greeting_") &&
          !m.text?.includes("નવી વાતચીત માટે હું તૈયાર છું")
      );
      const firstUserMsg = realMessages.find((m) => m.sender === "user");
      const title = firstUserMsg
        ? firstUserMsg.text.slice(0, 45) + (firstUserMsg.text.length > 45 ? "..." : "")
        : txt("આધ્યાત્મિક સંવાદ", "आध्यात्मिक संवाद", "Spiritual Dialogue");

      conv = {
        id: convId,
        title,
        messages: realMessages,
        isPinned: false,
        isArchived: false,
      };
    }
    return conv;
  };

  const activeConv = hasUserMessages ? getActiveConversation() : null;

  // Header Rename submit handler
  const handleHeaderRenameSubmit = (e) => {
    if (e) e.preventDefault();
    if (headerRenameTitle.trim() && activeConv?.id) {
      renameConversation(activeConv.id, headerRenameTitle.trim());
      setHistoryList(getAllConversations());
      showToast(txt("નામ અપડેટ થઈ ગયું.", "नाम अपडेट हो गया।", "Name updated."));
    }
    setIsHeaderRenameOpen(false);
  };

  // Load and listen for history updates
  useEffect(() => {
    const updateHistoryList = () => {
      setHistoryList(getAllConversations());
    };
    updateHistoryList();

    if (user) {
      syncHistoryWithServer().then((list) => {
        if (list) setHistoryList(list);
      });
    }

    window.addEventListener("gita-ai-history-updated", updateHistoryList);
    return () => {
      window.removeEventListener("gita-ai-history-updated", updateHistoryList);
    };
  }, [user]);

  // Listen for open-history event from other pages
  useEffect(() => {
    const handleOpenHistory = () => {
      setIsOpen(true);
      setIsHistoryOpen(true);
      setHistoryList(getAllConversations());
    };
    window.addEventListener("gita-ai-open-history", handleOpenHistory);
    return () => {
      window.removeEventListener("gita-ai-open-history", handleOpenHistory);
    };
  }, []);

  // Close 3-dots dropdown menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".gita-sidebar-menu-wrapper")) {
        setMenuOpenConvId(null);
      }
      if (!e.target.closest(".gita-header-menu-wrapper")) {
        setIsHeaderMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Stop voice recognition if chat window closes
  useEffect(() => {
    if (!isOpen && isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
    }
  }, [isOpen, isListening]);

  // Voice Input Toggle using Web Speech API
  const toggleVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        txt(
          "તમારા બ્રાઉઝરમાં વોઇસ ઇનપુટ સપોર્ટ નથી. કૃપા કરીને Google Chrome અથવા Microsoft Edge નો ઉપયોગ કરો.",
          "आपके ब्राउज़र में वॉइस इनपुट सपोर्ट नहीं है। कृपया Google Chrome या Microsoft Edge का उपयोग करें।",
          "Voice input is not supported in your browser. Please use Google Chrome or Microsoft Edge."
        )
      );
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = isEnglish ? "en-IN" : isHindi ? "hi-IN" : "gu-IN";
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInputText(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        inputRef.current?.focus();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Voice input start failed:", err);
      setIsListening(false);
    }
  };

  // Auto-close if user logs out or if user enters quiz or auth page
  useEffect(() => {
    const isRestrictedPage =
      location.pathname === "/login" ||
      location.pathname === "/register" ||
      location.pathname.startsWith("/quiz");

    if ((!user || isRestrictedPage) && isOpen) {
      setIsOpen(false);
    }
  }, [user, location.pathname, isOpen]);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [messages, isOpen]);

  // Sync user conversations across all devices from cloud
  useEffect(() => {
    if (user) {
      syncHistoryWithServer();
    }
  }, [user]);

  // Auto-resize input textarea up to 6-7 lines before scrolling
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      const scrollHeight = inputRef.current.scrollHeight;
      // Cap at 165px (approx 6-7 lines of text)
      inputRef.current.style.height = `${Math.min(scrollHeight, 165)}px`;
    }
  }, [inputText]);

  // Start with a clean new chat by default
  useEffect(() => {
    // Default clean state for new chat
    setMessages([]);

    // Listen for custom event from History page to resume specific conversation
    const handleOpenConversation = (e) => {
      const targetId = e.detail?.conversationId;
      if (targetId) {
        const targetConv = getConversationById(targetId);
        if (targetConv && targetConv.messages) {
          setMessages(targetConv.messages);
          setActiveConvId(targetConv.id);
        }
      }
      setIsOpen(true);
    };

    window.addEventListener("gita-ai-open-conversation", handleOpenConversation);
    return () => {
      window.removeEventListener("gita-ai-open-conversation", handleOpenConversation);
    };
  }, []);


  // Save conversation automatically whenever messages change (excluding temporary greeting)
  useEffect(() => {
    const realMessages = messages.filter(
      (m) =>
        !m.isGreetingPrompt &&
        !m.id?.startsWith("greeting_") &&
        !m.text?.includes("નવી વાતચીત માટે હું તૈયાર છું")
    );

    if (realMessages.length > 0) {
      const firstUserMsg = realMessages.find((m) => m.sender === "user");
      const title = firstUserMsg
        ? firstUserMsg.text.slice(0, 45) + (firstUserMsg.text.length > 45 ? "..." : "")
        : txt("આધ્યાત્મિક સંવાદ", "आध्यात्मिक संवाद", "Spiritual Dialogue");

      const convId = activeConvId || `gita_chat_${Date.now()}`;
      if (!activeConvId) {
        setActiveConvId(convId);
      }

      saveConversation({
        id: convId,
        title,
        messages: realMessages
      });
    }
  }, [messages, activeConvId]);

  // Start new conversation
  const handleNewConversation = () => {
    setActiveConversationId(null);
    setActiveConvId(null);
    setMessages([]);
    setIsHeaderMenuOpen(false);
    setIsHeaderRenameOpen(false);
  };

  // Send message
  const handleSendMessage = async (textToSend) => {
    const query = (typeof textToSend === "string" ? textToSend : inputText).trim();
    if (!query || isLoading) return;

    if (!user) {
      setIsOpen(false);
      const targetPath = location.pathname + location.search;
      const redirectMsg = txt(
        "ગીતા AI માર્ગદર્શકનો ઉપયોગ કરવા માટે Login કરવું જરૂરી છે.",
        "गीता AI मार्गदर्शक का उपयोग करने के लिए Login करना आवश्यक है।",
        "Login is required to use Gita AI Guide."
      );

      sessionStorage.setItem(
        "authRedirect",
        JSON.stringify({
          from: targetPath,
          message: redirectMsg,
        })
      );

      navigate("/login", {
        state: {
          from: targetPath,
          message: redirectMsg,
        },
      });
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
    }

    const userMessage = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toISOString()
    };

    // Remove any initial greeting so it vanishes from the top when user asks a question
    const activeMessages = messages.filter(
      (m) =>
        !m.isGreetingPrompt &&
        !m.id?.startsWith("greeting_") &&
        !m.text?.includes("નવી વાતચીત માટે હું તૈયાર છું")
    );

    const newMessages = [...activeMessages, userMessage];
    setMessages(newMessages);
    setInputText("");
    setIsLoading(true);

    try {
      const token = getValidToken();
      const response = await fetch(`${API_BASE}/api/gita-ai/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: query,
          history: newMessages.slice(-6)
        })
      });

      const data = await response.json();

      if (data.success && data.answer) {
        const aiMessage = {
          id: `ai_${Date.now()}`,
          sender: "ai",
          text: data.answer,
          timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        if (response.status === 401 || (data.message && data.message.toLowerCase().includes("token"))) {
          clearAuthSession();
        }
        throw new Error(data.message || txt("ઉત્તર મેળવવામાં સમસ્યા આવી.", "उत्तर प्राप्त करने में समस्या आई।", "Error receiving response."));
      }
    } catch (error) {
      console.error("Gita AI Request Error:", error);
      const errorMessage = {
        id: `err_${Date.now()}`,
        sender: "ai",
        text: txt(
          "ક્ષમા કરશો, પ્રશ્નનો ઉત્તર મેળવવામાં ટેક્નિકલ સમસ્યા આવી છે. કૃપા કરીને થોડી ક્ષણો પછી ફરી પૂછો.",
          "क्षमा करें, प्रश्न का उत्तर प्राप्त करने में तकनीकी समस्या आई है। कृपया कुछ क्षणों बाद पुनः पूछें।",
          "Sorry, a technical error occurred while getting the answer. Please try again in a few moments."
        ),
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyText = (id, text) => {
    const cleanText = text
      .replace(/\*\*\*(.*?)\*\*\*/g, "$1")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/==(.*?)==/g, "$1")
      .replace(/`(.*?)`/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      .replace(/^#{1,4}\s+/gm, "")
      .replace(/^>\s*/gm, "");

    navigator.clipboard.writeText(cleanText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Undo changes up to this point and edit
  const handleUndoMessage = (targetIndex, text) => {
    if (isLoading) {
      setIsLoading(false);
    }
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    }

    // Roll back conversation messages up to (and excluding) this user message
    const previousMessages = messages.slice(0, targetIndex);
    if (previousMessages.length === 0) {
      setMessages([]);
    } else {
      setMessages(previousMessages);
    }

    // Populate the input box with the user's question and focus
    setInputText(text);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(text.length, text.length);
      }
    }, 50);
  };

  // Filter history conversations based on search
  const filteredHistory = historyList.filter((conv) => {
    if (!historySearch.trim()) return true;
    const q = historySearch.trim().toLowerCase();
    const titleMatch = conv.title && conv.title.toLowerCase().includes(q);
    const msgMatch =
      conv.messages &&
      conv.messages.some((m) => m.text && m.text.toLowerCase().includes(q));
    return titleMatch || msgMatch;
  });

  // Date formatting for history list
  const formatHistoryDate = (isoString) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      if (isToday) {
        return d.toLocaleTimeString(isEnglish ? "en-US" : isHindi ? "hi-IN" : "gu-IN", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      return d.toLocaleDateString(isEnglish ? "en-US" : isHindi ? "hi-IN" : "gu-IN", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return "";
    }
  };

  // Toggle ChatGPT style History Sidebar
  const handleToggleHistory = () => {
    if (!isHistoryOpen) {
      setHistoryList(getAllConversations());
      if (user) {
        syncHistoryWithServer().then((list) => {
          if (list) setHistoryList(list);
        });
      }
    }
    setIsHistoryOpen((prev) => !prev);
  };

  // Switch to a previous conversation
  const handleSelectConversation = (convId) => {
    const conv =
      getConversationById(convId) || historyList.find((c) => c.id === convId);
    if (conv && conv.messages) {
      setMessages(conv.messages);
      setActiveConvId(conv.id);
      setActiveConversationId(conv.id);
    }
    setIsHistoryOpen(false);
  };

  // Toggle 3-dots dropdown menu
  const handleToggleMenu = (e, convId) => {
    e.stopPropagation();
    setMenuOpenConvId((prev) => (prev === convId ? null : convId));
  };

  // Share conversation (native share or copy text to clipboard)
  const handleShareConversation = async (e, conv) => {
    e.stopPropagation();
    setMenuOpenConvId(null);
    try {
      const summary =
        conv.messages && conv.messages.length > 0
          ? conv.messages
              .filter((m) => !m.isGreetingPrompt && !m.id?.startsWith("greeting_"))
              .map(
                (m) =>
                  `${m.sender === "user" ? txt("પ્રશ્ન:", "प्रश्न:", "Question:") : txt("ગીતા AI:", "गीता AI:", "Gita AI:")} ${m.text}`
              )
              .join("\n\n")
          : "";

      const shareText = `॥ ${txt("શ્રીમદ્ ભગવદ્ ગીતા સંવાદ", "श्रीमद्भगवद्गीता संवाद", "Shrimad Bhagavad Gita Dialogue")} ॥\n\n${txt("વિષય:", "विषय:", "Topic:")} ${
        conv.title || txt("આધ્યાત્મિક માર્ગદર્શન", "आध्यात्मिक मार्गदर्शन", "Spiritual Guidance")
      }\n\n${summary}\n\n${txt("સંપૂર્ણ ગીતા વાંચો અને જાણો:", "सम्पूर्ण गीता पढ़ें और जानें:", "Read and explore the complete Gita:")} ${window.location.origin}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: conv.title || txt("ગીતા AI સંવાદ", "गीता AI संवाद", "Gita AI Dialogue"),
            text: shareText,
            url: window.location.origin,
          });
          return;
        } catch (err) {}
      }

      await navigator.clipboard.writeText(shareText);
      showToast(txt("સંવાદ ક્લિપબોર્ડ પર કોપી થયો!", "संवाद क्लिपबोर्ड पर कॉपी हुआ!", "Dialogue copied to clipboard!"));
    } catch (err) {
      console.error("Share error:", err);
      showToast(txt("શેર કરવામાં સમસ્યા આવી.", "शेयर करने में समस्या आई।", "Error sharing dialogue."));
    }
  };

  // Rename handlers
  const handleStartRename = (e, conv) => {
    e.stopPropagation();
    setMenuOpenConvId(null);
    setEditingConvId(conv.id);
    setEditingTitle(conv.title || "");
  };

  const handleSaveRename = (e, convId) => {
    if (e) e.stopPropagation();
    if (editingTitle && editingTitle.trim()) {
      renameConversation(convId, editingTitle.trim());
      showToast(txt("નામ અપડેટ થઈ ગયું.", "नाम अपडेट हो गया।", "Name updated."));
    }
    setEditingConvId(null);
    setEditingTitle("");
  };

  const handleCancelRename = (e) => {
    if (e) e.stopPropagation();
    setEditingConvId(null);
    setEditingTitle("");
  };

  // Pin / Unpin toggle
  const handleTogglePin = (e, convId) => {
    e.stopPropagation();
    setMenuOpenConvId(null);
    const newPinned = togglePinConversation(convId);
    showToast(newPinned ? txt("સંવાદ પિન કર્યો.", "संवाद पिन किया।", "Dialogue pinned.") : txt("સંવાદ અનપિન કર્યો.", "संवाद अनपिन किया।", "Dialogue unpinned."));
  };

  // Archive / Unarchive toggle
  const handleToggleArchive = (e, convId) => {
    e.stopPropagation();
    setMenuOpenConvId(null);
    const newArchived = toggleArchiveConversation(convId);
    showToast(newArchived ? txt("સંવાદ આર્કાઇવ કર્યો.", "संवाद आर्काइव किया।", "Dialogue archived.") : txt("સંવાદ અન-આર્કાઇવ કર્યો.", "संवाद अन-आर्काइव किया।", "Dialogue unarchived."));
  };

  // Delete single conversation
  const handleDeleteHistoryItem = (e, convId) => {
    e.stopPropagation();
    setMenuOpenConvId(null);
    deleteConversation(convId);
    setHistoryList((prev) => prev.filter((c) => c.id !== convId));
    if (activeConvId === convId) {
      handleNewConversation();
    }
    showToast(txt("સંવાદ ડીલીટ કર્યો.", "संवाद डिलीટ किया।", "Dialogue deleted."));
  };

  // Clear all conversations
  const handleClearAllHistory = () => {
    if (window.confirm(txt("શું તમે તમામ AI સંવાદો હંમેશ માટે ડીલીટ કરવા માંગો છો?", "क्या आप सभी AI संवाद हमेशा के लिए डिलीट करना चाहते हैं?", "Are you sure you want to permanently delete all AI dialogues?"))) {
      clearAllConversations();
      setHistoryList([]);
      handleNewConversation();
      showToast(txt("તમામ ઇતિહાસ સાફ કર્યો.", "समस्त इतिहास साफ किया गया।", "All history cleared."));
    }
  };

  // Start fresh chat from history sidebar
  const handleStartNewFromHistory = () => {
    handleNewConversation();
    setIsHistoryOpen(false);
  };

  const handleGoToLogin = () => {
    setIsOpen(false);
    setIsHistoryOpen(false);
    const targetPath = location.pathname + location.search;
    const redirectMsg = txt(
      "તમારી AI History સાચવવા માટે Login કરવું જરૂરી છે.",
      "अपनी AI History सहेजने के लिए Login करना आवश्यक है।",
      "Login is required to save your AI History."
    );

    sessionStorage.setItem(
      "authRedirect",
      JSON.stringify({
        from: targetPath,
        message: redirectMsg,
      })
    );

    navigate("/login", {
      state: {
        from: targetPath,
        message: redirectMsg,
      },
    });
  };

  // Render single history item in sidebar with 3-dots dropdown menu
  const renderHistoryItem = (conv) => {
    const isActive = conv.id === activeConvId;
    const isEditing = editingConvId === conv.id;
    const isMenuOpen = menuOpenConvId === conv.id;

    return (
      <div
        key={conv.id}
        className={`gita-sidebar-item ${isActive ? "active" : ""} ${
          conv.isPinned ? "is-pinned" : ""
        } ${isMenuOpen ? "menu-open" : ""}`}
        onClick={() => {
          if (!isEditing) handleSelectConversation(conv.id);
        }}
        role="button"
        tabIndex={0}
      >
        <div className="gita-sidebar-item-icon">
          {conv.isPinned ? (
            <Pin size={14} className="gita-sidebar-pin-badge" />
          ) : (
            <MessageSquareText size={15} />
          )}
        </div>

        <div className="gita-sidebar-item-info">
          {isEditing ? (
            <div
              className="gita-sidebar-rename-form"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={editingTitle}
                autoFocus
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveRename(e, conv.id);
                  if (e.key === "Escape") handleCancelRename(e);
                }}
              />
              <button
                type="button"
                className="rename-action-btn save"
                onClick={(e) => handleSaveRename(e, conv.id)}
                title={txt("સાચવો", "सहेजें", "Save")}
              >
                <Check size={13} />
              </button>
              <button
                type="button"
                className="rename-action-btn cancel"
                onClick={handleCancelRename}
                title={txt("રદ કરો", "रद्द करें", "Cancel")}
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <>
              <h5 className="gita-sidebar-item-title" title={conv.title}>
                {conv.title || txt("આધ્યાત્મિક સંવાદ", "आध्यात्मिक संवाद", "Spiritual Dialogue")}
              </h5>
              <div className="gita-sidebar-item-meta">
                <Clock size={11} />
                <span>{formatHistoryDate(conv.updatedAt)}</span>
                {conv.messages?.length > 0 && (
                  <span className="gita-sidebar-item-count">
                    • {conv.messages.length} {txt("મેસેજ", "संदेश", "messages")}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* 3-Dots Action Button & Floating Menu */}
        {!isEditing && (
          <div className="gita-sidebar-menu-wrapper">
            <button
              type="button"
              className={`gita-sidebar-item-more-btn ${
                isMenuOpen ? "active" : ""
              }`}
              onClick={(e) => handleToggleMenu(e, conv.id)}
              title={txt("વિકલ્પો", "विकल्प", "Options")}
              aria-label={txt("વધુ વિકલ્પો", "अधिक विकल्प", "More options")}
            >
              <MoreHorizontal size={15} />
            </button>

            {isMenuOpen && (
              <div
                className="gita-sidebar-menu-dropdown"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 1. Share */}
                <button
                  type="button"
                  className="gita-sidebar-menu-item"
                  onClick={(e) => handleShareConversation(e, conv)}
                >
                  <Share2 size={13} />
                  <span>{txt("શેર કરો", "शेयर करें", "Share")}</span>
                </button>

                {/* 2. Rename */}
                <button
                  type="button"
                  className="gita-sidebar-menu-item"
                  onClick={(e) => handleStartRename(e, conv)}
                >
                  <Pencil size={13} />
                  <span>{txt("નામ બદલો", "नाम बदलें", "Rename")}</span>
                </button>

                {/* 3. Pin / Unpin */}
                <button
                  type="button"
                  className="gita-sidebar-menu-item"
                  onClick={(e) => handleTogglePin(e, conv.id)}
                >
                  {conv.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                  <span>{conv.isPinned ? txt("અનપિન કરો", "अनपिन करें", "Unpin") : txt("પિન કરો", "पिन करें", "Pin")}</span>
                </button>

                <div className="gita-sidebar-menu-divider" />

                {/* 5. Delete */}
                <button
                  type="button"
                  className="gita-sidebar-menu-item danger"
                  onClick={(e) => handleDeleteHistoryItem(e, conv.id)}
                >
                  <Trash2 size={13} />
                  <span>{txt("ડીલીટ કરો", "डिलीट करें", "Delete")}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleFabClick = () => {
    setIsLabelExpanded(false);
    if (!user) {
      const targetPath = location.pathname + location.search;
      const redirectMsg = txt(
        "ગીતા AI માર્ગદર્શકનો ઉપયોગ કરવા માટે Login કરવું જરૂરી છે.",
        "गीता AI मार्गदर्शक का उपयोग करने के लिए Login करना आवश्यक है।",
        "Login is required to use Gita AI Guide."
      );

      sessionStorage.setItem(
        "authRedirect",
        JSON.stringify({
          from: targetPath,
          message: redirectMsg,
        })
      );

      navigate("/login", {
        state: {
          from: targetPath,
          message: redirectMsg,
        },
      });
      return;
    }
    // Always open a fresh new chat session
    handleNewConversation();
    setIsOpen(true);
  };

  // Listen for open-gita-ai-assistant event (e.g. from About Us page modal)
  useEffect(() => {
    const handleOpenAssistant = () => {
      setIsHistoryOpen(false);
      handleFabClick();
    };

    window.addEventListener("open-gita-ai-assistant", handleOpenAssistant);
    return () => {
      window.removeEventListener("open-gita-ai-assistant", handleOpenAssistant);
    };
  }, [user, location.pathname, location.search]);


  // Login, Register અથવા Quiz રમતી વખતે Floating AI બટન બતાવવાની જરૂર નથી
  if (
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname.startsWith("/quiz")
  ) {
    return null;
  }

  return (
    <aside
      className={`gita-ai-wrapper ${theme} ${isOpen ? "is-open" : ""}`}
      aria-label="Gita AI Assistant"
    >
      {/* =================================================
          FLOATING TRIGGER BUTTON (BOTTOM RIGHT CORNER)
      ================================================= */}
      {!isOpen && (
        <button
          type="button"
          className={`gita-ai-fab ${isLabelExpanded ? "label-expanded" : ""}`}
          onClick={handleFabClick}
          title={txt("ગીતા AI માર્ગદર્શક સાથે વાત કરો", "गीता AI मार्गदर्शक से बात करें", "Talk with Gita AI Guide")}
          aria-label={txt("ગીતા AI ખોલો", "गीता AI खोलें", "Open Gita AI")}
        >
          <div className="gita-ai-fab-glow" />
          <div className="gita-ai-fab-icon-box">
            <img
              src="/icons/gita-ai-icon-192.png"
              alt={txt("ગીતા AI", "गीता AI", "Gita AI")}
              className="gita-fab-ai-img"
            />
          </div>
          <span className="gita-ai-fab-pill-text">
            {txt("ગીતા AI ને પૂછો", "गीता AI से पूछें", "Ask Gita AI")}
          </span>
        </button>
      )}

      {/* =================================================
          CHAT WINDOW MODAL & BLURRED BACKDROP
      ================================================= */}
      {isOpen && (
        <div className="gita-ai-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="gita-ai-window"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            {/* =========================================================
                CHATGPT STYLE SIDEBAR DRAWER (HISTORY PANEL)
                ========================================================= */}
            <div className={`gita-sidebar-drawer ${isHistoryOpen ? "is-open" : ""}`}>
              {/* Dimmed backdrop to close sidebar on click */}
              <div
                className="gita-sidebar-backdrop"
                onClick={() => setIsHistoryOpen(false)}
                title={txt("ચેટ પર પાછા જાઓ", "चैट पर वापस जाएं", "Back to chat")}
              />

              {/* Sliding Sidebar Panel */}
              <aside className="gita-sidebar-panel" aria-label={txt("સંવાદ ઇતિહાસ", "संवाद इतिहास", "Chat History")}>
                {/* Panel Header */}
                <div className="gita-sidebar-header">
                  <div className="gita-sidebar-header-left">
                    <History size={18} className="gita-sidebar-header-icon" />
                    <span>{txt("સંવાદ ઇતિહાસ", "संवाद इतिहास", "Chat History")}</span>
                  </div>
                  <button
                    type="button"
                    className="gita-sidebar-close-btn"
                    onClick={() => setIsHistoryOpen(false)}
                    title={txt("ઇતિહાસ બંધ કરો", "इतिहास बंद करें", "Close History")}
                    aria-label={txt("બંધ કરો", "बंद करें", "Close")}
                  >
                    <X size={17} />
                  </button>
                </div>

                {/* New Chat Action Button */}
                <div className="gita-sidebar-new-chat-box">
                  <button
                    type="button"
                    className="gita-sidebar-new-chat-btn"
                    onClick={handleStartNewFromHistory}
                  >
                    <Plus size={16} />
                    <span>{txt("+ નવી વાતચીત", "+ नई बातचीत", "+ New Chat")}</span>
                  </button>
                </div>

                {/* Archived Conversations Box (Top, below New Chat) */}
                {historyList.filter((c) => c.isArchived).length > 0 && (
                  <div className="gita-sidebar-archived-top-box">
                    <button
                      type="button"
                      className={`gita-sidebar-archived-toggle ${showArchived ? "expanded" : ""}`}
                      onClick={() => setShowArchived((prev) => !prev)}
                    >
                      <div className="gita-sidebar-archived-toggle-left">
                        <Archive size={14} />
                        <span>
                          {txt("આર્કાઇવ કરેલ સંવાદો", "आर्काइव किए गए संवाद", "Archived Chats")} ({historyList.filter((c) => c.isArchived).length})
                        </span>
                      </div>
                      {showArchived ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </button>
                    {showArchived && (
                      <div className="gita-sidebar-archived-list">
                        {historyList
                          .filter((c) => c.isArchived)
                          .map((conv) => renderHistoryItem(conv))}
                      </div>
                    )}
                  </div>
                )}

                {/* Search Bar (shows when user has 2+ chats) */}
                {historyList.length > 2 && (
                  <div className="gita-sidebar-search-box">
                    <Search size={14} className="gita-sidebar-search-icon" />
                    <input
                      type="text"
                      placeholder={txt("ઇતિહાસમાં શોધો...", "इतिहास में खोजें...", "Search in history...")}
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                    />
                    {historySearch && (
                      <button
                        type="button"
                        className="gita-sidebar-search-clear"
                        onClick={() => setHistorySearch("")}
                        title={txt("સાફ કરો", "साफ करें", "Clear")}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                )}

                {/* Toast Notification in Sidebar */}
                {toastMessage && (
                  <div className="gita-sidebar-toast">
                    <span>{toastMessage}</span>
                  </div>
                )}

                {/* Conversations List */}
                <div className="gita-sidebar-list">
                  {filteredHistory.length === 0 ? (
                    <div className="gita-sidebar-empty">
                      <div className="gita-sidebar-empty-icon">
                        <MessageSquareText size={26} />
                      </div>
                      <p>
                        {historySearch
                          ? txt("કોઈ મેળ ખાતો સંવાદ નથી મળ્યો", "कोई मिलता-जुलता संवाद नहीं मिला", "No matching conversations found")
                          : txt("કોઈ જૂનો સંવાદ નથી", "कोई पुराना संवाद नहीं है", "No previous conversations")}
                      </p>
                      <span>
                        {historySearch
                          ? txt("અન્ય શબ્દોથી શોધો.", "अन्य शब्दों से खोजें।", "Try searching with other words.")
                          : txt("તમારો પ્રશ્ન પૂછો, તે આપમેળે અહીં સંગ્રહિત થશે.", "अपना प्रश्न पूछें, वह अपने आप यहाँ संग्रहीत होगा।", "Ask your question, it will be automatically saved here.")}
                      </span>
                    </div>
                  ) : historySearch.trim() ? (
                    filteredHistory.map((conv) => renderHistoryItem(conv))
                  ) : (
                    <>
                      {/* Pinned Conversations */}
                      {historyList.filter((c) => c.isPinned && !c.isArchived).length > 0 && (
                        <div className="gita-sidebar-group">
                          <div className="gita-sidebar-group-title">
                            <Pin size={12} />
                            <span>{txt("પિન કરેલા સંવાદો", "पिन किए गए संवाद", "Pinned Conversations")}</span>
                          </div>
                          {historyList
                            .filter((c) => c.isPinned && !c.isArchived)
                            .map((conv) => renderHistoryItem(conv))}
                        </div>
                      )}

                      {/* Recent Unpinned Conversations */}
                      {historyList.filter((c) => !c.isPinned && !c.isArchived).length > 0 && (
                        <div className="gita-sidebar-group">
                          {historyList.filter((c) => c.isPinned && !c.isArchived).length > 0 && (
                            <div className="gita-sidebar-group-title">
                              <span>{txt("તાજેતરના સંવાદો", "हाल के संवाद", "Recent Conversations")}</span>
                            </div>
                          )}
                          {historyList
                            .filter((c) => !c.isPinned && !c.isArchived)
                            .map((conv) => renderHistoryItem(conv))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Sidebar Footer - User Profile Section */}
                <div className="gita-sidebar-footer">
                  {user ? (
                    <div className="gita-sidebar-user-section">
                      {historyList.length > 0 && (
                        <button
                          type="button"
                          className="gita-sidebar-clear-all"
                          onClick={handleClearAllHistory}
                          title={txt("બધા સંવાદો કાઢી નાખો", "सभी संवाद हटाएं", "Clear all conversations")}
                        >
                          <Trash2 size={12} />
                          <span>{txt("તમામ ઇતિહાસ સાફ કરો", "समस्त इतिहास साफ करें", "Clear All History")}</span>
                        </button>
                      )}

                      <div
                        className="gita-sidebar-user-card"
                        onClick={() => {
                          setIsOpen(false);
                          navigate("/profile");
                        }}
                        title={txt("પ્રોફાઇલ જુઓ", "प्रोफ़ाइल देखें", "View Profile")}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="gita-sidebar-user-avatar">
                          <User size={16} />
                        </div>
                        <div className="gita-sidebar-user-info">
                          <span className="gita-sidebar-user-name">
                            {user.name || txt("વપરાશકર્તા", "उपयोगकर्ता", "User")}
                          </span>
                          <span className="gita-sidebar-user-id" title={user.email || ""}>
                            {user.email || (user._id || user.id ? `ID: #${String(user._id || user.id).slice(-6).toUpperCase()}` : txt("સભ્ય પ્રોફાઇલ", "सदस्य प्रोफ़ाइल", "Member Profile"))}
                          </span>
                        </div>
                        <ChevronRight size={15} className="gita-sidebar-user-arrow" />
                      </div>
                    </div>
                  ) : (
                    <div
                      className="gita-sidebar-user-card guest"
                      onClick={handleGoToLogin}
                      title={txt("Login કરો", "Login करें", "Login")}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="gita-sidebar-user-avatar guest">
                        <User size={16} />
                      </div>
                      <div className="gita-sidebar-user-info">
                        <span className="gita-sidebar-user-name">{txt("અતિથિ (Guest)", "अतिथि (Guest)", "Guest")}</span>
                        <span className="gita-sidebar-user-id">{txt("Login કરો →", "Login करें →", "Login →")}</span>
                      </div>
                      <ChevronRight size={15} className="gita-sidebar-user-arrow" />
                    </div>
                  )}
                </div>
              </aside>
            </div>

            {/* WINDOW HEADER (ChatGPT Style with History on the LEFT) */}
            <header className="gita-ai-header">
              <div className="gita-ai-header-left">
                {/* ChatGPT style sidebar drawer toggle button on the LEFT */}
                <button
                  type="button"
                  className={`gita-ai-icon-btn sidebar-toggle-btn ${isHistoryOpen ? "active" : ""}`}
                  onClick={handleToggleHistory}
                  title={isHistoryOpen ? txt("ઇતિહાસ સાઇડબાર બંધ કરો", "इतिहास साइडबार बंद करें", "Close history sidebar") : txt("સંવાદ ઇતિહાસ જુઓ (Sidebar)", "संवाद इतिहास देखें (Sidebar)", "View chat history (Sidebar)")}
                  aria-label={txt("સાઇડબાર", "साइडबार", "Sidebar")}
                >
                  <PanelLeft size={18} />
                </button>

                <div className="gita-ai-avatar">
                  <img
                    src="/icons/gita-ai-icon-192.png"
                    alt={txt("ગીતા AI", "गीता AI", "Gita AI")}
                    className="gita-ai-avatar-img"
                  />
                  <span className="gita-ai-online-dot" />
                </div>
                <div className="gita-ai-header-titles">
                  <h3>{txt("ગીતા AI", "गीता AI", "Gita AI")}</h3>
                  <span>॥ श्रीकृष्णः शरणं मम ॥</span>
                </div>
              </div>

              <div className="gita-ai-header-actions">
                {/* 3-Dots Action Button & Dropdown Menu (Only visible when chatting) */}
                {hasUserMessages && activeConv && (
                  <div className="gita-header-menu-wrapper">
                    <button
                      type="button"
                      className={`gita-ai-icon-btn ${isHeaderMenuOpen ? "active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsHeaderMenuOpen((prev) => !prev);
                      }}
                      title={txt("વધુ વિકલ્પો", "अधिक विकल्प", "More options")}
                      aria-label={txt("વધુ વિકલ્પો", "अधिक विकल्प", "More options")}
                    >
                      <MoreHorizontal size={18} />
                    </button>

                    {isHeaderMenuOpen && (
                      <div
                        className="gita-sidebar-menu-dropdown gita-header-menu-dropdown"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* 1. Share */}
                        <button
                          type="button"
                          className="gita-sidebar-menu-item"
                          onClick={(e) => {
                            setIsHeaderMenuOpen(false);
                            handleShareConversation(e, activeConv);
                          }}
                        >
                          <Share2 size={13} />
                          <span>{txt("શેર કરો", "शेयर करें", "Share")}</span>
                        </button>

                        {/* 2. Rename */}
                        <button
                          type="button"
                          className="gita-sidebar-menu-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsHeaderMenuOpen(false);
                            setHeaderRenameTitle(activeConv.title || "");
                            setIsHeaderRenameOpen(true);
                          }}
                        >
                          <Pencil size={13} />
                          <span>{txt("નામ બદલો", "नाम बदलें", "Rename")}</span>
                        </button>

                        {/* 3. Pin / Unpin */}
                        <button
                          type="button"
                          className="gita-sidebar-menu-item"
                          onClick={(e) => {
                            setIsHeaderMenuOpen(false);
                            handleTogglePin(e, activeConv.id);
                            setHistoryList(getAllConversations());
                          }}
                        >
                          {activeConv.isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                          <span>{activeConv.isPinned ? txt("અનપિન કરો", "अनपिन करें", "Unpin") : txt("પિન કરો", "पिन करें", "Pin")}</span>
                        </button>

                        <div className="gita-sidebar-menu-divider" />

                        {/* 5. Delete */}
                        <button
                          type="button"
                          className="gita-sidebar-menu-item danger"
                          onClick={(e) => {
                            setIsHeaderMenuOpen(false);
                            if (window.confirm(txt("શું તમે આ સંવાદ ડીલીટ કરવા માંગો છો?", "क्या आप यह संवाद डिलीट करना चाहते हैं?", "Do you want to delete this conversation?"))) {
                              handleDeleteHistoryItem(e, activeConv.id);
                            }
                          }}
                        >
                          <Trash2 size={13} />
                          <span>{txt("ડીલીટ કરો", "डिलीट करें", "Delete")}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* New Conversation Button */}
                <button
                  type="button"
                  className="gita-ai-icon-btn"
                  onClick={handleNewConversation}
                  title={txt("નવી વાતચીત શરૂ કરો", "नई बातचीत शुरू करें", "Start New Conversation")}
                  aria-label={txt("નવી વાતચીત", "नई बातचीत", "New Conversation")}
                >
                  <RotateCcw size={17} />
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  className="gita-ai-icon-btn close-btn"
                  onClick={() => setIsOpen(false)}
                  title={txt("ચેટ બંધ કરો", "चैट बंद करें", "Close Chat")}
                  aria-label={txt("ચેટ બંધ કરો", "चેટ બંધ કરો", "Close Chat")}
                >
                  <X size={19} />
                </button>
              </div>
            </header>

          {/* CHAT MESSAGES BODY */}
          <div className={`gita-ai-body ${!hasUserMessages ? "has-suggestions" : ""}`}>
            {!hasUserMessages && !isLoading && (
              <div className="gita-new-chat-hero">
                <div className="gita-hero-logo-box">
                  <img
                    src="/icons/gita-ai-icon-192.png"
                    alt={txt("ગીતા AI", "गीता AI", "Gita AI")}
                    className="gita-hero-logo-img"
                  />
                </div>
                <span className="gita-hero-greeting">{txt("જય શ્રી કૃષ્ણ", "जय श्री कृष्ण", "Jai Shree Krishna")}</span>
                <h2 className="gita-hero-title">
                  {txt("હું તમને કેવી રીતે મદદ કરી શકું", "मैं आपकी क्या सहायता कर सकता हूँ", "How can I help you")}{userFirstName ? `, ${userFirstName}` : ""}?
                </h2>
              </div>
            )}

            {messages
              .filter((m) => !m.isGreetingPrompt && !m.id?.startsWith("greeting_"))
              .map((msg, index) => (
              <div
                key={msg.id}
                className={`gita-msg-row ${
                  msg.sender === "user" ? "user-row" : "ai-row"
                }`}
              >
                {msg.sender === "ai" && (
                  <div className="gita-msg-avatar">
                    <img
                      src="/icons/gita-ai-icon-192.png"
                      alt={txt("ગીતા AI", "गीता AI", "Gita AI")}
                      className="gita-msg-avatar-img"
                    />
                  </div>
                )}

                <div className="gita-msg-bubble">
                  <div className="gita-msg-text">
                    {renderMessageContent(msg.text)}
                  </div>

                  {msg.sender === "ai" && (
                    <div className="gita-msg-actions">
                      <button
                        type="button"
                        className="gita-copy-btn"
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        title={txt("ઉત્તર કોપી કરો", "उत्तर कॉपी करें", "Copy answer")}
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check size={12} />
                            <span>{txt("કોપી થયું", "कॉपी हुआ", "Copied")}</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>{txt("કોપી", "कॉपी", "Copy")}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {msg.sender === "user" && (
                    <div className="gita-user-msg-actions">
                      <button
                        type="button"
                        className="gita-user-icon-btn"
                        onClick={() => handleCopyText(msg.id, msg.text)}
                        title={copiedId === msg.id ? txt("કોપી થયું!", "कॉपी हुआ!", "Copied!") : txt("પ્રશ્ન કોપી કરો", "प्रश्न कॉपी करें", "Copy question")}
                        aria-label={txt("પ્રશ્ન કોપી કરો", "प्रश्न कॉपी करें", "Copy question")}
                      >
                        {copiedId === msg.id ? (
                          <Check size={13} strokeWidth={2.5} />
                        ) : (
                          <Copy size={13} strokeWidth={2.2} />
                        )}
                      </button>

                      <button
                        type="button"
                        className="gita-user-icon-btn"
                        onClick={() => handleUndoMessage(index, msg.text)}
                        title={txt("આ પ્રશ્ન સુધી Undo કરો અને સુધારો", "इस प्रश्न तक Undo करें और सुधारें", "Undo to this question and edit")}
                        aria-label={txt("આ પ્રશ્ન સુધી Undo કરો અને સુધારો", "इस प्रश्न तक Undo करें और सुधारें", "Undo to this question and edit")}
                      >
                        <Undo2 size={13} strokeWidth={2.2} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* TYPING INDICATOR */}
            {isLoading && (
              <div className="gita-msg-row ai-row">
                <div className="gita-msg-avatar">
                  <img
                    src="/icons/gita-ai-icon-192.png"
                    alt={txt("ગીતા AI", "गीता AI", "Gita AI")}
                    className="gita-msg-avatar-img"
                  />
                </div>
                <div className="gita-msg-bubble typing-bubble">
                  <div className="gita-typing-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}

            {/* ChatGPT style subtle disclaimer notice at the very end of the chat stream */}
            {hasAiAnswers && !isLoading && (
              <div className="gita-ai-chat-disclaimer">
                <span>
                  {txt("ગીતા AI ભૂલ કરી શકે છે. મહત્વપૂર્ણ માહિતીની ચકાસણી કરી લેવી.", "गीता AI गलती कर सकता है। महत्वपूर्ण जानकारी की पुष्टि कर लें।", "Gita AI may make mistakes. Verify important information.")}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* CHAT INPUT FORM */}
          <footer className="gita-ai-footer">
            {/* QUICK SUGGESTIONS */}
            {!hasUserMessages && !isLoading && (
              <div className="gita-suggestions-bar">
                <div className="gita-suggestions-scroll">
                  {(isEnglish ? SUGGESTIONS_EN : isHindi ? SUGGESTIONS_HI : SUGGESTIONS_GU).map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      className="gita-suggestion-chip"
                      onClick={() => handleSendMessage(sug)}
                    >
                      <MessageSquare size={13} className="gita-suggestion-icon" />
                      <span>{sug}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isListening && (
              <div className="gita-listening-bar">
                <span className="gita-listening-wave" />
                <span>{txt("માઇક ચાલુ છે... બોલો (તમારો અવાજ લખાશે)", "माइक चालू है... बोलिए (आपकी आवाज़ लिखी जाएगी)", "Mic is on... Speak now (your voice will be transcribed)")}</span>
              </div>
            )}

            <div
              className={`gita-input-wrapper ${
                isListening ? "listening-active" : ""
              }`}
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isListening
                    ? txt("સાંભળી રહ્યું છે... બોલો...", "सुन रहा है... बोलिए...", "Listening... Speak now...")
                    : txt("તમારો આધ્યાત્મિક પ્રશ્ન કે સમસ્યા પૂછો...", "अपना आध्यात्मिक प्रश्न या समस्या पूछें...", "Ask your spiritual question or life problem...")
                }
                className="gita-ai-textarea"
                disabled={isLoading}
              />

              {/* VOICE INPUT (MIC) BUTTON */}
              <button
                type="button"
                className={`gita-ai-mic-btn ${
                  isListening ? "active-recording" : ""
                }`}
                onClick={toggleVoiceInput}
                disabled={isLoading}
                title={
                  isListening
                    ? txt("સાંભળવાનું બંધ કરવા ક્લિક કરો", "सुनना बंद करने के लिए क्लिक करें", "Click to stop listening")
                    : txt("વોઇસ દ્વારા બોલીને પૂછો (માઇક)", "वॉइस द्वारा बोलकर पूछें (माइक)", "Ask by speaking (Mic)")
                }
                aria-label={txt("વોઇસ ઇનપુટ", "वॉइस इनपुट", "Voice Input")}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <button
                type="button"
                className="gita-ai-send-btn"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isLoading}
                title={txt("સવાલ મોકલો", "सवाल भेजें", "Send question")}
                aria-label={txt("સવાલ મોકલો", "सवाल भेजें", "Send question")}
              >
                <Send size={16} />
              </button>
            </div>
          </footer>

          {/* Rename Modal for Header 3-Dots Menu */}
          {isHeaderRenameOpen && (
            <div
              className="gita-rename-modal-overlay"
              onClick={() => setIsHeaderRenameOpen(false)}
            >
              <div
                className="gita-rename-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="gita-rename-modal-header">
                  <Pencil size={17} className="gita-rename-modal-icon" />
                  <h4>{txt("સંવાદનું નામ બદલો", "संवाद का नाम बदलें", "Rename Conversation")}</h4>
                </div>
                <form onSubmit={handleHeaderRenameSubmit}>
                  <input
                    type="text"
                    className="gita-rename-modal-input"
                    value={headerRenameTitle}
                    onChange={(e) => setHeaderRenameTitle(e.target.value)}
                    placeholder={txt("સંવાદનું નામ લખો...", "संवाद का नाम लिखें...", "Enter conversation title...")}
                    autoFocus
                    maxLength={60}
                  />
                  <div className="gita-rename-modal-actions">
                    <button
                      type="button"
                      className="gita-rename-btn cancel"
                      onClick={() => setIsHeaderRenameOpen(false)}
                    >
                      {txt("રદ કરો", "रद्द करें", "Cancel")}
                    </button>
                    <button
                      type="submit"
                      className="gita-rename-btn save"
                      disabled={!headerRenameTitle.trim()}
                    >
                      {txt("સાચવો", "सहेजें", "Save")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Floating Toast Notification */}
          {toastMessage && (
            <div className="gita-ai-toast">
              <span>{toastMessage}</span>
            </div>
          )}

        </div>
      </div>
      )}
    </aside>
  );
}

