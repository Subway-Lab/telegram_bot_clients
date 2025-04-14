const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  photo: { type: String },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Request', RequestSchema);