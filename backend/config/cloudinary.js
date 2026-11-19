const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "bi4h5jje",
  api_key: process.env.CLOUDINARY_API_KEY || "292824945687632",
  api_secret: process.env.CLOUDINARY_API_SECRET || "QPIlaAZV4GBDW87R-47jf1XWGbs",
  secure: true,
});

module.exports = cloudinary;
