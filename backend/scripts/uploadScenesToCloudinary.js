/**
 * Bulk Upload Script: Uploads 9:16 images to Cloudinary into bhagavad_gita/scenes
 * Usage:
 *   node backend/scripts/uploadScenesToCloudinary.js "C:/path/to/my/500_images"
 * Or put images in "scenes_to_upload/" folder and run:
 *   node backend/scripts/uploadScenesToCloudinary.js
 */

const fs = require("fs");
const path = require("path");
const cloudinary = require("../config/cloudinary");

const targetDir = process.argv[2] || path.join(__dirname, "../../scenes_to_upload");

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
  console.log(`\n📁 created directory: ${targetDir}`);
  console.log(`➡️  Please paste your 9:16 images into "${targetDir}" and rerun this script!\n`);
  process.exit(0);
}

const files = fs.readdirSync(targetDir).filter((f) => {
  const ext = path.extname(f).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
});

if (files.length === 0) {
  console.log(`\n⚠️ No images found in "${targetDir}"`);
  console.log(`➡️  Please paste your 9:16 images (.jpg, .png, .webp) into "${targetDir}" and rerun this script!\n`);
  process.exit(0);
}

console.log(`\n🚀 Found ${files.length} images to upload to Cloudinary (folder: bhagavad_gita/scenes)...`);

async function uploadAll() {
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fullPath = path.join(targetDir, file);
    const baseName = path.basename(file, path.extname(file)).replace(/[^a-zA-Z0-9_-]/g, "_");
    const publicId = `bhagavad_gita/scenes/${baseName}`;

    try {
      const res = await cloudinary.uploader.upload(fullPath, {
        public_id: publicId,
        overwrite: true,
        tags: ["gita_video_scene"],
        transformation: [
          { quality: "auto:good" },
          { fetch_format: "auto" }
        ]
      });
      successCount++;
      console.log(`[${i + 1}/${files.length}] ✅ Uploaded: ${file} -> ${res.secure_url}`);
    } catch (err) {
      failCount++;
      console.error(`[${i + 1}/${files.length}] ❌ Failed: ${file} (${err.message})`);
    }
  }

  console.log(`\n🎉 Done! Successfully uploaded: ${successCount}, Failed: ${failCount}\n`);
}

uploadAll();
