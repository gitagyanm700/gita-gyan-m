const express = require("express");
const {
  listProjects,
  getProjectById,
  saveProject,
  deleteProject,
} = require("../controllers/storyProjectController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// All Story Project routes require Admin authentication
router.use(protect);
router.use(adminOnly);

// GET /api/story-projects - List all shared story projects
router.get("/", listProjects);

// GET /api/story-projects/:id - Get a specific story project
router.get("/:id", getProjectById);

// POST /api/story-projects - Create or update a story project
router.post("/", saveProject);

// DELETE /api/story-projects/:id - Delete a story project
router.delete("/:id", deleteProject);

module.exports = router;
