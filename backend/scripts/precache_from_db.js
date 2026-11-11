require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
const Shlok = require("../models/Shlok");
const { VOICE_MAP, buildShlokTtsTasks } = require("../utils/ttsTextUtils");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://aambaliyamanav_db_user:Kishna2007@cluster0.atg2ikc.mongodb.net/bhagavad_gita?appName=Cluster0";

const CACHE_DIR = path.join(__dirname, "../audio_cache");
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

async function synthesizeToFile(cleanText, lang, customRate, filePath) {
  if (fs.existsSync(filePath)) {
    return true; // Already cached
  }
  const voiceLang = VOICE_MAP[lang] ? lang : "gu";
  const selectedVoice = VOICE_MAP[voiceLang].male;
  const prosodyOptions = {
    rate: customRate !== null && customRate !== undefined ? customRate : lang === "sa" ? "-22%" : "-2%",
    pitch: lang === "sa" ? "-2Hz" : "+0Hz",
  };

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const tts = new MsEdgeTTS({ connectionTimeoutMs: 25000, synthesisTimeoutMs: 60000 });
      await tts.setMetadata(selectedVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(cleanText, prosodyOptions);
      const chunks = [];
      await new Promise((resolve, reject) => {
        audioStream.on("data", (chunk) => chunks.push(chunk));
        audioStream.on("end", resolve);
        audioStream.on("error", (err) => reject(err));
      });
      const buffer = Buffer.concat(chunks);
      if (buffer.length > 0) {
        fs.writeFileSync(filePath, buffer);
        return true;
      }
    } catch (err) {
      if (attempt < 4) await new Promise((r) => setTimeout(r, 700 * attempt));
    }
  }
  return false;
}

async function run() {
  const args = process.argv.slice(2);
  const langArg = args.find((a) => a.startsWith("--langs="));
  const languages = langArg
    ? langArg
        .replace("--langs=", "")
        .split(",")
        .map((l) => l.trim().toLowerCase())
        .filter((l) => VOICE_MAP[l])
    : ["gu"];

  console.log(`Connecting to MongoDB... (languages: sa + ${languages.join(", ")})`);
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB successfully!");

  const chapters = Array.from({ length: 18 }, (_, i) => i + 1);
  const allTasks = [];

  for (const ch of chapters) {
    const shlokas = await Shlok.find({ chapterNumber: ch }).sort({ shlokNumber: 1 }).lean();
    if (shlokas.length === 0) continue;
    console.log(`Chapter ${ch}: Found ${shlokas.length} shlokas in MongoDB.`);

    for (const s of shlokas) {
      const shTasks = buildShlokTtsTasks(s, languages);
      for (const t of shTasks) {
        allTasks.push({
          ...t,
          filePath: path.join(CACHE_DIR, `${t.cacheKey}.mp3`),
        });
      }
    }
  }

  console.log(`Total audio clips to verify/generate across all chapters: ${allTasks.length}`);

  let completed = 0;
  let alreadyCached = 0;
  let newlyGenerated = 0;
  let failed = 0;
  let taskIndex = 0;
  const CONCURRENCY = 6;

  async function worker() {
    while (taskIndex < allTasks.length) {
      const task = allTasks[taskIndex++];
      if (!task) break;

      if (fs.existsSync(task.filePath)) {
        alreadyCached++;
      } else {
        const ok = await synthesizeToFile(task.cleanText || task.text, task.lang, task.rate, task.filePath);
        if (ok) newlyGenerated++;
        else {
          failed++;
          console.warn(`Failed clip: ${task.label}`);
        }
      }
      completed++;

      if (completed % 20 === 0 || completed === allTasks.length) {
        console.log(
          `Progress: ${completed}/${allTasks.length} (${Math.round(
            (completed / allTasks.length) * 100
          )}%) [Already: ${alreadyCached}, New: ${newlyGenerated}, Failed: ${failed}]`
        );
      }
    }
  }

  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  console.log("\nALL AVAILABLE CHAPTER AUDIOS PRE-CACHED SUCCESSFULLY!");
  console.log(`Total verified/generated: ${alreadyCached + newlyGenerated}/${allTasks.length}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
