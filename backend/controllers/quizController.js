const mongoose = require("mongoose");
const QuizQuestion = require("../models/QuizQuestion");
const QuizResult = require("../models/QuizResult");
const QuizUserProgress = require("../models/QuizUserProgress");

const {
  translateQuizToHindi,
  translateQuizToEnglish,
  translateQuizFieldToHindi,
  translateQuizFieldToEnglish,
} = require("../services/translationService");

// =====================================================
// SHUFFLE ARRAY
// Fisher-Yates Shuffle
// =====================================================

const shuffleQuestions = (items) => {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [shuffled[i], shuffled[j]] = [
      shuffled[j],
      shuffled[i],
    ];
  }

  return shuffled;
};

// =====================================================
// SHUFFLE QUESTION OPTIONS (A, B, C, D)
// =====================================================

const shuffleQuestionOptions = (q) => {
  if (!q || !Array.isArray(q.options) || q.options.length < 2) {
    return q;
  }

  const indices = q.options.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const doc = q.toObject ? q.toObject() : { ...q };
  doc.options = indices.map((i) => q.options[i]);

  if (Array.isArray(q.optionsHi) && q.optionsHi.length === q.options.length) {
    doc.optionsHi = indices.map((i) => q.optionsHi[i]);
  }
  if (Array.isArray(q.optionsEn) && q.optionsEn.length === q.options.length) {
    doc.optionsEn = indices.map((i) => q.optionsEn[i]);
  }

  return doc;
};



// =====================================================
// =====================================================
// GET SCOPE KEY HELPER
// =====================================================

const getScopeKey = (category, chapter, shlokaRange) => {
  let cat = String(category || "").trim().toLowerCase();
  let ch = chapter ? String(chapter).trim() : "";
  let range = String(shlokaRange || "all").trim().toLowerCase();

  if (ch && !cat.startsWith("chapter-")) {
    cat = `chapter-${ch}`;
  }

  if (cat.startsWith("chapter-")) {
    return `${cat}:${range || "all"}`;
  }

  if (cat === "mahabharata") {
    return "mahabharata:all";
  }

  return "all:all";
};

// GET QUIZ QUESTIONS
// =====================================================

