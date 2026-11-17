const User = require("../models/User");

// Chapter shloka counts in the Bhagavad Gita (Total: 700)
const CHAPTER_LENGTHS = {
  1: 47,
  2: 72,
  3: 43,
  4: 42,
  5: 29,
  6: 47,
  7: 30,
  8: 28,
  9: 34,
  10: 42,
  11: 55,
  12: 20,
  13: 35,
  14: 27,
  15: 20,
  16: 24,
  17: 28,
  18: 78,
};

const TOTAL_SHLOKAS = 700;

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

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function checkAndAwardBadges(readShlokas, currentStreak, existingBadges) {
  const existingSet = new Set(existingBadges.map((b) => b.badgeId));
  const newBadges = [];

  const totalRead = readShlokas.length;

  // Chapter-wise count map
  const chapterCounts = {};
  readShlokas.forEach((s) => {
    chapterCounts[s.chapterNumber] = (chapterCounts[s.chapterNumber] || 0) + 1;
  });

  const award = (id) => {
    if (!existingSet.has(id)) {
      newBadges.push({ badgeId: id, unlockedAt: new Date() });
      existingSet.add(id);
    }
  };

  // 1. First Step (પ્રથમ પગલું)
  if (totalRead >= 1) award("first_step");

  // 2. 3-Day Streak (નિષ્ઠાવાન સાધક)
  if (currentStreak >= 3) award("streak_3");

  // 3. 7-Day Streak (અભ્યાસી યોગી)
  if (currentStreak >= 7) award("streak_7");

  // 4. Chapter 1 Complete (અર્જુન વિષાદ મુક્ત)
  if ((chapterCounts[1] || 0) >= CHAPTER_LENGTHS[1]) award("chapter_1");

  // 5. Chapter 3 Complete (કર્મયોગી)
  if ((chapterCounts[3] || 0) >= CHAPTER_LENGTHS[3]) award("chapter_3");

  // 6. Chapter 4 Complete (જ્ઞાનયોગી)
  if ((chapterCounts[4] || 0) >= CHAPTER_LENGTHS[4]) award("chapter_4");

  // 7. Chapter 12 Complete (ભક્તિયોગી)
  if ((chapterCounts[12] || 0) >= CHAPTER_LENGTHS[12]) award("chapter_12");

  // 8. 100 Shlokas (શતક સાધક)
  if (totalRead >= 100) award("century");

  // 9. 350 Shlokas (ગીતા પારંગત - 50%)
  if (totalRead >= 350) award("halfway");

  // 10. All 700 Shlokas (ગીતા સિદ્ધ - 100%)
  if (totalRead >= TOTAL_SHLOKAS) award("gita_siddha");

  return newBadges;
}

// =====================================================
// GET READING PROGRESS
// =====================================================
const getProgress = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User મળ્યો નથી." });
    }

    const progress = user.readingProgress || {
      readShlokas: [],
      currentStreak: 0,
      longestStreak: 0,
      lastReadDate: null,
      unlockedBadges: [],
    };

    // Calculate chapter-by-chapter breakdown
    const chapterBreakdown = {};
    for (let ch = 1; ch <= 18; ch++) {
      chapterBreakdown[ch] = {
        total: CHAPTER_LENGTHS[ch],
        read: 0,
      };
    }

    (progress.readShlokas || []).forEach((s) => {
      if (chapterBreakdown[s.chapterNumber]) {
        chapterBreakdown[s.chapterNumber].read += 1;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalShlokas: TOTAL_SHLOKAS,
        readCount: (progress.readShlokas || []).length,
        currentStreak: progress.currentStreak || 0,
        longestStreak: progress.longestStreak || 0,
        lastReadDate: progress.lastReadDate,
        chapterBreakdown,
        readShlokas: progress.readShlokas || [],
        unlockedBadges: progress.unlockedBadges || [],
      },
    });
  } catch (error) {
    console.error("Get Reading Progress Error:", error);
    res.status(500).json({
      success: false,
      message: "પ્રગતિ ડેટા લોડ કરવામાં સમસ્યા આવી.",
      error: error.message,
    });
  }
};

