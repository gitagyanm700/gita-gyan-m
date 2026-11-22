const StoryProject = require("../models/StoryProject");
const cloudinary = require("../config/cloudinary");

/**
 * List all shared story projects (Visible to all Admin dashboards across devices)
 */
exports.listProjects = async (req, res) => {
  try {
    const projects = await StoryProject.find()
      .select("title lang aspectRatio subtitlePos voice sceneCount thumbnailUrl createdByName lastEditedBy updatedAt createdAt")
      .sort({ updatedAt: -1 })
      .lean();

    // Exclude any accidental completely blank projects
    const validProjects = projects.filter(
      (p) =>
        Boolean(p.thumbnailUrl) ||
        (p.title && p.title.trim() && p.title !== "અનામી વાર્તા પ્રોજેક્ટ") ||
        (p.sceneCount && p.sceneCount > 0)
    );

    res.json({
      success: true,
      projects: validProjects.map((p) => ({
        id: p._id.toString(),
        _id: p._id.toString(),
        title: p.title || "અનામી વાર્તા પ્રોજેક્ટ",
        lang: p.lang || "gu",
        aspectRatio: p.aspectRatio || "9:16",
        voice: p.voice || "male",
        sceneCount: p.sceneCount || 0,
        thumbUrl: p.thumbnailUrl || null,
        createdByName: p.createdByName || "Admin",
        lastEditedBy: p.lastEditedBy || "Admin",
        updatedAt: p.updatedAt,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error listing story projects:", error);
    res.status(500).json({
      success: false,
      message: "વાર્તા પ્રોજેક્ટ્સ લાવવામાં ક્ષતિ આવી.",
      error: error.message,
    });
  }
};

/**
 * Get a specific story project by ID
 */
exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await StoryProject.findById(id).lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "પ્રોજેક્ટ મળ્યો નથી.",
      });
    }

    res.json({
      success: true,
      project: {
        id: project._id.toString(),
        _id: project._id.toString(),
        title: project.title,
        lang: project.lang,
        aspectRatio: project.aspectRatio,
        subtitlePos: project.subtitlePos,
        voice: project.voice,
        scenes: project.scenes || [],
        sceneCount: project.scenes?.length || 0,
        thumbnailUrl: project.thumbnailUrl,
        updatedAt: project.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error getting story project:", error);
    res.status(500).json({
      success: false,
      message: "પ્રોજેક્ટ મેળવવામાં ક્ષતિ આવી.",
      error: error.message,
    });
  }
};

/**
 * Create or Update a shared story project
 * Automatically uploads newly added base64 images to Cloudinary (Zero server disk storage!)
 */
exports.saveProject = async (req, res) => {
  try {
    const { id, _id, title, lang, aspectRatio, subtitlePos, voice, scenes } = req.body;
    const projectId = id || _id;

    const adminName = req.user?.name || req.user?.email || "Admin";

    // Process scenes and upload any base64 images to Cloudinary CDN
    const processedScenes = [];
    const scenesArray = Array.isArray(scenes) ? scenes : [];

    for (let i = 0; i < scenesArray.length; i++) {
      const sc = scenesArray[i];
      let imgUrl = sc.imageSrc || null;

      // If user uploaded a new image as base64 data URL, upload to Cloudinary
      if (imgUrl && typeof imgUrl === "string" && imgUrl.startsWith("data:image")) {
        try {
          const uploadRes = await cloudinary.uploader.upload(imgUrl, {
            folder: "bhagavad_gita/story_projects",
            public_id: `story_img_${Date.now()}_${i}`,
            overwrite: true,
            transformation: [{ quality: "auto:good" }, { fetch_format: "auto" }],
          });
          imgUrl = uploadRes.secure_url;
        } catch (uploadErr) {
          console.warn("Cloudinary upload failed for scene image:", uploadErr.message);
          // keep existing URL if upload fails
        }
      }

      processedScenes.push({
        id: sc.id || `sc_${Date.now()}_${i}`,
        sceneTitle: sc.sceneTitle || `સીન ${i + 1}`,
        text: sc.text || "",
        imageSrc: imgUrl,
        audioDuration: Number(sc.audioDuration) || 0,
      });
    }

    // Verify that the project is not completely blank
    const hasContent = processedScenes.some(
      (s) => (s.text && s.text.trim().length > 0) || Boolean(s.imageSrc)
    );
    if (!hasContent) {
      return res.status(400).json({
        success: false,
        message: "ખાલી પ્રોજેક્ટ સાચવી શકાતો નથી. કૃપા કરીને ઓછામાં ઓછો એક સીનમાં લખાણ અથવા ફોટો ઉમેરો.",
      });
    }

    const firstImage = processedScenes.find((s) => s.imageSrc)?.imageSrc || null;

    let projectDoc = null;
    if (projectId && projectId.match(/^[0-9a-fA-F]{24}$/)) {
      projectDoc = await StoryProject.findById(projectId);
    }
    // Fallback: if title matches an existing project, update it instead of creating duplicates
    if (!projectDoc && title && title.trim() && title.trim() !== "અનામી વાર્તા પ્રોજેક્ટ") {
      projectDoc = await StoryProject.findOne({ title: title.trim() });
    }

    if (projectDoc) {
      // Update existing project
      projectDoc.title = (title || "").trim() || "અનામી વાર્તા પ્રોજેક્ટ";
      projectDoc.lang = lang || "gu";
      projectDoc.aspectRatio = aspectRatio || "9:16";
      projectDoc.subtitlePos = subtitlePos || "auto";
      projectDoc.voice = voice || "male";
      projectDoc.scenes = processedScenes;
      projectDoc.sceneCount = processedScenes.length;
      projectDoc.thumbnailUrl = firstImage;
      projectDoc.lastEditedBy = adminName;
      await projectDoc.save();
    } else {
      // Create new shared project
      projectDoc = await StoryProject.create({
        title: (title || "").trim() || "અનામી વાર્તા પ્રોજેક્ટ",
        lang: lang || "gu",
        aspectRatio: aspectRatio || "9:16",
        subtitlePos: subtitlePos || "auto",
        voice: voice || "male",
        scenes: processedScenes,
        sceneCount: processedScenes.length,
        thumbnailUrl: firstImage,
        createdBy: req.user?._id,
        createdByName: adminName,
        lastEditedBy: adminName,
      });
    }

    res.json({
      success: true,
      message: "વાર્તા પ્રોજેક્ટ તમામ એડમિન માટે સફળતાપૂર્વક સાચવવામાં આવ્યો છે!",
      project: {
        id: projectDoc._id.toString(),
        _id: projectDoc._id.toString(),
        title: projectDoc.title,
        lang: projectDoc.lang,
        aspectRatio: projectDoc.aspectRatio,
        subtitlePos: projectDoc.subtitlePos,
        voice: projectDoc.voice,
        scenes: projectDoc.scenes,
        sceneCount: projectDoc.sceneCount,
        thumbnailUrl: projectDoc.thumbnailUrl,
        updatedAt: projectDoc.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error saving story project:", error);
    res.status(500).json({
      success: false,
      message: "વાર્તા પ્રોજેક્ટ સાચવવામાં ક્ષતિ આવી.",
      error: error.message,
    });
  }
};

/**
 * Delete a story project
 */
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await StoryProject.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "પ્રોજેક્ટ મળ્યો નથી.",
      });
    }

    res.json({
      success: true,
      message: "પ્રોજેક્ટ સફળતાપૂર્વક ડિલીટ કરવામાં આવ્યો છે.",
    });
  } catch (error) {
    console.error("Error deleting story project:", error);
    res.status(500).json({
      success: false,
      message: "પ્રોજેક્ટ ડિલીટ કરવામાં ક્ષતિ આવી.",
      error: error.message,
    });
  }
};