const getQuizQuestions = async (req, res) => {
  try {
    const {
      category,
      chapter,
      limit,
      shlokaFrom,
      shlokaTo,
      shlokaRange,
    } = req.query;

    // =================================================
    // BASE QUERY
    // =================================================

    const query = {
      isActive: true,
    };

    // =================================================
    // CHAPTER FILTER
    // =================================================

    if (
      chapter &&
      chapter !== "all"
    ) {
      const chapterNumber =
        Number(chapter);

      if (
        Number.isInteger(chapterNumber) &&
        chapterNumber >= 1 &&
        chapterNumber <= 18
      ) {
        query.chapterNumber =
          chapterNumber;
      }
    }

    // =================================================
    // CATEGORY FILTER
    // =================================================

    if (
      category &&
      category !== "all"
    ) {
      if (category === "chapter" && query.chapterNumber) {
        query.$or = [
          { category: `chapter-${query.chapterNumber}` },
          { category: "chapter" },
          { category: "gita" },
        ];
      } else {
        query.category =
          category;
      }
    }

    // =================================================
    // FETCH QUESTIONS
    // =================================================

    // =================================================
    // SHLOKA RANGE FILTER
    // =================================================

    let from = shlokaFrom ? Number(shlokaFrom) : null;
    let to = shlokaTo ? Number(shlokaTo) : null;

    if ((!from || !to) && shlokaRange && shlokaRange !== "all") {
      const parts = String(shlokaRange).split("-").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        from = parts[0];
        to = parts[1];
      } else if (parts.length === 1 && !isNaN(parts[0])) {
        from = parts[0];
        to = parts[0];
      }
    }

    if (from !== null && to !== null) {
      query.shlokaNumber = { $gte: from, $lte: to };
    }

    // =================================================
    // FETCH ALL ELIGIBLE QUESTIONS
    // =================================================

    let eligibleQuestions =
      await QuizQuestion.find(query);

    if (!eligibleQuestions || eligibleQuestions.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        questions: [],
      });
    }

    const questionLimit =
      Number(limit) || 10;

    const needed = Math.min(
      questionLimit,
      eligibleQuestions.length
    );

    let selectedQuestions = [];
    const userId = req.user ? (req.user._id || req.user.id) : null;

    // =================================================
    // NO-REPEAT DECK/CYCLE ALGORITHM PER USER
    // =================================================
    // જ્યાં સુધી યુઝર તમામ પ્રશ્નો એકવાર ન રમી લે
    // ત્યાં સુધી આગળ રમાયેલા પ્રશ્નો રીપીટ નહીં થાય.
    // બધા પ્રશ્નો રમાઈ ગયા પછી જ નવી સાયકલ શરૂ થશે.
    // =================================================

    if (userId) {
      const scopeKey = getScopeKey(category, chapter, shlokaRange);

      let progress = await QuizUserProgress.findOne({
        user: userId,
        scopeKey,
      });

      if (!progress) {
        progress = new QuizUserProgress({
          user: userId,
          scopeKey,
          seenQuestionIds: [],
          cycleCount: 1,
        });
      }

      // Clean seenQuestionIds to remove duplicates and deleted questions
      const validEligibleIdSet = new Set(
        eligibleQuestions.map((q) => String(q._id))
      );
      const cleanSeenIds = [];
      const seenSet = new Set();
      (progress.seenQuestionIds || []).forEach((id) => {
        const strId = String(id);
        if (validEligibleIdSet.has(strId) && !seenSet.has(strId)) {
          seenSet.add(strId);
          cleanSeenIds.push(id);
        }
      });
      progress.seenQuestionIds = cleanSeenIds;

      let unseen = eligibleQuestions.filter(
        (q) => !seenSet.has(String(q._id))
      );
      let alreadySeen = eligibleQuestions.filter(
        (q) => seenSet.has(String(q._id))
      );

      if (unseen.length >= needed) {
        // કેસ 1: બાકી રહેલા પ્રશ્નોમાંથી જરૂરી સંખ્યા મળી રહે છે
        unseen = shuffleQuestions(unseen);
        selectedQuestions = unseen.slice(0, needed);

        selectedQuestions.forEach((q) => {
          progress.seenQuestionIds.push(q._id);
        });

        // જો બધા પ્રશ્નો રમાઈ ગયા હોય તો આગલી વખત માટે સાયકલ રીસેટ કરો
        if (progress.seenQuestionIds.length >= eligibleQuestions.length) {
          progress.seenQuestionIds = [];
          progress.cycleCount = (progress.cycleCount || 1) + 1;
        }
      } else if (unseen.length > 0) {
        // કેસ 2: થોડા અનસીન પ્રશ્નો બાકી છે (પણ જરૂર કરતાં ઓછા)
        unseen = shuffleQuestions(unseen);
        const fromUnseen = unseen;

        // આ સાયકલ પૂર્ણ થઈ!
        progress.cycleCount = (progress.cycleCount || 1) + 1;

        // રીસેટ થયેલ પૂલમાંથી બાકીના પ્રશ્નો લો
        const stillNeeded = needed - fromUnseen.length;
        alreadySeen = shuffleQuestions(alreadySeen);
        const fromResetPool = alreadySeen.slice(0, stillNeeded);

        selectedQuestions = shuffleQuestions([...fromUnseen, ...fromResetPool]);
        progress.seenQuestionIds = fromResetPool.map((q) => q._id);
      } else {
        // કેસ 3: આ પૂલના બધા પ્રશ્નો રમાઈ ગયા છે - સાયકલ રીસેટ
        progress.cycleCount = (progress.cycleCount || 1) + 1;
        const shuffledPool = shuffleQuestions(eligibleQuestions);
        selectedQuestions = shuffledPool.slice(0, needed);
        progress.seenQuestionIds = selectedQuestions.map((q) => q._id);
      }

      progress.lastPlayedAt = new Date();
      await progress.save();
    } else {
      selectedQuestions = shuffleQuestions(eligibleQuestions).slice(0, needed);
    }

    // =================================================
    // SHUFFLE OPTIONS (A, B, C, D) FOR EVERY QUESTION
    // =================================================

    const questions = selectedQuestions.map(shuffleQuestionOptions);

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(200).json({
      success: true,
      count: questions.length,
      questions,
    });

  } catch (error) {
    console.error(
      "❌ Get Quiz Questions Error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Quiz questions load કરવામાં error આવ્યો.",
    });
  }
};

// =====================================================
// GET QUIZ QUESTIONS COUNT
// =====================================================

const getQuizQuestionsCount = async (req, res) => {
  try {
    const {
      category,
      chapter,
      shlokaFrom,
      shlokaTo,
      shlokaRange,
    } = req.query;

    const query = {
      isActive: true,
    };

    if (chapter && chapter !== "all") {
      const chapterNumber = Number(chapter);
      if (
        Number.isInteger(chapterNumber) &&
        chapterNumber >= 1 &&
        chapterNumber <= 18
      ) {
        query.chapterNumber = chapterNumber;
      }
    }

    if (category && category !== "all") {
      if (category.startsWith("chapter-")) {
        query.category = category;
      } else if (category === "chapter" && query.chapterNumber) {
        query.category = {
          $in: [`chapter-${query.chapterNumber}`, "chapter", "gita"],
        };
      } else {
        query.category = category;
      }
    }

    let from = shlokaFrom ? Number(shlokaFrom) : null;
    let to = shlokaTo ? Number(shlokaTo) : null;

    if ((!from || !to) && shlokaRange && shlokaRange !== "all") {
      const parts = String(shlokaRange).split("-").map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        from = parts[0];
        to = parts[1];
      } else if (parts.length === 1 && !isNaN(parts[0])) {
        from = parts[0];
        to = parts[0];
      }
    }

    if (from !== null && to !== null) {
      query.shlokaNumber = { $gte: from, $lte: to };
    }

    const count = await QuizQuestion.countDocuments(query);

    return res.status(200).json({
      success: true,
      count,
      totalQuestions: count,
    });
  } catch (error) {
    console.error("❌ Get Quiz Questions Count Error:", error);
    return res.status(500).json({
      success: false,
      message: "Questions count fetch કરવામાં error આવ્યો.",
      count: 0,
      totalQuestions: 0,
    });
  }
};



