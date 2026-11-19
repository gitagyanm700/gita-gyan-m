const cloudinary = require("../config/cloudinary");

// In-memory cache to keep Cloudinary API usage low
let cachedScenes = null;
let lastCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Get all 9:16 Video Scenes from Cloudinary
 */
exports.getScenes = async (req, res) => {
  try {
    const now = Date.now();
    const forceRefresh = req.query.refresh === "true";

    if (!forceRefresh && cachedScenes && now - lastCacheTime < CACHE_TTL) {
      return res.json({
        success: true,
        fromCache: true,
        count: cachedScenes.length,
        scenes: cachedScenes,
      });
    }

    // Fetch resources with tag 'gita_video_scene' or under folder 'bhagavad_gita/scenes'
    const result = await cloudinary.api.resources_by_tag("gita_video_scene", {
      max_results: 500,
      resource_type: "image",
    });

    const scenes = (result.resources || []).map((r) => ({
      public_id: r.public_id,
      url: r.secure_url || r.url,
      width: r.width,
      height: r.height,
      format: r.format,
      created_at: r.created_at,
    }));

    cachedScenes = scenes;
    lastCacheTime = now;

    res.json({
      success: true,
      fromCache: false,
      count: scenes.length,
      scenes,
    });
  } catch (error) {
    console.error("Error fetching Cloudinary scenes:", error.message);
    res.status(500).json({
      success: false,
      message: "ક્લાઉડ સીન્સ ફેચ કરવામાં ભૂલ થઈ",
      error: error.message,
    });
  }
};

/**
 * Upload one or multiple 9:16 scenes to Cloudinary
 */
exports.uploadScenes = async (req, res) => {
  try {
    const { images } = req.body; // array of { dataUrl or url, name }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: "અપલોડ કરવા માટે ઈમેજ ડેટા મળ્યો નથી",
      });
    }

    const uploaded = [];
    const errors = [];

    for (let i = 0; i < images.length; i++) {
      const item = images[i];
      const data = typeof item === "string" ? item : item.dataUrl || item.url;
      const customName = item.name ? item.name.replace(/[^a-zA-Z0-9_-]/g, "_") : `scene_${Date.now()}_${i}`;

      try {
        const uploadRes = await cloudinary.uploader.upload(data, {
          folder: "bhagavad_gita/scenes",
          public_id: customName,
          overwrite: true,
          tags: ["gita_video_scene"],
          transformation: [
            { quality: "auto:good" },
            { fetch_format: "auto" }
          ]
        });

        uploaded.push({
          public_id: uploadRes.public_id,
          url: uploadRes.secure_url,
          width: uploadRes.width,
          height: uploadRes.height,
          format: uploadRes.format,
        });
      } catch (uploadErr) {
        console.error(`Failed to upload image ${i}:`, uploadErr.message);
        errors.push({ index: i, error: uploadErr.message });
      }
    }

    // Invalidate cache
    cachedScenes = null;

    res.json({
      success: true,
      message: `${uploaded.length} ઈમેજો સફળતાપૂર્વક Cloudinary પર અપલોડ થઈ`,
      uploadedCount: uploaded.length,
      errorCount: errors.length,
      uploaded,
      errors,
    });
  } catch (error) {
    console.error("Cloudinary upload controller error:", error);
    res.status(500).json({
      success: false,
      message: "Cloudinary પર ઈમેજ અપલોડ કરવામાં નિષ્ફળતા",
      error: error.message,
    });
  }
};

/**
 * Delete a scene from Cloudinary
 */
exports.deleteScene = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({ success: false, message: "Public ID જરૂરી છે" });
    }

    const fullPublicId = publicId.includes("/") ? publicId : `bhagavad_gita/scenes/${publicId}`;

    const result = await cloudinary.uploader.destroy(fullPublicId);

    // Invalidate cache
    cachedScenes = null;

    res.json({
      success: true,
      message: "સીન સફળતાપૂર્વક ડિલીટ થઈ ગયો",
      result,
    });
  } catch (error) {
    console.error("Delete scene error:", error.message);
    res.status(500).json({
      success: false,
      message: "સીન ડિલીટ કરવામાં ભૂલ થઈ",
      error: error.message,
    });
  }
};
