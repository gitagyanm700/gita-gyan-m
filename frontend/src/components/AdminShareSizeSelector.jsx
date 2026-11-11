import { createPortal } from "react-dom";
import { Check, ChevronDown, Crown, Download, Maximize2, X } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { SHARE_CARD_SIZE_PRESETS } from "../utils/shareCardSizes.js";
import "./AdminShareSizeSelector.css";

export default function AdminShareSizeSelector({
  isSuperAdmin,
  selectedSizeId,
  isSheetOpen,
  sheetMode = "select",
  onOpenSheet,
  onCloseSheet,
  onSelectSize,
  onDownloadSize,
  disabled = false,
}) {
  const { txt } = useLanguage();

  // Strictly hidden for everyone except the 2 designated Super Admins
  if (!isSuperAdmin) return null;

  const activePreset =
    SHARE_CARD_SIZE_PRESETS.find((p) => p.id === selectedSizeId) ||
    SHARE_CARD_SIZE_PRESETS[0];

  const handleRowClick = (preset) => {
    if (sheetMode === "download" && typeof onDownloadSize === "function") {
      onDownloadSize(preset);
    } else if (typeof onSelectSize === "function") {
      onSelectSize(preset);
    }
  };

  return (
    <>
      {/* Compact Admin-Only Size Selector Bar */}
      <div className="admin-size-bar-wrapper">
        <button
          type="button"
          className="admin-size-bar-btn"
          onClick={() => onOpenSheet && onOpenSheet("select")}
          disabled={disabled}
          title={txt(
            "ઈમેજ ડાઉનલોડ સાઇઝ પસંદ કરો (Super Admin)",
            "इमेज डाउनलोड साइज़ चुनें (Super Admin)",
            "Select Image Export Size (Super Admin)"
          )}
        >
          <div className="admin-size-bar-left">
            <span className="admin-size-pill-badge">
              <Crown size={12} />
              <span>Super Admin</span>
            </span>
            <Maximize2 size={14} className="admin-size-icon" />
            <span className="admin-size-active-name">{activePreset.label}</span>
          </div>

          <div className="admin-size-bar-right">
            <span className="admin-size-ratio-chip">{activePreset.ratio}</span>
            <span className="admin-size-px-chip">
              {activePreset.width} × {activePreset.height}
            </span>
            <ChevronDown size={15} className="admin-size-chevron" />
          </div>
        </button>
      </div>

      {/* Size Picker Modal Sheet (Portal to body so it never clips) */}
      {isSheetOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="admin-size-sheet-overlay"
            onClick={(e) => {
              e.stopPropagation();
              onCloseSheet && onCloseSheet();
            }}
          >
            <div
              className="admin-size-sheet-card"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={txt(
                "ઈમેજ સાઇઝ પસંદ કરો",
                "इमेज साइज़ चुनें",
                "Select Image Size"
              )}
            >
              <div className="admin-size-sheet-header">
                <div className="admin-size-sheet-title">
                  <span className="admin-size-pill-badge">
                    <Crown size={12} />
                    <span>Super Admin</span>
                  </span>
                  <h4>
                    {sheetMode === "download"
                      ? txt(
                          "ડાઉનલોડ કરવા માટે સાઇઝ પસંદ કરો",
                          "डाउनलोड करने के लिए साइज़ चुनें",
                          "Select Size to Download"
                        )
                      : txt(
                          "ઈમેજ સાઇઝ પસંદ કરો",
                          "इमेज साइज़ चुनें",
                          "Select Export Size"
                        )}
                  </h4>
                </div>
                <button
                  type="button"
                  className="admin-size-sheet-close"
                  onClick={() => onCloseSheet && onCloseSheet()}
                  aria-label={txt("બંધ કરો", "बंद करें", "Close")}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="admin-size-sheet-hint">
                {sheetMode === "download"
                  ? txt(
                      "નીચેમાંથી જે સાઇઝ પસંદ કરશો તે સાઇઝમાં જ ઈમેજ ડાઉનલોડ થશે.",
                      "नीचे से जो साइज़ चुनेंगे उसी साइज़ में इमेज डाउनलोड होगी।",
                      "Click any size below to immediately download the image in those exact pixel dimensions."
                    )
                  : txt(
                      "સાઇઝ પર ક્લિક કરી પ્રિવ્યૂ જુઓ અથવા સીધા ડાઉનલોડ આઇકન પર ક્લિક કરો.",
                      "साइज़ पर क्लिक करके प्रीव्यू देखें या सीधे डाउनलोड आइकन पर क्लिक करें।",
                      "Click a row to preview that aspect ratio, or tap the download icon to export immediately."
                    )}
              </div>

              <div className="admin-size-table-wrap">
                <table className="admin-size-table">
                  <thead>
                    <tr>
                      <th>
                        {txt(
                          "ક્યાં ઉપયોગ કરવો?",
                          "कहाँ उपयोग करें?",
                          "Where to use?"
                        )}
                      </th>
                      <th className="col-ratio">Ratio</th>
                      <th className="col-pixels">Size (Pixels)</th>
                      <th className="col-action" aria-label="Download" />
                    </tr>
                  </thead>
                  <tbody>
                    {SHARE_CARD_SIZE_PRESETS.map((preset) => {
                      const isActive = preset.id === activePreset.id;
                      return (
                        <tr
                          key={preset.id}
                          className={`admin-size-row ${isActive ? "active" : ""}`}
                          onClick={() => handleRowClick(preset)}
                        >
                          <td className="col-platform">
                            <span className="platform-cell-inner">
                              {isActive && (
                                <Check
                                  size={14}
                                  strokeWidth={3}
                                  className="platform-active-check"
                                />
                              )}
                              <span>{preset.label}</span>
                            </span>
                          </td>
                          <td className="col-ratio">
                            <span className="table-ratio-badge">{preset.ratio}</span>
                          </td>
                          <td className="col-pixels">
                            {preset.width} × {preset.height}
                          </td>
                          <td className="col-action">
                            <button
                              type="button"
                              className="row-quick-download-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDownloadSize && onDownloadSize(preset);
                              }}
                              title={txt(
                                `${preset.width}×${preset.height} માં ડાઉનલોડ કરો`,
                                `${preset.width}×${preset.height} में डाउनलोड करें`,
                                `Download ${preset.width}×${preset.height}`
                              )}
                              aria-label={`Download ${preset.label} (${preset.width}x${preset.height})`}
                            >
                              <Download size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
