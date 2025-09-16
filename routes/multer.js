const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const allowedFileTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/svg+xml",
  "image/webp",
  "image/avif",
];

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images/uploads");
  },
  filename: (req, file, cb) => {
    const fileName = uuidv4();
    cb(null, fileName + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const limits = {
  fileSize: 5 * 1024 * 1024,
};

const upload = multer({ storage, fileFilter, limits });

module.exports = upload;
