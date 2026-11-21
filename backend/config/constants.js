// =====================================================
// BHAGAVAD GITA - BACKEND GLOBAL CONSTANTS & HELPERS
// Single source of truth for Super Admin & Permissions
// =====================================================

const SUPER_ADMIN_EMAILS = [
  "gitagyanm700@gmail.com",
  "250230107002manav@gmail.com",
];

const isSuperAdminEmail = (email) => {
  if (!email) return false;
  return SUPER_ADMIN_EMAILS.includes(String(email).trim().toLowerCase());
};

const isSuperAdminUser = (user) => {
  if (!user) return false;
  if (user.isSuperAdmin === true) return true;
  if (user.email && isSuperAdminEmail(user.email)) return true;
  return false;
};

const ALL_PERMISSIONS = [
  "add_shloks",
  "edit_shloks",
  "delete_shloks",
  "manage_shloks",
  "download_audio",
  "generate_shlok_video",
  "manage_video_studio",
  "add_quiz",
  "edit_quiz",
  "delete_quiz",
  "share_quiz",
  "manage_quiz",
  "view_analytics",
  "manage_feedbacks",
  "delete_feedbacks",
  "manage_users",
  "delete_users",
  "manage_admins",
];

module.exports = {
  SUPER_ADMIN_EMAILS,
  isSuperAdminEmail,
  isSuperAdminUser,
  ALL_PERMISSIONS,
};
