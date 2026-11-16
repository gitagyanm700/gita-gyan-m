const User = require("../models/User");
const Visitor = require("../models/Visitor");
const {
  SUPER_ADMIN_EMAILS,
  isSuperAdminEmail,
  isSuperAdminUser,
  ALL_PERMISSIONS,
} = require("../config/constants");

// =====================================================
// GET ALL USERS
// =====================================================
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    // Calculate visit counts for each registered user after registration
    const visitAgg = await Visitor.aggregate([
      {
        $match: {
          isRegistered: true,
          userId: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$userId",
          visitCount: { $sum: 1 },
        },
      },
    ]);

    const visitMap = {};
    visitAgg.forEach((item) => {
      if (item._id) {
        visitMap[String(item._id)] = item.visitCount;
      }
    });

    const ALL_PERMS = ALL_PERMISSIONS;

    const usersWithVisits = users.map((u) => {
      const isSuper = isSuperAdminEmail(u.email);

      return {
        ...u,
        isSuperAdmin: isSuper,
        permissions: isSuper ? ALL_PERMS : (u.permissions || []),
        visitCount: visitMap[String(u._id)] || 0,
      };
    });

    const getSuperAdminRank = (u) => {
      const email = (u.email || "").toLowerCase().trim();
      if (email === "gitagyanm700@gmail.com") return 1;
      if (email === "250230107002manav@gmail.com") return 2;
      return 99;
    };

    usersWithVisits.sort((a, b) => {
      const rankA = getSuperAdminRank(a);
      const rankB = getSuperAdminRank(b);

      // 1. Super Admins always come first in fixed order (#1 gitagyanm700, #2 250230107002manav)
      if (rankA !== rankB) {
        return rankA - rankB;
      }

      // 2. Sub-admins come next before regular users
      const isSubAdminA = a.role === "admin" && rankA === 99;
      const isSubAdminB = b.role === "admin" && rankB === 99;

      if (isSubAdminA && !isSubAdminB) return -1;
      if (!isSubAdminA && isSubAdminB) return 1;

      // 3. Within sub-admins OR within regular users, sort alphabetically A-Z by name
      const nameA = (a.name || "").trim().toLowerCase();
      const nameB = (b.name || "").trim().toLowerCase();
      return nameA.localeCompare(nameB, "gu", { sensitivity: "base" });
    });

    res.json({
      success: true,
      count: usersWithVisits.length,
      users: usersWithVisits,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Users મેળવવામાં error આવ્યો.",
      error: error.message,
    });
  }
};


// =====================================================
// DELETE USER
// =====================================================
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Admin cannot delete themselves
    if (userId === req.userId.toString()) {
      return res.status(400).json({
        message: "તમે તમારા પોતાના Admin accountને delete કરી શકતા નથી.",
      });
    }

    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        message: "User મળ્યો નથી.",
      });
    }

    // Super Admin cannot be deleted
    if (
      isSuperAdminEmail(targetUser.email)
    ) {
      return res.status(403).json({
        message: "મુખ્ય સુપર એડમિન (Super Admin) એકાઉન્ટને ડિલીટ કરી શકાતું નથી.",
      });
    }

    // Deleting another admin requires Super Admin privilege
    if (targetUser.role === "admin") {
      const requester = await User.findById(req.userId);
      const isRequesterSuper =
        requester &&
        (requester.isSuperAdmin ||
          isSuperAdminEmail(requester.email));

      if (!isRequesterSuper) {
        return res.status(403).json({
          message: "બીજા Admin accountને ફક્ત મુખ્ય Super Admin જ ડિલીટ કરી શકે છે.",
        });
      }
    }

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: "User successfully deleted. ✅",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "User delete કરવામાં error આવ્યો.",
      error: error.message,
    });
  }
};


