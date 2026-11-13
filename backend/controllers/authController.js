const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// =====================================================
// EMAIL TRANSPORTER (GMAIL SMTP FALLBACK)
// =====================================================

const transporter =
  process.env.EMAIL_USER && process.env.EMAIL_PASS
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      })
    : null;

// =====================================================
// DUAL-PROVIDER EMAIL SENDER (BREVO API + NODEMAILER FALLBACK)
// =====================================================

const sendEmail = async ({
  to,
  subject,
  html,
}) => {
  let brevoError = null;

  // 1. Try Brevo REST API first (if API key is present)
  if (process.env.BREVO_API_KEY) {
    try {
      const response = await fetch(
        "https://api.brevo.com/v3/smtp/email",
        {
          method: "POST",

          headers: {
            accept: "application/json",
            "api-key": process.env.BREVO_API_KEY,
            "content-type": "application/json",
          },

          body: JSON.stringify({
            sender: {
              name:
                process.env.BREVO_SENDER_NAME ||
                "Bhagavad Gita",

              email:
                process.env.BREVO_SENDER_EMAIL ||
                process.env.EMAIL_USER,
            },

            replyTo: {
              name:
                process.env.BREVO_SENDER_NAME ||
                "Bhagavad Gita",

              email:
                process.env.BREVO_SENDER_EMAIL ||
                process.env.EMAIL_USER,
            },

            to: [
              {
                email: to,
              },
            ],

            subject,

            htmlContent: html,
          }),
        }
      );

      if (response.ok) {
        console.log(`✅ Email sent to ${to} via Brevo API`);
        return await response.json();
      }

      const errorText = await response.text();
      brevoError = new Error(
        `Brevo API Error ${response.status}: ${errorText}`
      );
      console.warn(
        "⚠️ Brevo API failed, trying Nodemailer fallback:",
        brevoError.message
      );
    } catch (err) {
      brevoError = err;
      console.warn(
        "⚠️ Brevo request threw error, trying Nodemailer fallback:",
        err.message
      );
    }
  }

  // 2. Fallback to Gmail SMTP via Nodemailer
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"Bhagavad Gita" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
      });
      console.log(
        `✅ Email sent to ${to} via Nodemailer (Gmail):`,
        info.messageId
      );
      return { messageId: info.messageId, provider: "nodemailer" };
    } catch (smtpErr) {
      console.error(
        "❌ Nodemailer fallback also failed:",
        smtpErr.message
      );
      if (brevoError) {
        throw new Error(
          `${brevoError.message} | SMTP Error: ${smtpErr.message}`
        );
      }
      throw smtpErr;
    }
  }

  if (brevoError) {
    throw brevoError;
  }

  throw new Error(
    "No email service configured (missing BREVO_API_KEY and EMAIL_USER/EMAIL_PASS)"
  );
};




// =====================================================
// TEMPORARY OTP STORAGE
// =====================================================

const otpStore = new Map();

// =====================================================
// EMAIL TRANSPORTER
// =====================================================



// =====================================================
// GENERATE 6 DIGIT OTP
// =====================================================

const generateOTP = () => {
  return Math.floor(
    100000 + Math.random() * 900000
  ).toString();
};

// =====================================================
// MULTI-LANGUAGE OTP SUBJECT HELPER
// =====================================================

const getOTPSubject = (purpose, language = "gu") => {
  const lang = ["gu", "hi", "en"].includes(language) ? language : "gu";
  if (purpose === "registration") {
    return lang === "en"
      ? "Bhagavad Gita - Account Verification OTP"
      : lang === "hi"
      ? "श्रीमद्भगवद्गीता - खाता सत्यापन OTP"
      : "શ્રીમદ્ ભગવદ્ ગીતા - એકાઉન્ટ વેરિફિકેશન OTP";
  }
  if (purpose === "forgot_password") {
    return lang === "en"
      ? "Bhagavad Gita - Password Reset OTP"
      : lang === "hi"
      ? "श्रीमद्भगवद्गीता - पासवर्ड रीसेट OTP"
      : "શ્રીમદ્ ભગવદ્ ગીતા - પાસવર્ડ રીસેટ OTP";
  }
  return lang === "en"
    ? "Bhagavad Gita - Profile Update OTP"
    : lang === "hi"
    ? "श्रीमद्भगवद्गीता - प्रोफ़ाइल अपडेट OTP"
    : "શ્રીમદ્ ભગવદ્ ગીતા - પ્રોફાઇલ અપડેટ OTP";
};

// =====================================================
// PROFESSIONAL RESPONSIVE MULTI-LANGUAGE OTP EMAIL TEMPLATE
// =====================================================

