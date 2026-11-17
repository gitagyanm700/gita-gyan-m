const express = require("express");
const router = express.Router();
const {
  generateSpeech,
  generateSpeechBatch,
  warmupChapterAudios,
  downloadShlokAudio,
} = require("../controllers/ttsController");
const { protect, requirePermission } = require("../middleware/authMiddleware");

// POST /api/tts/speak
router.post("/speak", generateSpeech);

// POST /api/tts/batch (High-speed batch audio download for offline sync)
router.post("/batch", generateSpeechBatch);

// GET & POST /api/tts/warmup/:chapterNumber
router.get("/warmup/:chapterNumber", warmupChapterAudios);
router.post("/warmup/:chapterNumber", warmupChapterAudios);

// DOWNLOAD SHLOK AUDIO MP3 (Super Admin or download_audio permission)
// GET & POST /api/tts/download/shlok/:chapterNumber/:shlokNumber
router.get(
  "/download/shlok/:chapterNumber/:shlokNumber",
  protect,
  requirePermission("download_audio"),
  downloadShlokAudio
);
router.post(
  "/download/shlok/:chapterNumber/:shlokNumber",
  protect,
  requirePermission("download_audio"),
  downloadShlokAudio
);

module.exports = router;

