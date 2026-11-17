const webpush = require("web-push");
const Subscription = require("../models/Subscription");
const AppInstallation = require("../models/AppInstallation");
const User = require("../models/User");

// Official VAPID Keys
const DEFAULT_VAPID_PUBLIC =
  "BBZ0vGL3_MtwlA6Owet6dEptXpiUIKyYdzV9Zy9qeew50cNaYqlRjpeg2qKdJowEnZWQ7vhbWOE-f0xhfMe6EDQ";
const DEFAULT_VAPID_PRIVATE =
  "2PC7JJlWR5mb8hiEcmjlBkDKrJS907LjRxknH44mHzw";

// Initialize VAPID
let vapidConfigured = false;
function ensureVapidConfig() {
  if (vapidConfigured) return true;
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE;
  try {
    webpush.setVapidDetails(
      "mailto:admin@bhagavadgita.com",
      vapidPublicKey,
      vapidPrivateKey
    );
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.error("❌ Failed to configure VAPID details:", err.message);
    return false;
  }
}

// Low-level helper: send push to single subscriber
async function sendPush(subscription, payload) {
  if (!ensureVapidConfig()) return false;

  // IMPORTANT: Do NOT set a static 'topic' header!
  // RFC 8030 / Google FCM treats messages with a 'Topic' header as collapsible,
  // which causes Android to defer/delay delivery in Doze mode until the app is opened.
  // Omitting 'topic' guarantees immediate, high-priority background delivery even when the screen is off and app is closed!
  const pushOptions = {
    TTL: 24 * 60 * 60, // 24 hours: delivers as soon as device is online
    urgency: "high",   // High urgency: wakes up device immediately
  };

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify(payload),
      pushOptions
    );
    return true;
  } catch (err) {
    // 404 or 410 = Subscription expired, uninstalled, or revoked
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.log(`🗑️ Subscription ${subscription.endpoint?.slice(0, 35)}... expired/revoked, removing from DB.`);
      try {
        await Subscription.deleteOne({ endpoint: subscription.endpoint });
        await AppInstallation.updateMany(
          { notificationEndpoint: subscription.endpoint },
          { $set: { hasNotificationEnabled: false } }
        );
      } catch (cleanErr) {}
    } else {
      console.error(`⚠️ WebPush delivery failed for ${subscription.endpoint?.slice(0, 35)}:`, err.message);
    }
    throw err;
  }
}

