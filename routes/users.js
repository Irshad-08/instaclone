const mongoose = require("mongoose");
const plm = require("passport-local-mongoose");

const mongoURL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/instaclone";

mongoose.connect(mongoURL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  profileImage: String,
  name: String,
  email: String,
  bio: String,
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
  post: [{ type: mongoose.Schema.Types.ObjectId, ref: "post" }],
  sentMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: "message" }],
  receivedMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: "message" }],
});

userSchema.plugin(plm);

module.exports = mongoose.model("user", userSchema);