// =====================================================
// GET AVAILABLE QUESTIONS SUMMARY (CHAPTERS & SHLOKAS)
// =====================================================

const getQuizQuestionsSummary = async (req, res) => {
  try {
    const questions = await QuizQuestion.find(
      { isActive: true },
      "category chapterNumber shlokaNumber"
    ).lean();

    const chapters = {};
    const shlokas = {};
    let totalAll = 0;
    let mahabharataTotal = 0;

    questions.forEach((q) => {
      totalAll++;
      const cat = String(q.category || "").toLowerCase();
      if (cat === "mahabharata") {
        mahabharataTotal++;
        return;
      }

      let ch = q.chapterNumber;
      if (!ch && cat.startsWith("chapter-")) {
        ch = Number(cat.replace("chapter-", ""));
      }

      if (ch && ch >= 1 && ch <= 18) {
        chapters[ch] = (chapters[ch] || 0) + 1;
        if (!shlokas[ch]) {
          shlokas[ch] = {};
        }

        const sNum = q.shlokaNumber;
        if (sNum && sNum >= 1) {
          shlokas[ch][sNum] = (shlokas[ch][sNum] || 0) + 1;
        } else {
          shlokas[ch]["general"] = (shlokas[ch]["general"] || 0) + 1;
        }
      }
    });

    return res.status(200).json({
      success: true,
      total: totalAll,
      mahabharata: mahabharataTotal,
      chapters,
      shlokas,
    });
  } catch (error) {
    console.error("❌ Get Quiz Questions Summary Error:", error);
    return res.status(500).json({
      success: false,
      message: "Quiz summary fetch કરવામાં error આવ્યો.",
      chapters: {},
      shlokas: {},
    });
  }
};



// =====================================================
// GET SINGLE QUIZ QUESTION
// =====================================================

const getQuizQuestionById = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    const question =
      await QuizQuestion.findOne({
        _id: id,
        isActive: true,
      });

    if (!question) {
      return res.status(404).json({
        success: false,

        message:
          "Quiz question મળ્યો નથી.",
      });
    }

    return res.status(200).json({
      success: true,

      question,
    });

  } catch (error) {
    console.error(
      "❌ Get Quiz Question Error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Quiz question load કરવામાં error આવ્યો.",
    });
  }
};


// =====================================================
// SUBMIT QUIZ
// =====================================================