// =====================================================
// UPDATE USER ROLE & PERMISSIONS
// =====================================================
const updateUserRole = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { role, permissions } = req.body;

    if (!role || !["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "અમાન્ય રોલ (Role). ફક્ત 'user' અથવા 'admin' હોઈ શકે છે.",
      });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User મળ્યો નથી.",
      });
    }

    const requester = await User.findById(req.userId);
    const isRequesterSuper =
      requester &&
      (requester.isSuperAdmin ||
        isSuperAdminEmail(requester.email));

    // Target is Super Admin -> Nobody can demote or alter their permissions
    if (
      isSuperAdminEmail(targetUser.email)
    ) {
      return res.status(403).json({
        success: false,
        message: "મુખ્ય સુપર એડમિન (Super Admin) ના રોલ કે પરમિશન બદલી શકાતા નથી.",
      });
    }

    // Admins cannot alter their own role/permissions
    if (targetUserId === req.userId.toString()) {
      return res.status(400).json({
        success: false,
        message: "તમે તમારા પોતાના એડમિન રોલ કે પરમિશન બદલી શકતા નથી.",
      });
    }

    // Only Super Admin or someone with explicit manage_admins can modify roles
    const requesterCanManageAdmins =
      isRequesterSuper ||
      (requester.role === "admin" &&
        Array.isArray(requester.permissions) &&
        requester.permissions.includes("manage_admins"));

    if (!requesterCanManageAdmins) {
      return res.status(403).json({
        success: false,
        message: "તમારી પાસે એડમિન રોલ અથવા પરમિશન બદલવાનો અધિકાર નથી.",
      });
    }

    // Non-super admin cannot alter or demote an admin who holds permissions requester lacks
    if (!isRequesterSuper && targetUser.role === "admin") {
      const requesterPerms = Array.isArray(requester.permissions) ? requester.permissions : [];
      const targetPerms = Array.isArray(targetUser.permissions) ? targetUser.permissions : [];
      const hasHigherPerms = targetPerms.some((p) => !requesterPerms.includes(p));
      if (hasHigherPerms) {
        return res.status(403).json({
          success: false,
          message: "તમે તમારા કરતાં વધુ અધિકાર ધરાવતા એડમિનની પરમિશન બદલી શકતા નથી.",
        });
      }
    }

    const validPermissions = ALL_PERMISSIONS;

    let cleanPermissions = [];
    if (role === "admin") {
      if (Array.isArray(permissions)) {
        cleanPermissions = permissions.filter((p) =>
          validPermissions.includes(p)
        );
      } else {
        cleanPermissions = [
          "add_shloks",
          "edit_shloks",
          "add_quiz",
          "edit_quiz",
          "share_quiz",
          "view_analytics",
          "manage_feedbacks",
          "manage_users",
        ];
      }

      // A non-super admin can ONLY grant permissions they possess themselves!
      if (!isRequesterSuper) {
        const requesterPerms = Array.isArray(requester.permissions) ? requester.permissions : [];
        const disallowedPerms = cleanPermissions.filter((p) => !requesterPerms.includes(p));
        if (disallowedPerms.length > 0) {
          return res.status(403).json({
            success: false,
            message: "તમે ફક્ત તે જ પરમિશન્સ અન્યને આપી શકો છો જે તમારી પાસે ઉપલબ્ધ છે.",
          });
        }
      }
    }

    targetUser.role = role;
    targetUser.permissions = cleanPermissions;
    await targetUser.save();

    return res.status(200).json({
      success: true,
      message:
        role === "admin"
          ? `${targetUser.name} ને Admin બનાવવામાં આવ્યા અને પરમિશન્સ સેટ થઈ ગઈ ✅`
          : `${targetUser.name} પાસેથી Admin અધિકાર હટાવીને સામાન્ય User બનાવવામાં આવ્યા ✅`,
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        isSuperAdmin: targetUser.isSuperAdmin,
        permissions: targetUser.permissions,
      },
    });
  } catch (error) {
    console.error("Update User Role Error:", error);
    return res.status(500).json({
      success: false,
      message: "રોલ કે પરમિશન અપડેટ કરવામાં error આવ્યો.",
      error: error.message,
    });
  }
};


// =====================================================
// GET ADMIN PERMISSIONS METADATA
// =====================================================
const getAdminPermissionsList = async (req, res) => {
  const permissions = [
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
      nameHi: "फ़ीडबैक डिलीट",
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

  return res.status(200).json({
    success: true,
    permissions,
  });
};


module.exports = {
  getAllUsers,
  deleteUser,
  updateUserRole,
  getAdminPermissionsList,
};