import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Cloud,
  Upload,
  Trash2,
  RefreshCw,
  X,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
} from "lucide-react";
import { getValidToken } from "../utils/authHelper";
import "./CloudScenesManagerModal.css";

export default function CloudScenesManagerModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(null);

  const fileInputRef = useRef(null);

  const isLocalHost =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");
  const API_BASE = isLocalHost
    ? "http://localhost:5000"
    : "https://bhagavad-gita-backend-jy1a.onrender.com";

  // Lock body scroll while modal is open
  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, []);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (previewIndex === null) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setPreviewIndex(null);
      if (e.key === "ArrowLeft") {
        setPreviewIndex((idx) => (idx > 0 ? idx - 1 : idx));
      }
      if (e.key === "ArrowRight") {
        setPreviewIndex((idx) => (idx < scenes.length - 1 ? idx + 1 : idx));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewIndex, scenes.length]);

  // Fetch Cloudinary scenes
  const loadScenes = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/api/scenes${forceRefresh ? "?refresh=true" : ""}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.scenes)) {
        setScenes(data.scenes);
      } else {
        setError(data.message || "સીન્સ લોડ કરવામાં નિષ્ફળતા");
      }
    } catch (err) {
      console.error("Fetch scenes error:", err);
      setError("Cloudinary સર્વર સાથે કનેક્ટ થઈ શક્યું નથી");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScenes();
  }, []);

  // Handle Bulk File Upload
  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    setError(null);
    setSuccessMsg(null);
    setUploadProgress({ current: 0, total: files.length });

    const token = getValidToken();

    // Helper: convert File to base64
    const fileToBase64 = (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ dataUrl: reader.result, name: file.name });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

    try {
      // Process in batches of 4 images to prevent payload limits
      const BATCH_SIZE = 4;
      let uploadedSoFar = 0;

      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batchFiles = files.slice(i, i + BATCH_SIZE);
        const base64Batch = await Promise.all(batchFiles.map(fileToBase64));

        const res = await fetch(`${API_BASE}/api/scenes/upload`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ images: base64Batch }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "અપલોડમાં ભૂલ થઈ");
        }

        uploadedSoFar += batchFiles.length;
        setUploadProgress({ current: uploadedSoFar, total: files.length });
      }

      setSuccessMsg(`${files.length} ઈમેજો સફળતાપૂર્વક Cloudinary પર અપલોડ થઈ ગઈ!`);
      // Reload list
      await loadScenes(true);
    } catch (err) {
      console.error("Bulk upload error:", err);
      setError(err.message || "ઈમેજ અપલોડ કરવામાં ભૂલ થઈ");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Delete scene from Cloudinary
  const handleDelete = async (publicId) => {
    if (!window.confirm("શું તમે આ ઈમેજને Cloudinary માંથી ડિલીટ કરવા માંગો છો?")) return;

    try {
      const token = getValidToken();
      // Extract encoded publicId (replace slashes with ~ or encode)
      const encodedId = encodeURIComponent(publicId);
      const res = await fetch(`${API_BASE}/api/scenes/${encodedId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setScenes((prev) => prev.filter((s) => s.public_id !== publicId));
        setSuccessMsg("ઈમેજ સફળતાપૂર્વક હટાવી દીધી");
      } else {
        alert(data.message || "ડિલીટ કરવામાં ભૂલ થઈ");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("ડિલીટ કરતી વખતે સર્વર એરર આવી");
    }
  };

  return createPortal(
    <div className="cloud-scenes-modal-overlay" onClick={onClose}>
      <div
        className="cloud-scenes-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="cloud-scenes-modal-header">
          <div className="cloud-scenes-header-left">
            <div className="cloud-scenes-header-icon">
              <Cloud size={24} />
            </div>
            <div>
              <h2 className="cloud-scenes-modal-title">
                Cloudinary 9:16 Video Scenes Gallery
              </h2>
              <p className="cloud-scenes-modal-subtitle">
                ક્લાઉડ CDN પર હોસ્ટ થયેલી 9:16 વર્ટિકલ ઈમેજો (કુલ: {scenes.length} / 500)
              </p>
            </div>
          </div>
          <button
            type="button"
            className="cloud-scenes-close-btn"
            onClick={onClose}
            title="બંધ કરો"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="cloud-scenes-modal-body">
          {/* STATS & ACTIONS BAR */}
          <div className="cloud-scenes-stats-bar">
            <div className="cloud-scenes-stat-item">
              <span className="cloud-scenes-stat-badge">
                Cloud: bi4h5jje
              </span>
              <span className="cloud-scenes-stat-label">
                <strong>{scenes.length}</strong> સીન્સ ઉપલબ્ધ છે
              </span>
            </div>

            <div className="cloud-scenes-actions-group">
              <button
                type="button"
                className="cloud-scenes-refresh-btn"
                onClick={() => loadScenes(true)}
                disabled={loading || isUploading}
                title="રિફ્રેશ કરો"
              >
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
                રિફ્રેશ
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={handleFilesSelected}
              />

              <button
                type="button"
                className="cloud-scenes-upload-btn"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    અપલોડ થઈ રહ્યું છે...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Bulk Upload 9:16 Images
                  </>
                )}
              </button>
            </div>
          </div>

          {/* PROGRESS BOX */}
          {isUploading && (
            <div className="cloud-scenes-progress-box">
              <div className="cloud-scenes-progress-info">
                <span>ઈમેજો Cloudinary CDN પર અપલોડ થઈ રહી છે...</span>
                <span>
                  {uploadProgress.current} / {uploadProgress.total} (
                  {Math.round((uploadProgress.current / (uploadProgress.total || 1)) * 100)}%)
                </span>
              </div>
              <div className="cloud-scenes-progress-track">
                <div
                  className="cloud-scenes-progress-fill"
                  style={{
                    width: `${Math.round(
                      (uploadProgress.current / (uploadProgress.total || 1)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* SUCCESS / ERROR ALERTS */}
          {successMsg && (
            <div style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.2)", border: "1px solid rgba(16, 185, 129, 0.4)", color: "#10b981", fontSize: "0.86rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} /> {successMsg}
            </div>
          )}

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#ef4444", fontSize: "0.86rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* COMPACT UPLOAD BANNER */}
          <div
            className="cloud-scenes-compact-dropzone"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <div className="cloud-scenes-dropzone-left">
              <ImageIcon size={22} style={{ color: "#fbbf24", flexShrink: 0 }} />
              <div>
                <div className="cloud-scenes-dropzone-text">
                  <strong>નવી 9:16 ઈમેજો અપલોડ કરો</strong> (એકસાથે ૧૦, ૫૦, ૧૦૦ કે ૫૦૦ ઈમેજો સિલેક્ટ કરો)
                </div>
                <div className="cloud-scenes-dropzone-hint">
                  JPG, PNG, WebP ફોર્મેટ • ક્લાઉડ CDN પર 9:16 વિડિયો સીન તરીકે સેવ થશે
                </div>
              </div>
            </div>
            <button
              type="button"
              className="cloud-scenes-upload-btn"
              style={{ padding: "6px 14px", fontSize: "0.82rem" }}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current && fileInputRef.current.click();
              }}
            >
              <Upload size={14} /> ફાઈલો પસંદ કરો
            </button>
          </div>

          {/* GALLERY GRID */}
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
              <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto 12px auto", color: "#fbbf24" }} />
              <div>Cloudinary CDN માંથી 9:16 સીન્સ ફેચ થઈ રહ્યા છે...</div>
            </div>
          ) : scenes.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
              કોઈ સીન મળ્યો નથી. "Bulk Upload" બટન પર ક્લિક કરીને નવી ઈમેજો ઉમેરો.
            </div>
          ) : (
            <div className="cloud-scenes-grid">
              {scenes.map((s, idx) => (
                <div
                  key={s.public_id || idx}
                  className="cloud-scene-card"
                  onClick={() => setPreviewIndex(idx)}
                  title="ક્લિક કરીને ફૂલ-સાઈઝ 9:16 માં જુઓ"
                >
                  <img src={s.url} alt={`Scene ${idx + 1}`} loading="lazy" />
                  <span className="cloud-scene-badge">
                    #{idx + 1} • {s.format ? s.format.toUpperCase() : "9:16"}
                  </span>
                  <div className="cloud-scene-zoom-hint">
                    🔍 View Full
                  </div>
                  <button
                    type="button"
                    className="cloud-scene-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(s.public_id);
                    }}
                    title="ડિલીટ કરો"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="cloud-scene-info-overlay">
                    {s.public_id.split("/").pop()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CLI SCRIPT HELP */}
          <div className="cloud-scenes-cli-help">
            <FileText size={20} style={{ color: "#38bdf8", flexShrink: 0 }} />
            <div>
              <strong>પ્રો-ટીપ (કમાન્ડ લાઈનથી અપલોડ):</strong> તમે તમારા ફોલ્ડરમાંથી ૫૦૦ ઈમેજો ટર્મિનલ દ્વારા પણ ૧-ક્લિકમાં અપલોડ કરી શકો છો:
              <br />
              <span className="cloud-scenes-cli-code">
                node backend/scripts/uploadScenesToCloudinary.js "તમારા_ફોલ્ડરનો_પાથ"
              </span>
            </div>
          </div>
        </div>

        {/* FULLSCREEN LIGHTBOX PREVIEW */}
        {previewIndex !== null && scenes[previewIndex] && (
          <div
            className="cloud-lightbox-overlay"
            onClick={() => setPreviewIndex(null)}
          >
            <div
              className="cloud-lightbox-content"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="cloud-lightbox-close"
                onClick={() => setPreviewIndex(null)}
                title="બંધ કરો (Esc)"
              >
                <X size={20} />
              </button>

              {previewIndex > 0 && (
                <button
                  type="button"
                  className="cloud-lightbox-nav-btn prev"
                  onClick={() => setPreviewIndex(previewIndex - 1)}
                  title="પાછળ (Left Arrow)"
                >
                  ‹
                </button>
              )}

              <img
                src={scenes[previewIndex].url}
                alt={`Scene ${previewIndex + 1}`}
                className="cloud-lightbox-img"
              />

              {previewIndex < scenes.length - 1 && (
                <button
                  type="button"
                  className="cloud-lightbox-nav-btn next"
                  onClick={() => setPreviewIndex(previewIndex + 1)}
                  title="આગળ (Right Arrow)"
                >
                  ›
                </button>
              )}

              <div className="cloud-lightbox-title">
                #{previewIndex + 1} • {scenes[previewIndex].public_id.split("/").pop()}
                {scenes[previewIndex].width && scenes[previewIndex].height
                  ? ` (${scenes[previewIndex].width} × ${scenes[previewIndex].height})`
                  : ""}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
