import fixWebmDuration from 'fix-webm-duration';

/**
 * videoDurationFixer.js
 *
 * Fixes duration metadata in browser-recorded video files (WebM & MP4).
 *
 * Browsers (Chromium/Chrome on Desktop & Android) record live video streams via MediaRecorder
 * without writing the final duration into the container metadata header (or setting it to 0 / unknown).
 * This causes phone galleries (Android/Samsung/Google Photos/iOS) to display incorrect durations
 * like "0:03" or prevent timeline seeking.
 *
 * This module inspects the container (WebM or MP4) and patches:
 * - WebM: EBML Info -> TimecodeScale (1ms) and Duration (in milliseconds)
 * - MP4: moov -> mvhd (movie duration), tkhd (track duration), mdhd (media duration), mehd (fragment duration)
 */

// WebM EBML element definitions
const WEBM_SECTIONS = {
  0xa45dfa3: { name: 'EBML', type: 'Container' },
  0x286: { name: 'EBMLVersion', type: 'Uint' },
  0x2f7: { name: 'EBMLReadVersion', type: 'Uint' },
  0x2f2: { name: 'EBMLMaxIDLength', type: 'Uint' },
  0x2f3: { name: 'EBMLMaxSizeLength', type: 'Uint' },
  0x282: { name: 'DocType', type: 'String' },
  0x287: { name: 'DocTypeVersion', type: 'Uint' },
  0x285: { name: 'DocTypeReadVersion', type: 'Uint' },
  0x6c: { name: 'Void', type: 'Binary' },
  0x3f: { name: 'CRC-32', type: 'Binary' },
  0x8538067: { name: 'Segment', type: 'Container' },
  0x14d9b74: { name: 'SeekHead', type: 'Container' },
  0x549a966: { name: 'Info', type: 'Container' },
  0xad7b1: { name: 'TimecodeScale', type: 'Uint' },
  0x489: { name: 'Duration', type: 'Float' },
  0x654ae6b: { name: 'Tracks', type: 'Container' },
  0x2e: { name: 'TrackEntry', type: 'Container' },
};

function doInherit(newClass, baseClass) {
  newClass.prototype = Object.create(baseClass.prototype);
  newClass.prototype.constructor = newClass;
}

function WebmBase(name, type) {
  this.name = name || 'Unknown';
  this.type = type || 'Unknown';
}
WebmBase.prototype.updateBySource = function () {};
WebmBase.prototype.setSource = function (source) {
  this.source = source;
  this.updateBySource();
};
WebmBase.prototype.updateByData = function () {};
WebmBase.prototype.setData = function (data) {
  this.data = data;
  this.updateByData();
};

function WebmUint(name, type) {
  WebmBase.call(this, name, type || 'Uint');
}
doInherit(WebmUint, WebmBase);
function padHex(hex) {
  return hex.length % 2 === 1 ? '0' + hex : hex;
}
WebmUint.prototype.updateBySource = function () {
  this.data = '';
  for (let i = 0; i < this.source.length; i++) {
    this.data += padHex(this.source[i].toString(16));
  }
};
WebmUint.prototype.updateByData = function () {
  const length = this.data.length / 2;
  this.source = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    this.source[i] = parseInt(this.data.substr(i * 2, 2), 16);
  }
};
WebmUint.prototype.getValue = function () {
  return parseInt(this.data, 16);
};
WebmUint.prototype.setValue = function (value) {
  this.setData(padHex(value.toString(16)));
};

function WebmFloat(name, type) {
  WebmBase.call(this, name, type || 'Float');
}
doInherit(WebmFloat, WebmBase);
WebmFloat.prototype.getFloatArrayType = function () {
  return this.source && this.source.length === 4 ? Float32Array : Float64Array;
};
WebmFloat.prototype.updateBySource = function () {
  const byteArray = new Uint8Array(this.source.slice().reverse());
  const floatArrayType = this.getFloatArrayType();
  const floatArray = new floatArrayType(byteArray.buffer);
  this.data = floatArray[0];
};
WebmFloat.prototype.updateByData = function () {
  const floatArrayType = this.getFloatArrayType();
  const floatArray = new floatArrayType([this.data]);
  const byteArray = new Uint8Array(floatArray.buffer);
  this.source = new Uint8Array(byteArray.slice().reverse());
};
WebmFloat.prototype.getValue = function () {
  return this.data;
};
WebmFloat.prototype.setValue = function (value) {
  this.setData(value);
};