const generateOTPEmailHtml = ({
  name = "ભક્ત",
  otp,
  purpose = "registration",
  language = "gu",
  type = "email",
}) => {
  const lang = ["gu", "hi", "en"].includes(language) ? language : "gu";
  const safeName = (name || (lang === "gu" ? "ભક્ત" : lang === "hi" ? "भक्त" : "Devotee")).trim();

  const content = {
    gu: {
      brandTitle: "શ્રીમદ્ ભગવદ્ ગીતા",
      brandTagline: "જીવનનું દિવ્ય માર્ગદર્શન અને અમૂલ્ય ઉપદેશ",
      purposeBadge:
        purpose === "registration"
          ? "એકાઉન્ટ વેરિફિકેશન"
          : purpose === "forgot_password"
          ? "પાસવર્ડ રીસેટ"
          : "પ્રોફાઇલ અપડેટ",
      greeting: `નમસ્તે ${safeName} 🙏`,
      intro:
        purpose === "registration"
          ? "શ્રીમદ્ ભગવદ્ ગીતા પરિવારમાં આપનું હાર્દિક સ્વાગત છે. આપનું એકાઉન્ટ સુરક્ષિત રીતે વેરિફાય કરવા માટે નીચે આપેલ ૬-અંકના OTP નો ઉપયોગ કરો:"
          : purpose === "forgot_password"
          ? "અમને આપના એકાઉન્ટનો પાસવર્ડ રીસેટ કરવાની વિનંતી મળી છે. નવો પાસવર્ડ સેટ કરવા માટે નીચે આપેલ સુરક્ષિત OTP નો ઉપયોગ કરો:"
          : `આપની પ્રોફાઇલમાં ${type === "email" ? "Email ID" : "Mobile Number"} અપડેટ કરવા માટે નીચે આપેલ OTP નો ઉપયોગ કરો:`,
      otpLabel: "આપનો વેરિફિકેશન કોડ (OTP)",
      expiryText: "આ OTP <strong>૧૦ મિનિટ</strong> માટે માન્ય છે.",
      securityTitle: "સુરક્ષા સૂચના",
      securityText: "આ OTP કોઈની પણ સાથે શેર કરશો નહીં. અમારી ટીમ ક્યારેય આપની પાસેથી OTP માંગશે નહીં.",
      ignoreText: "જો આપે આ વિનંતી નથી કરી, તો ચિંતા કરવાની જરૂર નથી. આપ આ ઈમેલને અવગણી શકો છો, આપનું એકાઉન્ટ સંપૂર્ણપણે સુરક્ષિત છે.",
      btnText: "વેબસાઇટની મુલાકાત લો",
      shloka: "॥ कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ॥",
      copyright: "© 2026 શ્રીમદ્ ભગવદ્ ગીતા. સર્વાધિકાર સુરક્ષિત.",
    },
    hi: {
      brandTitle: "श्रीमद्भगवद्गीता",
      brandTagline: "जीवन का दिव्य मार्गदर्शन एवं अमूल्य उपदेश",
      purposeBadge:
        purpose === "registration"
          ? "खाता सत्यापन"
          : purpose === "forgot_password"
          ? "पासवर्ड रीसेट"
          : "प्रोफ़ाइल अपडेट",
      greeting: `नमस्ते ${safeName} 🙏`,
      intro:
        purpose === "registration"
          ? "श्रीमद्भगवद्गीता परिवार में आपका हार्दिक स्वागत है। अपना खाता सुरक्षित रूप से सत्यापित करने के लिए कृपया नीचे दिए गए 6-अंकीय OTP का उपयोग करें:"
          : purpose === "forgot_password"
          ? "हमें आपके खाते का पासवर्ड रीसेट करने का अनुरोध प्राप्त हुआ है। नया पासवर्ड सेट करने के लिए नीचे दिए गए सुरक्षित OTP का उपयोग करें:"
          : `अपनी प्रोफ़ाइल में ${type === "email" ? "Email ID" : "Mobile Number"} अपडेट करने के लिए नीचे दिए गए OTP का उपयोग करें:`,
      otpLabel: "आपका सत्यापन कोड (OTP)",
      expiryText: "यह OTP <strong>10 मिनट</strong> के लिए मान्य है।",
      securityTitle: "सुरक्षा निर्देश",
      securityText: "यह OTP किसी के साथ भी साझा न करें। हमारी टीम कभी भी आपसे OTP नहीं मांगेगी।",
      ignoreText: "यदि आपने यह अनुरोध नहीं किया है, तो चिंता की कोई बात नहीं है। आप इस ईमेल को अनदेखा कर सकते हैं, आपका खाता पूरी तरह सुरक्षित है।",
      btnText: "वेबसाइट पर जाएं",
      shloka: "॥ कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ॥",
      copyright: "© 2026 श्रीमद्भगवद्गीता. सर्वाधिकार सुरक्षित।",
    },
    en: {
      brandTitle: "Bhagavad Gita",
      brandTagline: "Divine Wisdom & Spiritual Life Guidance",
      purposeBadge:
        purpose === "registration"
          ? "Account Verification"
          : purpose === "forgot_password"
          ? "Password Reset"
          : "Profile Update",
      greeting: `Namaste ${safeName} 🙏`,
      intro:
        purpose === "registration"
          ? "Welcome to the Bhagavad Gita community. Please use the 6-digit One-Time Password (OTP) below to securely verify your account:"
          : purpose === "forgot_password"
          ? "We received a request to reset your account password. Please use the secure OTP below to set your new password:"
          : `Please use the OTP below to update your ${type === "email" ? "Email ID" : "Mobile Number"}:`,
      otpLabel: "YOUR VERIFICATION CODE (OTP)",
      expiryText: "This OTP is valid for <strong>10 minutes</strong> only.",
      securityTitle: "Security Notice",
      securityText: "Never share this OTP with anyone. Our team will never ask you for your verification code.",
      ignoreText: "If you did not request this, you can safely ignore this email. Your account remains completely secure.",
      btnText: "Visit Bhagavad Gita Website",
      shloka: "॥ कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ॥",
      copyright: "© 2026 Bhagavad Gita. All rights reserved.",
    },
  };

  const t = content[lang];
  const logoUrl = "https://gita-gyan-m.vercel.app/icons/icon-192x192.png";
  const websiteUrl = "https://gita-gyan-m.vercel.app";

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${t.brandTitle} - ${t.purposeBadge}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4ede4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4ede4; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08); border: 1px solid #e7ded0;">
          
          <!-- Spiritual Gradient Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #0f2b48 0%, #173f73 50%, #b45309 100%); padding: 36px 24px 28px 24px; text-align: center;">
              
              <!-- App Logo with Halo Ring -->
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 14px auto;">
                <tr>
                  <td align="center" style="background: rgba(255, 255, 255, 0.18); border-radius: 50%; padding: 5px; width: 78px; height: 78px;">
                    <img src="${logoUrl}" alt="${t.brandTitle}" width="74" height="74" style="display: block; border-radius: 50%; border: 2px solid #fde047; box-shadow: 0 4px 14px rgba(0,0,0,0.25);" />
                  </td>
                </tr>
              </table>

              <!-- Brand Name -->
              <h1 style="margin: 0 0 6px 0; font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                ${t.brandTitle}
              </h1>

              <!-- Tagline -->
              <p style="margin: 0 0 16px 0; font-size: 13px; color: #fde68a; font-weight: 500; letter-spacing: 0.2px;">
                ${t.brandTagline}
              </p>

              <!-- Purpose Pill Badge -->
              <div style="display: inline-block; background: rgba(254, 240, 138, 0.2); border: 1px solid rgba(254, 240, 138, 0.45); border-radius: 30px; padding: 5px 16px;">
                <span style="font-size: 12px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 1px;">
                  ✦ ${t.purposeBadge} ✦
                </span>
              </div>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 34px 32px 24px 32px; background-color: #ffffff; color: #1e293b;">
              
              <!-- Greeting -->
              <h2 style="margin: 0 0 14px 0; font-size: 20px; font-weight: 700; color: #0f172a;">
                ${t.greeting}
              </h2>

              <!-- Explanatory Text -->
              <p style="margin: 0 0 22px 0; font-size: 15px; line-height: 1.65; color: #334155;">
                ${t.intro}
              </p>

              <!-- Hero OTP Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
                <tr>
                  <td align="center" style="background: #fffbeb; border: 2px dashed #f59e0b; border-radius: 16px; padding: 22px 16px; text-align: center;">
                    <span style="display: block; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #92400e; text-transform: uppercase; margin-bottom: 8px;">
                      ${t.otpLabel}
                    </span>
                    <span style="display: block; font-family: 'Consolas', 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #c2410c; padding-left: 10px; margin: 4px 0;">
                      ${otp}
                    </span>
                    <span style="display: inline-block; font-size: 13px; color: #78350f; margin-top: 6px;">
                      ${t.expiryText}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Security Callout Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 0 12px 12px 0; margin: 20px 0 24px 0;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #1e40af;">
                      🔒 ${t.securityTitle}
                    </p>
                    <p style="margin: 0; font-size: 13px; line-height: 1.55; color: #475569;">
                      ${t.securityText}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Safety ignore info -->
              <p style="margin: 0 0 26px 0; font-size: 13px; line-height: 1.6; color: #64748b;">
                ${t.ignoreText}
              </p>

              <!-- Call to action button -->
              <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin: 10px auto 20px auto;">
                <tr>
                  <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #173f73 0%, #0f2b48 100%);">
                    <a href="${websiteUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
                      ${t.btnText} →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Sacred Footer -->
          <tr>
            <td align="center" style="background-color: #faf6f0; border-top: 1px solid #ebdccb; padding: 22px 24px; text-align: center;">
              
              <!-- Sacred Shloka -->
              <p style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700; color: #854d0e; letter-spacing: 0.5px;">
                ${t.shloka}
              </p>

              <!-- Copyright -->
              <p style="margin: 0; font-size: 12px; color: #78716c; line-height: 1.5;">
                ${t.copyright}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// =====================================================
