const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  caption: String,
  postImage: String,
  date: {
    type: Date,
    default: Date.now,
  },
  likes: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    default: [],
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
});

module.exports = mongoose.model("post", postSchema);
