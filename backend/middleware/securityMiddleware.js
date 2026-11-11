// =====================================================
// BHAGAVAD GITA - ADVANCED SECURITY & HARDENING MIDDLEWARE
// Protection against NoSQL Injection, Brute Force, XSS,
// Clickjacking, Data Leakage, and Denial-of-Service (DoS)
// =====================================================

// =====================================================
// 1. IN-MEMORY RATE LIMITER (ANTI-BRUTE-FORCE & ANTI-DDOS)
// =====================================================

class MemoryRateLimiter {
  constructor(windowMs, maxRequests, message) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.message = message;
    this.hits = new Map();

    // Auto cleanup expired entries every 5 minutes to avoid memory leaks
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.hits.entries()) {
        if (now > record.resetTime) {
          this.hits.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  middleware() {
    return (req, res, next) => {
      // Get real client IP (supports proxies like Render / Cloudflare)
      const ip =
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket?.remoteAddress ||
        "unknown-ip";

      const now = Date.now();
      let record = this.hits.get(ip);

      if (!record || now > record.resetTime) {
        record = {
          count: 1,
          resetTime: now + this.windowMs,
        };
        this.hits.set(ip, record);
        return next();
      }

      record.count += 1;

      if (record.count > this.maxRequests) {
        const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
        res.setHeader("Retry-After", retryAfterSeconds);
        return res.status(429).json({
          success: false,
          error: "Too Many Requests",
          message: this.message || "ઘણા બધા પ્રયાસો થયા છે. કૃપા કરીને થોડીવાર પછી પ્રયાસ કરો.",
          retryAfter: retryAfterSeconds,
        });
      }

      next();
    };
  }
}

// Auth Rate Limiter: Max 15 attempts per 15 minutes (Login, Register)
const authLimiter = new MemoryRateLimiter(
  15 * 60 * 1000,
  15,
  "સુરક્ષા ખાતર: ઘણા બધા લૉગિન પ્રયાસો થયા છે. ૧૫ મિનિટ પછી ફરી પ્રયાસ કરો."
).middleware();

// OTP Rate Limiter: Max 6 OTP requests per 10 minutes (Registration, Forgot Password, Profile Update)
const otpLimiter = new MemoryRateLimiter(
  10 * 60 * 1000,
  6,
  "OTP મોકલવાની મર્યાદા સમાપ્ત થઈ છે. ૧૦ મિનિટ પછી ફરી પ્રયાસ કરો."
).middleware();

// General API Rate Limiter: Max 300 requests per minute per IP
const generalApiLimiter = new MemoryRateLimiter(
  60 * 1000,
  300,
  "ખૂબ જ ઝડપથી વિનંતીઓ મોકલાઈ રહી છે. કૃપા કરીને થોડી ક્ષણો પછી પ્રયાસ કરો."
).middleware();

// Dedicated High-Throughput Limiter for Neural TTS & Batch Offline Audio Sync
const ttsLimiter = new MemoryRateLimiter(
  60 * 1000,
  2500,
  "ઑડિયો સિંક વિનંતીઓની મર્યાદા પાર થઈ છે. કૃપા કરીને થોડી ક્ષણો પછી પ્રયાસ કરો."
).middleware();

// =====================================================
// 2. HTTP SECURITY HEADERS (HELMET EQUIVALENT)
// =====================================================

const securityHeaders = (req, res, next) => {
  // Prevent MIME-sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prevent Clickjacking iframe embedding
  res.setHeader("X-Frame-Options", "SAMEORIGIN");

  // Browser XSS Filter
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // HTTP Strict Transport Security (HSTS) - Enforce HTTPS for 1 year
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );

  // Control referrer information leakage
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Restrict sensitive hardware features
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  // Prevent cross-domain flash/pdf exploits
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");

  // Hide Express signature
  res.removeHeader("X-Powered-By");

  next();
};

// =====================================================
// 3. NOSQL INJECTION SANITIZER (STRIP $ AND . KEYS)
// =====================================================

function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    // Strip keys starting with $ (MongoDB operators) or containing .
    if (key.startsWith("$") || key.includes(".")) {
      console.warn(`[Security] Blocked potential NoSQL injection key: "${key}"`);
      continue;
    }
    clean[key] = typeof value === "object" ? sanitizeObject(value) : value;
  }
  return clean;
}

const noSqlSanitizer = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeObject(req.params);
  }
  next();
};

// =====================================================
// 4. CORS WHITELIST CONFIGURATION
// =====================================================

const ALLOWED_ORIGINS = [
  "https://gita-gyan-m.vercel.app",
  "https://bhagavad-gita-website-rk1v.vercel.app",
  "https://bhagavad-gita-backend-jy1a.onrender.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow mobile apps, curl, or standalone PWA where origin might be undefined or localhost
    if (!origin) return callback(null, true);

    if (
      ALLOWED_ORIGINS.includes(origin) ||
      origin.endsWith(".vercel.app") ||
      origin.endsWith(".onrender.com")
    ) {
      return callback(null, true);
    }

    console.warn(`[Security] CORS request blocked from untrusted origin: ${origin}`);
    return callback(new Error("CORS: Not allowed by Access-Control-Allow-Origin"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "X-Cron-Secret",
  ],
};

// =====================================================
// 5. PRODUCTION ERROR MASKING (NO INTERNAL STACK LEAKS)
// =====================================================

const secureErrorHandler = (err, req, res, next) => {
  console.error("Unhandled Security/Server Error:", err);

  const isCorsError = err.message && err.message.includes("CORS");
  if (isCorsError) {
    return res.status(403).json({
      success: false,
      error: "Access Denied",
      message: "અનધિકૃત સાઇટ પરથી ઍક્સેસ પ્રતિબંધિત છે.",
    });
  }

  // Never leak internal DB error or stack trace to client
  return res.status(err.status || 500).json({
    success: false,
    error: "Internal Server Error",
    message: "સર્વર પર અણધારી સમસ્યા આવી. કૃપા કરીને થોડીવાર પછી પ્રયાસ કરો.",
  });
};

module.exports = {
  securityHeaders,
  noSqlSanitizer,
  authLimiter,
  otpLimiter,
  generalApiLimiter,
  ttsLimiter,
  corsOptions,
  secureErrorHandler,
};