// SEND PROFILE EMAIL OTP
// =====================================================

const sendProfileEmailOTP = async (
  user,
  otp,
  type,
  language = "gu"
) => {
  const subject = getOTPSubject("profile_update", language);
  const html = generateOTPEmailHtml({
    name: user.name,
    otp,
    purpose: "profile_update",
    language,
    type,
  });

  await sendEmail({
    to: user.email,
    subject,
    html,
  });
};

// =====================================================
// GENERIC PROFILE OTP KEY
// =====================================================

const getProfileOTPKey = (
  userId,
  type
) => {
  return `profile_${userId.toString()}_${type}`;
};

// =====================================================
// FORGOT PASSWORD OTP KEY
// =====================================================

const getForgotPasswordOTPKey = (
  email
) => {
  return `forgot_password_${email}`;
};

// =====================================================
// SEND EMAIL OTP
// POST /api/auth/send-otp
// =====================================================

const sendOTP = async (
  req,
  res
) => {
  try {

    const {
      name,
      mobile,
      email,
      birthDate,
      state,
      city,
      language = "gu",
    } = req.body;

    // =================================================
    // REQUIRED FIELDS
    // =================================================

    if (
      !name ||
      !mobile ||
      !email ||
      !birthDate
    ) {
      return res.status(400).json({
        message:
          "બધી માહિતી ભરવી જરૂરી છે.",
      });
    }

    // =================================================
    // CLEAN DATA
    // =================================================

    const cleanName =
      name.trim();

    const cleanMobile =
      mobile.trim();

    const cleanEmail =
      email
        .toLowerCase()
        .trim();

    // =================================================
    // VALIDATE MOBILE
    // =================================================

    if (
      !/^[0-9]{10}$/.test(
        cleanMobile
      )
    ) {
      return res.status(400).json({
        message:
          "યોગ્ય 10 અંકનો Mobile Number નાખો.",
      });
    }

    // =================================================
    // VALIDATE EMAIL
    // =================================================

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        cleanEmail
      )
    ) {
      return res.status(400).json({
        message:
          "યોગ્ય Email ID નાખો.",
      });
    }

    // =================================================
    // VALIDATE BIRTH DATE
    // =================================================

    const parsedBirthDate =
      new Date(birthDate);

    if (
      Number.isNaN(
        parsedBirthDate.getTime()
      )
    ) {
      return res.status(400).json({
        message:
          "યોગ્ય Birth Date નાખો.",
      });
    }

    // =================================================
    // CHECK EXISTING EMAIL
    // =================================================

    const existingEmail =
      await User.findOne({
        email: cleanEmail,
      });

    if (existingEmail) {
      return res.status(400).json({
        message:
          "આ Email પહેલેથી register થયેલ છે.",
      });
    }

    // =================================================
    // CHECK EXISTING MOBILE
    // =================================================



    // =================================================
    // GENERATE OTP
    // =================================================

    const otp =
      generateOTP();

    // =================================================
    // OTP EXPIRY
    // =================================================

    const expiresAt =
      Date.now() +
      10 * 60 * 1000;

    // =================================================
    // STORE OTP
    // =================================================

    otpStore.set(
      cleanEmail,
      {
        otp,
        expiresAt,
        verified: false,
        name: cleanName,
        mobile: cleanMobile,
        birthDate:
          parsedBirthDate,
        state: (state || "Gujarat").toString().trim(),
        city: (city || "").toString().trim(),
      }
    );

    // =================================================
    // SEND REGISTRATION OTP
    // =================================================

    const subject = getOTPSubject("registration", language);
    const html = generateOTPEmailHtml({
      name: cleanName,
      otp,
      purpose: "registration",
      language,
    });

    await sendEmail({
      to: cleanEmail,
      subject,
      html,
    });

    const successMsg =
      language === "en"
        ? "Verification OTP has been sent to your Email."
        : language === "hi"
        ? "आपके Email पर सत्यापन OTP भेज दिया गया है।"
        : "તમારા Email પર OTP મોકલવામાં આવ્યો છે.";

    return res.status(200).json({
      message: successMsg,
    });

  } catch (error) {

    console.error(
      "❌ Send OTP Error:",
      error
    );

    const isBrevoIpBlock =
      error.message && error.message.includes("authorised_ips");

    return res.status(500).json({
      message: isBrevoIpBlock
        ? "Brevo ઈમેલ સર્વિસમાં IP બ્લોક છે. એડમિન કૃપા કરીને Brevo સેટિંગ્સમાં IP whitelist બંધ કરો."
        : (error.message || "OTP મોકલવામાં સમસ્યા આવી."),
      error:
        error.message,
    });
  }
};

// =====================================================
// VERIFY REGISTRATION OTP
// POST /api/auth/verify-otp
// =====================================================

