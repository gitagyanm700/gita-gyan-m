const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const cron = require("node-cron");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const shlokRoutes = require("./routes/shlokRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const continueReadingRoutes = require("./routes/continueReadingRoutes");
const quizRoutes = require("./routes/quizRoutes");
const readingTrackerRoutes = require("./routes/readingTrackerRoutes");
const gitaAiRoutes = require("./routes/gitaAiRoutes");
const visitorRoutes = require("./routes/visitorRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const appAnalyticsRoutes = require("./routes/appAnalyticsRoutes");
const ttsRoutes = require("./routes/ttsRoutes");
const sceneRoutes = require("./routes/sceneRoutes");
const { scheduleStartupAudioPrecache } = require("./controllers/ttsController");
const notificationController = require("./controllers/notificationController");

const {
  securityHeaders,
  noSqlSanitizer,
  generalApiLimiter,
  ttsLimiter,
  corsOptions,
  secureErrorHandler,
} = require("./middleware/securityMiddleware");

const app = express();

// Trust reverse proxy (Render, Vercel, Cloudflare) for accurate client IP in rate limiting
app.set("trust proxy", 1);

// Connect MongoDB Database
connectDB();

// =====================================================
// SECURITY SUITE
// =====================================================

// 1. Disable server fingerprinting (Hides Express signature)
app.disable("x-powered-by");

// 2. Set strict HTTP security headers (HSTS, Anti-Clickjacking, Anti-XSS, MIME-sniffing protection)
app.use(securityHeaders);

// 3. Strict CORS Whitelist
app.use(cors(corsOptions));

// 4. Request Body Size Limiting (Allows high-throughput TTS sync & image uploads)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.text({ type: ["text/plain", "application/json"], limit: "50mb" }));

// 5. NoSQL Injection Sanitizer (Strips any malicious $ and . keys from body, query, and params)
app.use(noSqlSanitizer);

// 6. Global API Rate Limiter (Dedicated high-throughput limiter for TTS offline sync)
app.use("/api", (req, res, next) => {
  if (req.path === "/tts" || req.path.startsWith("/tts/")) {
    return ttsLimiter(req, res, next);
  }
  return generalApiLimiter(req, res, next);
});

// =====================================================
// ROUTES
// =====================================================

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/shloks", shlokRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/continue-reading", continueReadingRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/reading-tracker", readingTrackerRoutes);
app.use("/api/gita-ai", gitaAiRoutes);
app.use("/api/visitors", visitorRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/app-analytics", appAnalyticsRoutes);
app.use("/api/tts", ttsRoutes);
app.use("/api/scenes", sceneRoutes);

// Root health check endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Bhagavad Gita Backend API is running securely 🚀",
  });
});

// Centralized Secure Error Handler (Never leaks internal stack traces or DB errors to clients)
app.use(secureErrorHandler);

// =====================================================
// PUSH NOTIFICATION SCHEDULER (EVERY 2 HOURS THROUGHOUT THE DAY)
// 06:00 AM, 08:00 AM, 10:00 AM, 12:00 PM, 02:00 PM, 04:00 PM, 06:00 PM, 08:00 PM, 10:00 PM IST
// Sends to all subscribed devices on time!
// =====================================================
const twoHourCronExpression = "0 6,8,10,12,14,16,18,20,22 * * *";

cron.schedule(
  twoHourCronExpression,
  async () => {
    console.log("⏰ [Cron Every 2 Hours] Dispatching Gita push notification...");
    await notificationController.sendEvery2HoursReminder();
  },
  { timezone: "Asia/Kolkata" }
);

// High-precision Watchdog (checks every 30 seconds to guarantee exact on-time delivery)
// Catches cold starts within the first 25 minutes of each slot!
let lastTriggeredSlot = null;
setInterval(async () => {
  try {
    const now = new Date();
    // IST Time (UTC + 5.5 hours)
    const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const hour = istTime.getUTCHours();
    const minute = istTime.getUTCMinutes();
    const targetHours = [6, 8, 10, 12, 14, 16, 18, 20, 22];

    // Trigger within first 25 minutes of slot if not already triggered today
    if (targetHours.includes(hour) && minute <= 25) {
      const slotKey = `${istTime.getUTCFullYear()}-${istTime.getUTCMonth()}-${istTime.getUTCDate()}_${hour}`;
      if (lastTriggeredSlot !== slotKey) {
        lastTriggeredSlot = slotKey;
        console.log(`🎯 [Watchdog Trigger IST ${hour}:${minute.toString().padStart(2, '0')}] Firing 2-hour notification for slot ${hour}:00...`);
        await notificationController.sendEvery2HoursReminder();
      }
    }
  } catch (watchErr) {
    console.error("Watchdog error:", watchErr.message);
  }
}, 30 * 1000);

// =====================================================
// RENDER 24/7 ACTIVE KEEP-ALIVE (PREVENTS SPIN-DOWN DURING ACTIVE HOURS)
// Pings every 10 minutes between 05:30 AM and 10:30 PM IST
// Guarantees that Render remains awake so notifications trigger on time even if app is closed!
// =====================================================
const BACKEND_SELF_URL = process.env.BACKEND_URL || "https://bhagavad-gita-backend-jy1a.onrender.com";

setInterval(async () => {
  try {
    const now = new Date();
    const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const hour = istTime.getUTCHours();
    const min = istTime.getUTCMinutes();

    // Active spiritual reading hours: 05:30 AM to 10:30 PM IST
    const isDayTime = (hour > 5 || (hour === 5 && min >= 30)) && (hour < 22 || (hour === 22 && min <= 30));
    if (isDayTime) {
      const res = await fetch(`${BACKEND_SELF_URL}/`);
      if (res.ok) {
        console.log(`🔄 [Keep-Alive Ping OK] Server kept active at IST ${hour}:${min.toString().padStart(2, "0")}`);
      }
    }
  } catch (e) {
    // Non-blocking ping
  }
}, 10 * 60 * 1000); // 10 minutes (Render sleeps after 15m)

// Midnight reset (00:00 IST)
cron.schedule(
  "0 0 * * *",
  async () => {
    console.log("🌙 [Cron Midnight] Resetting daily notification counters...");
    await notificationController.resetDailyCounters();
  },
  { timezone: "Asia/Kolkata" }
);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running securely on http://localhost:${PORT}`);
  scheduleStartupAudioPrecache();
});
