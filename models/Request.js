const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  photoBuffer: { type: Buffer },
  photoContentType: { type: String },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Request', RequestSchema);


// Логируем успешную компиляцию модели
console.log('[MongoDB] Request модель инициализирована');

module.exports = mongoose.model('Request', RequestSchema);