const verifyOTP = async (
  req,
  res
) => {
  try {

    const {
      email,
      otp,
    } = req.body;

    if (
      !email ||
      !otp
    ) {
      return res.status(400).json({
        message:
          "Email અને OTP જરૂરી છે.",
      });
    }

    const cleanEmail =
      email
        .toLowerCase()
        .trim();

    const cleanOTP =
      otp
        .toString()
        .trim();

    if (
      !/^[0-9]{6}$/.test(
        cleanOTP
      )
    ) {
      return res.status(400).json({
        message:
          "6 અંકનો યોગ્ય OTP નાખો.",
      });
    }

    const storedOTP =
      otpStore.get(
        cleanEmail
      );

    if (!storedOTP) {
      return res.status(400).json({
        message:
          "OTP મળ્યો નથી. ફરીથી OTP મોકલો.",
      });
    }

    if (
      Date.now() >
      storedOTP.expiresAt
    ) {

      otpStore.delete(
        cleanEmail
      );

      return res.status(400).json({
        message:
          "OTP expire થઈ ગયો છે. ફરીથી OTP મોકલો / OTP समाप्त (expire) हो गया है। पुनः OTP भेजें।",
      });
    }

    if (
      storedOTP.otp !==
      cleanOTP
    ) {
      return res.status(400).json({
        message:
          "OTP ખોટો છે. કૃપા કરીને ફરી તપાસો.",
      });
    }

    otpStore.set(
      cleanEmail,
      {
        ...storedOTP,
        verified: true,
      }
    );

    return res.status(200).json({
      message:
        "OTP successfully verify થઈ ગયો છે.",
    });

  } catch (error) {

    console.error(
      "❌ Verify OTP Error:",
      error
    );

    return res.status(500).json({
      message:
        "OTP verificationમાં સમસ્યા આવી.",
      error:
        error.message,
    });
  }
};

// =====================================================
// REGISTER USER
// POST /api/auth/register
// =====================================================