// 9 Rich 2-Hour Notification Slots (06:00 AM to 10:00 PM IST)
const NOTIFICATION_SLOTS = {
  // 06:00 AM IST - પ્રભાત સ્મરણ
  slot_6: {
    name: "06:00 AM - પ્રભાત",
    templates: [
      {
        title: "🌅 શ્રીમદ્ ભગવદ્ ગીતા | પ્રભાત સ્મરણ",
        body: "આજના પવિત્ર દિવસની શુભ શરૂઆત ગીતાજીના અધ્યાય વાંચનથી કરો. મનને પરમ શાંતિ મળશે. 🙏",
        url: "/chapters",
      },
      {
        title: "☀️ શુભ પ્રભાત | આજનું ગીતા વાંચન",
        body: "નવો દિવસ, નવી દિવ્ય ઉર્જા! આજનો પવિત્ર ગીતા અધ્યાય વાંચવાનો સમય થઈ ગયો છે.",
        url: "/chapters",
      },
    ],
  },

  // 08:00 AM IST - સવારની ક્વિઝ ચેલેન્જ
  slot_8: {
    name: "08:00 AM - સવાર ક્વિઝ",
    templates: [
      {
        title: "🎯 સવારની ગીતા ક્વિઝ | જ્ઞાન કસોટી",
        body: "આજના દિવસની શરૂઆતમાં 2 મિનિટ ગીતા ક્વિઝ રમી તમારા આધ્યાત્મિક જ્ઞાનને ચકાસો! 🧠",
        url: "/quiz-category",
      },
      {
        title: "⚡ પ્રભાત ક્વિઝ ચેલેન્જ",
        body: "શું તમે આજના પ્રશ્નોના સાચા જવાબ આપી શકો છો? હમણાં જ ક્વિઝ રમીને સ્કોર વધારો!",
        url: "/quiz-category",
      },
    ],
  },

  // 10:00 AM IST - સવારનું ચિંતન / કર્મયોગ
  slot_10: {
    name: "10:00 AM - ચિંતન",
    templates: [
      {
        title: "📖 કર્મયોગ પ્રેરણા | શ્રીમદ્ ભગવદ્ ગીતા",
        body: "કાર્યમાં કુશળતા જ યોગ છે. આજના કર્તવ્યો શરૂ કરતાં પહેલાં ગીતાજીના શ્લોકો વાંચો. 🌸",
        url: "/chapters",
      },
      {
        title: "✨ મનની એકાગ્રતા માટે ગીતા પાઠ",
        body: "દિવસના કાર્યોમાં સદ્બુદ્ધિ અને સકારાત્મક વિચારો માટે આજનો પવિત્ર ગીતા અધ્યાય વાંચો.",
        url: "/chapters",
      },
    ],
  },

  // 12:00 PM IST - બપોર ક્વિઝ & શાંતિ
  slot_12: {
    name: "12:00 PM - બપોર ક્વિઝ",
    templates: [
      {
        title: "🏆 બપોરની ગીતા ક્વિઝ સ્પર્ધા",
        body: "થોડો સમય ફાળવીને ગીતા ક્વિઝ રમો અને તમારા આધ્યાત્મિક જ્ઞાનને વધુ સમૃદ્ધ બનાવો!",
        url: "/quiz-category",
      },
      {
        title: "🧠 મધ્યાહ્ન ગીતા ક્વિઝ ચેલેન્જ",
        body: "આજના ગીતા પ્રશ્નોના સાચા જવાબ આપી લીડરબોર્ડમાં તમારો સ્કોર ટોપ પર લઈ જાઓ.",
        url: "/quiz-category",
      },
    ],
  },

  // 02:00 PM IST - બપોરનું પ્રેરણાદાયી વાંચન
  slot_14: {
    name: "02:00 PM - અપરાહ્ન વાંચન",
    templates: [
      {
        title: "🌿 જીવન માર્ગદર્શન | ભગવદ્ ગીતા",
        body: "દોડધામ ભરેલા દિવસ વચ્ચે થોડો સમય કાઢીને ગીતાજીનો અધ્યાય વાંચો અને શાંતિ અનુભવો. 🕊️",
        url: "/chapters",
      },
      {
        title: "📖 પવિત્ર ગીતા અધ્યાય વાંચન",
        body: "ગીતાજીના દિવ્ય શ્લોકોનું વાંચન કરી મનને તણાવમુક્ત અને સકારાત્મક બનાવો.",
        url: "/chapters",
      },
    ],
  },

  // 04:00 PM IST - અપરાહ્ન ક્વિઝ
  slot_16: {
    name: "04:00 PM - અપરાહ્ન ક્વિઝ",
    templates: [
      {
        title: "⚡ ગીતા ક્વિઝ ચેલેન્જ | આજનો સ્કોર",
        body: "ગીતા ક્વિઝ રમીને નવા બેજ અને પોઈન્ટ્સ મેળવો. હમણાં જ ક્વિઝ શરૂ કરો! 🎯",
        url: "/quiz-category",
      },
      {
        title: "🧠 બપોર પછીની ગીતા જ્ઞાન ક્વિઝ",
        body: "તમારા આધ્યાત્મિક જ્ઞાનની કસોટી કરો અને જુઓ કે તમે કેટલા પ્રશ્નોના સાચા જવાબ આપી શકો છો.",
        url: "/quiz-category",
      },
    ],
  },

  // 06:00 PM IST - સંધ્યા ગીતા વાંચન
  slot_18: {
    name: "06:00 PM - સંધ્યા વાંચન",
    templates: [
      {
        title: "🌆 સંધ્યા સમય | શ્રીમદ્ ભગવદ્ ગીતા વાંચન",
        body: "દિવસભરના પરિશ્રમ પછી મનને પરમ શાંતિ આપવા ગીતાજીના પવિત્ર અધ્યાયનું વાંચન કરો. 🕉️",
        url: "/chapters",
      },
      {
        title: "🌸 સાંજનું ગીતા વાંચન સ્મરણ",
        body: "સંધ્યાકાળે ગીતાજીનો અધ્યાય વાંચી દિવસને સાર્થક અને પવિત્ર બનાવો.",
        url: "/chapters",
      },
    ],
  },

  // 08:00 PM IST - સાંજની ક્વિઝ
  slot_20: {
    name: "08:00 PM - રાત્રિ ક્વિઝ",
    templates: [
      {
        title: "🎯 સાંજની મહા ગીતા ક્વિઝ સ્પર્ધા",
        body: "સાંજનો સમય ગીતા ક્વિઝ રમવા માટે ઉત્તમ છે! પ્રશ્નોના સાચા જવાબ આપી જ્ઞાન ચકાસો. 🏆",
        url: "/quiz-category",
      },
      {
        title: "🧠 રાત્રિ ગીતા ક્વિઝ ચેલેન્જ",
        body: "પરિવાર સાથે ગીતા ક્વિઝ રમો અને આજનું તમારું ક્વિઝ લક્ષ્ય પૂર્ણ કરો!",
        url: "/quiz-category",
      },
    ],
  },

  // 10:00 PM IST - શાંત નિદ્રા & રાત્રિ મનન
  slot_22: {
    name: "10:00 PM - રાત્રિ મનન",
    templates: [
      {
        title: "🌙 શાંત નિદ્રા માટે ગીતા સ્મરણ",
        body: "સુતા પહેલાં મનની પરમ શાંતિ માટે ગીતાજીનો એક અધ્યાય વાંચી આજના દિવસને પૂર્ણ કરો. 🙏",
        url: "/chapters",
      },
      {
        title: "🌟 રાત્રિ ગીતા પાઠ | પરમ શાંતિ",
        body: "આજનું અધ્યાય વાંચન પૂરું કરી શાંત, પવિત્ર અને સકારાત્મક ચિત્તે નિદ્રાધીન થાઓ.",
        url: "/chapters",
      },
    ],
  },
};

