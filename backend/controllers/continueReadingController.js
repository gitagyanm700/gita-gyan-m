const User = require("../models/User");

const CHAPTER_LENGTHS = {
  1: 47, 2: 72, 3: 43, 4: 42, 5: 29, 6: 47, 7: 30, 8: 28, 9: 34,
  10: 42, 11: 55, 12: 20, 13: 35, 14: 27, 15: 20, 16: 24, 17: 28, 18: 78,
};

function getNextSequentialUnread(readShlokas = []) {
  const readSet = new Set(
    (readShlokas || []).map((s) => `${Number(s.chapterNumber)}-${Number(s.shlokNumber)}`)
  );

  for (let ch = 1; ch <= 18; ch++) {
    const total = CHAPTER_LENGTHS[ch] || 47;
    for (let s = 1; s <= total; s++) {
      if (!readSet.has(`${ch}-${s}`)) {
        return {
          chapterNumber: ch,
          shlokNumber: s,
          isCompleted: false,
        };
      }
    }
  }

  return {
    chapterNumber: 1,
    shlokNumber: 1,
    isCompleted: true,
  };
}

// =====================================================
// GET CONTINUE READING
// =====================================================

const getContinueReading = async (req, res) => {
  try {
    // Find Logged-in User
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User મળ્યો નથી.",
      });
    }

    // Always compute strictly sequential next unread shloka across 18 chapters
    const readShlokas = user.readingProgress?.readShlokas || [];
    const nextSequential = getNextSequentialUnread(readShlokas);

    // Keep user record strictly synchronized with sequential unread
    user.continueReading = {
      chapterNumber: nextSequential.chapterNumber,
      shlokNumber: nextSequential.shlokNumber,
      isCompleted: nextSequential.isCompleted,
      updatedAt: new Date(),
    };
    await user.save();

    // Return Continue Reading
    res.status(200).json({
      success: true,
      continueReading: {
        chapterNumber: nextSequential.chapterNumber,
        shlokNumber: nextSequential.shlokNumber,
        isCompleted: nextSequential.isCompleted,
        updatedAt: user.continueReading?.updatedAt || new Date(),
      },
    });
  } catch (error) {
    console.error(
      "Get Continue Reading Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Continue Reading load કરવામાં error આવ્યો.",
      error: error.message,
    });
  }
};

// =====================================================
// SAVE / UPDATE CONTINUE READING
// =====================================================

const saveContinueReading = async (req, res) => {
  try {
    const {
      chapterNumber,
      shlokNumber,
    } = req.body;

    // =================================================
    // VALIDATION
    // =================================================

    if (
      !chapterNumber ||
      !shlokNumber
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Chapter number અને Shlok number જરૂરી છે.",
      });
    }

    // =================================================
    // VALIDATE CHAPTER
    // =================================================

    const chapter = Number(
      chapterNumber
    );

    const shlok = Number(
      shlokNumber
    );

    if (
      !Number.isInteger(chapter) ||
      chapter < 1 ||
      chapter > 18
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid chapter number.",
      });
    }

    if (
      !Number.isInteger(shlok) ||
      shlok < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid shlok number.",
      });
    }

    // =================================================
    // FIND LOGGED-IN USER
    // =================================================

    const user = await User.findById(
      req.userId
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User મળ્યો નથી.",
      });
    }

    // =================================================
    // SAVE CONTINUE READING
    // Strictly computed from read progress so skipped shlokas never corrupt it
    // =================================================

    const readShlokas = user.readingProgress?.readShlokas || [];
    const nextSequential = getNextSequentialUnread(readShlokas);

    user.continueReading = {
      chapterNumber: nextSequential.chapterNumber,
      shlokNumber: nextSequential.shlokNumber,
      isCompleted: nextSequential.isCompleted,
      updatedAt: new Date(),
    };

    await user.save();

    // =================================================
    // RESPONSE
    // =================================================

    res.status(200).json({
      success: true,
      message:
        "Continue Reading save થયું. 📖",
      continueReading:
        user.continueReading,
    });
  } catch (error) {
    console.error(
      "Save Continue Reading Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Continue Reading save કરવામાં error આવ્યો.",
      error: error.message,
    });
  }
};

// =====================================================
// EXPORT CONTROLLERS
// =====================================================

module.exports = {
  getContinueReading,
  saveContinueReading,
};