const registerUser = async (
  req,
  res
) => {
  try {

    const {
      name,
      mobile,
      email,
      birthDate,
      password,
      otp,
      state,
      city,
    } = req.body;

    if (
      !name ||
      !mobile ||
      !email ||
      !birthDate ||
      !password ||
      !otp
    ) {
      return res.status(400).json({
        message:
          "બધી માહિતી ભરવી જરૂરી છે.",
      });
    }

    const cleanName =
      name.trim();

    const cleanMobile =
      mobile.trim();

    const cleanEmail =
      email
        .toLowerCase()
        .trim();

    const cleanOTP =
      otp
        .toString()
        .trim();

    const storedOTP =
      otpStore.get(
        cleanEmail
      );

    if (!storedOTP) {
      return res.status(400).json({
        message:
          "OTP verification જરૂરી છે.",
      });
    }

    if (
      storedOTP.verified !==
      true
    ) {
      return res.status(400).json({
        message:
          "પહેલા OTP verify કરો.",
      });
    }

    if (
      Date.now() >
      storedOTP.expiresAt
    ) {

      otpStore.delete(
        cleanEmail
      );

      return res.status(400).json({
        message:
          "OTP expire થઈ ગયો છે. ફરીથી OTP મોકલો / OTP समाप्त (expire) हो गया है। पुनः OTP भेजें।",
      });
    }

    if (
      storedOTP.otp !==
      cleanOTP
    ) {
      return res.status(400).json({
        message:
          "OTP ખોટો છે.",
      });
    }

    const existingEmail =
      await User.findOne({
        email: cleanEmail,
      });

    if (existingEmail) {
      return res.status(400).json({
        message:
          "આ Email પહેલેથી register થયેલ છે.",
      });
    }



    if (
      password.length < 6
    ) {
      return res.status(400).json({
        message:
          "Password ઓછામાં ઓછો 6 charactersનો હોવો જોઈએ.",
      });
    }

    const parsedBirthDate =
      new Date(
        birthDate
      );

    if (
      Number.isNaN(
        parsedBirthDate.getTime()
      )
    ) {
      return res.status(400).json({
        message:
          "યોગ્ય Birth Date જરૂરી છે.",
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    const finalState = (
      state ||
      (storedOTP && storedOTP.state) ||
      "Gujarat"
    ).toString().trim();

    const finalCity = (
      city ||
      (storedOTP && storedOTP.city) ||
      ""
    ).toString().trim();

    const user =
      await User.create({
        name:
          cleanName,

        mobile:
          cleanMobile,

        email:
          cleanEmail,

        birthDate:
          parsedBirthDate,

        state:
          finalState,

        city:
          finalCity,

        password:
          hashedPassword,

        role:
          "user",
      });

    otpStore.delete(
      cleanEmail
    );

    return res.status(201).json({
      message:
        "Registration સફળ થયું ✅",

      user: {
        id:
          user._id,

        name:
          user.name,

        mobile:
          user.mobile,

        email:
          user.email,

        birthDate:
          user.birthDate,

        state:
          user.state,

        city:
          user.city,

        role:
          user.role,

        isSuperAdmin:
          user.isSuperAdmin ||
          (user.email && ["gitagyanm700@gmail.com", "aambaliyamanav@gmail.com"].includes(user.email.toLowerCase())),

        permissions:
          (user.isSuperAdmin || (user.email && ["gitagyanm700@gmail.com", "aambaliyamanav@gmail.com"].includes(user.email.toLowerCase())))
            ? [
                "add_shloks",
                "edit_shloks",
                "delete_shloks",
                "manage_shloks",
                "add_quiz",
                "edit_quiz",
                "manage_quiz",
                "delete_quiz",
                "share_quiz",
                "view_analytics",
                "manage_feedbacks",
                "delete_feedbacks",
                "manage_users",
                "delete_users",
                "manage_admins",
              ]
            : Array.isArray(user.permissions)
            ? user.permissions
            : (user.role === "admin"
                ? [
                    "add_shloks",
                    "edit_shloks",
                    "add_quiz",
                    "edit_quiz",
                    "share_quiz",
                    "view_analytics",
                    "manage_feedbacks",
                    "manage_users",
                  ]
                : []),
      },
    });

  } catch (error) {

    console.error(
      "❌ Register Error:",
      error
    );

    return res.status(500).json({
      message:
        "Registration દરમિયાન error આવ્યો.",

      error:
        error.message,
    });
  }
};

// =====================================================
// LOGIN USER
// POST /api/auth/login
// =====================================================

const loginUser = async (
  req,
  res
) => {
  try {

    const {
      email,
      password,
    } = req.body;

    if (
      !email ||
      !password ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message:
          "Email અને password જરૂરી છે.",
      });
    }

    const cleanEmail =
      email
        .toLowerCase()
        .trim();

    const user =
      await User.findOne({
        email:
          cleanEmail,
      }).select("+password");

    if (!user) {
      return res.status(401).json({
        message:
          "Email અથવા password ખોટો છે.",
      });
    }

    const isPasswordCorrect =
      await bcrypt.compare(
        password,
        user.password
      );

    if (
      !isPasswordCorrect
    ) {
      return res.status(401).json({
        message:
          "Email અથવા password ખોટો છે.",
      });
    }

    const token =
      jwt.sign(
        {
          userId:
            user._id,

          role:
            user.role,
        },

        process.env.JWT_SECRET,

        {
          expiresIn:
            "30d",
        }
      );

    return res.status(200).json({
      message:
        "Login સફળ થયું ✅",

      token,

      user: {
        id:
          user._id,

        name:
          user.name,

        mobile:
          user.mobile,

        email:
          user.email,

        birthDate:
          user.birthDate,

        state:
          user.state || "Gujarat",

        city:
          user.city || "",

        role:
          user.role,

        isSuperAdmin:
          user.isSuperAdmin ||
          (user.email && ["gitagyanm700@gmail.com", "aambaliyamanav@gmail.com"].includes(user.email.toLowerCase())),

        permissions:
          (user.isSuperAdmin || (user.email && ["gitagyanm700@gmail.com", "aambaliyamanav@gmail.com"].includes(user.email.toLowerCase())))
            ? [
                "add_shloks",
                "edit_shloks",
                "delete_shloks",
                "manage_shloks",
                "add_quiz",
                "edit_quiz",
                "manage_quiz",
                "delete_quiz",
                "share_quiz",
                "view_analytics",
                "manage_feedbacks",
                "delete_feedbacks",
                "manage_users",
                "delete_users",
                "manage_admins",
              ]
            : Array.isArray(user.permissions)
            ? user.permissions
            : (user.role === "admin"
                ? [
                    "add_shloks",
                    "edit_shloks",
                    "add_quiz",
                    "edit_quiz",
                    "share_quiz",
                    "view_analytics",
                    "manage_feedbacks",
                    "manage_users",
                  ]
                : []),
      },
    });

  } catch (error) {

    console.error(
      "❌ Login Error:",
      error
    );

    return res.status(500).json({
      message:
        "Login દરમિયાન error આવ્યો.",

      error:
        error.message,
    });
  }
};

// =====================================================
// GET PROFILE
// GET /api/auth/profile
// =====================================================

const getProfile = async (
  req,
  res
) => {
  try {

    const user =
      await User.findById(
        req.userId
      ).select(
        "-password"
      );

    if (!user) {
      return res.status(404).json({
        message:
          "User મળ્યો નથી.",
      });
    }

    const isSuper =
      user.isSuperAdmin ||
      (user.email && user.email.toLowerCase() === "gitagyanm700@gmail.com");

    const userObj = user.toObject ? user.toObject() : user;

    return res.status(200).json({
      user: {
        ...userObj,
        isSuperAdmin: isSuper,
        permissions:
          user.permissions ||
          (user.role === "admin"
            ? [
                "add_shloks",
                "edit_shloks",
                "add_quiz",
                "edit_quiz",
                "share_quiz",
                "view_analytics",
                "manage_feedbacks",
                "manage_users",
                "manage_admins",
              ]
            : []),
      },
    });

  } catch (error) {

    console.error(
      "❌ Profile Error:",
      error
    );

    return res.status(500).json({
      message:
        "Profile મેળવવામાં error આવ્યો.",
    });
  }
};

// =====================================================
// SEND PROFILE UPDATE OTP
// POST /api/auth/profile/send-otp
// LOGIN REQUIRED
// =====================================================

const sendProfileOTP = async (
  req,
  res
) => {
  try {

    const {
      type,
      value,
      language = "gu",
    } = req.body;

    if (
      !type ||
      !value
    ) {
      return res.status(400).json({
        message:
          "OTP type અને value જરૂરી છે.",
      });
    }

    if (
      type !== "email" &&
      type !== "mobile"
    ) {
      return res.status(400).json({
        message:
          "Invalid OTP type.",
      });
    }

    const user =
      await User.findById(
        req.userId
      );

    if (!user) {
      return res.status(404).json({
        message:
          "User મળ્યો નથી.",
      });
    }

    let cleanValue =
      value
        .toString()
        .trim();

    if (
      type === "email"
    ) {
      cleanValue =
        cleanValue
          .toLowerCase();
    }

    if (
      type === "email"
    ) {

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          cleanValue
        )
      ) {
        return res.status(400).json({
          message:
            "યોગ્ય Email ID નાખો.",
        });
      }

      const existingEmail =
        await User.findOne({
          email:
            cleanValue,

          _id: {
            $ne:
              req.userId,
          },
        });

      if (existingEmail) {
        return res.status(400).json({
          message:
            "આ Email બીજા accountમાં ઉપયોગમાં છે.",
        });
      }
    }

    if (
      type === "mobile"
    ) {

      if (
        !/^[0-9]{10}$/.test(
          cleanValue
        )
      ) {
        return res.status(400).json({
          message:
            "યોગ્ય 10 અંકનો Mobile Number નાખો.",
        });
      }

      const existingMobile =
        await User.findOne({
          mobile:
            cleanValue,

          _id: {
            $ne:
              req.userId,
          },
        });

      if (existingMobile) {
        return res.status(400).json({
          message:
            "આ Mobile Number બીજા accountમાં ઉપયોગમાં છે.",
        });
      }
    }

    const otp =
      generateOTP();

    const expiresAt =
      Date.now() +
      10 * 60 * 1000;

    const otpKey =
      getProfileOTPKey(
        req.userId,
        type
      );

    otpStore.set(
      otpKey,
      {
        otp,
        expiresAt,
        verified: false,

        userId:
          req.userId.toString(),

        type,

        value:
          cleanValue,
      }
    );

    await sendProfileEmailOTP(
      user,
      otp,
      type,
      language
    );

    const profileSuccessMsg =
      language === "en"
        ? (type === "email"
            ? "Email change OTP has been sent to your registered Email."
            : "Mobile change OTP has been sent to your registered Email.")
        : language === "hi"
        ? (type === "email"
            ? "आपके पंजीकृत Email पर ईमेल परिवर्तन OTP भेज दिया गया है।"
            : "आपके पंजीकृत Email पर मोबाइल परिवर्तन OTP भेज दिया गया है।")
        : (type === "email"
            ? "તમારા હાલના registered Email પર Email change OTP મોકલવામાં આવ્યો છે."
            : "તમારા હાલના registered Email પર Mobile change OTP મોકલવામાં આવ્યો છે.");

    return res.status(200).json({
      message: profileSuccessMsg,
      otpSent: true,
    });

  } catch (error) {

    console.error(
      "❌ Profile OTP Error:",
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        "Profile update OTP મોકલવામાં સમસ્યા આવી.",
    });
  }
};

// =====================================================
// VERIFY PROFILE OTP
// POST /api/auth/profile/verify-otp
// LOGIN REQUIRED
// =====================================================