function WebmContainer(name, type) {
  WebmBase.call(this, name, type || 'Container');
}
doInherit(WebmContainer, WebmBase);
WebmContainer.prototype.readByte = function () {
  return this.source[this.offset++];
};
WebmContainer.prototype.readUint = function () {
  const firstByte = this.readByte();
  const bytes = 8 - firstByte.toString(2).length;
  let value = firstByte - (1 << (7 - bytes));
  for (let i = 0; i < bytes; i++) {
    value *= 256;
    value += this.readByte();
  }
  return value;
};
WebmContainer.prototype.updateBySource = function () {
  this.data = [];
  for (this.offset = 0; this.offset < this.source.length; this.offset = end) {
    const id = this.readUint();
    const len = this.readUint();
    const end = Math.min(this.offset + len, this.source.length);
    const data = this.source.slice(this.offset, end);

    const info = WEBM_SECTIONS[id] || { name: 'Unknown', type: 'Unknown' };
    let ctr = WebmBase;
    switch (info.type) {
      case 'Container':
        ctr = WebmContainer;
        break;
      case 'Uint':
        ctr = WebmUint;
        break;
      case 'Float':
        ctr = WebmFloat;
        break;
    }
    const section = new ctr(info.name, info.type);
    section.setSource(data);
    this.data.push({
      id,
      idHex: id.toString(16),
      data: section,
    });
  }
};
WebmContainer.prototype.writeUint = function (x, draft) {
  let bytes = 1;
  let flag = 0x80;
  for (; x >= flag && bytes < 8; bytes++, flag *= 0x80) {}

  if (!draft) {
    let value = flag + x;
    for (let i = bytes - 1; i >= 0; i--) {
      const c = value % 256;
      this.source[this.offset + i] = c;
      value = (value - c) / 256;
    }
  }
  this.offset += bytes;
};
WebmContainer.prototype.writeSections = function (draft) {
  this.offset = 0;
  for (let i = 0; i < this.data.length; i++) {
    const section = this.data[i];
    const content = section.data.source;
    const contentLength = content.length;
    this.writeUint(section.id, draft);
    this.writeUint(contentLength, draft);
    if (!draft) {
      this.source.set(content, this.offset);
    }
    this.offset += contentLength;
  }
  return this.offset;
};
WebmContainer.prototype.updateByData = function () {
  const length = this.writeSections('draft');
  this.source = new Uint8Array(length);
  this.writeSections();
};
WebmContainer.prototype.getSectionById = function (id) {
  for (let i = 0; i < this.data.length; i++) {
    if (this.data[i].id === id) {
      return this.data[i].data;
    }
  }
  return null;
};

function WebmFile(source) {
  WebmContainer.call(this, 'File', 'File');
  this.setSource(source);
}
doInherit(WebmFile, WebmContainer);
WebmFile.prototype.fixDuration = function (durationMs) {
  const segmentSection = this.getSectionById(0x8538067);
  if (!segmentSection) return false;

  const infoSection = segmentSection.getSectionById(0x549a966);
  if (!infoSection) return false;

  let timeScaleSection = infoSection.getSectionById(0xad7b1);
  if (!timeScaleSection) {
    timeScaleSection = new WebmUint('TimecodeScale', 'Uint');
    timeScaleSection.setValue(1000000);
    infoSection.data.push({ id: 0xad7b1, data: timeScaleSection });
  } else {
    timeScaleSection.setValue(1000000);
  }

  // ALWAYS set or overwrite the duration float (in milliseconds)
  let durationSection = infoSection.getSectionById(0x489);
  if (durationSection) {
    durationSection.setValue(durationMs);
  } else {
    durationSection = new WebmFloat('Duration', 'Float');
    durationSection.setValue(durationMs);
    infoSection.data.push({ id: 0x489, data: durationSection });
  }

  infoSection.updateByData();
  segmentSection.updateByData();
  this.updateByData();
  return true;
};
WebmFile.prototype.toBlob = function (mimeType) {
  const buf = this.source.buffer.slice(
    this.source.byteOffset,
    this.source.byteOffset + this.source.byteLength
  );
  return new Blob([buf], { type: mimeType || 'video/webm' });
};

/**
 * Patch duration in MP4 container (ISO BMFF)
 */
