const mongoose = require("mongoose");

const sceneItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    sceneTitle: { type: String, default: "" },
    text: { type: String, default: "" },
    imageSrc: { type: String, default: null }, // Permanent Cloudinary CDN URL or image URL
    audioDuration: { type: Number, default: 0 },
  },
  { _id: false }
);

const storyProjectSchema = new mongoose.Schema(
  {
    title: { type: String, default: "અનામી વાર્તા પ્રોજેક્ટ", trim: true },
    lang: { type: String, default: "gu" },
    aspectRatio: { type: String, default: "9:16" },
    subtitlePos: { type: String, default: "auto" },
    voice: { type: String, default: "male" },
    scenes: [sceneItemSchema],
    sceneCount: { type: Number, default: 0 },
    thumbnailUrl: { type: String, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdByName: { type: String, default: "Admin" },
    lastEditedBy: { type: String, default: "Admin" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StoryProject", storyProjectSchema);
