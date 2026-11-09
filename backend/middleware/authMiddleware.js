const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        message: "Login જરૂરી છે."
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // =====================================================
    // USER ID
    // =====================================================

    req.userId = decoded.userId;

    // =====================================================
    // GET USER
    // =====================================================

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User મળ્યો નથી."
      });
    }

    // =====================================================
    // SET USER
    // =====================================================

    req.user = user;

    next();

  } catch (error) {
    console.error("Protect Error:", error);

    const isHi = req.headers && req.headers["accept-language"] && req.headers["accept-language"].includes("hi");
    return res.status(401).json({
      success: false,
      code: "TOKEN_EXPIRED",
      message: isHi ? "Invalid अथवा expired token." : "Invalid અથવા / अथवा expired token."
    });
  }
};


const optionalAuth = async (req, res, next) => {
  try {
    const authHeader =
      req.headers.authorization;

    // Login નથી → Anonymous user તરીકે ચાલુ રાખો
    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      req.user = null;
      req.userId = null;

      return next();
    }

    const token =
      authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.userId =
      decoded.userId;

    const user =
      await User.findById(
        req.userId
      );

    // User મળ્યો નહીં → Anonymous
    if (!user) {
      req.user = null;
      req.userId = null;

      return next();
    }

    // Logged-in user
    req.user = user;

    next();

  } catch (error) {
    console.error(
      "Optional Auth Error:",
      error
    );

    // Invalid/expired token હોય તો પણ
    // public Shlok 1–5 access બંધ ન થાય
    req.user = null;
    req.userId = null;

    next();
  }
};


const SUPER_ADMIN_EMAILS = [
  "gitagyanm700@gmail.com",
  "aambaliyamanav@gmail.com",
];

const isSuperAdmin = (user) => {
  if (!user) return false;
  if (user.isSuperAdmin === true) return true;
  if (user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  return false;
};

const hasPermission = (user, permissionKey) => {
  if (!user || user.role !== "admin") return false;
  if (isSuperAdmin(user)) return true;

  if (Array.isArray(user.permissions)) {
    if (Array.isArray(permissionKey)) {
      return permissionKey.some((k) => hasPermission(user, k));
    }

    if (user.permissions.includes(permissionKey)) return true;

    // Backward-compatibility aliases:
    // Legacy manage_shloks gives access to add_shloks and edit_shloks
    if (
      (permissionKey === "add_shloks" || permissionKey === "edit_shloks") &&
      user.permissions.includes("manage_shloks")
    ) {
      return true;
    }

    // Legacy manage_quiz gives access to add_quiz and edit_quiz
    if (
      (permissionKey === "add_quiz" || permissionKey === "edit_quiz") &&
      user.permissions.includes("manage_quiz")
    ) {
      return true;
    }

    return false;
  }
  return true; // legacy admin fallback
};

const adminOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User મળ્યો નથી."
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required."
      });
    }

    req.user = user;
    next();

  } catch (error) {
    console.error("Admin Error:", error);

    return res.status(500).json({
      message: "Authorization error."
    });
  }
};

const requirePermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.userId);

      if (!user) {
        return res.status(404).json({
          message: "User મળ્યો નથી."
        });
      }

      if (user.role !== "admin") {
        return res.status(403).json({
          message: "Admin access required."
        });
      }

      if (!hasPermission(user, permissionKey)) {
        const permLabel = Array.isArray(permissionKey) ? permissionKey.join(" / ") : permissionKey;
        return res.status(403).json({
          success: false,
          code: "PERMISSION_DENIED",
          message: `તમારી પાસે આ સુવિધા (${permLabel}) નો ઉપયોગ કરવાની પરમિશન નથી. મુખ્ય એડમિનનો સંપર્ક કરો.`
        });
      }

      req.user = user;
      next();

    } catch (error) {
      console.error("RequirePermission Error:", error);

      return res.status(500).json({
        message: "Authorization error."
      });
    }
  };
};

const superAdminOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user || user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required."
      });
    }

    if (!isSuperAdmin(user) && !hasPermission(user, "manage_admins")) {
      return res.status(403).json({
        success: false,
        code: "SUPER_ADMIN_REQUIRED",
        message: "માત્ર મુખ્ય એડમિન (Super Admin) જ એડમિન બનાવી અથવા પરમિશન બદલી શકે છે."
      });
    }

    req.user = user;
    next();

  } catch (error) {
    console.error("Super Admin Check Error:", error);

    return res.status(500).json({
      message: "Authorization error."
    });
  }
};

/**
 * Strict Super Admin Only Middleware
 * Grants access exclusively to Master Super Admins (gitagyanm700@gmail.com / aambaliyamanav@gmail.com)
 * Sub-admins or regular users are strictly blocked.
 */
const strictSuperAdminOnly = async (req, res, next) => {
  try {
    const user = req.user || (await User.findById(req.userId));

    if (!user || user.role !== "admin" || !isSuperAdmin(user)) {
      return res.status(403).json({
        success: false,
        code: "SUPER_ADMIN_EXCLUSIVE",
        message: "માત્ર મુખ્ય સુપર એડમિન (Master Super Admin) જ આ સુવિધાનો ઉપયોગ કરી શકે છે."
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Strict Super Admin Check Error:", error);
    return res.status(500).json({
      message: "Authorization error."
    });
  }
};

module.exports = {
  protect,
  optionalAuth,
  adminOnly,
  requirePermission,
  superAdminOnly,
  strictSuperAdminOnly,
  isSuperAdmin,
  hasPermission,
};