const submitQuiz = async (
  req,
  res
) => {
  try {
    // =================================================
    // USER
    // =================================================

    const userId =
      req.user._id;

    // =================================================
    // REQUEST DATA
    // =================================================

    const {
      category,
      chapter,
      answers,
      timeTaken,
      shlokaRange,
      completed,
      totalQuestions: reqTotalQuestions,
    } = req.body;

    const isCompleted = typeof completed === "boolean" ? completed : true;

    // =================================================
    // VALIDATE ANSWERS
    // =================================================

    if (
      !Array.isArray(answers)
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Quiz answers યોગ્ય નથી.",
      });
    }

    if (
      answers.length === 0 &&
      isCompleted !== false
    ) {
      return res.status(400).json({
        success: false,

        message:
          "કોઈ answer submit કરવામાં આવ્યો નથી.",
      });
    }

    // =================================================
    // QUESTION IDS (VALIDATED OBJECTIDS)
    // =================================================

    const validAnswers = answers.filter(
      (item) => item && item.questionId && mongoose.Types.ObjectId.isValid(item.questionId)
    );

    const questionIds = validAnswers.map((item) => item.questionId);

    if (
      questionIds.length === 0 &&
      isCompleted !== false
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Valid question IDs મળ્યા નથી.",
      });
    }

    // =================================================
    // GET QUESTIONS FROM DATABASE
    // =================================================

    const questions =
      questionIds.length > 0
        ? await QuizQuestion.find({
            _id: {
              $in: questionIds,
            },
          })
        : [];

    // =================================================
    // SCORE VARIABLES
    // =================================================

    let correctAnswers = 0;

    let wrongAnswers = 0;

    let skippedQuestions = 0;

    // =================================================
    // CHECK EVERY ANSWER
    // =================================================

    const checkedAnswers =
      validAnswers.map(
        (userAnswer) => {

          // -------------------------------------------
          // FIND QUESTION
          // -------------------------------------------

          const question =
            questions.find(
              (item) =>
                String(item._id) ===
                String(
                  userAnswer.questionId
                )
            );

          // -------------------------------------------
          // QUESTION NOT FOUND
          // -------------------------------------------

          if (!question) {
            return {
              questionId:
                userAnswer.questionId,

              selectedAnswer:
                userAnswer.selectedAnswer ||
                "",

              correctAnswer: "",

              isCorrect: false,
            };
          }

          // -------------------------------------------
          // SELECTED ANSWER
          // -------------------------------------------

          const selectedAnswer =
            String(
              userAnswer.selectedAnswer ||
                ""
            ).trim();

          // -------------------------------------------
          // CORRECT ANSWER
          // -------------------------------------------

          const correctAnswer =
            String(
              question.correctAnswer ||
                ""
            ).trim();

          // -------------------------------------------
          // SKIPPED
          // -------------------------------------------

          if (!selectedAnswer) {
            skippedQuestions++;

            return {
              questionId:
                question._id,

              selectedAnswer: "",

              correctAnswer,

              isCorrect: false,
            };
          }

          // -------------------------------------------
          // ANSWER CHECK (GUJARATI & HINDI SUPPORT)
          // -------------------------------------------

          const normSelected = String(selectedAnswer || "").trim().toLowerCase();
          const normCorrectGu = String(correctAnswer || "").trim().toLowerCase();
          const normCorrectHi = String(question.correctAnswerHi || "").trim().toLowerCase();
          const normCorrectEn = String(question.correctAnswerEn || "").trim().toLowerCase();

          let isCorrect = Boolean(
            (normSelected && normCorrectGu && normSelected === normCorrectGu) ||
            (normSelected && normCorrectHi && normSelected === normCorrectHi) ||
            (normSelected && normCorrectEn && normSelected === normCorrectEn)
          );

          // Position-based index check if language strings differ
          if (
            !isCorrect &&
            Array.isArray(question.optionsHi) &&
            question.optionsHi.length === 4 &&
            Array.isArray(question.options) &&
            question.options.length === 4
          ) {
            const selectedIdxHi = question.optionsHi.findIndex(
              (opt) => String(opt || "").trim().toLowerCase() === normSelected
            );
            const correctIdxGu = question.options.findIndex(
              (opt) => String(opt || "").trim().toLowerCase() === normCorrectGu
            );
            if (selectedIdxHi !== -1 && selectedIdxHi === correctIdxGu) {
              isCorrect = true;
            }
          }

          // -------------------------------------------
          // SCORE
          // -------------------------------------------

          if (isCorrect) {
            correctAnswers++;
          } else {
            wrongAnswers++;
          }

          // -------------------------------------------
          // RETURN
          // -------------------------------------------

          return {
            questionId:
              question._id,

            selectedAnswer,

            correctAnswer,

            isCorrect: Boolean(isCorrect),
          };
        }
      );

    // =================================================
    // TOTAL QUESTIONS
    // =================================================

    const totalQuestions = Math.max(
      Number(reqTotalQuestions) || 0,
      answers.length,
      checkedAnswers.length
    );

    // If quiz was incomplete, remaining unanswered questions are counted as skipped
    if (isCompleted === false && totalQuestions > (correctAnswers + wrongAnswers)) {
      skippedQuestions = totalQuestions - (correctAnswers + wrongAnswers);
    }

    // =================================================
    // SCORE
    // =================================================

    const score =
      correctAnswers;

    // =================================================
    // PERCENTAGE
    // =================================================

    const percentage =
      totalQuestions > 0
        ? Math.round(
            (
              correctAnswers /
              totalQuestions
            ) * 100
          )
        : 0;

    // =================================================
    // CHAPTER NUMBER
    // =================================================

    let finalChapterNumber =
      null;

    if (
      chapter &&
      chapter !== "all"
    ) {
      const parsedChapter =
        Number(chapter);

      if (
        Number.isInteger(
          parsedChapter
        ) &&
        parsedChapter >= 1 &&
        parsedChapter <= 18
      ) {
        finalChapterNumber =
          parsedChapter;
      }
    }

    if (
      !finalChapterNumber &&
      typeof category === "string" &&
      category.startsWith("chapter-")
    ) {
      const parsedFromCat =
        Number(
          category.replace("chapter-", "")
        );

      if (
        Number.isInteger(
          parsedFromCat
        ) &&
        parsedFromCat >= 1 &&
        parsedFromCat <= 18
      ) {
        finalChapterNumber =
          parsedFromCat;
      }
    }

    // =================================================
    // FINAL CATEGORY
    // =================================================

    const finalCategory =
      category || "all";

    // =================================================
    // SAVE NEW QUIZ ATTEMPT
    // =================================================

    const result =
      await QuizResult.create({
        user: userId,

        category:
          finalCategory,

        chapterNumber:
          finalChapterNumber,

        totalQuestions,

        correctAnswers,

        wrongAnswers,

        skippedQuestions,

        score,

        percentage,

        shlokaRange:
          shlokaRange ? String(shlokaRange).trim() : "",

        timeTaken:
          Number(timeTaken) || 0,

        answers:
          checkedAnswers,

        completed: isCompleted,
      });

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(201).json({
      success: true,

      message:
        "Quiz successfully submit થયો.",

      result: {
        id: result._id,

        _id: result._id,

        category:
          result.category,

        chapterNumber:
          result.chapterNumber,

        totalQuestions:
          result.totalQuestions,

        correctAnswers:
          result.correctAnswers,

        wrongAnswers:
          result.wrongAnswers,

        skippedQuestions:
          result.skippedQuestions,

        score:
          result.score,

        percentage:
          result.percentage,

        timeTaken:
          result.timeTaken,

        createdAt:
          result.createdAt,
      },
    });

  } catch (error) {
    console.error(
      "❌ Submit Quiz Error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Quiz submit કરવામાં error આવ્યો.",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};


// =====================================================
// GET MY QUIZ RESULTS
// =====================================================

const getMyQuizResults = async (
  req,
  res
) => {
  try {
    const userId =
      req.user._id;

    const results =
      await QuizResult.find({
        user: userId,
      })
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,

      count:
        results.length,

      results,
    });

  } catch (error) {
    console.error(
      "❌ Get Quiz Results Error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Quiz results load કરવામાં error આવ્યો.",
    });
  }
};


