import { getValidToken, handleAuth401 } from "../utils/authHelper.js";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { hasPermission } from "../utils/permissionHelper.js";
import { BookOpen, Activity, Type, Trash2, Save, FileText, RefreshCw, Archive, Mic, Sparkles, Plus, Highlighter, Palette, AlignLeft, AlignCenter, AlignRight, CornerDownLeft, ArrowLeft, List, Undo, Redo, Bold, Italic, Underline } from "lucide-react";
import "./ShlokManagement.css";


/* =====================================================
   RICH TEXT EDITOR
===================================================== */

function RichTextEditor({
  value,
  onChange,
  placeholder,
}) {
  const editorRef = useRef(null);
  const [textColor, setTextColor] =
    useState("#7a5a00");

  useEffect(() => {
    if (!editorRef.current) return;

    if (
      editorRef.current.innerHTML !==
      (value || "")
    ) {
      editorRef.current.innerHTML =
        value || "";
    }
  }, [value]);

  const updateValue = () => {
    if (!editorRef.current) return;

    onChange(
      editorRef.current.innerHTML
    );
  };

  const formatText = (
    command,
    commandValue = null
  ) => {
    if (!editorRef.current) return;

    editorRef.current.focus();

    document.execCommand(
      command,
      false,
      commandValue
    );

    updateValue();
  };

  const addNewLine = () => {
    if (!editorRef.current) return;

    editorRef.current.focus();

    document.execCommand(
      "insertHTML",
      false,
      "<br>"
    );

    updateValue();
  };

  const handleTextColor = (event) => {
    const color =
      event.target.value;

    setTextColor(color);

    formatText(
      "foreColor",
      color
    );
  };

  const highlightText = () => {
    formatText(
      "backColor",
      "#fff176"
    );
  };

  const alignText = (alignment) => {
    if (!editorRef.current) return;

    editorRef.current.focus();

    if (alignment === "left") {
      document.execCommand(
        "justifyLeft"
      );
    }

    if (alignment === "center") {
      document.execCommand(
        "justifyCenter"
      );
    }

    if (alignment === "right") {
      document.execCommand(
        "justifyRight"
      );
    }

    updateValue();
  };

  const handleUndo = () => {
    if (!editorRef.current) return;

    editorRef.current.focus();

    document.execCommand("undo");

    updateValue();
  };

  const handleRedo = () => {
    if (!editorRef.current) return;

    editorRef.current.focus();

    document.execCommand("redo");

    updateValue();
  };

  return (
    <div className="rich-editor">
      <div className="rich-toolbar">

        {/* BOLD / ITALIC / UNDERLINE */}
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-button"
            title="Bold"
            onMouseDown={(event) => {
              event.preventDefault();
              formatText("bold");
            }}
          > <Bold size={16} /> </button>

          <button
            type="button"
            className="toolbar-button"
            title="Italic"
            onMouseDown={(event) => {
              event.preventDefault();
              formatText("italic");
            }}
          > <Italic size={16} /> </button>

          <button
            type="button"
            className="toolbar-button"
            title="Underline"
            onMouseDown={(event) => {
              event.preventDefault();
              formatText("underline");
            }}
          > <Underline size={16} /> </button>
        </div>

        <span className="toolbar-divider" />

        {/* HIGHLIGHT / COLOR */}
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-button highlight-button"
            title="Highlight"
            onMouseDown={(event) => {
              event.preventDefault();
              highlightText();
            }}
          > <Highlighter size={16} /> </button>

          <label
            className="toolbar-color-button"
            title="Text Color"
          > <Palette size={16} /> <input
              type="color"
              value={textColor}
              onChange={
                handleTextColor
              }
            />
          </label>
        </div>

        <span className="toolbar-divider" />

        {/* ALIGNMENT */}
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-button"
            title="Align Left"
            onMouseDown={(event) => {
              event.preventDefault();
              alignText("left");
            }}
          > <AlignLeft size={16} /> </button>

          <button
            type="button"
            className="toolbar-button"
            title="Align Center"
            onMouseDown={(event) => {
              event.preventDefault();
              alignText("center");
            }}
          > <AlignCenter size={16} /> </button>

          <button
            type="button"
            className="toolbar-button"
            title="Align Right"
            onMouseDown={(event) => {
              event.preventDefault();
              alignText("right");
            }}
          > <AlignRight size={16} /> </button>
        </div>

        <span className="toolbar-divider" />

        {/* LIST / NEW LINE */}
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-button"
            title="Bullet List"
            onMouseDown={(event) => {
              event.preventDefault();

              formatText(
                "insertUnorderedList"
              );
            }}
          > <List size={16} /> </button>

          <button
            type="button"
            className="toolbar-button new-line-button"
            title="New Line"
            onMouseDown={(event) => {
              event.preventDefault();
              addNewLine();
            }}
          > <CornerDownLeft size={16} /> </button>
        </div>

        <span className="toolbar-divider" />

        {/* UNDO / REDO */}
        <div className="toolbar-group">
          <button
            type="button"
            className="toolbar-button undo-btn"
            title="Undo"
            onMouseDown={(event) => {
              event.preventDefault();
              handleUndo();
            }}
          > <Undo size={16} /> </button>

          <button
            type="button"
            className="toolbar-button redo-btn"
            title="Redo"
            onMouseDown={(event) => {
              event.preventDefault();
              handleRedo();
            }}
          > <Redo size={16} /> </button>
        </div>
      </div>

      <div
        ref={editorRef}
        className="rich-editor-area"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(event) =>
          onChange(
            event.currentTarget.innerHTML
          )
        }
      />
    </div>
  );
}

/* =====================================================
   HELPER FUNCTIONS
===================================================== */

const htmlToPlainText = (html) => {
  if (!html) return "";

  const temp =
    document.createElement("div");

  temp.innerHTML = html;

  return (
    temp.textContent ||
    temp.innerText ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim();
};


const preserveSanskritSubWords = (origMeaning, translatedMeaning) => {
  if (!origMeaning || !translatedMeaning || typeof origMeaning !== "string" || typeof translatedMeaning !== "string") {
    return translatedMeaning || "";
  }

  if (!origMeaning.includes("=")) {
    return translatedMeaning;
  }

  const origParts = origMeaning.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);
  if (origParts.length === 0 || !origParts.every((p) => p.includes("="))) {
    return translatedMeaning;
  }

  const origLeftSides = origParts.map((p) => p.split("=")[0].trim());

  if (translatedMeaning.includes("=")) {
    const transParts = translatedMeaning.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);

    if (transParts.length === origLeftSides.length && transParts.every((p) => p.includes("="))) {
      const fixedParts = transParts.map((transPart, idx) => {
        const transSplit = transPart.split("=");
        const transRight = transSplit.slice(1).join("=").trim().replace(/[.]+$/, "");
        return `${origLeftSides[idx]} = ${transRight}`;
      });
      return fixedParts.join(", ");
    }

    const regex = /([^=,;]+)\s*=\s*([^=,;]+)/g;
    const matches = [...translatedMeaning.matchAll(regex)];
    if (matches.length === origLeftSides.length) {
      const fixed = matches.map((m, idx) => {
        const transRight = m[2].trim().replace(/[.]+$/, "");
        return `${origLeftSides[idx]} = ${transRight}`;
      });
      return fixed.join(", ");
    }
  }

  return translatedMeaning;
};

