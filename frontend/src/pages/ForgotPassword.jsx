import { useState } from "react";
import { Eye, EyeOff, Mail, KeyRound, Lock, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";
import OtpBoxInput from "../components/OtpBoxInput.jsx";
import "./ForgotPassword.css";

const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const AUTH_API_URL = isLocal
  ? "http://localhost:5000/api/auth"
  : "https://bhagavad-gita-backend-jy1a.onrender.com/api/auth";

function ForgotPassword() {
  const navigate = useNavigate();
  const { isHindi, isEnglish, isGujarati, txt } = useLanguage();

  // =====================================================
  // STATE
  // =====================================================

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [step, setStep] = useState(1);

  const [loading, setLoading] = useState(false);

  // =====================================================
// PASSWORD VISIBILITY
// =====================================================

const [showNewPassword, setShowNewPassword] =
  useState(false);

const [showConfirmPassword, setShowConfirmPassword] =
  useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =====================================================
  // SEND OTP
  // =====================================================

  const handleSendOTP = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!email.trim()) {
      setError(txt("કૃપા કરીને Email ID નાખો.", "कृपया Email ID दर्ज करें।", "Please enter your Email ID."));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${AUTH_API_URL}/forgot-password/send-otp`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            language: isEnglish ? "en" : isHindi ? "hi" : "gu",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            txt("OTP મોકલવામાં સમસ્યા આવી.", "OTP भेजने में समस्या आई।", "Failed to send OTP.")
        );
      }

      setMessage(
        data.message ||
          txt("તમારા Email પર OTP મોકલવામાં આવ્યો છે.", "आपके Email पर OTP भेजा गया है।", "OTP has been sent to your Email.")
      );

      setStep(2);
    } catch (err) {
      console.error(
        "❌ Send Forgot Password OTP Error:",
        err
      );

      setError(
        err.message || txt("OTP મોકલવામાં સમસ્યા આવી.", "OTP भेजने में समस्या आई।", "Failed to send OTP.")
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // VERIFY OTP (AUTO OR SUBMIT)
  // =====================================================

  const handleVerifyOTP = async (otpToVerify, e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    const code = (typeof otpToVerify === "string" ? otpToVerify : otp).trim();

    setMessage("");
    setError("");

    if (!code) {
      setError(
        txt("કૃપા કરીને 6 અંકનો OTP નાખો.", "कृपया 6 अंकों का OTP दर्ज करें।", "Please enter the 6-digit OTP.")
      );
      return;
    }

    if (!/^[0-9]{6}$/.test(code)) {
      setError(
        txt("યોગ્ય 6 અંકનો OTP નાખો.", "मान्य 6 अंकों का OTP दर्ज करें।", "Please enter a valid 6-digit OTP.")
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${AUTH_API_URL}/forgot-password/verify-otp`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email:
              email.trim().toLowerCase(),

            otp: code,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            txt("OTP verification નિષ્ફળ થયું.", "OTP verification विफल रहा।", "OTP verification failed.")
        );
      }

      setMessage(
        data.message ||
          txt("OTP successfully verify થઈ ગયો છે.", "OTP सफलतापूर्वक verify हो गया है।", "OTP verified successfully.")
      );

      setStep(3);
    } catch (err) {
      console.error(
        "❌ Verify Forgot Password OTP Error:",
        err
      );

      setError(
        err.message ||
          txt("OTP verificationમાં સમસ્યા આવી.", "OTP verification में समस्या आई।", "Error during OTP verification.")
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RESET PASSWORD
  // =====================================================

  const handleResetPassword = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!newPassword) {
      setError(
        txt("કૃપા કરીને New Password નાખો.", "कृपया New Password दर्ज करें।", "Please enter new password.")
      );
      return;
    }

    if (newPassword.length < 6) {
      setError(
        txt("New Password ઓછામાં ઓછો 6 charactersનો હોવો જોઈએ.", "New Password कम से कम 6 अक्षरों का होना चाहिए।", "New password must be at least 6 characters.")
      );
      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        txt("New Password અને Confirm Password સરખા નથી.", "New Password और Confirm Password समान नहीं हैं।", "New password and Confirm password do not match.")
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${AUTH_API_URL}/forgot-password/reset-password`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email:
              email.trim().toLowerCase(),

            newPassword,

            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            txt("Password reset કરવામાં સમસ્યા આવી.", "Password reset करने में समस्या आई।", "Failed to reset password.")
        );
      }

      setMessage(
        data.message ||
          txt("Password successfully reset થઈ ગયો છે.", "Password सफलतापूर्वक reset हो गया है।", "Password reset successfully.")
      );

      // =================================================
      // CLEAR PASSWORD FIELDS
      // =================================================

      setNewPassword("");
      setConfirmPassword("");

      // =================================================
      // GO TO LOGIN
      // =================================================

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      console.error(
        "❌ Reset Password Error:",
        err
      );

      setError(
        err.message || txt("Password reset કરવામાં સમસ્યા આવી.", "Password reset करने में समस्या आई।", "Failed to reset password.")
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // BACK TO LOGIN
  // =====================================================

  const handleBackToLogin = () => {
    navigate("/login");
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <main className="forgot-password-page">

      <div className="forgot-password-card">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="forgot-password-header">

          <div className="forgot-password-om">
            ॐ
          </div>

          <h1>
            {txt("Forgot Password", "Forgot Password", "Forgot Password")}
          </h1>

          <p>
            {txt("તમારો Password ફરીથી set કરો", "अपना Password पुनः set करें", "Reset your password")}
          </p>

        </div>


        {/* =================================================
            STEP INDICATOR
        ================================================= */}

        <div className="forgot-password-steps">

          <div
            className={
              step >= 1
                ? "forgot-step active"
                : "forgot-step"
            }
          >
            <span>1</span>
            <small>{txt("ઇમેઇલ", "ईमेल", "Email")}</small>
          </div>

          <div className="forgot-step-line"></div>

          <div
            className={
              step >= 2
                ? "forgot-step active"
                : "forgot-step"
            }
          >
            <span>2</span>
            <small>OTP</small>
          </div>

          <div className="forgot-step-line"></div>

          <div
            className={
              step >= 3
                ? "forgot-step active"
                : "forgot-step"
            }
          >
            <span>3</span>
            <small>{txt("પાસવર્ડ", "पासवर्ड", "Password")}</small>
          </div>

        </div>


        {/* =================================================
            MESSAGE
        ================================================= */}

        {message && (
          <div className="forgot-success">
            <CheckCircle size={16} className="btn-icon" /> {message}
          </div>
        )}

        {error && (
          <div className="forgot-error">
            <AlertCircle size={16} className="btn-icon" /> {error}
          </div>
        )}


        {/* =================================================
            STEP 1
            EMAIL
        ================================================= */}

        {step === 1 && (

          <form
            className="forgot-password-form"
            onSubmit={handleSendOTP}
          >

            <div className="forgot-form-icon">
              <Mail size={32} color="#2563eb" />
            </div>

            <h2>
              {txt("Email Verification", "Email Verification", "Email Verification")}
            </h2>

            <p>
              {txt("તમારા registered Email ID પર OTP મોકલવામાં આવશે.", "आपके registered Email ID पर OTP भेजा जाएगा।", "An OTP will be sent to your registered Email ID.")}
            </p>


            <label>
              {txt("રજિસ્ટર્ડ ઇમેઇલ", "पंजीकृत ईमेल", "Registered Email")}
            </label>

            <input
              type="email"
              placeholder={txt("તમારું Email નાખો", "अपना Email दर्ज करें", "Enter your Email")}
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              autoComplete="email"
              disabled={loading}
            />


            <button
              type="submit"
              className="forgot-primary-button"
              disabled={loading}
            >
              {loading
                ? <><Loader2 size={16} className="spinner btn-icon" /> {txt("OTP મોકલાઈ રહ્યો છે...", "OTP भेजा जा रहा है...", "Sending OTP...")}</>
                : <><Mail size={16} className="btn-icon" /> {txt("OTP મોકલો", "OTP भेजें", "Send OTP")}</>}
            </button>

          </form>
        )}


        {/* =================================================
            STEP 2
            OTP (6-BOX AUTO-VERIFY)
        ================================================= */}

        {step === 2 && (

          <form
            className="forgot-password-form"
            onSubmit={(e) => handleVerifyOTP(otp, e)}
          >

            <div className="forgot-form-icon">
              <KeyRound size={32} color="#2563eb" />
            </div>

            <h2>
              {txt("OTP દાખલ કરો", "OTP दर्ज करें", "Enter OTP")}
            </h2>

            <p>
              <strong>
                {email}
              </strong>

              <br />

              {txt("પર મોકલવામાં આવેલ 6 અંકનો OTP નાખો.", "पर भेजा गया 6 अंकों का OTP दर्ज करें।", "Enter the 6-digit OTP sent to this email.")}
            </p>

            <label style={{ textAlign: "center", marginBottom: "4px" }}>
              OTP
            </label>

            {/* 6-DIGIT OTP BOX INPUT */}
            <OtpBoxInput
              length={6}
              value={otp}
              onChange={(newOtp) => {
                setOtp(newOtp);
                if (error) setError("");
              }}
              onComplete={(completedOtp) => {
                handleVerifyOTP(completedOtp);
              }}
              disabled={loading}
              hasError={Boolean(error)}
              autoFocus={true}
            />

            {/* AUTO-VERIFYING FEEDBACK */}
            {loading && (
              <div className="otp-auto-verifying-status">
                <Loader2 size={18} className="spinner btn-icon" />
                <span>{txt("OTP Verify થઈ રહ્યો છે...", "OTP Verify हो रहा है...", "Verifying OTP...")}</span>
              </div>
            )}

            <button
              type="button"
              className="forgot-secondary-button"
              onClick={() => {
                setStep(1);
                setOtp("");
                setMessage("");
                setError("");
              }}
              disabled={loading}
            >
              <ArrowLeft size={15} className="btn-icon" /> {txt("Email ફરી નાખો", "Email पुनः दर्ज करें", "Re-enter Email")}
            </button>

          </form>
        )}


        {/* =================================================
            STEP 3
            RESET PASSWORD
        ================================================= */}

        {step === 3 && (

          <form
            className="forgot-password-form"
            onSubmit={handleResetPassword}
          >

            <div className="forgot-form-icon">
              <Lock size={32} color="#2563eb" />
            </div>

            <h2>
              {txt("નવો Password બનાવો", "नया Password बनाएं", "Create New Password")}
            </h2>

            <p>
              {txt("હવે તમારા account માટે નવો Password બનાવો.", "अब अपने account के लिए नया Password बनाएं।", "Now create a new password for your account.")}
            </p>


            <label>
              {txt("નવો Password", "नया Password", "New Password")}
            </label>

<div className="password-input-container">

  <input
    type={
      showNewPassword
        ? "text"
        : "password"
    }
    placeholder={txt("નવો Password", "नया Password", "New Password")}
    value={newPassword}
    onChange={(e) =>
      setNewPassword(
        e.target.value
      )
    }
    autoComplete="new-password"
    disabled={loading}
  />

  <button
    type="button"
    className="password-toggle-button"
    onClick={() =>
      setShowNewPassword(
        (previous) => !previous
      )
    }
    aria-label={
      showNewPassword
        ? txt("Password સંતાડો", "Password छिपाएं", "Hide Password")
        : txt("Password બતાવો", "Password दिखाएं", "Show Password")
    }
    title={
      showNewPassword
        ? txt("Password સંતાડો", "Password छिपाएं", "Hide Password")
        : txt("Password બતાવો", "Password दिखाएं", "Show Password")
    }
  >
    {showNewPassword ? (
      <EyeOff
        size={20}
        strokeWidth={2}
      />
    ) : (
      <Eye
        size={20}
        strokeWidth={2}
      />
    )}
  </button>

</div>


            <label>
              {txt("Confirm New Password", "Confirm New Password", "Confirm New Password")}
            </label>

<div className="password-input-container">

  <input
    type={
      showConfirmPassword
        ? "text"
        : "password"
    }
    placeholder={txt("Password ફરી નાખો", "Password पुनः दर्ज करें", "Re-enter Password")}
    value={confirmPassword}
    onChange={(e) =>
      setConfirmPassword(
        e.target.value
      )
    }
    autoComplete="new-password"
    disabled={loading}
  />

  <button
    type="button"
    className="password-toggle-button"
    onClick={() =>
      setShowConfirmPassword(
        (previous) => !previous
      )
    }
    aria-label={
      showConfirmPassword
        ? txt("Confirm Password સંતાડો", "Confirm Password छिपाएं", "Hide Confirm Password")
        : txt("Confirm Password બતાવો", "Confirm Password दिखाएं", "Show Confirm Password")
    }
    title={
      showConfirmPassword
        ? txt("Confirm Password સંતાડો", "Confirm Password छिपाएं", "Hide Confirm Password")
        : txt("Confirm Password બતાવો", "Confirm Password दिखाएं", "Show Confirm Password")
    }
  >
    {showConfirmPassword ? (
      <EyeOff
        size={20}
        strokeWidth={2}
      />
    ) : (
      <Eye
        size={20}
        strokeWidth={2}
      />
    )}
  </button>

</div>


            <button
              type="submit"
              className="forgot-primary-button"
              disabled={loading}
            >
              {loading
                ? <><Loader2 size={16} className="spinner btn-icon" /> {txt("Password reset થઈ રહ્યો છે...", "Password reset हो रहा है...", "Resetting Password...")}</>
                : <><Lock size={16} className="btn-icon" /> {txt("Password Reset કરો", "Password Reset करें", "Reset Password")}</>}
            </button>

          </form>
        )}


        {/* =================================================
            BACK TO LOGIN
        ================================================= */}

        <div className="forgot-login-link">

          <button
            type="button"
            onClick={handleBackToLogin}
            disabled={loading}
          >
            <ArrowLeft size={15} className="btn-icon" /> {txt("Login Page પર પાછા જાઓ", "Login Page पर वापस जाएं", "Back to Login Page")}
          </button>

        </div>

      </div>

    </main>
  );
}

export default ForgotPassword;