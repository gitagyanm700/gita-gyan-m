/**
 * AUTO GENERATE SCENES & UPLOAD TO CLOUDINARY
 * Generates 9:16 vertical 3D mythological scenes and uploads to bhagavad_gita/scenes
 */

const fs = require("fs");
const path = require("path");
const cloudinary = require("../config/cloudinary");

// 50+ Curated Unique Scene Prompts across all 18 Chapters & Gita Themes
const SCENE_PROMPTS = [
  // Chapter 1 - Armies, Chariots & Sorrow
  "Cinematic 3D render of ancient Kurukshetra battlefield with golden war chariots and rows of warrior banners under stormy dramatic skies, vertical 9:16 portrait, photorealistic 8k, Unreal Engine 5, no text",
  "Epic 3D render of Arjuna kneeling on his golden chariot holding Gandiva bow with bowed head in sorrow, celestial dust, vertical 9:16 portrait, 8k mythological masterpiece",
  "Photorealistic 3D render of warrior blowing magnificent golden Panchajanya conch shell at sunrise on battlefield, vertical 9:16 portrait, divine light, 8k",
  "Ancient royal golden palace hall of Hastinapur with King Dhritarashtra and sage Sanjaya, warm oil lamps, Vedic architecture, vertical 9:16 portrait, 8k",
  "Close-up of golden armor and Gandiva bow slipping from warrior hand onto wooden chariot floor, dust particles, dramatic rim lighting, vertical 9:16, 8k",
  "Four majestic celestial white horses with golden bridles pulling a divine chariot across the battlefield of Kurukshetra, vertical 9:16 portrait, 8k",

  // Chapter 2 & Updesh - Wisdom & Soul
  "Lord Krishna in bright golden pitambar garments, smiling with divine compassion, Gyan Mudra hand gesture, peacock feather crown, vertical 9:16 portrait, celestial aura, 8k",
  "Sacred golden wheel of Dharma and eternal soul radiating divine cosmic energy above tranquil blue ocean, vertical 9:16 portrait, 8k",
  "Serene enlightened yogi meditating in lotus position under ancient banyan tree, golden light emanating from heart, vertical 9:16 portrait, 8k",
  "Spiritual depiction of immortal soul unaffected by weapons, fire, and water, luminous golden consciousness in cosmic space, vertical 9:16 portrait, 8k",

  // Chapter 3 & 4 - Karma Yoga & Divine Incarnation
  "Cosmic Dharmachakra wheel of selfless karma spinning with golden rays of light and lotus petals, vertical 9:16 portrait, 8k",
  "Lord Krishna appearing from divine golden fire to re-establish righteousness (Yada Yada Hi Dharmasya), majestic celestial form, vertical 9:16 portrait, 8k",
  "Venerable ancient Vedic sage in saffron robes teaching sacred Upanishads to young disciple beside glowing sacrificial yajna fire, vertical 9:16 portrait, 8k",

  // Chapter 6 - Dhyana & Meditation
  "Luminous golden Om symbol glowing softly above blossoming pink lotus floating on tranquil pristine lake under starlit night sky, vertical 9:16 portrait, 8k",
  "Spiritual mountain peaks of the Himalayas at dawn with golden sunrise clouds, serene meditation cave with glowing oil lamp, vertical 9:16 portrait, 8k",
  "Deep meditation and mind tranquility, calm reflection of golden lotus flower on serene water ripples, vertical 9:16 portrait, 8k",

  // Chapter 9, 10 & 11 - Divine Glories & Vishwaroop
  "Lord Krishna's cosmic Vishwaroop form with multiple radiant divine faces, crowns of celestial gold, galaxies and stars swirling in aura, vertical 9:16 portrait, 8k",
  "Arjuna with folded hands gazing up in awe at the infinite cosmic form of Krishna in the celestial sky, vertical 9:16 portrait, 8k",
  "Radiant golden Sudarshana Chakra spinning with blazing solar flames against deep space nebula, vertical 9:16 portrait, 8k",
  "Divine cosmic tree of life (Ashvattha) with roots in heavens and branches reaching into creation, golden leaves, vertical 9:16 portrait, 8k",

  // Chapter 12 - Bhakti & Devotion
  "Beautiful glowing altar with brass lamps (diya), fresh marigold garlands, and ancient Sanskrit Bhagavad Gita scripture, vertical 9:16 portrait, 8k",
  "Devotee with folded hands offering sacred lotus flowers before glowing divine feet of Lord Krishna, warm ambient light, vertical 9:16 portrait, 8k",
  "Lord Krishna playing enchanting golden bamboo flute (Bansuri) with peacock feather fluttering in gentle breeze in sacred Vrindavan grove, vertical 9:16 portrait, 8k",

  // Chapter 15 & 18 - Purushottama & Final Victory
  "Arjuna standing tall and confident with raised Gandiva bow, standing beside charioteer Krishna ready for righteous victory, vertical 9:16 portrait, 8k",
  "Divine light of supreme liberation (Moksha) opening through celestial golden gates in the heavens, vertical 9:16 portrait, 8k",
  "Sacred Vedic temple sanctum with ancient stone carvings, golden bells, and glowing sacred oil lamps, vertical 9:16 portrait, 8k",
  "Sacred river Ganges flowing gracefully at Haridwar during evening Ganga Aarti with thousands of floating golden diyas, vertical 9:16 portrait, 8k",
  "Panoramic vertical view of Kurukshetra battle line with royal flags of Pandavas flutter in golden sunset, vertical 9:16 portrait, 8k",
  "Divine Gyan Mudra hand of Lord Krishna blessing the universe with celestial sparkles and golden light rays, vertical 9:16 portrait, 8k",
  "Peacock feather crown of Lord Krishna illuminated by soft morning sunbeam against sky blue background, vertical 9:16 portrait, 8k"
];

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateSingleImage(prompt, index) {
  const encPrompt = encodeURIComponent(prompt);
  // Using Pollinations FLUX with random seed
  const seed = Math.floor(Math.random() * 999999);
  const url = `https://image.pollinations.ai/prompt/${encPrompt}?width=768&height=1376&model=flux&seed=${seed}&nologo=true`;

  console.log(`\n[${index + 1}/${SCENE_PROMPTS.length}] Requesting image generation...`);
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      console.warn(`Provider returned HTTP ${res.status}. Waiting before retry...`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 5000) {
      console.warn("Received non-image response. Provider busy.");
      return null;
    }

    const publicId = `bhagavad_gita/scenes/scene_ai_flux_${Date.now()}_${index + 1}`;
    console.log(`Uploading ${buf.length} bytes to Cloudinary (${publicId})...`);

    return new Promise((resolve) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          overwrite: true,
          tags: ["gita_video_scene"],
          transformation: [{ quality: "auto:good" }, { fetch_format: "auto" }],
        },
        (err, result) => {
          if (err) {
            console.error("Cloudinary upload failed:", err.message);
            resolve(null);
          } else {
            console.log(`✅ Uploaded successfully: ${result.secure_url}`);
            resolve(result.secure_url);
          }
        }
      );
      uploadStream.end(buf);
    });
  } catch (err) {
    console.error("Error in generation/upload:", err.message);
    return null;
  }
}

async function startAutoGeneration() {
  console.log("=================================================");
  console.log("BHAGAVAD GITA — AUTOMATED SCENE GENERATOR");
  console.log(`Total Curated Prompts: ${SCENE_PROMPTS.length}`);
  console.log("=================================================");

  let successCount = 0;

  for (let i = 0; i < SCENE_PROMPTS.length; i++) {
    const prompt = SCENE_PROMPTS[i];
    const uploadedUrl = await generateSingleImage(prompt, i);

    if (uploadedUrl) {
      successCount++;
    }

    // Rate-limit safety: wait 60 seconds between free requests to avoid 429
    console.log("Waiting 60 seconds for next slot to prevent rate limits...");
    await delay(60 * 1000);
  }

  console.log(`\n🎉 Finished batch run! Uploaded ${successCount} new scenes to Cloudinary!`);
}

if (require.main === module) {
  startAutoGeneration();
}

module.exports = { startAutoGeneration, SCENE_PROMPTS };