// =====================================================
// GET SINGLE RESULT
// =====================================================

const getQuizResultById = async (
  req,
  res
) => {
  try {
    const userId =
      req.user._id;

    const { id } =
      req.params;

    const result =
      await QuizResult.findOne({
        _id: id,
        user: userId,
      });

    if (!result) {
      return res.status(404).json({
        success: false,

        message:
          "Quiz result મળ્યું નથી.",
      });
    }

    return res.status(200).json({
      success: true,

      result,
    });

  } catch (error) {
    console.error(
      "❌ Get Quiz Result Error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Quiz result load કરવામાં error આવ્યો.",
    });
  }
};


// =====================================================
// ADMIN - GET ALL QUESTIONS
// =====================================================

const getAllQuizQuestionsAdmin =
  async (req, res) => {
    try {
      const {
        category,
        chapter,
        shloka,
      } = req.query;

      const query = {};

      // =================================================
      // CATEGORY
      // =================================================

      if (
        category &&
        category !== "all"
      ) {
        query.category =
          category;
      }

      // =================================================
      // CHAPTER
      // =================================================

      if (
        chapter &&
        chapter !== "all"
      ) {
        const chapterNumber =
          Number(chapter);

        if (
          Number.isInteger(
            chapterNumber
          ) &&
          chapterNumber >= 1 &&
          chapterNumber <= 18
        ) {
          query.chapterNumber =
            chapterNumber;
        }
      }

      if (shloka && shloka !== "all") {
        const shlokaNum = Number(shloka);
        if (Number.isInteger(shlokaNum) && shlokaNum >= 1) {
          query.shlokaNumber = shlokaNum;
        }
      }

      // =================================================
      // FETCH
      // =================================================

      const questions =
        await QuizQuestion.find(
          query
        ).sort({
          createdAt: -1,
        });

      return res.status(200).json({
        success: true,

        count:
          questions.length,

        questions,
      });

    } catch (error) {
      console.error(
        "❌ Admin Get Quiz Questions Error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Admin quiz questions load કરવામાં error આવ્યો.",
      });
    }
  };


// =====================================================
// ADMIN - ADD QUESTION
// =====================================================