const verifyProfileOTP = async (
  req,
  res
) => {
  try {

    const {
      type,
      value,
      otp,
    } = req.body;

    if (
      !type ||
      !otp
    ) {
      return res.status(400).json({
        message:
          "OTP verification માટે Type અને OTP જરૂરી છે.",
      });
    }

    if (
      type !== "email" &&
      type !== "mobile"
    ) {
      return res.status(400).json({
        message:
          "Invalid OTP type.",
      });
    }

    const userId =
      req.userId.toString();

    const otpKey =
      getProfileOTPKey(
        userId,
        type
      );

    const storedOTP =
      otpStore.get(
        otpKey
      );

    if (!storedOTP) {

      console.log(
        "❌ Profile OTP Not Found:",
        otpKey
      );

      return res.status(400).json({
        message:
          "OTP મળ્યો નથી. પહેલા OTP મોકલો.",
      });
    }

    if (
      Date.now() >
      storedOTP.expiresAt
    ) {

      otpStore.delete(
        otpKey
      );

      return res.status(400).json({
        message:
          "OTP expire થઈ ગયો છે. ફરીથી OTP મોકલો / OTP समाप्त (expire) हो गया है। पुनः OTP भेजें।",
      });
    }

    const cleanOTP =
      otp
        .toString()
        .trim();

    if (
      !/^[0-9]{6}$/.test(
        cleanOTP
      )
    ) {
      return res.status(400).json({
        message:
          "6 અંકનો યોગ્ય OTP નાખો.",
      });
    }

    if (
      storedOTP.otp !==
      cleanOTP
    ) {

      return res.status(400).json({
        message:
          "OTP ખોટો છે. કૃપા કરીને ફરી તપાસો.",
      });
    }

    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {

      let cleanValue =
        value
          .toString()
          .trim();

      if (
        type === "email"
      ) {
        cleanValue =
          cleanValue
            .toLowerCase();
      }

      if (
        storedOTP.value !==
        cleanValue
      ) {
        return res.status(400).json({
          message:
            type === "email"
              ? "આ OTP આ Email માટે નથી."
              : "આ OTP આ Mobile Number માટે નથી.",
        });
      }
    }

    const verifiedOTP = {
      ...storedOTP,

      verified:
        true,

      verifiedAt:
        Date.now(),
    };

    otpStore.set(
      otpKey,
      verifiedOTP
    );

    console.log(
      "✅ Profile OTP Verified:",
      {
        userId,
        type,
      }
    );

    return res.status(200).json({
      message:
        type === "email"
          ? "Email OTP successfully verify થઈ ગયો છે. ✅"
          : "Mobile OTP successfully verify થઈ ગયો છે. ✅",

      verified:
        true,

      type,

      value:
        storedOTP.value,
    });

  } catch (error) {

    console.error(
      "❌ Verify Profile OTP Error:",
      error
    );

    return res.status(500).json({
      message:
        "OTP verificationમાં સમસ્યા આવી.",
      error:
        error.message,
    });
  }
};

// =====================================================
// UPDATE PROFILE
// PUT /api/auth/profile
// =====================================================

const updateProfile = async (
  req,
  res
) => {
  try {

    const userId =
      req.userId;

    const {
      name,
      mobile,
      email,
      birthDate,
      currentPassword,
      newPassword,
      emailOTP,
      mobileOTP,
    } = req.body;

    const user =
      await User.findById(
        userId
      ).select("+password");

    if (!user) {
      return res.status(404).json({
        message:
          "User મળ્યો નથી.",
      });
    }

    // =================================================
    // CHECK EMAIL CHANGE
    // =================================================

    let emailChanged =
      false;

    if (
      email !== undefined &&
      email
        .toString()
        .toLowerCase()
        .trim() !==
        user.email
          .toLowerCase()
    ) {
      emailChanged =
        true;
    }

    // =================================================
    // CHECK MOBILE CHANGE
    // =================================================

    let mobileChanged =
      false;

    if (
      mobile !== undefined &&
      mobile
        .toString()
        .trim() !==
        user.mobile
    ) {
      mobileChanged =
        true;
    }

    // =================================================
    // EMAIL OTP REQUIRED
    // =================================================

    if (
      emailChanged
    ) {

      if (!emailOTP) {
        return res.status(400).json({
          message:
            "Email બદલવા માટે OTP verification જરૂરી છે.",
        });
      }

      const cleanEmail =
        email
          .toString()
          .toLowerCase()
          .trim();

      const otpKey =
        getProfileOTPKey(
          userId,
          "email"
        );

      const storedOTP =
        otpStore.get(
          otpKey
        );

      if (!storedOTP) {
        return res.status(400).json({
          message:
            "Email OTP મળ્યો નથી. પહેલા OTP મોકલો.",
        });
      }

      if (
        Date.now() >
        storedOTP.expiresAt
      ) {

        otpStore.delete(
          otpKey
        );

        return res.status(400).json({
          message:
            "Email OTP expire થઈ ગયો છે. ફરીથી OTP મોકલો / Email OTP समाप्त (expire) हो गया है। पुनः OTP भेजें।",
        });
      }

      if (
        storedOTP.otp !==
        emailOTP
          .toString()
          .trim()
      ) {
        return res.status(400).json({
          message:
            "Email OTP ખોટો છે.",
        });
      }

      if (
        storedOTP.value !==
        cleanEmail
      ) {
        return res.status(400).json({
          message:
            "Email OTP આ Email માટે નથી.",
        });
      }

      if (
        storedOTP.verified !==
        true
      ) {
        return res.status(400).json({
          message:
            "પહેલા Email OTP verify કરો.",
        });
      }

      const existingEmail =
        await User.findOne({
          email:
            cleanEmail,

          _id: {
            $ne:
              userId,
          },
        });

      if (existingEmail) {
        return res.status(400).json({
          message:
            "આ Email બીજા accountમાં ઉપયોગમાં છે.",
        });
      }

      user.email =
        cleanEmail;

      otpStore.delete(
        otpKey
      );
    }

    // =================================================
    // MOBILE OTP REQUIRED
    // =================================================

    if (
      mobileChanged
    ) {

      if (!mobileOTP) {
        return res.status(400).json({
          message:
            "Mobile Number બદલવા માટે OTP verification જરૂરી છે.",
        });
      }

      const cleanMobile =
        mobile
          .toString()
          .trim();

      const otpKey =
        getProfileOTPKey(
          userId,
          "mobile"
        );

      const storedOTP =
        otpStore.get(
          otpKey
        );

      if (!storedOTP) {
        return res.status(400).json({
          message:
            "Mobile OTP મળ્યો નથી. પહેલા OTP મોકલો.",
        });
      }

      if (
        Date.now() >
        storedOTP.expiresAt
      ) {

        otpStore.delete(
          otpKey
        );

        return res.status(400).json({
          message:
            "Mobile OTP expire થઈ ગયો છે. ફરીથી OTP મોકલો / Mobile OTP समाप्त (expire) हो गया है। पुनः OTP भेजें।",
        });
      }

      if (
        storedOTP.otp !==
        mobileOTP
          .toString()
          .trim()
      ) {
        return res.status(400).json({
          message:
            "Mobile OTP ખોટો છે.",
        });
      }

      if (
        storedOTP.value !==
        cleanMobile
      ) {
        return res.status(400).json({
          message:
            "Mobile OTP આ Mobile Number માટે નથી.",
        });
      }

      if (
        storedOTP.verified !==
        true
      ) {
        return res.status(400).json({
          message:
            "પહેલા Mobile OTP verify કરો.",
        });
      }

      const existingMobile =
        await User.findOne({
          mobile:
            cleanMobile,

          _id: {
            $ne:
              userId,
          },
        });

      if (existingMobile) {
        return res.status(400).json({
          message:
            "આ Mobile Number બીજા accountમાં ઉપયોગમાં છે.",
        });
      }

      user.mobile =
        cleanMobile;

      otpStore.delete(
        otpKey
      );
    }

    // =================================================
    // NAME UPDATE
    // =================================================

    if (
      name !== undefined
    ) {

      const cleanName =
        name
          .toString()
          .trim();

      if (!cleanName) {
        return res.status(400).json({
          message:
            "Name ખાલી રાખી શકાતું નથી.",
        });
      }

      user.name =
        cleanName;
    }

    // =================================================
    // BIRTH DATE UPDATE
    // =================================================

    if (
      birthDate !== undefined
    ) {

      const parsedBirthDate =
        new Date(
          birthDate
        );

      if (
        Number.isNaN(
          parsedBirthDate.getTime()
        )
      ) {
        return res.status(400).json({
          message:
            "યોગ્ય Birth Date નાખો.",
        });
      }

      user.birthDate =
        parsedBirthDate;
    }

    // =================================================
    // STATE & CITY UPDATE
    // =================================================

    if (req.body.state !== undefined) {
      user.state = req.body.state.toString().trim();
    }

    if (req.body.city !== undefined) {
      user.city = req.body.city.toString().trim();
    }

    // =================================================
    // PASSWORD UPDATE
    // =================================================

    if (
      newPassword !== undefined &&
      newPassword !== ""
    ) {

      if (
        !currentPassword
      ) {
        return res.status(400).json({
          message:
            "Password બદલવા માટે Current Password જરૂરી છે.",
        });
      }

      const isCurrentPasswordCorrect =
        await bcrypt.compare(
          currentPassword,
          user.password
        );

      if (
        !isCurrentPasswordCorrect
      ) {
        return res.status(400).json({
          message:
            "Current Password ખોટો છે.",
        });
      }

      if (
        newPassword.length <
        6
      ) {
        return res.status(400).json({
          message:
            "New Password ઓછામાં ઓછો 6 charactersનો હોવો જોઈએ.",
        });
      }

      user.password =
        await bcrypt.hash(
          newPassword,
          10
        );
    }

    await user.save();

    const updatedUser =
      await User.findById(
        userId
      ).select(
        "-password"
      );

    return res.status(200).json({
      message:
        "Profile સફળતાપૂર્વક update થઈ ગઈ છે. ✅",

      user:
        updatedUser,
    });

  } catch (error) {

    console.error(
      "❌ Update Profile Error:",
      error
    );

    return res.status(500).json({
      message:
        "Profile update કરવામાં error આવ્યો.",
    });
  }
};

