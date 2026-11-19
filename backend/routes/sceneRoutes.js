const express = require("express");
const { getScenes, uploadScenes, deleteScene } = require("../controllers/sceneController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// GET all Cloudinary 9:16 scenes (cached, fast)
router.get("/", getScenes);

// POST upload new scenes (Admin only)
router.post("/upload", protect, adminOnly, uploadScenes);

// DELETE scene by publicId (Admin only)
router.delete("/:publicId", protect, adminOnly, deleteScene);

module.exports = router;