const cleanSanskritWord = (word) => {
  return String(word || "")
    .replace(
      /[।॥,;:!?()[\]{}"“”‘’'|]/gu,
      ""
    )
    .trim();
};

const extractSanskritWords = (
  sanskrit
) => {
  const plainText =
    htmlToPlainText(sanskrit);

  if (!plainText) return [];

  return plainText
    .split(/\s+/u)
    .map(cleanSanskritWord)
    .filter(Boolean);
};

const createWordId = () => {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

/* =====================================================
   SHLOK MANAGEMENT
===================================================== */

function ShlokManagement() {
  const navigate = useNavigate();
  const { isHindi, isEnglish, isGujarati, txt } = useLanguage();
  const { user } = useAuth();
  const canAddShloks = hasPermission(user, "add_shloks") || hasPermission(user, "manage_shloks");
  const canEditShloks = hasPermission(user, "edit_shloks") || hasPermission(user, "manage_shloks");
  const canDeleteShloks = hasPermission(user, "delete_shloks");

  /* =====================================================
     STATE
  ===================================================== */

  const [shlokas, setShlokas] =
    useState([]);

  const [
    selectedChapter,
    setSelectedChapter,
  ] = useState("1");

  const [
    expandedShlokId,
    setExpandedShlokId,
  ] = useState(null);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [
    wordDetectionMessage,
    setWordDetectionMessage,
  ] = useState("");

  const [
    wordMeanings,
    setWordMeanings,
  ] = useState([]);

  const previousSanskritRef =
    useRef("");

  const [activeLangTab, setActiveLangTab] =
    useState("gu");

  const [translatingField, setTranslatingField] =
    useState(null);

  const [autoTranslateSuccess, setAutoTranslateSuccess] =
    useState("");

  /* =====================================================
     FORM DATA
  ===================================================== */

  const [formData, setFormData] =
    useState({
      chapterNumber: 1,
      chapterName:
        "અર્જુનવિષાદ યોગ",
      chapterNameHi:
        "अर्जुनविषाद योग",
      chapterNameEn:
        "Arjuna Vishada Yoga",
      shlokNumber: "",
      speaker: "",
      speakerHi: "",
      speakerEn: "",
      sanskrit: "",
      translation: "",
      translationHi: "",
      translationEn: "",
      message: "",
      messageHi: "",
      messageEn: "",
    });

  /* =====================================================
     API URL
  ===================================================== */

  const API_URL =
    "https://bhagavad-gita-backend-jy1a.onrender.com/api/shloks";

  /* =====================================================
     CHAPTER NAMES
  ===================================================== */

  const chapterNames = {
    1: "અર્જુનવિષાદ યોગ",
    2: "સાંખ્ય યોગ",
    3: "કર્મ યોગ",
    4: "જ્ઞાનકર્મસંન્યાસ યોગ",
    5: "કર્મસંન્યાસ યોગ",
    6: "આત્મસંયમ યોગ",
    7: "જ્ઞાનવિજ્ઞાન યોગ",
    8: "અક્ષરબ્રહ્મ યોગ",
    9: "રાજવિદ્યા રાજગુહ્ય યોગ",
    10: "વિભૂતિ યોગ",
    11: "વિશ્વરૂપદર્શન યોગ",
    12: "ભક્તિ યોગ",
    13: "ક્ષેત્રક્ષેત્રજ્ઞ વિભાગ યોગ",
    14: "ગુણત્રયવિભાગ યોગ",
    15: "પુરુષોત્તમ યોગ",
    16: "દૈવાસુરસંપદ્વિભાગ યોગ",
    17: "શ્રદ્ધાત્રયવિભાગ યોગ",
    18: "મોક્ષસંન્યાસ યોગ",
  };

  const chapterNamesHi = {
    1: "अर्जुनविषाद योग",
    2: "सांख्य योग",
    3: "कर्म योग",
    4: "ज्ञानकर्मसंन्यास योग",
    5: "कर्मसंन्यास योग",
    6: "आत्मसंयम योग",
    7: "ज्ञानविज्ञान योग",
    8: "अक्षरब्रह्म योग",
    9: "राजविद्या राजगुह्य योग",
    10: "विभूति योग",
    11: "विश्वरूपदर्शन योग",
    12: "भक्ति योग",
    13: "क्षेत्र-क्षेत्रज्ञ विभाग योग",
    14: "गुणत्रय विभाग योग",
    15: "पुरुषोत्तम योग",
    16: "दैवासुरसम्पद्विभाग योग",
    17: "श्रद्धात्रयविभाग योग",
    18: "मोक्षसंन्यास योग",
  };

  const chapterNamesEn = {
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
    14: "Gunatraya Vibhaga Yoga",
    15: "Purushottama Yoga",
    16: "Daivasura Sampad Vibhaga Yoga",
    17: "Shraddhatraya Vibhaga Yoga",
    18: "Moksha Sanyasa Yoga",
  };

  /* =====================================================
     ADMIN CHECK
  ===================================================== */

  useEffect(() => {
    const token =
      getValidToken();

    const savedUser =
      localStorage.getItem("user");

    if (!token || !savedUser) {
      navigate("/login");
      return;
    }

    try {
      const user =
        JSON.parse(savedUser);

      if (user.role !== "admin") {
        navigate("/");
      }
    } catch (parseError) {
      console.error(
        "User parse error:",
        parseError
      );

      navigate("/login");
    }
  }, [navigate]);

  /* =====================================================
     FETCH SHLOKAS
  ===================================================== */

  const fetchShlokas = async (
    chapterNumber
  ) => {
    try {
      setLoading(true);
      setError("");

      const token =
        getValidToken() ||
        localStorage.getItem("token");

      const response =
        await fetch(
          `${API_URL}/chapter/${chapterNumber}`,
          {
            headers: token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : {},
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          handleAuth401();
          return;
        }
        throw new Error(
          data.message ||
            "Shlokas load થઈ શક્યા નથી."
        );
      }

      const fetchedShlokas =
        Array.isArray(data.shlokas)
          ? data.shlokas
          : [];

      fetchedShlokas.sort(
        (a, b) =>
          Number(a.shlokNumber) -
          Number(b.shlokNumber)
      );

      setShlokas(
        fetchedShlokas
      );
    } catch (err) {
      console.error(
        "Fetch Shlok Error:",
        err
      );

      setError(
        err.message ||
          "Shlokas load કરવામાં error આવ્યો."
      );

      setShlokas([]);
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    fetchShlokas(1);
  }, []);

  /* =====================================================
     NORMAL INPUT CHANGE
  ===================================================== */

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (current) => {
        if (name === "speaker") {
          return {
            ...current,
            speaker: value,
            speakerHi: value,
            speakerEn: value,
          };
        }
        return {
          ...current,
          [name]: value,
        };
      }
    );
  };

  /* =====================================================
     CHAPTER CHANGE
  ===================================================== */

  const handleChapterChange = (
    event
  ) => {
    const chapterNumber =
      Number(event.target.value);

    setSelectedChapter(
      String(chapterNumber)
    );

    setFormData(
      (current) => ({
        ...current,
        chapterNumber,
        chapterName:
          chapterNames[
            chapterNumber
          ],
        chapterNameHi:
          chapterNamesHi[
            chapterNumber
          ] || "",
        chapterNameEn:
          chapterNamesEn[
            chapterNumber
          ] || "",
      })
    );

    setExpandedShlokId(null);
    setEditingId(null);

    setWordMeanings([]);
    setWordDetectionMessage("");
    setAutoTranslateSuccess("");

    previousSanskritRef.current =
      "";

    fetchShlokas(
      chapterNumber
    );
  };

  /* =====================================================
     RESET FORM
  ===================================================== */

  const resetForm = () => {
    const chapterNumber =
      Number(selectedChapter);

    setEditingId(null);

    setFormData({
      chapterNumber,
      chapterName:
        chapterNames[
          chapterNumber
        ],
      chapterNameHi:
        chapterNamesHi[
          chapterNumber
        ] || "",
      chapterNameEn:
        chapterNamesEn[
          chapterNumber
        ] || "",
      shlokNumber: "",
      speaker: "",
      speakerHi: "",
      speakerEn: "",
      sanskrit: "",
      translation: "",
      translationHi: "",
      translationEn: "",
      message: "",
      messageHi: "",
      messageEn: "",
    });

    setWordMeanings([]);
    setWordDetectionMessage("");
    setAutoTranslateSuccess("");

    previousSanskritRef.current =
      "";

    setError("");
    setMessage("");
  };

  /* =====================================================
     AUTOMATIC WORD DETECTION
  ===================================================== */

  useEffect(() => {
    const words =
      extractSanskritWords(
        formData.sanskrit
      );

    if (words.length === 0) {
      setWordMeanings([]);
      setWordDetectionMessage("");

      previousSanskritRef.current =
        formData.sanskrit;

      return;
    }

    if (
      previousSanskritRef.current ===
      formData.sanskrit
    ) {
      return;
    }

    setWordMeanings(
      (currentWords) => {
        // Do not overwrite if user has already entered custom meanings or split words
        const hasCustomizedWords =
          currentWords.some(
            (w) =>
              (w.meaning && w.meaning.trim()) ||
              (w.meaningHi && w.meaningHi.trim()) ||
              (w.meaningEn && w.meaningEn.trim())
          ) ||
          (currentWords.length > 0 && currentWords.length !== words.length);

        if (hasCustomizedWords && previousSanskritRef.current) {
          return currentWords;
        }

        const usedOldIndexes =
          new Set();

        const updatedWords =
          words.map(
            (word, index) => {
              const samePosition =
                currentWords[index];

              if (
                samePosition &&
                cleanSanskritWord(
                  samePosition.word
                ) === word
              ) {
                usedOldIndexes.add(
                  index
                );

                return {
                  id:
                    samePosition.id ||
                    createWordId(),

                  word,

                  meaning:
                    samePosition.meaning ||
                    "",

                  meaningHi:
                    samePosition.meaningHi ||
                    "",

                  meaningEn:
                    samePosition.meaningEn ||
                    "",
                };
              }

              const oldIndex =
                currentWords.findIndex(
                  (
                    oldItem,
                    oldIndex
                  ) =>
                    !usedOldIndexes.has(
                      oldIndex
                    ) &&
                    cleanSanskritWord(
                      oldItem.word
                    ) === word
                );

              if (oldIndex !== -1) {
                usedOldIndexes.add(
                  oldIndex
                );

                return {
                  id:
                    currentWords[
                      oldIndex
                    ].id ||
                    createWordId(),

                  word,

                  meaning:
                    currentWords[
                      oldIndex
                    ].meaning ||
                    "",

                  meaningHi:
                    currentWords[
                      oldIndex
                    ].meaningHi ||
                    "",

                  meaningEn:
                    currentWords[
                      oldIndex
                    ].meaningEn ||
                    "",
                };
              }

              return {
                id: createWordId(),
                word,
                meaning: "",
                meaningHi: "",
                meaningEn: "",
              };
            }
          );

        return updatedWords;
      }
    );

    setWordDetectionMessage(
      `${words.length} Sanskrit શબ્દ automatically detect થયા.`
    );

    previousSanskritRef.current =
      formData.sanskrit;
  }, [formData.sanskrit]);

  /* =====================================================
     UPDATE WORD
  ===================================================== */

  const updateWord = (
    id,
    field,
    value
  ) => {
    setWordMeanings(
      (currentWords) =>
        currentWords.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  [field]: value,
                }
              : item
        )
    );
  };

  /* =====================================================
     DELETE WORD
  ===================================================== */

  const deleteWord = (id) => {
    setWordMeanings(
      (currentWords) =>
        currentWords.filter(
          (item) =>
            item.id !== id
        )
    );
  };

  /* =====================================================
     ADD MANUAL WORD
  ===================================================== */

  const addManualWord = () => {
    setWordMeanings(
      (currentWords) => [
        ...currentWords,
        {
          id: createWordId(),
          word: "",
          meaning: "",
          meaningHi: "",
          meaningEn: "",
        },
      ]
    );

    setWordDetectionMessage(
      "નવો Sanskrit word manually add કર્યો."
    );
  };

  /* =====================================================
     MOVE WORD UP
  ===================================================== */

  const moveWordUp = (index) => {
    if (index <= 0) return;

    setWordMeanings(
      (currentWords) => {
        const updated = [
          ...currentWords,
        ];

        [
          updated[index - 1],
          updated[index],
        ] = [
          updated[index],
          updated[index - 1],
        ];

        return updated;
      }
    );
  };

  /* =====================================================
     MOVE WORD DOWN
  ===================================================== */

  const moveWordDown = (
    index
  ) => {
    setWordMeanings(
      (currentWords) => {
        if (
          index >=
          currentWords.length - 1
        ) {
          return currentWords;
        }

        const updated = [
          ...currentWords,
        ];

        [
          updated[index],
          updated[index + 1],
        ] = [
          updated[index + 1],
          updated[index],
        ];

        return updated;
      }
    );
  };

  /* =====================================================
     VALIDATE WORD MEANINGS
  ===================================================== */

  const validateWordMeanings =
    () => {
      const invalidWord =
        wordMeanings.find(
          (item) =>
            !item.word ||
            !item.word.trim()
        );

      if (invalidWord) {
        return (
          "કોઈ Sanskrit word ખાલી રાખી શકાય નહીં."
        );
      }

      return "";
    };

  /* =====================================================
     AUTO TRANSLATE SINGLE FIELD (WORDS / TRANSLATION / MESSAGE)
  ===================================================== */

  const handleTranslateField = async (targetLang = "hi", field = "translation") => {
    const fieldKey = `${targetLang}-${field}`;
    try {
      setTranslatingField(fieldKey);
      setError("");
      setAutoTranslateSuccess("");

      if (field === "words") {
        const cleanedWords = wordMeanings.filter((w) => w.word && w.word.trim());
        if (cleanedWords.length === 0) {
          throw new Error("શબ્દાર્થ અનુવાદ માટે પહેલાં સંસ્કૃત શ્લોક દાખલ કરો જેથી શબ્દો દેખાય.");
        }
      } else if (field === "translation") {
        const plainTranslation = htmlToPlainText(formData.translation);
        if (!formData.translation?.trim() && !plainTranslation) {
          throw new Error("પહેલાં ગુજરાતી અનુવાદ લખો જેથી તેનું AI દ્વારા અનુવાદ થઈ શકે.");
        }
      } else if (field === "message") {
        const plainMessage = htmlToPlainText(formData.message);
        if (!formData.message?.trim() && !plainMessage) {
          throw new Error("પહેલાં ગુજરાતી સંદેશ લખો જેથી તેનું AI દ્વારા અનુવાદ થઈ શકે.");
        }
      }

      const token = getValidToken();

      const cleanedWords = wordMeanings
        .map((item) => ({
          word: item.word?.trim() || "",
          meaning: item.meaning?.trim() || "",
          meaningHi: item.meaningHi?.trim() || "",
          meaningEn: item.meaningEn?.trim() || "",
        }))
        .filter((item) => item.word);

      const response = await fetch(`${API_URL}/auto-translate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chapterNumber: Number(formData.chapterNumber),
          chapterName: formData.chapterName,
          speaker: formData.speaker,
          sanskrit: formData.sanskrit,
          translation: formData.translation,
          message: formData.message,
          wordMeanings: cleanedWords,
          targetLang: targetLang,
          field: field,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "ઓટો-અનુવાદ થઈ શક્યો નથી.");
      }

      const translated = data?.data || data?.translated;

      if (!translated) {
        throw new Error(data?.message || "અનુવાદ પ્રાપ્ત થઈ શક્યો નથી.");
      }

      if (field === "words" && Array.isArray(translated.wordMeanings)) {
        setWordMeanings((prev) =>
          prev.map((item, idx) => {
            const translatedItem = translated.wordMeanings[idx];

            if (targetLang === "hi") {
              const rawHi =
                translatedItem?.meaningHi !== undefined
                  ? translatedItem.meaningHi
                  : item.meaningHi || "";
              return {
                ...item,
                word: item.word, // Keep user's exact Sanskrit word (including split words) strictly untouched
                meaningHi: preserveSanskritSubWords(item.meaning, rawHi),
              };
            } else {
              const rawEn =
                translatedItem?.meaningEn !== undefined
                  ? translatedItem.meaningEn
                  : item.meaningEn || "";
              return {
                ...item,
                word: item.word, // Keep user's exact Sanskrit word (including split words) strictly untouched
                meaningEn: preserveSanskritSubWords(item.meaning, rawEn),
              };
            }
          })
        );

        setAutoTranslateSuccess(
          targetLang === "hi"
            ? "✨ સંસ્કૃત-હિન્દી શબ્દાર્થ સફળતાપૂર્વક AI દ્વારા અનુવાદિત થયા!"
            : "✨ સંસ્કૃત-અંગ્રેજી શબ્દાર્થ (Word Meanings) સફળતાપૂર્વક AI દ્વારા અનુવાદિત થયા!"
        );
      } else if (field === "translation") {
        if (targetLang === "hi") {
          setFormData((prev) => ({
            ...prev,
            translationHi:
              translated.translationHi || prev.translationHi,
          }));
          setAutoTranslateSuccess("✨ શ્લોકાર્થ (અનુવાદ) સફળતાપૂર્વક હિન્દીમાં AI દ્વારા અનુવાદિત થયો!");
        } else {
          setFormData((prev) => ({
            ...prev,
            translationEn:
              translated.translationEn || prev.translationEn,
          }));
          setAutoTranslateSuccess("✨ શ્લોકાર્થ (અનુવાદ) સફળતાપૂર્વક અંગ્રેજીમાં AI દ્વારા અનુવાદિત થયો!");
        }
      } else if (field === "message") {
        if (targetLang === "hi") {
          setFormData((prev) => ({
            ...prev,
            messageHi:
              translated.messageHi || prev.messageHi,
          }));
          setAutoTranslateSuccess("✨ ગીતા સંદેશ / વ્યાખ્યા સફળતાપૂર્વક હિન્દીમાં AI દ્વારા અનુવાદિત થઈ!");
        } else {
          setFormData((prev) => ({
            ...prev,
            messageEn:
              translated.messageEn || prev.messageEn,
          }));
          setAutoTranslateSuccess("✨ ગીતા સંદેશ / વ્યાખ્યા સફળતાપૂર્વક અંગ્રેજીમાં AI દ્વારા અનુવાદિત થઈ!");
        }
      }
    } catch (err) {
      console.error("Field translate error:", err);
      setError(err.message || "અનુવાદ કરવામાં error આવ્યો.");
    } finally {
      setTranslatingField(null);
    }
  };


  /* =====================================================
     ADD / UPDATE SHLOK
  ===================================================== */

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (editingId && !canEditShloks) {
        alert(
          txt(
            "તમારી પાસે શ્લોક સુધારવાની (Edit) પરમિશન નથી.",
            "आपके पास श्लोक संपादित करने (Edit) की अनुमति नहीं है।",
            "You do not have permission to edit shlokas."
          )
        );
        return;
      }

      if (!editingId && !canAddShloks) {
        alert(
          txt(
            "તમારી પાસે નવો શ્લોક ઉમેરવાની (Add) પરમિશન નથી.",
            "आपके पास नया श्लोक जोड़ने (Add) की अनुमति नहीं है।",
            "You do not have permission to add new shlokas."
          )
        );
        return;
      }

      setSaving(true);
      setError("");
      setMessage("");

      const token =
        localStorage.getItem(
          "token"
        );

      try {
        const plainSanskrit =
          htmlToPlainText(
            formData.sanskrit
          );

        const plainTranslation =
          htmlToPlainText(
            formData.translation
          );

        const plainMessage =
          htmlToPlainText(
            formData.message
          );

        if (
          !formData.chapterNumber ||
          !formData.chapterName.trim() ||
          !formData.shlokNumber ||
          !formData.speaker.trim() ||
          !plainSanskrit ||
          !plainTranslation ||
          !plainMessage
        ) {
          throw new Error(
            "બધી માહિતી ભરવી જરૂરી છે."
          );
        }

        const wordValidation =
          validateWordMeanings();

        if (wordValidation) {
          throw new Error(
            wordValidation
          );
        }

        const cleanedWordMeanings =
          wordMeanings
            .map((item) => ({
              word:
                item.word?.trim() ||
                "",

              meaning:
                item.meaning?.trim() ||
                "",

              meaningHi:
                item.meaningHi?.trim() ||
                "",

              meaningEn:
                item.meaningEn?.trim() ||
                "",
            }))
            .filter(
              (item) =>
                item.word
            );

        const payload = {
          chapterNumber:
            Number(
              formData.chapterNumber
            ),

          chapterName:
            formData.chapterName.trim(),

          chapterNameHi:
            formData.chapterNameHi?.trim() ||
            chapterNamesHi[
              Number(formData.chapterNumber)
            ] ||
            formData.chapterName.trim(),

          chapterNameEn:
            formData.chapterNameEn?.trim() ||
            chapterNamesEn[
              Number(formData.chapterNumber)
            ] ||
            "",

          shlokNumber:
            Number(
              formData.shlokNumber
            ),

          speaker:
            formData.speaker.trim(),

          speakerHi:
            formData.speaker.trim(),

          speakerEn:
            formData.speaker.trim(),

          sanskrit:
            formData.sanskrit,

          wordMeanings:
            cleanedWordMeanings,

          translation:
            formData.translation,

          translationHi:
            formData.translationHi?.trim() ||
            "",

          translationEn:
            formData.translationEn?.trim() ||
            "",

          message:
            formData.message,

          messageHi:
            formData.messageHi?.trim() ||
            "",

          messageEn:
            formData.messageEn?.trim() ||
            "",
        };

        const url =
          editingId
            ? `${API_URL}/${editingId}`
            : API_URL;

        const method =
          editingId
            ? "PUT"
            : "POST";

        const response =
          await fetch(url, {
            method,

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify(
                payload
              ),
          });

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Shlok save થઈ શક્યો નથી."
          );
        }

        setMessage(
          editingId
            ? "Shlok successfully updated. ✅"
            : "Shlok successfully added. ✅"
        );

        setExpandedShlokId(null);
        setEditingId(null);

        setFormData({
          chapterNumber:
            Number(
              selectedChapter
            ),

          chapterName:
            chapterNames[
              Number(
                selectedChapter
              )
            ],

          chapterNameHi:
            chapterNamesHi[
              Number(
                selectedChapter
              )
            ] || "",

          chapterNameEn:
            chapterNamesEn[
              Number(
                selectedChapter
              )
            ] || "",

          shlokNumber: "",
          speaker: "",
          speakerHi: "",
          speakerEn: "",
          sanskrit: "",
          translation: "",
          translationHi: "",
          translationEn: "",
          message: "",
          messageHi: "",
          messageEn: "",
        });

        setWordMeanings([]);
        setWordDetectionMessage("");
        setAutoTranslateSuccess("");

        previousSanskritRef.current =
          "";

        await fetchShlokas(
          Number(selectedChapter)
        );
      } catch (err) {
        console.error(
          "SAVE ERROR:",
          err
        );

        setError(
          err.message ||
            "Shlok save કરવામાં error આવ્યો."
        );
      } finally {
        setSaving(false);
      }
    };

  /* =====================================================
     EDIT SHLOK
  ===================================================== */

  const handleEdit = (
    shlok
  ) => {
    if (!canEditShloks) {
      alert(
        txt(
          "તમારી પાસે શ્લોક સુધારવાની (Edit) પરમિશન નથી.",
          "आपके पास श्लोक संपादित करने (Edit) की अनुमति नहीं है।",
          "You do not have permission to edit shlokas."
        )
      );
      return;
    }

    setEditingId(shlok._id);

    setFormData({
      chapterNumber:
        shlok.chapterNumber,

      chapterName:
        shlok.chapterName ||
        chapterNames[
          shlok.chapterNumber
        ] ||
        "",

      chapterNameHi:
        shlok.chapterNameHi ||
        chapterNamesHi[
          shlok.chapterNumber
        ] ||
        "",

      chapterNameEn:
        shlok.chapterNameEn ||
        chapterNamesEn[
          shlok.chapterNumber
        ] ||
        "",

      shlokNumber:
        shlok.shlokNumber,

      speaker:
        shlok.speaker || "",

      speakerHi:
        shlok.speaker || shlok.speakerHi || "",

      speakerEn:
        shlok.speaker || (shlok.speakerEn && shlok.speakerEn !== "undefined"
          ? shlok.speakerEn
          : ""),

      sanskrit:
        shlok.sanskrit || "",

      translation:
        shlok.translation || "",

      translationHi:
        shlok.translationHi || "",

      translationEn:
        shlok.translationEn || "",

      message:
        shlok.message || "",

      messageHi:
        shlok.messageHi || "",

      messageEn:
        shlok.messageEn || "",
    });

    const existingWords =
      Array.isArray(
        shlok.wordMeanings
      )
        ? shlok.wordMeanings
        : [];

    if (
      existingWords.length > 0
    ) {
      setWordMeanings(
        existingWords.map(
          (item, index) => ({
            id: `${Date.now()}-${index}-${Math.random()}`,

            word:
              item.word || "",

            meaning:
              item.meaning || "",

            meaningHi:
              item.meaningHi || "",

            meaningEn:
              item.meaningEn || "",
          })
        )
      );

      previousSanskritRef.current =
        shlok.sanskrit || "";

      setWordDetectionMessage(
        `${existingWords.length} saved Sanskrit words loaded.`
      );
    } else {
      setWordMeanings([]);

      setWordDetectionMessage("");

      previousSanskritRef.current =
        "";
    }

    setExpandedShlokId(
      shlok._id
    );

    setMessage("");
    setError("");
    setAutoTranslateSuccess("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =====================================================
     DELETE SHLOK
  ===================================================== */

  const handleDelete =
    async (
      id,
      number
    ) => {
      if (!canDeleteShloks) {
        alert(
          txt(
            "તમારી પાસે શ્લોક ડિલીટ કરવાની પરમિશન નથી. મુખ્ય એડમિનનો સંપર્ક કરો.",
            "आपके पास श्लोक डिलीट करने की अनुमति नहीं है। मुख्य एडमिन से संपर्क करें।",
            "You do not have permission to delete shlokas. Contact Super Admin."
          )
        );
        return;
      }

      const confirmed =
        window.confirm(
          `શું તમે Shlok ${number} ને delete કરવા માંગો છો?`
        );

      if (!confirmed) return;

      const token =
        localStorage.getItem(
          "token"
        );

      try {
        setError("");
        setMessage("");

        const response =
          await fetch(
            `${API_URL}/${id}`,
            {
              method: "DELETE",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Shlok delete થઈ શક્યો નથી."
          );
        }

        setMessage(
          "Shlok successfully deleted."
        );

        if (
          expandedShlokId === id
        ) {
          setExpandedShlokId(
            null
          );
        }

        await fetchShlokas(
          Number(
            selectedChapter
          )
        );
      } catch (err) {
        console.error(
          "Delete Shlok Error:",
          err
        );

        setError(
          err.message ||
            "Shlok delete કરવામાં error આવ્યો."
        );
      }
    };

  /* =====================================================
     TOGGLE SHLOK
  ===================================================== */

  const toggleShlok = (id) => {
    setExpandedShlokId(
      (current) =>
        current === id
          ? null
          : id
    );
  };

  /* =====================================================
     RENDER HELPERS & SCROLL-PRESERVING LANGUAGE SWITCH
  ===================================================== */
  const targetScrollInfoRef = useRef(null);

  const handleLangTabSwitch = (newLang, sectionKey, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.currentTarget && typeof e.currentTarget.blur === "function") {
        e.currentTarget.blur();
      }
    }
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }

    if (activeLangTab === newLang) return;

    // Capture position before changing state
    const savedScrollY =
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      0;
    let sectionOffsetFromViewport = null;

    if (sectionKey) {
      const sectionEl = document.getElementById(`section-${sectionKey}`);
      if (sectionEl) {
        sectionOffsetFromViewport = sectionEl.getBoundingClientRect().top;
      }
    }

    targetScrollInfoRef.current = {
      sectionKey,
      sectionOffsetFromViewport,
      savedScrollY,
    };

    setActiveLangTab(newLang);
  };

  useLayoutEffect(() => {
    if (!targetScrollInfoRef.current) return;
    const { sectionKey, sectionOffsetFromViewport, savedScrollY } =
      targetScrollInfoRef.current;

    const restoreScroll = () => {
      if (sectionKey && sectionOffsetFromViewport !== null) {
        const newSectionEl = document.getElementById(`section-${sectionKey}`);
        if (newSectionEl) {
          const currentTop = newSectionEl.getBoundingClientRect().top;
          const delta = currentTop - sectionOffsetFromViewport;
          if (Math.abs(delta) > 0.5) {
            window.scrollBy({ top: delta, behavior: "instant" });
          }
          return;
        }
      }
      if (savedScrollY !== null && savedScrollY !== undefined) {
        window.scrollTo({ top: savedScrollY, behavior: "instant" });
      }
    };

    restoreScroll();
    const rafId = requestAnimationFrame(restoreScroll);
    const t1 = setTimeout(restoreScroll, 25);
    const t2 = setTimeout(restoreScroll, 75);
    const t3 = setTimeout(restoreScroll, 150);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [activeLangTab]);

  const renderLangTabs = (sectionKey = "words") => (
    <div className="section-lang-tabs">
      <button
        type="button"
        className={`section-lang-tab ${activeLangTab === "gu" ? "active" : ""}`}
        onClick={(e) => handleLangTabSwitch("gu", sectionKey, e)}
      >
        ગુજરાતી વિગત
      </button>
      <button
        type="button"
        className={`section-lang-tab ${activeLangTab === "hi" ? "active" : ""}`}
        onClick={(e) => handleLangTabSwitch("hi", sectionKey, e)}
      >
        हिन्दी विवरण (Auto)
      </button>
      <button
        type="button"
        className={`section-lang-tab ${activeLangTab === "en" ? "active" : ""}`}
        onClick={(e) => handleLangTabSwitch("en", sectionKey, e)}
      >
        English Details (Auto)
      </button>
    </div>
  );

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <main className="shlok-management-page">
      <div className="shlok-management-container">

        {/* HEADER */}
        <div className="shlok-management-header">
          <div>
            <h1>
              Shlok Management
            </h1>
          </div>

          <button
            type="button"
            className="back-admin-btn"
            onClick={() =>
              navigate("/admin")
            }
          >
            <ArrowLeft className="btn-icon" size={16} /> Admin Dashboard
          </button>
        </div>

        {/* MESSAGES */}
        {message && (
          <div className="success-message">
            {message}
          </div>
        )}

        {error && (
          <div className="error-message">
            ❌ {error}
          </div>
        )}

        {/* =================================================
            ADD / EDIT FORM
        ================================================= */}

        {!canAddShloks && canEditShloks && !editingId && (
          <div style={{ margin: "20px 0", padding: "16px", borderRadius: "14px", background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", textAlign: "center", fontWeight: "500" }}>
            ℹ️ {txt("શ્લોક સુધારવા માટે નીચેની યાદીમાંથી કોઈપણ શ્લોક પર 'Edit' બટન ક્લિક કરો.", "श्लोक संपादित करने के लिए नीचे दी गई सूची में से किसी भी श्लोक पर 'Edit' बटन क्लिक करें।", "Click 'Edit' on any shloka in the list below to edit it.")}
          </div>
        )}

        {(canAddShloks || (canEditShloks && editingId)) && (
        <section className="shlok-form-section">

          <div className="section-title">
            <div>
              <h2>
                {editingId
                  ? "✏️ Edit Shlok"
                  : "➕ Add New Shlok"}
              </h2>
            </div>
          </div>

          <form
            className="shlok-form"
            onSubmit={handleSubmit}
          >

            {/* CHAPTER + SHLOK NUMBER */}
            <div className="form-row">

              <div className="form-group">
                <label>
                  Chapter
                </label>

                <select
                  name="chapterNumber"
                  value={
                    formData.chapterNumber
                  }
                  onChange={
                    handleChapterChange
                  }
                  required
                >
                  {Array.from(
                    {
                      length: 18,
                    },
                    (_, index) =>
                      index + 1
                  ).map(
                    (number) => (
                      <option
                        key={number}
                        value={number}
                      >
                        Chapter {number}
                        {" — "}
                        {
                          chapterNames[
                            number
                          ]
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>
                  Shlok Number
                </label>

                <input
                  type="number"
                  name="shlokNumber"
                  min="1"
                  value={
                    formData.shlokNumber
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Example: 1"
                  required
                />
              </div>

            </div>

            {/* SANSKRIT SHLOK - Shared across both languages */}
            <div className="form-group">
              <label>
                <Activity className="btn-icon" size={16} /> Sanskrit Shlok (સંસ્કૃત શ્લોક બંને ભાષા માટે સમાન રહેશે)
              </label>

              <RichTextEditor
                value={
                  formData.sanskrit
                }
                onChange={(value) =>
                  setFormData(
                    (current) => ({
                      ...current,
                      sanskrit: value,
                    })
                  )
                }
                placeholder="અહીં સંપૂર્ણ સંસ્કૃત શ્લોક લખો..."
              />
            </div>

            {/* SPEAKER */}
            <div className="form-group">
              <label>
                Speaker (વક્તા - સંસ્કૃત / ગુજરાતી)
              </label>

              <input
                type="text"
                name="speaker"
                value={
                  formData.speaker
                }
                onChange={
                  handleChange
                }
                placeholder="Example: धृतराष्ट्र उवाच"
                required
              />
            </div>

            {/* AUTO TRANSLATE SUCCESS BANNER */}
            {autoTranslateSuccess && (
              <div className="auto-translate-success-banner">
                {autoTranslateSuccess}
              </div>
            )}

            {/* TAB CONTENT: GUJARATI */}
            {activeLangTab === "gu" && (
              <>
                {/* WORD-WISE GUJARATI MEANING */}
                <div className="word-wise-section" id="section-words">
                  <div className="word-wise-section-header">
                    <div className="word-wise-title-area">
                      <div className="word-wise-icon">
                        <Type className="btn-icon" size={16} />
                      </div>

                      <div>
                        <h3>
                          Word-wise Gujarati Meaning
                        </h3>
                      </div>
                    </div>

                    <div className="section-header-actions">
                      {renderLangTabs("words")}
                    </div>
                  </div>

                  {/* WORD LIST */}
                  {wordMeanings.length ===
                  0 ? (
                    <div className="word-empty-box">
                      <div className="word-empty-icon">
                        🔤
                      </div>

                      <h3>
                        Sanskrit words અહીં
                        દેખાશે
                      </h3>
                    </div>
                  ) : (
                    <div className="word-meaning-list">
                      {wordMeanings.map(
                        (
                          item,
                          index
                        ) => (
                          <div
                            className="word-meaning-row"
                            key={
                              item.id
                            }
                          >
                            <div className="word-number">
                              {index + 1}
                            </div>

                            <div className="word-input-group">
                              <label>
                                Sanskrit Word (સંસ્કૃત)
                              </label>

                              <input
                                type="text"
                                value={
                                  item.word
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateWord(
                                    item.id,
                                    "word",
                                    event.target.value
                                  )
                                }
                                placeholder="Sanskrit word"
                                className="sanskrit-word-input"
                              />
                            </div>

                            <div className="word-arrow">
                              →
                            </div>

                            <div className="word-input-group">
                              <label>
                                Gujarati Meaning
                              </label>

                              <input
                                type="text"
                                value={
                                  item.meaning
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateWord(
                                    item.id,
                                    "meaning",
                                    event.target.value
                                  )
                                }
                                placeholder="ગુજરાતી અર્થ લખો..."
                                className="gujarati-word-input"
                              />
                            </div>

                            <div className="word-row-actions">
                              <button
                                type="button"
                                className="word-move-btn"
                                title="Move Up"
                                onClick={() =>
                                  moveWordUp(
                                    index
                                  )
                                }
                                disabled={
                                  index === 0
                                }
                              >
                                ↑
                              </button>

                              <button
                                type="button"
                                className="word-move-btn"
                                title="Move Down"
                                onClick={() =>
                                  moveWordDown(
                                    index
                                  )
                                }
                                disabled={
                                  index ===
                                  wordMeanings.length -
                                    1
                                }
                              >
                                ↓
                              </button>

                              <button
                                type="button"
                                className="word-delete-btn"
                                title="Delete Word"
                                onClick={() =>
                                  deleteWord(
                                    item.id
                                  )
                                }
                              >
                                <Trash2 className="btn-icon" size={16} />
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* ADD ANOTHER WORD */}
                  {wordMeanings.length >
                    0 && (
                    <button
                      type="button"
                      className="add-word-bottom-btn"
                      onClick={
                        addManualWord
                      }
                    >
                      ➕ Add Another Sanskrit Word
                    </button>
                  )}
                </div>

                {/* TRANSLATION */}
                <div className="form-group" id="section-translation">
                  <div className="form-group-header-with-btn">
                    <label style={{ margin: 0 }}>
                      <BookOpen className="btn-icon" size={16} /> Gujarati Translation (ગુજરાતી અનુવાદ)
                    </label>

                    <div className="section-header-actions">
                      {renderLangTabs("translation")}
                    </div>
                  </div>

                  <RichTextEditor
                    value={
                      formData.translation
                    }
                    onChange={(value) =>
                      setFormData(
                        (current) => ({
                          ...current,
                          translation:
                            value,
                        })
                      )
                    }
                    placeholder="શ્લોકનો ગુજરાતી અર્થ..."
                  />
                </div>

                {/* MESSAGE */}
                <div className="form-group" id="section-message">
                  <div className="form-group-header-with-btn">
                    <label style={{ margin: 0 }}>
                      <Sparkles className="btn-icon" size={16} /> Message / Explanation (ગુજરાતી સંદેશ)
                    </label>

                    <div className="section-header-actions">
                      {renderLangTabs("message")}
                    </div>
                  </div>

                  <RichTextEditor
                    value={
                      formData.message
                    }
                    onChange={(value) =>
                      setFormData(
                        (current) => ({
                          ...current,
                          message: value,
                        })
                      )
                    }
                    placeholder="શ્લોકમાંથી મળતો સંદેશ..."
                  />
                </div>
              </>
            )}

            {/* TAB CONTENT: HINDI */}
            {activeLangTab === "hi" && (
              <>
                {/* WORD-WISE HINDI MEANING */}
                <div className="word-wise-section" id="section-words">
                  <div className="word-wise-section-header">
                    <div className="word-wise-title-area">
                      <div className="word-wise-icon">
                        <Type className="btn-icon" size={16} />
                      </div>

                      <div>
                        <h3>
                          Word-wise Hindi Meaning (हिन्दी शब्दार्थ)
                        </h3>
                      </div>
                    </div>

                    <div className="section-header-actions">
                      {renderLangTabs("words")}
                      <button
                        type="button"
                        className="field-ai-translate-btn hi-btn"
                        onClick={() => handleTranslateField("hi", "words")}
                        disabled={translatingField !== null}
                        title="માત્ર શબ્દાર્થને AI દ્વારા હિન્દીમાં અનુવાદ કરો"
                      >
                        <Sparkles className={`btn-icon ${translatingField === "hi-words" ? "spinning" : ""}`} size={15} />
                        {translatingField === "hi-words"
                          ? "શબ્દાર્થ અનુવાદ થઈ રહ્યો છે..."
                          : "✨ શબ્દાર્થ AI અનુવાદ"}
                      </button>
                    </div>
                  </div>

                  {wordMeanings.length === 0 ? (
                    <div className="word-empty-box">
                      <div className="word-empty-icon">
                        🔤
                      </div>

                      <h3>
                        પહેલાં સંસ્કૃત શ્લોક લખો જેથી શબ્દો દેખાય
                      </h3>
                    </div>
                  ) : (
                    <div className="word-meaning-list">
                      {wordMeanings.map(
                        (
                          item,
                          index
                        ) => (
                          <div
                            className="word-meaning-row"
                            key={
                              item.id
                            }
                          >
                            <div className="word-number">
                              {index + 1}
                            </div>

                            <div className="word-input-group">
                              <label>
                                Sanskrit Word (Pure Sanskrit)
                              </label>

                              <input
                                type="text"
                                value={
                                  item.word
                                }
                                readOnly
                                placeholder="Sanskrit word"
                                className="sanskrit-word-input"
                                style={{ backgroundColor: "#fdf8ef" }}
                              />
                            </div>

                            <div className="word-arrow">
                              →
                            </div>

                            <div className="word-input-group">
                              <label>
                                Hindi Meaning (हिन्दी अर्थ)
                              </label>

                              <input
                                type="text"
                                value={
                                  item.meaningHi || ""
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateWord(
                                    item.id,
                                    "meaningHi",
                                    event.target.value
                                  )
                                }
                                placeholder="हिन्दी अर्थ લખો..."
                                className="gujarati-word-input"
                              />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* HINDI TRANSLATION */}
                <div className="form-group" id="section-translation">
                  <div className="form-group-header-with-btn">
                    <label style={{ margin: 0 }}>
                      <BookOpen className="btn-icon" size={16} /> Hindi Translation (हिन्दी अनुवाद)
                    </label>

                    <div className="section-header-actions">
                      {renderLangTabs("translation")}
                      <button
                        type="button"
                        className="field-ai-translate-btn hi-btn"
                        onClick={() => handleTranslateField("hi", "translation")}
                        disabled={translatingField !== null}
                        title="માત્ર શ્લોકના અનુવાદને AI દ્વારા હિન્દીમાં અનુવાદ કરો"
                      >
                        <Sparkles className={`btn-icon ${translatingField === "hi-translation" ? "spinning" : ""}`} size={15} />
                        {translatingField === "hi-translation"
                          ? "અનુવાદ થઈ રહ્યો છે..."
                          : "✨ અનુવાદ AI અનુવાદ"}
                      </button>
                    </div>
                  </div>

                  <RichTextEditor
                    value={
                      formData.translationHi
                    }
                    onChange={(value) =>
                      setFormData(
                        (current) => ({
                          ...current,
                          translationHi:
                            value,
                        })
                      )
                    }
                    placeholder="श्लोक का हिन्दी अर्थ..."
                  />
                </div>

                {/* HINDI MESSAGE */}
                <div className="form-group" id="section-message">
                  <div className="form-group-header-with-btn">
                    <label style={{ margin: 0 }}>
                      <Sparkles className="btn-icon" size={16} /> Hindi Message / Explanation (हिन्दी संदेश)
                    </label>

                    <div className="section-header-actions">
                      {renderLangTabs("message")}
                      <button
                        type="button"
                        className="field-ai-translate-btn hi-btn"
                        onClick={() => handleTranslateField("hi", "message")}
                        disabled={translatingField !== null}
                        title="માત્ર સંદેશ/વ્યાખ્યાને AI દ્વારા હિન્દીમાં અનુવાદ કરો"
                      >
                        <Sparkles className={`btn-icon ${translatingField === "hi-message" ? "spinning" : ""}`} size={15} />
                        {translatingField === "hi-message"
                          ? "સંદેશ અનુવાદ થઈ રહ્યો છે..."
                          : "✨ સંદેશ AI અનુવાદ"}
                      </button>
                    </div>
                  </div>

                  <RichTextEditor
                    value={
                      formData.messageHi
                    }
                    onChange={(value) =>
                      setFormData(
                        (current) => ({
                          ...current,
                          messageHi: value,
                        })
                      )
                    }
                    placeholder="श्लोक से मिलने वाला आध्यात्मिक संदेश..."
                  />
                </div>
              </>
            )}

            {/* TAB CONTENT: ENGLISH */}
            {activeLangTab === "en" && (
              <>
                {/* WORD-WISE ENGLISH MEANING */}
                <div className="word-wise-section" id="section-words">
                  <div className="word-wise-section-header">
                    <div className="word-wise-title-area">
                      <div className="word-wise-icon">
                        <Type className="btn-icon" size={16} />
                      </div>

                      <div>
                        <h3>
                          Word-wise English Meaning (Sanskrit to English)
                        </h3>
                      </div>
                    </div>

                    <div className="section-header-actions">
                      {renderLangTabs("words")}
                      <button
                        type="button"
                        className="field-ai-translate-btn en-btn"
                        onClick={() => handleTranslateField("en", "words")}
                        disabled={translatingField !== null}
                        title="Translate only word meanings to English using AI"
                      >
                        <Sparkles className={`btn-icon ${translatingField === "en-words" ? "spinning" : ""}`} size={15} />
                        {translatingField === "en-words"
                          ? "શબ્દાર્થ અનુવાદ થઈ રહ્યો છે..."
                          : "✨ શબ્દાર્થ AI અનુવાદ"}
                      </button>
                    </div>
                  </div>

                  {wordMeanings.length === 0 ? (
                    <div className="word-empty-box">
                      <div className="word-empty-icon">
                        🔤
                      </div>

                      <h3>
                        પહેલાં સંસ્કૃત શ્લોક લખો જેથી શબ્દો દેખાય
                      </h3>
                    </div>
                  ) : (
                    <div className="word-meaning-list">
                      {wordMeanings.map(
                        (
                          item,
                          index
                        ) => (
                          <div
                            className="word-meaning-row"
                            key={
                              item.id
                            }
                          >
                            <div className="word-number">
                              {index + 1}
                            </div>

                            <div className="word-input-group">
                              <label>
                                Sanskrit Word (Pure Sanskrit)
                              </label>

                              <input
                                type="text"
                                value={
                                  item.word
                                }
                                readOnly
                                placeholder="Sanskrit word"
                                className="sanskrit-word-input"
                                style={{ backgroundColor: "#fdf8ef" }}
                              />
                            </div>

                            <div className="word-arrow">
                              →
                            </div>

                            <div className="word-input-group">
                              <label>
                                English Meaning
                              </label>

                              <input
                                type="text"
                                value={
                                  item.meaningEn || ""
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateWord(
                                    item.id,
                                    "meaningEn",
                                    event.target.value
                                  )
                                }
                                placeholder="Enter English meaning..."
                                className="gujarati-word-input"
                              />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* ENGLISH TRANSLATION */}
                <div className="form-group" id="section-translation">
                  <div className="form-group-header-with-btn">
                    <label style={{ margin: 0 }}>
                      <BookOpen className="btn-icon" size={16} /> English Translation (અંગ્રેજી અનુવાદ)
                    </label>

                    <div className="section-header-actions">
                      {renderLangTabs("translation")}
                      <button
                        type="button"
                        className="field-ai-translate-btn en-btn"
                        onClick={() => handleTranslateField("en", "translation")}
                        disabled={translatingField !== null}
                        title="Translate only verse translation to English using AI"
                      >
                        <Sparkles className={`btn-icon ${translatingField === "en-translation" ? "spinning" : ""}`} size={15} />
                        {translatingField === "en-translation"
                          ? "અનુવાદ થઈ રહ્યો છે..."
                          : "✨ અનુવાદ AI અનુવાદ"}
                      </button>
                    </div>
                  </div>

                  <RichTextEditor
                    value={
                      formData.translationEn
                    }
                    onChange={(value) =>
                      setFormData(
                        (current) => ({
                          ...current,
                          translationEn:
                            value,
                        })
                      )
                    }
                    placeholder="English translation of the sacred verse..."
                  />
                </div>

                {/* ENGLISH MESSAGE */}
                <div className="form-group" id="section-message">
                  <div className="form-group-header-with-btn">
                    <label style={{ margin: 0 }}>
                      <Sparkles className="btn-icon" size={16} /> English Divine Message / Commentary (અંગ્રેજી સંદેશ)
                    </label>

                    <div className="section-header-actions">
                      {renderLangTabs("message")}
                      <button
                        type="button"
                        className="field-ai-translate-btn en-btn"
                        onClick={() => handleTranslateField("en", "message")}
                        disabled={translatingField !== null}
                        title="Translate only spiritual message to English using AI"
                      >
                        <Sparkles className={`btn-icon ${translatingField === "en-message" ? "spinning" : ""}`} size={15} />
                        {translatingField === "en-message"
                          ? "સંદેશ અનુવાદ થઈ રહ્યો છે..."
                          : "✨ સંદેશ AI અનુવાદ"}
                      </button>
                    </div>
                  </div>

                  <RichTextEditor
                    value={
                      formData.messageEn
                    }
                    onChange={(value) =>
                      setFormData(
                        (current) => ({
                          ...current,
                          messageEn: value,
                        })
                      )
                    }
                    placeholder="Spiritual message and practical life commentary in English..."
                  />
                </div>
              </>
            )}

            {/* BUTTONS */}
            <div className="form-actions">

              <button
                type="submit"
                className="save-shlok-btn"
                disabled={saving}
              >
                {saving
                  ? "⏳ Saving..."
                  : editingId
                  ? (<span><Save className="btn-icon" size={16}/> Update Shlok</span>)
                  : (<span><Plus className="btn-icon" size={16}/> Add Shlok</span>)}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="cancel-edit-btn"
                  onClick={
                    resetForm
                  }
                >
                  ✖ Cancel Edit
                </button>
              )}

            </div>

          </form>
        </section>
        )}

        {/* =================================================
            SHLOK LIST
        ================================================= */}

        <section className="shlok-list-section">

          <div className="section-title">

            <div>
              <h2>
                <FileText className="btn-icon" size={16} /> Chapter{" "}
                {selectedChapter}{" "}
                Shlokas
              </h2>

              <p>
                Total:{" "}
                {shlokas.length}{" "}
                Shlokas
              </p>
            </div>

            <button
              type="button"
              className="refresh-btn"
              onClick={() =>
                fetchShlokas(
                  Number(
                    selectedChapter
                  )
                )
              }
            >
              <RefreshCw className="btn-icon" size={16} /> Refresh
            </button>

          </div>

          {loading ? (
            <div className="loading-box">
              ⏳ {txt("શ્લોક લોડ થઈ રહ્યા છે...", "श्लोक लोड हो रहे हैं...", "Loading shlokas...")}
            </div>
          ) : shlokas.length ===
            0 ? (
            <div className="empty-box">
              <Archive className="btn-icon" size={16} /> આ Chapterમાં હજુ કોઈ
              Shlok નથી.
            </div>
          ) : (
            <div className="shlok-number-grid">

              {shlokas.map(
                (shlok) => {
                  const isExpanded =
                    expandedShlokId ===
                    shlok._id;

                  return (
                    <div
                      className={
                        isExpanded
                          ? "shlok-item expanded"
                          : "shlok-item"
                      }
                      key={
                        shlok._id
                      }
                    >

                      {/* NUMBER BOX */}
                      <button
                        type="button"
                        className={
                          isExpanded
                            ? "shlok-number-box active"
                            : "shlok-number-box"
                        }
                        onClick={() =>
                          toggleShlok(
                            shlok._id
                          )
                        }
                        aria-expanded={isExpanded}
                      >
                        <span className="shlok-btn-label">
                          શ્લોક
                        </span>

                        <strong>
                          {
                            shlok.shlokNumber
                          }
                        </strong>

                        <small className="shlok-btn-status">
                          {isExpanded
                            ? "▲ બંધ"
                            : "▼ ખોલો"}
                        </small>
                      </button>

                      {/* DETAILS */}
                      {isExpanded && (
                        <div className="shlok-detail-panel">

                          {/* HEADER */}
                          <div className="shlok-detail-header">

                            <div>
                              <span className="detail-label">
                                અધ્યાય{" "}
                                {
                                  shlok.chapterNumber
                                }
                              </span>

                              <h3>
                                Shlok{" "}
                                {
                                  shlok.shlokNumber
                                }
                              </h3>

                              <p>
                                <Mic className="btn-icon" size={16} />{" "}
                                {
                                  shlok.speaker
                                }
                              </p>
                            </div>

                            <div className="shlok-actions">

                              {canEditShloks && (
                                <button
                                  type="button"
                                  className="edit-shlok-btn"
                                  onClick={() =>
                                    handleEdit(
                                      shlok
                                    )
                                  }
                                >
                                  ✏️ Edit
                                </button>
                              )}

                              {canDeleteShloks && (
                                <button
                                  type="button"
                                  className="delete-shlok-btn"
                                  onClick={() =>
                                    handleDelete(
                                      shlok._id,
                                      shlok.shlokNumber
                                    )
                                  }
                                >
                                  <Trash2 className="btn-icon" size={16} /> Delete
                                </button>
                              )}

                            </div>

                          </div>

                          {/* SANSKRIT */}
                          <div className="detail-content sanskrit-detail">

                            <h4>
                              <Activity className="btn-icon" size={16} /> સંસ્કૃત શ્લોક
                            </h4>

                            <div
                              className="admin-sanskrit-text"
                              dangerouslySetInnerHTML={{
                                __html:
                                  shlok.sanskrit ||
                                  "<span>સંસ્કૃત શ્લોક ઉપલબ્ધ નથી.</span>",
                              }}
                            />

                          </div>

                          {/* WORD MEANINGS */}
                          <div className="detail-content word-meanings-detail">

                            <h4>
                              <Type className="btn-icon" size={16} /> Word-wise Gujarati Meaning
                            </h4>

                            {Array.isArray(
                              shlok.wordMeanings
                            ) &&
                            shlok
                              .wordMeanings
                              .length >
                              0 ? (
                              <div className="saved-word-meaning-list">

                                {shlok.wordMeanings.map(
                                  (
                                    item,
                                    index
                                  ) => (
                                    <div
                                      className="saved-word-meaning-row"
                                      key={`${shlok._id}-word-${index}`}
                                    >

                                      <span className="saved-word-number">
                                        {
                                          index +
                                          1
                                        }
                                      </span>

                                      <span className="saved-sanskrit-word">
                                        {
                                          item.word
                                        }
                                      </span>

                                      <span className="saved-word-arrow">
                                        →
                                      </span>

                                      <span className="saved-gujarati-meaning">
                                        {
                                          item.meaning ||
                                          "અર્થ ઉમેરવામાં આવ્યો નથી"
                                        }
                                      </span>

                                    </div>
                                  )
                                )}

                              </div>
                            ) : (
                              <p>
                                Word-wise meaning
                                ઉપલબ્ધ નથી.
                              </p>
                            )}

                          </div>

                          {/* TRANSLATION */}
                          <div className="detail-content translation-detail">

                            <h4>
                              <BookOpen className="btn-icon" size={16} /> ગુજરાતી અર્થ
                            </h4>

                            <div
                              className="admin-translation-text"
                              dangerouslySetInnerHTML={{
                                __html:
                                  shlok.translation ||
                                  "<span>ગુજરાતી અર્થ ઉપલબ્ધ નથી.</span>",
                              }}
                            />

                          </div>

                          {/* MESSAGE */}
                          <div className="detail-content message-detail">

                            <h4>
                              <Sparkles className="btn-icon" size={16} /> સંદેશ
                            </h4>

                            <div
                              className="admin-message-text"
                              dangerouslySetInnerHTML={{
                                __html:
                                  shlok.message ||
                                  "<span>સંદેશ ઉપલબ્ધ નથી.</span>",
                              }}
                            />

                          </div>

                          {/* HINDI TRANSLATION PREVIEW */}
                          {shlok.translationHi && (
                            <div className="detail-content translation-detail" style={{ borderLeft: "3px solid #f59e0b" }}>
                              <h4>
                                <BookOpen className="btn-icon" size={16} /> हिन्दी अनुवाद (Hindi Translation)
                              </h4>

                              <div
                                className="admin-translation-text"
                                dangerouslySetInnerHTML={{
                                  __html: shlok.translationHi,
                                }}
                              />
                            </div>
                          )}

                          {/* HINDI MESSAGE PREVIEW */}
                          {shlok.messageHi && (
                            <div className="detail-content message-detail" style={{ borderLeft: "3px solid #f59e0b" }}>
                              <h4>
                                <Sparkles className="btn-icon" size={16} /> हिन्दी संदेश (Hindi Message)
                              </h4>

                              <div
                                className="admin-message-text"
                                dangerouslySetInnerHTML={{
                                  __html: shlok.messageHi,
                                }}
                              />
                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  );
                }
              )}

            </div>
          )}

        </section>

      </div>
    </main>
  );
}

export default ShlokManagement;