// =====================================================
// =====================================================
// FORGOT PASSWORD SYSTEM
// =====================================================
// =====================================================


// =====================================================
// SEND FORGOT PASSWORD OTP
// POST /api/auth/forgot-password/send-otp
// =====================================================

const sendForgotPasswordOTP = async (
  req,
  res
) => {
  try {

    const {
      email,
      language = "gu",
    } = req.body;

    // =================================================
    // REQUIRED EMAIL
    // =================================================

    if (!email) {
      return res.status(400).json({
        message:
          "Email ID જરૂરી છે.",
      });
    }

    // =================================================
    // CLEAN EMAIL
    // =================================================

    const cleanEmail =
      email
        .toString()
        .toLowerCase()
        .trim();

    // =================================================
    // EMAIL VALIDATION
    // =================================================

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        cleanEmail
      )
    ) {
      return res.status(400).json({
        message:
          "યોગ્ય Email ID નાખો.",
      });
    }

    // =================================================
    // FIND USER
    // =================================================

    const user =
      await User.findOne({
        email:
          cleanEmail,
      }).select("+password");

    // =================================================
    // USER NOT FOUND
    // =================================================

    if (!user) {
      return res.status(404).json({
        message:
          "આ Email સાથે કોઈ account મળ્યું નથી.",
      });
    }

    // =================================================
    // GENERATE OTP
    // =================================================

    const otp =
      generateOTP();

    // =================================================
    // EXPIRY
    // 10 MINUTES
    // =================================================

    const expiresAt =
      Date.now() +
      10 * 60 * 1000;

    // =================================================
    // OTP KEY
    // =================================================

    const otpKey =
      getForgotPasswordOTPKey(
        cleanEmail
      );

    // =================================================
    // STORE OTP
    // =================================================

    otpStore.set(
      otpKey,
      {
        otp,

        expiresAt,

        verified:
          false,

        email:
          cleanEmail,

        userId:
          user._id.toString(),
      }
    );

    // =================================================
    // SEND EMAIL
    // =================================================

    const subject = getOTPSubject("forgot_password", language);
    const html = generateOTPEmailHtml({
      name: user.name,
      otp,
      purpose: "forgot_password",
      language,
    });

    await sendEmail({
      to: cleanEmail,
      subject,
      html,
    });

    // =================================================
    // SUCCESS
    // =================================================

    const forgotSuccessMsg =
      language === "en"
        ? "Password reset OTP has been sent to your Email."
        : language === "hi"
        ? "पासवर्ड रीसेट के लिए आपके Email पर OTP भेज दिया गया है।"
        : "Password reset માટે તમારા Email પર OTP મોકલવામાં આવ્યો છે.";

    return res.status(200).json({
      message: forgotSuccessMsg,
      otpSent: true,
    });

  } catch (error) {

    console.error(
      "❌ Forgot Password OTP Error:",
      error
    );

    return res.status(500).json({

      message:
        "Password reset OTP મોકલવામાં સમસ્યા આવી.",

      error:
        error.message,
    });
  }
};


// =====================================================
// VERIFY FORGOT PASSWORD OTP
// POST /api/auth/forgot-password/verify-otp
// =====================================================