const addQuizQuestion = async (
  req,
  res
) => {
  try {
    const {
      category,
      chapterNumber,
      shlokaNumber,
      question,
      options,
      correctAnswer,
      explanation,
      questionHi,
      optionsHi,
      correctAnswerHi,
      explanationHi,
      questionEn,
      optionsEn,
      correctAnswerEn,
      explanationEn,
    } = req.body;

    // =================================================
    // CATEGORY
    // =================================================

    if (!category) {
      return res.status(400).json({
        success: false,

        message:
          "Category જરૂરી છે.",
      });
    }

    // =================================================
    // CHAPTER
    // =================================================

    let finalChapterNumber =
      null;

    if (
      chapterNumber !== undefined &&
      chapterNumber !== null &&
      chapterNumber !== "" &&
      chapterNumber !== "all"
    ) {
      const parsedChapter =
        Number(chapterNumber);

      if (
        !Number.isInteger(
          parsedChapter
        ) ||
        parsedChapter < 1 ||
        parsedChapter > 18
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Chapter number 1 થી 18 વચ્ચે હોવો જોઈએ.",
        });
      }

      finalChapterNumber =
        parsedChapter;
    }

    // =================================================
    // AUTO CHAPTER FROM CATEGORY
    // =================================================

    if (
      category.startsWith(
        "chapter-"
      )
    ) {
      const categoryChapter =
        Number(
          category.replace(
            "chapter-",
            ""
          )
        );

      if (
        categoryChapter >= 1 &&
        categoryChapter <= 18
      ) {
        if (
          finalChapterNumber === null
        ) {
          finalChapterNumber =
            categoryChapter;
        } else if (
          finalChapterNumber !==
          categoryChapter
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Category અને Chapter number match હોવા જોઈએ.",
          });
        }
      }
    }

    // =================================================
    // QUESTION
    // =================================================

    if (
      !question ||
      !question.trim()
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Question જરૂરી છે.",
      });
    }

    // =================================================
    // OPTIONS
    // =================================================

    if (
      !Array.isArray(options) ||
      options.length !== 4
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Exactly 4 options જરૂરી છે.",
      });
    }

    const cleanOptions =
      options.map(
        (option) =>
          String(option).trim()
      );

    if (
      cleanOptions.some(
        (option) => !option
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          "ચારેય options ભરવા જરૂરી છે.",
      });
    }

    // =================================================
    // CORRECT ANSWER
    // =================================================

    if (
      !correctAnswer ||
      !String(correctAnswer).trim()
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Correct answer જરૂરી છે.",
      });
    }

    const cleanCorrectAnswer =
      String(
        correctAnswer
      ).trim();

    // =================================================
    // VERIFY CORRECT ANSWER
    // =================================================

    const answerExists =
      cleanOptions.some(
        (option) =>
          option.toLowerCase() ===
          cleanCorrectAnswer.toLowerCase()
      );

    if (!answerExists) {
      return res.status(400).json({
        success: false,

        message:
          "Correct answer options માંથી જ હોવો જોઈએ.",
      });
    }

    // =================================================
    // CREATE
    // =================================================

    const cleanOptionsHi = Array.isArray(optionsHi)
      ? optionsHi.map((opt) => String(opt || "").trim())
      : [];

    const cleanOptionsEn = Array.isArray(optionsEn)
      ? optionsEn.map((opt) => String(opt || "").trim())
      : [];

    const newQuestion =
      await QuizQuestion.create({
        category,

        chapterNumber:
          finalChapterNumber,

        shlokaNumber:
          shlokaNumber && Number(shlokaNumber) >= 1 ? Number(shlokaNumber) : null,

        question:
          question.trim(),

        questionHi:
          questionHi ? String(questionHi).trim() : "",

        questionEn:
          questionEn ? String(questionEn).trim() : "",

        options:
          cleanOptions,

        optionsHi:
          cleanOptionsHi,

        optionsEn:
          cleanOptionsEn,

        correctAnswer:
          cleanCorrectAnswer,

        correctAnswerHi:
          correctAnswerHi ? String(correctAnswerHi).trim() : "",

        correctAnswerEn:
          correctAnswerEn ? String(correctAnswerEn).trim() : "",

        explanation:
          explanation
            ? String(
                explanation
              ).trim()
            : "",

        explanationHi:
          explanationHi
            ? String(
                explanationHi
              ).trim()
            : "",

        explanationEn:
          explanationEn
            ? String(
                explanationEn
              ).trim()
            : "",

        isActive: true,
      });

    // =================================================
    // RESPONSE
    // =================================================

    return res.status(201).json({
      success: true,

      message:
        "Quiz question successfully add થયો. ✅",

      question:
        newQuestion,
    });

  } catch (error) {
    console.error(
      "❌ Admin Add Quiz Question Error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Quiz question add કરવામાં error આવ્યો.",
    });
  }
};


// =====================================================
// ADMIN - UPDATE QUESTION
// =====================================================

