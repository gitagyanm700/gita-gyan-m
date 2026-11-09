const express = require("express");
const router = express.Router();
const {
  generateSpeech,
  warmupChapterAudios,
  downloadShlokAudio,
} = require("../controllers/ttsController");
const { protect, strictSuperAdminOnly } = require("../middleware/authMiddleware");

// POST /api/tts/speak
router.post("/speak", generateSpeech);

// GET & POST /api/tts/warmup/:chapterNumber
router.get("/warmup/:chapterNumber", warmupChapterAudios);
router.post("/warmup/:chapterNumber", warmupChapterAudios);

// SUPER ADMIN EXCLUSIVE: Download Shlok Audio MP3
// GET & POST /api/tts/download/shlok/:chapterNumber/:shlokNumber
router.get("/download/shlok/:chapterNumber/:shlokNumber", protect, strictSuperAdminOnly, downloadShlokAudio);
router.post("/download/shlok/:chapterNumber/:shlokNumber", protect, strictSuperAdminOnly, downloadShlokAudio);

module.exports = router;