// Fallback for off-hours / custom triggers
const DEFAULT_NOTIFICATION = {
  title: "🕉️ શ્રીમદ્ ભગવદ્ ગીતા | દૈનિક સ્મરણ",
  body: "આજનો પવિત્ર ગીતા અધ્યાય વાંચો અને ગીતા ક્વિઝ રમી તમારું જ્ઞાન વધારો. 🙏",
  url: "/chapters",
};

module.exports = {
  // GET /api/notifications/public-key
  getPublicKey: (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC;
    return res.json({ publicKey: key });
  },

  // POST /api/notifications/subscribe (Register any device that turns on notifications)
  subscribe: async (req, res) => {
    try {
      const { endpoint, keys, role, userId, deviceId: clientDeviceId } = req.body;
      if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
        return res.status(400).json({ error: "અમાન્ય સબસ્ક્રિપ્શન વિગતો." });
      }

      const userRole = role === "admin" ? "admin" : "user";
      const validUserId = userId || null;

      const crypto = require("crypto");
      const fallbackDeviceId =
        "dev_" + crypto.createHash("md5").update(endpoint).digest("hex").substring(0, 16);
      const targetDeviceId = clientDeviceId || fallbackDeviceId;

      const existingSub = await Subscription.findOne({ endpoint });
      const isBrandNew = !existingSub;

      // 1. Save or update Subscription
      const subscription = await Subscription.findOneAndUpdate(
        { endpoint },
        {
          endpoint,
          keys,
          role: userRole,
          userId: validUserId,
          deviceId: targetDeviceId,
          isApp: true,
          lastOpenedDate: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // 2. Sync to AppInstallation
      try {
        let userName = null;
        let userEmail = null;
        if (validUserId) {
          const u = await User.findById(validUserId).select("name email").lean();
          if (u) {
            userName = u.name;
            userEmail = u.email;
          }
        }

        await AppInstallation.findOneAndUpdate(
          {
            $or: [{ notificationEndpoint: endpoint }, { deviceId: targetDeviceId }],
          },
          {
            $set: {
              deviceId: targetDeviceId,
              userId: validUserId,
              userName,
              userEmail,
              hasNotificationEnabled: true,
              notificationEndpoint: endpoint,
              isInstalled: true,
              lastOpenedAt: new Date(),
              uninstalledAt: null,
            },
            $setOnInsert: {
              installedAt: new Date(),
            },
          },
          { upsert: true, new: true }
        );
      } catch (appErr) {
        console.warn("AppInstallation sync warning:", appErr.message);
      }

      // 3. Immediately send a Welcome / Confirmation Push Notification on first-time enable!
      if (isBrandNew) {
        const siteUrl =
          process.env.SITE_URL && !process.env.SITE_URL.includes("rk1v")
            ? process.env.SITE_URL
            : "https://gita-gyan-m.vercel.app";

        const welcomePayload = {
          title: "🔔 શ્રીમદ્ ભગવદ્ ગીતા | નોટિફિકેશન સક્રિય",
          body: "ગીતા અધ્યાય વાંચન અને ક્વિઝ માટે દર ૨ કલાકે સમયસર રિમાઇન્ડર મળતા રહેશે. હરે કૃષ્ણ! 🙏",
          icon: `${siteUrl}/icons/icon-192x192.png`,
          badge: `${siteUrl}/icons/icon-192x192.png`,
          url: `${siteUrl}/chapters`,
          tag: `welcome-${Date.now()}`,
        };

        sendPush(subscription, welcomePayload).catch((err) => {
          console.warn("Welcome push notification warning:", err.message);
        });
      }

      console.log(`✅ Push subscription registered successfully: ${endpoint.slice(0, 35)}...`);
      return res.status(201).json({
        success: true,
        message: "નોટિફિકેશન સબસ્ક્રિપ્શન સફળતાપૂર્વક નોંધાઈ ગયું છે.",
      });
    } catch (err) {
      console.error("Subscription save error:", err);
      return res.status(500).json({ error: "સબસ્ક્રિપ્શન સેવ કરવામાં સમસ્યા આવી." });
    }
  },

  // POST /api/notifications/unsubscribe
  unsubscribe: async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint જરૂરી છે" });
      }
      await Subscription.deleteOne({ endpoint });
      await AppInstallation.updateMany(
        { notificationEndpoint: endpoint },
        { $set: { hasNotificationEnabled: false } }
      );
      console.log(`🚫 Push notification disabled for: ${endpoint.slice(0, 35)}...`);
      return res.json({ success: true, message: "સફળતાપૂર્વક અનસબસ્ક્રાઇબ થયું" });
    } catch (err) {
      console.error("Unsubscribe error:", err);
      return res.status(500).json({ error: "Unsubscribe કરવામાં સમસ્યા આવી" });
    }
  },

  // POST /api/notifications/record-open
  recordOpen: async (req, res) => {
    try {
      const { endpoint, userId } = req.body;
      const updateData = { lastOpenedDate: new Date() };
      if (userId) {
        await Subscription.updateMany({ userId }, { $set: updateData });
      }
      if (endpoint) {
        await Subscription.updateOne({ endpoint }, { $set: updateData });
      }
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Record open failed" });
    }
  },

  // POST /api/notifications/record-action (shlok_read or quiz_played)
  recordAction: async (req, res) => {
    try {
      const { endpoint, userId, action } = req.body;
      const updateData = { lastOpenedDate: new Date() };

      if (action === "shlok_read") {
        updateData.lastShlokReadDate = new Date();
      } else if (action === "quiz_played") {
        updateData.lastQuizPlayedDate = new Date();
      }

      if (userId) {
        await Subscription.updateMany({ userId }, { $set: updateData });
      }
      if (endpoint) {
        await Subscription.updateOne({ endpoint }, { $set: updateData });
      }
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: "Record action failed" });
    }
  },

  // =========================================================================
  // SEND 2-HOUR NOTIFICATION TO ALL SUBSCRIBED DEVICES
  // Slots: 06:00, 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00, 22:00 IST
  // =========================================================================
  sendEvery2HoursReminder: async (customMsg = null, force = false) => {
    try {
      // 1. Fetch all active subscriptions
      const subscribers = await Subscription.find({});
      if (!subscribers || subscribers.length === 0) {
        console.log("ℹ️ No push notification subscribers found in database.");
        return { success: true, message: "No subscribers found", sent: 0 };
      }

      const now = new Date();
      // Calculate current IST time (UTC + 5 hours 30 mins)
      const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
      const istHours = istTime.getUTCHours();
      const istMinutes = istTime.getUTCMinutes();

      // Find closest even hour slot (e.g. 6, 8, 10, 12, 14, 16, 18, 20, 22)
      // Round to nearest even hour if within 45 mins
      let matchedHour = Math.round(istHours / 2) * 2;
      if (matchedHour < 6) matchedHour = 6;
      if (matchedHour > 22) matchedHour = 22;

      const slotKey = `slot_${matchedHour}`;
      const slotData = NOTIFICATION_SLOTS[slotKey] || NOTIFICATION_SLOTS.slot_6;

      const siteUrl =
        process.env.SITE_URL && !process.env.SITE_URL.includes("rk1v")
          ? process.env.SITE_URL
          : "https://gita-gyan-m.vercel.app";

      // Pick payload
      let payload;
      if (customMsg) {
        payload = {
          title: customMsg.title,
          body: customMsg.body,
          icon: `${siteUrl}/icons/icon-192x192.png`,
          badge: `${siteUrl}/icons/icon-192x192.png`,
          url: customMsg.url ? (customMsg.url.startsWith("http") ? customMsg.url : `${siteUrl}${customMsg.url}`) : `${siteUrl}/chapters`,
          tag: `custom-${Date.now()}`,
          timestamp: Date.now(),
          vibrate: [200, 100, 200],
          requireInteraction: false,
          actions: [
            { action: "read", title: "📖 વાંચો" },
            { action: "quiz", title: "🎯 ક્વિઝ રમો" },
          ],
        };
      } else {
        const templates = slotData.templates;
        const selected = templates[Math.floor(Math.random() * templates.length)];
        payload = {
          title: selected.title,
          body: selected.body,
          icon: `${siteUrl}/icons/icon-192x192.png`,
          badge: `${siteUrl}/icons/icon-192x192.png`,
          url: `${siteUrl}${selected.url}`,
          tag: `gita-${slotKey}-${Date.now()}`,
          timestamp: Date.now(),
          vibrate: [200, 100, 200],
          requireInteraction: false,
          actions: [
            { action: "read", title: "📖 વાંચો" },
            { action: "quiz", title: "🎯 ક્વિઝ રમો" },
          ],
        };
      }

      console.log(`🚀 [Dispatching 2-Hour Notification - ${slotData.name}] (IST ${istHours}:${istMinutes}) to ${subscribers.length} devices...`);

      let sentCount = 0;
      let failedCount = 0;
      const successfulIds = [];

      // Send in parallel batches of 15 devices concurrently for maximum speed
      const BATCH_SIZE = 15;
      for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
        const batch = subscribers.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map(async (sub) => {
            await sendPush(sub, payload);
            return sub._id;
          })
        );

        for (const res of results) {
          if (res.status === "fulfilled") {
            sentCount++;
            successfulIds.push(res.value);
          } else {
            failedCount++;
          }
        }
      }

      // Update lastReminderSentDate and reminderCount for successful subscribers
      if (successfulIds.length > 0) {
        await Subscription.updateMany(
          { _id: { $in: successfulIds } },
          {
            $set: { lastReminderSentDate: new Date() },
            $inc: { reminderCount: 1 },
          }
        );
      }

      console.log(
        `✅ [2-Hour Gita Notification Complete] Sent: ${sentCount}, Failed: ${failedCount}, Total: ${subscribers.length}`
      );

      return {
        success: true,
        slot: slotData.name,
        sent: sentCount,
        failed: failedCount,
        total: subscribers.length,
        notification: payload,
      };
    } catch (err) {
      console.error("❌ Send 2-hour notification error:", err);
      return { success: false, error: err.message };
    }
  },

  // Backward-compatible alias
  sendDailyReminder: async (customMsg = null, force = false) => {
    return module.exports.sendEvery2HoursReminder(customMsg, force);
  },

  // Test to specific endpoint
  sendTestToEndpoint: async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (!endpoint) return res.status(400).json({ error: "Endpoint required" });

      const sub = await Subscription.findOne({ endpoint });
      if (!sub) return res.status(404).json({ error: "Subscription not found" });

      const siteUrl =
        process.env.SITE_URL && !process.env.SITE_URL.includes("rk1v")
          ? process.env.SITE_URL
          : "https://gita-gyan-m.vercel.app";

      const payload = {
        title: "🔔 શ્રીમદ્ ભગવદ્ ગીતા | ટેસ્ટ નોટિફિકેશન",
        body: "તમારા ડિવાઇસ પર ગીતા એપ નોટિફિકેશન સફળતાપૂર્વક કામ કરી રહ્યું છે! હરે કૃષ્ણ! 🙏",
        icon: `${siteUrl}/icons/icon-192x192.png`,
        badge: `${siteUrl}/icons/icon-192x192.png`,
        url: `${siteUrl}/chapters`,
        tag: `test-${Date.now()}`,
        timestamp: Date.now(),
        vibrate: [200, 100, 200],
        requireInteraction: false,
        actions: [
          { action: "read", title: "📖 વાંચો" },
          { action: "quiz", title: "🎯 ક્વિઝ રમો" },
        ],
      };

      await sendPush(sub, payload);
      return res.json({ success: true, message: "ટેસ્ટ નોટિફિકેશન સફળતાપૂર્વક મોકલાઈ ગયું!" });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  // Midnight counter reset
  resetDailyCounters: async () => {
    try {
      console.log("🌙 Resetting daily notification counters at midnight...");
      await Subscription.updateMany({}, { $set: { reminderCount: 0 } });
    } catch (err) {
      console.error("Reset daily counters error:", err);
    }
  },
};