// =====================================================
// MARK SHLOKA AS READ
// =====================================================
const markShlokaRead = async (req, res) => {
  try {
    const { chapterNumber, shlokNumber } = req.body;
    const ch = Number(chapterNumber);
    const shl = Number(shlokNumber);

    if (!ch || !shl || ch < 1 || ch > 18 || shl < 1) {
      return res.status(400).json({ success: false, message: "અમાન્ય અધ્યાય અથવા શ્લોક નંબર." });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User મળ્યો નથી." });
    }

    if (!user.readingProgress) {
      user.readingProgress = {
        readShlokas: [],
        currentStreak: 0,
        longestStreak: 0,
        lastReadDate: null,
        unlockedBadges: [],
      };
    }

    const today = getTodayString();
    const yesterday = getYesterdayString();

    // 1. Check if already read
    const isAlreadyRead = user.readingProgress.readShlokas.some(
      (s) => s.chapterNumber === ch && s.shlokNumber === shl
    );

    if (!isAlreadyRead) {
      user.readingProgress.readShlokas.push({
        chapterNumber: ch,
        shlokNumber: shl,
        readAt: new Date(),
      });
    }

    // 2. Update Streak
    let currentStreak = user.readingProgress.currentStreak || 0;
    let longestStreak = user.readingProgress.longestStreak || 0;
    const lastRead = user.readingProgress.lastReadDate;

    if (!lastRead) {
      currentStreak = 1;
    } else if (lastRead === today) {
      // Already read today, maintain streak
    } else if (lastRead === yesterday) {
      currentStreak += 1;
    } else {
      // Missed one or more days, reset to 1
      currentStreak = 1;
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    user.readingProgress.currentStreak = currentStreak;
    user.readingProgress.longestStreak = longestStreak;
    user.readingProgress.lastReadDate = today;

    // 3. Check for new badges
    const newlyUnlocked = checkAndAwardBadges(
      user.readingProgress.readShlokas,
      currentStreak,
      user.readingProgress.unlockedBadges || []
    );

    if (newlyUnlocked.length > 0) {
      user.readingProgress.unlockedBadges.push(...newlyUnlocked);
    }

    // Strictly update continueReading to the first sequential unread shloka across 18 chapters
    const nextSeq = getNextSequentialUnread(user.readingProgress.readShlokas);
    user.continueReading = {
      chapterNumber: nextSeq.chapterNumber,
      shlokNumber: nextSeq.shlokNumber,
      isCompleted: nextSeq.isCompleted,
      updatedAt: new Date(),
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: "શ્લોક વાંચેલ તરીકે માર્ક થયો.",
      readCount: user.readingProgress.readShlokas.length,
      currentStreak,
      longestStreak,
      newlyUnlockedBadges: newlyUnlocked,
    });
  } catch (error) {
    console.error("Mark Shloka Read Error:", error);
    res.status(500).json({
      success: false,
      message: "શ્લોક માર્ક કરવામાં સમસ્યા આવી.",
      error: error.message,
    });
  }
};

// =====================================================
// SYNC LOCAL READING PROGRESS (ON LOGIN)
// =====================================================
const syncProgress = async (req, res) => {
  try {
    const { localShlokas, localStreak, localBadges } = req.body;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User મળ્યો નથી." });
    }

    if (!user.readingProgress) {
      user.readingProgress = {
        readShlokas: [],
        currentStreak: 0,
        longestStreak: 0,
        lastReadDate: null,
        unlockedBadges: [],
      };
    }

    // Merge read shlokas
    const existingKeys = new Set(
      user.readingProgress.readShlokas.map((s) => `${s.chapterNumber}-${s.shlokNumber}`)
    );

    if (Array.isArray(localShlokas)) {
      localShlokas.forEach((s) => {
        const key = `${s.chapterNumber}-${s.shlokNumber}`;
        if (!existingKeys.has(key)) {
          user.readingProgress.readShlokas.push({
            chapterNumber: s.chapterNumber,
            shlokNumber: s.shlokNumber,
            readAt: s.readAt ? new Date(s.readAt) : new Date(),
          });
          existingKeys.add(key);
        }
      });
    }

    // Preserve higher streak
    if (localStreak && localStreak > (user.readingProgress.currentStreak || 0)) {
      user.readingProgress.currentStreak = localStreak;
    }

    // Check & award badges
    const newBadges = checkAndAwardBadges(
      user.readingProgress.readShlokas,
      user.readingProgress.currentStreak || 0,
      user.readingProgress.unlockedBadges || []
    );
    if (newBadges.length > 0) {
      user.readingProgress.unlockedBadges.push(...newBadges);
    }

    // Keep continueReading strictly synchronized to the first sequential unread shloka
    const nextSeq = getNextSequentialUnread(user.readingProgress.readShlokas);
    user.continueReading = {
      chapterNumber: nextSeq.chapterNumber,
      shlokNumber: nextSeq.shlokNumber,
      isCompleted: nextSeq.isCompleted,
      updatedAt: new Date(),
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: "પ્રગતિ સિંક થઈ ગઈ.",
      data: user.readingProgress,
    });
  } catch (error) {
    console.error("Sync Progress Error:", error);
    res.status(500).json({
      success: false,
      message: "સિંક કરવામાં સમસ્યા આવી.",
      error: error.message,
    });
  }
};

module.exports = {
  getProgress,
  markShlokaRead,
  syncProgress,
  CHAPTER_LENGTHS,
};