const updateQuizQuestion =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const {
        category,
        chapterNumber,
        shlokaNumber,
        question,
        options,
        correctAnswer,
        explanation,
        questionHi,
        optionsHi,
        correctAnswerHi,
        explanationHi,
        questionEn,
        optionsEn,
        correctAnswerEn,
        explanationEn,
      } = req.body;

      // =================================================
      // FIND
      // =================================================

      const existingQuestion =
        await QuizQuestion.findById(
          id
        );

      if (!existingQuestion) {
        return res.status(404).json({
          success: false,

          message:
            "Quiz question મળ્યો નથી.",
        });
      }

      // =================================================
      // CATEGORY
      // =================================================

      if (!category) {
        return res.status(400).json({
          success: false,

          message:
            "Category જરૂરી છે.",
        });
      }

      // =================================================
      // CHAPTER
      // =================================================

      let finalChapterNumber =
        null;

      if (
        chapterNumber !== undefined &&
        chapterNumber !== null &&
        chapterNumber !== "" &&
        chapterNumber !== "all"
      ) {
        const parsedChapter =
          Number(chapterNumber);

        if (
          !Number.isInteger(
            parsedChapter
          ) ||
          parsedChapter < 1 ||
          parsedChapter > 18
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Chapter number 1 થી 18 વચ્ચે હોવો જોઈએ.",
          });
        }

        finalChapterNumber =
          parsedChapter;
      }

      // =================================================
      // AUTO CHAPTER
      // =================================================

      if (
        category.startsWith(
          "chapter-"
        )
      ) {
        const categoryChapter =
          Number(
            category.replace(
              "chapter-",
              ""
            )
          );

        if (
          categoryChapter >= 1 &&
          categoryChapter <= 18
        ) {
          if (
            finalChapterNumber === null
          ) {
            finalChapterNumber =
              categoryChapter;
          } else if (
            finalChapterNumber !==
            categoryChapter
          ) {
            return res.status(400).json({
              success: false,

              message:
                "Category અને Chapter number match હોવા જોઈએ.",
            });
          }
        }
      }

      // =================================================
      // QUESTION
      // =================================================

      if (
        !question ||
        !question.trim()
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Question જરૂરી છે.",
        });
      }

      // =================================================
      // OPTIONS
      // =================================================

      if (
        !Array.isArray(options) ||
        options.length !== 4
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Exactly 4 options જરૂરી છે.",
        });
      }

      const cleanOptions =
        options.map(
          (option) =>
            String(option).trim()
        );

      if (
        cleanOptions.some(
          (option) => !option
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "ચારેય options ભરવા જરૂરી છે.",
        });
      }

      // =================================================
      // CORRECT ANSWER
      // =================================================

      if (
        !correctAnswer ||
        !String(correctAnswer).trim()
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Correct answer જરૂરી છે.",
        });
      }

      const cleanCorrectAnswer =
        String(
          correctAnswer
        ).trim();

      // =================================================
      // VERIFY ANSWER
      // =================================================

      const answerExists =
        cleanOptions.some(
          (option) =>
            option.toLowerCase() ===
            cleanCorrectAnswer.toLowerCase()
        );

      if (!answerExists) {
        return res.status(400).json({
          success: false,

          message:
            "Correct answer options માંથી જ હોવો જોઈએ.",
        });
      }

      // =================================================
      // UPDATE
      // =================================================

      existingQuestion.category =
        category;

      existingQuestion.chapterNumber =
        finalChapterNumber;

      if (shlokaNumber !== undefined) {
        existingQuestion.shlokaNumber =
          shlokaNumber && Number(shlokaNumber) >= 1 ? Number(shlokaNumber) : null;
      }

      existingQuestion.question =
        question.trim();

      existingQuestion.options =
        cleanOptions;

      existingQuestion.correctAnswer =
        cleanCorrectAnswer;

      existingQuestion.explanation =
        explanation
          ? String(
              explanation
            ).trim()
          : "";

      if (questionHi !== undefined) {
        existingQuestion.questionHi = String(questionHi || "").trim();
      }

      if (optionsHi !== undefined && Array.isArray(optionsHi)) {
        existingQuestion.optionsHi = optionsHi.map((opt) => String(opt || "").trim());
      }

      if (correctAnswerHi !== undefined) {
        existingQuestion.correctAnswerHi = String(correctAnswerHi || "").trim();
      }

      if (explanationHi !== undefined) {
        existingQuestion.explanationHi = String(explanationHi || "").trim();
      }

      if (questionEn !== undefined) {
        existingQuestion.questionEn = String(questionEn || "").trim();
      }

      if (optionsEn !== undefined && Array.isArray(optionsEn)) {
        existingQuestion.optionsEn = optionsEn.map((opt) => String(opt || "").trim());
      }

      if (correctAnswerEn !== undefined) {
        existingQuestion.correctAnswerEn = String(correctAnswerEn || "").trim();
      }

      if (explanationEn !== undefined) {
        existingQuestion.explanationEn = String(explanationEn || "").trim();
      }

      await existingQuestion.save();

      // =================================================
      // RESPONSE
      // =================================================

      return res.status(200).json({
        success: true,

        message:
          "Quiz question successfully update થયો. ✅",

        question:
          existingQuestion,
      });

    } catch (error) {
      console.error(
        "❌ Admin Update Quiz Question Error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Quiz question update કરવામાં error આવ્યો.",
      });
    }
  };


// =====================================================
// ADMIN - DELETE QUESTION
// =====================================================

const deleteQuizQuestion =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const question =
        await QuizQuestion.findById(
          id
        );

      if (!question) {
        return res.status(404).json({
          success: false,

          message:
            "Quiz question મળ્યો નથી.",
        });
      }

      await QuizQuestion.findByIdAndDelete(
        id
      );

      return res.status(200).json({
        success: true,

        message:
          "Quiz question successfully delete થયો.",
      });

    } catch (error) {
      console.error(
        "❌ Admin Delete Quiz Question Error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Quiz question delete કરવામાં error આવ્યો.",
      });
    }
  };

// =====================================================
// ADMIN - DELETE MULTIPLE / FILTERED QUESTIONS
// =====================================================

