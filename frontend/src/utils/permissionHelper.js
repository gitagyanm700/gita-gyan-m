// =====================================================
// BHAGAVAD GITA - ROLE & PERMISSIONS HELPER
// =====================================================

export const SUPER_ADMIN_EMAILS = [
  "gitagyanm700@gmail.com",
  "aambaliyamanav@gmail.com",
];

export const SUPER_ADMIN_EMAIL = "gitagyanm700@gmail.com";

export const PERMISSION_KEYS = {
  ADD_SHLOKS: "add_shloks",
  EDIT_SHLOKS: "edit_shloks",
  DELETE_SHLOKS: "delete_shloks",
  MANAGE_SHLOKS: "manage_shloks", // backward compatibility
  ADD_QUIZ: "add_quiz",
  EDIT_QUIZ: "edit_quiz",
  DELETE_QUIZ: "delete_quiz",
  SHARE_QUIZ: "share_quiz",
  MANAGE_QUIZ: "manage_quiz", // backward compatibility
  VIEW_ANALYTICS: "view_analytics",
  MANAGE_FEEDBACKS: "manage_feedbacks",
  DELETE_FEEDBACKS: "delete_feedbacks",
  MANAGE_USERS: "manage_users",
  DELETE_USERS: "delete_users",
  MANAGE_ADMINS: "manage_admins",
};

export const ALL_PERMISSIONS = [
  {
    id: "add_shloks",
    nameGu: "શ્લોક ઉમેરો (Add Shlok)",
    nameHi: "श्लोक जोड़ें (Add Shlok)",
    nameEn: "Add Shlokas",
    category: "shloks",
  },
  {
    id: "edit_shloks",
    nameGu: "શ્લોક સુધારો (Edit Shlok)",
    nameHi: "श्लोक संपादित करें (Edit Shlok)",
    nameEn: "Edit Shlokas",
    category: "shloks",
  },
  {
    id: "delete_shloks",
    nameGu: "શ્લોક ડિલીટ",
    nameHi: "श्लोक डिलीट",
    nameEn: "Delete Shlokas",
    category: "shloks",
    isDanger: true,
  },
  {
    id: "add_quiz",
    nameGu: "ક્વિઝ પ્રશ્ન ઉમેરો (Add Question)",
    nameHi: "क्विज़ प्रश्न जोड़ें (Add Question)",
    nameEn: "Add Quiz Questions",
    category: "quiz",
  },
  {
    id: "edit_quiz",
    nameGu: "ક્વિઝ પ્રશ્ન સુધારો (Edit Question)",
    nameHi: "क्विज़ प्रश्न संपादित करें (Edit Question)",
    nameEn: "Edit Quiz Questions",
    category: "quiz",
  },
  {
    id: "delete_quiz",
    nameGu: "ક્વિઝ ડિલીટ",
    nameHi: "क्विज़ डिलीट",
    nameEn: "Delete Quiz",
    category: "quiz",
    isDanger: true,
  },
  {
    id: "share_quiz",
    nameGu: "ક્વિઝ પ્રશ્ન શેર (Share Question)",
    nameHi: "क्विज़ प्रश्न शेयर (Share Question)",
    nameEn: "Share Quiz Questions",
    category: "quiz",
  },
  {
    id: "view_analytics",
    nameGu: "ટ્રાફિક અને એનાલિટિક્સ",
    nameHi: "ट्रैफ़िक और एनालिटिक्स",
    nameEn: "Traffic & Analytics",
    category: "analytics",
  },
  {
    id: "manage_feedbacks",
    nameGu: "યુઝર પ્રતિસાદ (Feedbacks)",
    nameHi: "उपयोगकर्ता फ़ीडबैक देखें",
    nameEn: "View Feedbacks",
    category: "feedbacks",
  },
  {
    id: "delete_feedbacks",
    nameGu: "પ્રતિસાદ ડિલીટ",
    nameHi: "फ़ीडबैक डिलीટ",
    nameEn: "Delete Feedbacks",
    category: "feedbacks",
    isDanger: true,
  },
  {
    id: "manage_users",
    nameGu: "યુઝર્સ લિસ્ટ (જુઓ)",
    nameHi: "उपयोगकर्ता सूची देखें",
    nameEn: "View Users List",
    category: "users",
  },
  {
    id: "delete_users",
    nameGu: "યુઝર ડિલીટ",
    nameHi: "उपयोगकर्ता डिलीट",
    nameEn: "Delete Users",
    category: "users",
    isDanger: true,
  },
  {
    id: "manage_admins",
    nameGu: "એડમિન પરમિશન્સ સંચાલન",
    nameHi: "एडमिन अनुमति प्रबंधन",
    nameEn: "Manage Admins & Roles",
    category: "security",
  },
];

/**
 * Checks if the user is the primary Super Admin (Master Admin)
 */
export function isSuperAdminUser(user) {
  if (!user) return false;
  if (user.isSuperAdmin === true) return true;
  if (
    user.email &&
    SUPER_ADMIN_EMAILS.some(
      (em) => em.toLowerCase() === user.email.toLowerCase()
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Strictly checks whether the user is one of the 2 designated Super Admins
 * (excludes all other admins / sub-admins and normal users).
 */
export function isExclusiveSuperAdmin(user) {
  if (!user || user.role !== "admin" || !user.email) return false;
  const normalizedEmail = String(user.email).trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.some(
    (em) => em.toLowerCase() === normalizedEmail
  );
}

/**
 * Checks if the user has a specific permission or any of multiple permissions
 */
export function hasPermission(user, permissionKey) {
  if (!user) return false;
  if (user.role !== "admin") return false;

  // Super Admin always has 100% full access to all permissions
  if (isSuperAdminUser(user)) return true;

  // If checking array of permission keys (grant if user has ANY of them)
  if (Array.isArray(permissionKey)) {
    return permissionKey.some((k) => hasPermission(user, k));
  }

  // If user has specific permissions array
  if (Array.isArray(user.permissions)) {
    if (user.permissions.includes(permissionKey)) return true;

    // Backward compatibility aliases:
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

  // Fallback for legacy admin
  return false;
}

/**
 * Returns human-readable label for a permission key
 */
export function getPermissionLabel(key, lang = "gu") {
  const perm = ALL_PERMISSIONS.find((p) => p.id === key);
  if (!perm) return key;
  if (lang === "hi") return perm.nameHi;
  if (lang === "en") return perm.nameEn;
  return perm.nameGu;
}
