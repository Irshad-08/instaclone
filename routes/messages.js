const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("message", messageSchema);