const deleteQuizQuestionsBulk = async (req, res) => {
  try {
    const { ids, filter, chapterNumber, category } = req.body || {};

    let query = {};

    if (Array.isArray(ids) && ids.length > 0) {
      query._id = { $in: ids };
    } else if (filter) {
      if (filter === "all") {
        query = {};
      } else if (filter === "mahabharata") {
        query = { category: "mahabharata" };
      } else if (filter.startsWith("chapter-")) {
        const ch = Number(filter.replace("chapter-", ""));
        query = {
          $or: [
            { chapterNumber: ch },
            { category: `chapter-${ch}` }
          ]
        };
      }
    } else if (chapterNumber) {
      const ch = Number(chapterNumber);
      query = {
        $or: [
          { chapterNumber: ch },
          { category: `chapter-${ch}` }
        ]
      };
    } else if (category) {
      query = { category };
    } else {
      return res.status(400).json({
        success: false,
        message: "Delete કરવા માટે કોઈ question ids અથવા filter મળ્યા નથી."
      });
    }

    const result = await QuizQuestion.deleteMany(query);

    return res.status(200).json({
      success: true,
      message: `${result.deletedCount || 0} questions successfully delete થયા.`,
      deletedCount: result.deletedCount || 0
    });
  } catch (error) {
    console.error("❌ Admin Bulk Delete Quiz Questions Error:", error);
    return res.status(500).json({
      success: false,
      message: "Questions delete કરવામાં error આવ્યો."
    });
  }
};


// =====================================================
// ADMIN - AUTO TRANSLATE QUIZ QUESTION
// =====================================================

const autoTranslateQuizQuestion = async (req, res) => {
  try {
    const {
      question,
      options,
      correctAnswer,
      explanation,
      category,
      chapterNumber,
      targetLang,
      field, // "question" | "options" | "explanation" | "all"
    } = req.body;

    // SINGLE FIELD TRANSLATION
    if (field && field !== "all") {
      if (field === "question" && (!question || !String(question).trim())) {
        return res.status(400).json({
          success: false,
          message: "પહેલાં ગુજરાતી પ્રશ્ન (Question) લખો.",
        });
      }

      if (field === "options") {
        if (!Array.isArray(options) || options.length !== 4 || options.some(o => !String(o || "").trim())) {
          return res.status(400).json({
            success: false,
            message: "પહેલાં ચારેય ગુજરાતી વિકલ્પો (Options 1 થી 4) ભરો.",
          });
        }
      }

      if (field === "explanation" && (!explanation || !String(explanation).trim())) {
        return res.status(400).json({
          success: false,
          message: "પહેલાં ગુજરાતી સમજૂતી (Explanation) લખો.",
        });
      }

      if (targetLang === "en") {
        const translated = await translateQuizFieldToEnglish({
          field,
          question,
          options,
          correctAnswer,
          explanation,
          category,
          chapterNumber,
        });
        return res.status(200).json({ success: true, data: translated, translated });
      }

      const translated = await translateQuizFieldToHindi({
        field,
        question,
        options,
        correctAnswer,
        explanation,
        category,
        chapterNumber,
      });
      return res.status(200).json({ success: true, data: translated, translated });
    }

    if (!question || !String(question).trim()) {
      return res.status(400).json({
        success: false,
        message: "Question જરૂરી છે.",
      });
    }

    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({
        success: false,
        message: "ચાર Options જરૂરી છે.",
      });
    }

    if (targetLang === "en") {
      const translated = await translateQuizToEnglish({
        question: String(question).trim(),
        options: options.map((opt) => String(opt || "").trim()),
        correctAnswer: String(correctAnswer || "").trim(),
        explanation: explanation ? String(explanation).trim() : "",
        category,
        chapterNumber,
      });

      return res.status(200).json({
        success: true,
        data: translated,
        translated,
      });
    }

    if (targetLang === "all" || targetLang === "both") {
      const [hiResult, enResult] = await Promise.all([
        translateQuizToHindi({
          question: String(question).trim(),
          options: options.map((opt) => String(opt || "").trim()),
          correctAnswer: String(correctAnswer || "").trim(),
          explanation: explanation ? String(explanation).trim() : "",
          category,
          chapterNumber,
        }),
        translateQuizToEnglish({
          question: String(question).trim(),
          options: options.map((opt) => String(opt || "").trim()),
          correctAnswer: String(correctAnswer || "").trim(),
          explanation: explanation ? String(explanation).trim() : "",
          category,
          chapterNumber,
        }),
      ]);

      return res.status(200).json({
        success: true,
        data: { ...hiResult, ...enResult },
        translated: { ...hiResult, ...enResult },
      });
    }

    const translated = await translateQuizToHindi({
      question: String(question).trim(),
      options: options.map((opt) => String(opt || "").trim()),
      correctAnswer: String(correctAnswer || "").trim(),
      explanation: explanation ? String(explanation).trim() : "",
      category,
      chapterNumber,
    });

    return res.status(200).json({
      success: true,
      data: translated,
      translated,
    });
  } catch (error) {
    console.error("❌ Auto Translate Quiz Question Error:", error);
    return res.status(500).json({
      success: false,
      message: "Quiz question ઓટો-અનુવાદ કરવામાં error આવ્યો.",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  getQuizQuestions,

  getQuizQuestionsCount,

  getQuizQuestionsSummary,

  getQuizQuestionById,

  submitQuiz,

  getMyQuizResults,

  getQuizResultById,

  // Admin
  getAllQuizQuestionsAdmin,

  addQuizQuestion,

  updateQuizQuestion,

  deleteQuizQuestion,

  deleteQuizQuestionsBulk,

  autoTranslateQuizQuestion,
};