export function patchMp4Duration(arrayBuffer, durationSeconds) {
  try {
    const data = new Uint8Array(arrayBuffer);
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let movieTimescale = 1000;

    function readBox(offset) {
      if (offset + 8 > data.length) return null;
      let size = view.getUint32(offset);
      const type = String.fromCharCode(
        data[offset + 4],
        data[offset + 5],
        data[offset + 6],
        data[offset + 7]
      );
      let headerSize = 8;
      if (size === 1) {
        if (offset + 16 > data.length) return null;
        size = Number(view.getBigUint64(offset + 8));
        headerSize = 16;
      } else if (size === 0) {
        size = data.length - offset;
      }
      return { offset, size, type, headerSize, end: offset + size };
    }

    function scanBoxes(start, end, onBox) {
      let offset = start;
      while (offset < end && offset + 8 <= data.length) {
        const box = readBox(offset);
        if (!box || box.size < 8) break;
        onBox(box);
        offset += box.size;
      }
    }

    scanBoxes(0, data.length, (moovBox) => {
      if (moovBox.type === 'moov') {
        scanBoxes(moovBox.offset + moovBox.headerSize, moovBox.end, (subBox) => {
          if (subBox.type === 'mvhd') {
            const v = data[subBox.offset + 8];
            if (v === 0) {
              movieTimescale = view.getUint32(subBox.offset + 20);
              if (movieTimescale > 0) {
                const durVal = Math.round(durationSeconds * movieTimescale);
                view.setUint32(subBox.offset + 24, durVal);
              }
            } else if (v === 1) {
              movieTimescale = view.getUint32(subBox.offset + 28);
              if (movieTimescale > 0) {
                const durVal = BigInt(Math.round(durationSeconds * movieTimescale));
                view.setBigUint64(subBox.offset + 32, durVal);
              }
            }
          } else if (subBox.type === 'trak') {
            scanBoxes(subBox.offset + subBox.headerSize, subBox.end, (trakSub) => {
              if (trakSub.type === 'tkhd') {
                const v = data[trakSub.offset + 8];
                if (v === 0) {
                  const durVal = Math.round(durationSeconds * movieTimescale);
                  view.setUint32(trakSub.offset + 28, durVal);
                } else if (v === 1) {
                  const durVal = BigInt(Math.round(durationSeconds * movieTimescale));
                  view.setBigUint64(trakSub.offset + 36, durVal);
                }
              } else if (trakSub.type === 'mdia') {
                scanBoxes(trakSub.offset + trakSub.headerSize, trakSub.end, (mdiaSub) => {
                  if (mdiaSub.type === 'mdhd') {
                    const v = data[mdiaSub.offset + 8];
                    if (v === 0) {
                      const mediaTimescale = view.getUint32(mdiaSub.offset + 20);
                      if (mediaTimescale > 0) {
                        const durVal = Math.round(durationSeconds * mediaTimescale);
                        view.setUint32(mdiaSub.offset + 24, durVal);
                      }
                    } else if (v === 1) {
                      const mediaTimescale = view.getUint32(mdiaSub.offset + 28);
                      if (mediaTimescale > 0) {
                        const durVal = BigInt(Math.round(durationSeconds * mediaTimescale));
                        view.setBigUint64(mdiaSub.offset + 32, durVal);
                      }
                    }
                  }
                });
              }
            });
          } else if (subBox.type === 'mvex') {
            scanBoxes(subBox.offset + subBox.headerSize, subBox.end, (mvexSub) => {
              if (mvexSub.type === 'mehd') {
                const v = data[mvexSub.offset + 8];
                if (v === 0) {
                  const durVal = Math.round(durationSeconds * movieTimescale);
                  view.setUint32(mvexSub.offset + 12, durVal);
                } else if (v === 1) {
                  const durVal = BigInt(Math.round(durationSeconds * movieTimescale));
                  view.setBigUint64(mvexSub.offset + 12, durVal);
                }
              }
            });
          }
        });
      }
    });

    return arrayBuffer;
  } catch (err) {
    console.warn('MP4 duration patch failed:', err);
    return arrayBuffer;
  }
}

/**
 * Main duration patcher for both WebM and MP4 blobs.
 * Takes the raw recorded Blob, injects the exact duration into metadata headers,
 * and returns the fixed Blob with accurate duration.
 *
 * @param {Blob} blob - The recorded video blob from MediaRecorder
 * @param {number} durationSeconds - The total actual duration in seconds
 * @param {string} mimeType - The mimeType string (e.g. "video/webm" or "video/mp4")
 * @returns {Promise<Blob>}
 */
export async function fixVideoDuration(blob, durationSeconds, mimeType = 'video/webm') {
  if (!blob || durationSeconds <= 0) {
    return blob;
  }

  try {
    const arrayBuffer = await blob.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength < 16) {
      return blob;
    }

    const uint8 = new Uint8Array(arrayBuffer);

    // Check EBML magic header: 0x1A 0x45 0xDF 0xA3 (WebM / Matroska)
    const isWebM =
      uint8[0] === 0x1a &&
      uint8[1] === 0x45 &&
      uint8[2] === 0xdf &&
      uint8[3] === 0xa3;

    if (isWebM) {
      try {
        const file = new WebmFile(uint8);
        const durationMs = Math.round(durationSeconds * 1000);
        if (file.fixDuration(durationMs)) {
          return file.toBlob(blob.type || mimeType || 'video/webm');
        }
      } catch (webmErr) {
        console.warn('WebM duration patch failed, trying fix-webm-duration fallback:', webmErr);
      }

      try {
        if (typeof fixWebmDuration === 'function') {
          return await new Promise((resolve) => {
            fixWebmDuration(blob, Math.round(durationSeconds * 1000), (fixed) => {
              resolve(fixed || blob);
            });
          });
        }
      } catch (fallbackErr) {
        console.warn('fix-webm-duration fallback error:', fallbackErr);
      }

      return blob;
    }

    // Check MP4 / ISO BMFF (bytes 4..7 is "ftyp" or mimeType is mp4)
    const isMp4 =
      (uint8[4] === 0x66 && uint8[5] === 0x74 && uint8[6] === 0x79 && uint8[7] === 0x70) ||
      (mimeType && mimeType.toLowerCase().includes('mp4'));

    if (isMp4) {
      try {
        patchMp4Duration(arrayBuffer, durationSeconds);
        return new Blob([arrayBuffer], { type: blob.type || mimeType || 'video/mp4' });
      } catch (mp4Err) {
        console.warn('MP4 duration patch failed:', mp4Err);
      }
    }

    return blob;
  } catch (err) {
    console.warn('fixVideoDuration error:', err);
    return blob;
  }
}
