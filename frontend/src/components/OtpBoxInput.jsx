import React, { useRef, useEffect } from "react";
import "./OtpBoxInput.css";

export default function OtpBoxInput({
  length = 6,
  value = "",
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
  hasError = false,
}) {
  const inputRefs = useRef([]);

  // Ensure refs array has right size
  if (inputRefs.current.length !== length) {
    inputRefs.current = Array(length).fill(null);
  }

  // Convert string value to array of length
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  useEffect(() => {
    if (autoFocus && !disabled) {
      const firstEmptyIndex = digits.findIndex((d) => !d);
      const targetIndex = firstEmptyIndex === -1 ? 0 : firstEmptyIndex;
      inputRefs.current[targetIndex]?.focus();
    }
  }, []);

  const handleMultiDigits = (cleanDigits, startIndex = 0) => {
    const newDigits = [...digits];
    let writeIdx = startIndex;
    for (let i = 0; i < cleanDigits.length && writeIdx < length; i++) {
      newDigits[writeIdx] = cleanDigits[i];
      writeIdx++;
    }
    const newOtp = newDigits.join("");
    if (onChange) onChange(newOtp);

    const focusIdx = Math.min(writeIdx, length - 1);
    inputRefs.current[focusIdx]?.focus();

    if (newDigits.every((d) => d !== "") && newOtp.length === length) {
      if (onComplete) onComplete(newOtp);
    }
  };

  const handleChange = (index, e) => {
    const rawVal = e.target.value;
    const cleanDigits = rawVal.replace(/\D/g, "");

    // Browser SMS autofill or multi-digit paste
    if (cleanDigits.length > 1) {
      handleMultiDigits(cleanDigits, index);
      return;
    }

    const singleDigit = cleanDigits.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = singleDigit;
    const newOtp = newDigits.join("");

    if (onChange) onChange(newOtp);

    if (singleDigit) {
      // Auto move cursor to next box
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
      // If all 6 digits are filled, auto verify
      if (newDigits.every((d) => d !== "") && newOtp.length === length) {
        if (onComplete) onComplete(newOtp);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Current box is empty, clear previous box and focus it
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        const newOtp = newDigits.join("");
        if (onChange) onChange(newOtp);
        inputRefs.current[index - 1]?.focus();
        e.preventDefault();
      } else if (digits[index]) {
        // Clear current box
        const newDigits = [...digits];
        newDigits[index] = "";
        const newOtp = newDigits.join("");
        if (onChange) onChange(newOtp);
        e.preventDefault();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      e.preventDefault();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const cleanDigits = pastedData.replace(/\D/g, "").slice(0, length);
    if (!cleanDigits) return;
    handleMultiDigits(cleanDigits, 0);
  };

  return (
    <div className={`otp-boxes-container ${hasError ? "has-error" : ""}`}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={index === 0 ? length : 1}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          value={digits[index]}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          className={`otp-digit-box ${digits[index] ? "filled" : ""}`}
          aria-label={`OTP Digit ${index + 1}`}
        />
      ))}
    </div>
  );
}