const verifyForgotPasswordOTP = async (
  req,
  res
) => {
  try {

    const {
      email,
      otp,
    } = req.body;

    // =================================================
    // REQUIRED
    // =================================================

    if (
      !email ||
      !otp
    ) {
      return res.status(400).json({
        message:
          "Email અને OTP જરૂરી છે.",
      });
    }

    // =================================================
    // CLEAN DATA
    // =================================================

    const cleanEmail =
      email
        .toString()
        .toLowerCase()
        .trim();

    const cleanOTP =
      otp
        .toString()
        .trim();

    // =================================================
    // OTP FORMAT
    // =================================================

    if (
      !/^[0-9]{6}$/.test(
        cleanOTP
      )
    ) {
      return res.status(400).json({
        message:
          "6 અંકનો યોગ્ય OTP નાખો.",
      });
    }

    // =================================================
    // OTP KEY
    // =================================================

    const otpKey =
      getForgotPasswordOTPKey(
        cleanEmail
      );

    // =================================================
    // GET OTP
    // =================================================

    const storedOTP =
      otpStore.get(
        otpKey
      );

    if (!storedOTP) {
      return res.status(400).json({
        message:
          "OTP મળ્યો નથી. પહેલા OTP મોકલો.",
      });
    }

    // =================================================
    // EXPIRY
    // =================================================

    if (
      Date.now() >
      storedOTP.expiresAt
    ) {

      otpStore.delete(
        otpKey
      );

      return res.status(400).json({
        message:
          "OTP expire થઈ ગયો છે. ફરીથી OTP મોકલો / OTP समाप्त (expire) हो गया है। पुनः OTP भेजें।",
      });
    }

    // =================================================
    // CHECK OTP
    // =================================================

    if (
      storedOTP.otp !==
      cleanOTP
    ) {
      return res.status(400).json({
        message:
          "OTP ખોટો છે. કૃપા કરીને ફરી તપાસો.",
      });
    }

    // =================================================
    // MARK VERIFIED
    // =================================================

    otpStore.set(
      otpKey,
      {
        ...storedOTP,

        verified:
          true,

        verifiedAt:
          Date.now(),
      }
    );

    // =================================================
    // SUCCESS
    // =================================================

    return res.status(200).json({

      message:
        "OTP successfully verify થઈ ગયો છે. ✅",

      verified:
        true,
    });

  } catch (error) {

    console.error(
      "❌ Verify Forgot Password OTP Error:",
      error
    );

    return res.status(500).json({

      message:
        "OTP verificationમાં સમસ્યા આવી.",

      error:
        error.message,
    });
  }
};


// =====================================================
// RESET PASSWORD
// POST /api/auth/forgot-password/reset
// =====================================================

const resetPassword = async (
  req,
  res
) => {
  try {

    const {
      email,
      newPassword,
      confirmPassword,
    } = req.body;

    // =================================================
    // REQUIRED
    // =================================================

    if (
      !email ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        message:
          "Email, New Password અને Confirm Password જરૂરી છે.",
      });
    }

    // =================================================
    // CLEAN EMAIL
    // =================================================

    const cleanEmail =
      email
        .toString()
        .toLowerCase()
        .trim();

    // =================================================
    // PASSWORD LENGTH
    // =================================================

    if (
      newPassword.length <
      6
    ) {
      return res.status(400).json({
        message:
          "New Password ઓછામાં ઓછો 6 charactersનો હોવો જોઈએ.",
      });
    }

    // =================================================
    // PASSWORD MATCH
    // =================================================

    if (
      newPassword !==
      confirmPassword
    ) {
      return res.status(400).json({
        message:
          "New Password અને Confirm Password match થતા નથી.",
      });
    }

    // =================================================
    // OTP KEY
    // =================================================

    const otpKey =
      getForgotPasswordOTPKey(
        cleanEmail
      );

    // =================================================
    // GET VERIFIED OTP
    // =================================================

    const storedOTP =
      otpStore.get(
        otpKey
      );

    if (!storedOTP) {
      return res.status(400).json({
        message:
          "Password reset OTP મળ્યો નથી. ફરીથી OTP process કરો.",
      });
    }

    // =================================================
    // CHECK OTP EXPIRY
    // =================================================

    if (
      Date.now() >
      storedOTP.expiresAt
    ) {

      otpStore.delete(
        otpKey
      );

      return res.status(400).json({
        message:
          "OTP expire થઈ ગયો છે. ફરીથી OTP મોકલો / OTP समाप्त (expire) हो गया है। पुनः OTP भेजें।",
      });
    }

    // =================================================
    // CHECK VERIFIED
    // =================================================

    if (
      storedOTP.verified !==
      true
    ) {
      return res.status(400).json({
        message:
          "પહેલા OTP verify કરો.",
      });
    }

    // =================================================
    // FIND USER
    // =================================================

    const user =
      await User.findOne({
        email:
          cleanEmail,
      }).select("+password");

    if (!user) {
      return res.status(404).json({
        message:
          "User મળ્યો નથી.",
      });
    }

    // =================================================
    // HASH NEW PASSWORD
    // =================================================

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        10
      );

    // =================================================
    // UPDATE PASSWORD
    // =================================================

    user.password =
      hashedPassword;

    await user.save();

    // =================================================
    // DELETE OTP
    // =================================================

    otpStore.delete(
      otpKey
    );

    // =================================================
    // SUCCESS
    // =================================================

    return res.status(200).json({

      message:
        "Password સફળતાપૂર્વક reset થઈ ગયો છે. ✅",

      passwordReset:
        true,
    });

  } catch (error) {

    console.error(
      "❌ Reset Password Error:",
      error
    );

    return res.status(500).json({

      message:
        "Password reset કરવામાં સમસ્યા આવી.",

      error:
        error.message,
    });
  }
};


// =====================================================
// PROFILE OTP FUNCTION ALIASES
// =====================================================

const sendProfileUpdateOTP =
  sendProfileOTP;

const verifyProfileUpdateOTP =
  verifyProfileOTP;

  const resetForgotPassword =
  resetPassword;


// =====================================================
// EXPORT
// =====================================================

module.exports = {

  // =====================================================
  // REGISTRATION OTP
  // =====================================================

  sendOTP,
  verifyOTP,

  // =====================================================
  // AUTHENTICATION
  // =====================================================

  registerUser,
  loginUser,

  // =====================================================
  // PROFILE
  // =====================================================

  getProfile,
  updateProfile,

  // =====================================================
  // PROFILE OTP
  // =====================================================

  sendProfileOTP,
  verifyProfileOTP,

  // Names used by authRoutes.js
  sendProfileUpdateOTP,
  verifyProfileUpdateOTP,

  // =====================================================
  // FORGOT PASSWORD
  // =====================================================

  sendForgotPasswordOTP,
  verifyForgotPasswordOTP,
  resetForgotPassword,
};