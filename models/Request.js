const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, required: true },
  username: { type: String, required: true },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  languageCode: { type: String, default: '' },
  isBot: { type: Boolean, default: false },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: false,
    },
    coordinates: {
      type: [Number],
      required: false,
    },
  },
  imageUrl: { type: String, required: false },
  description: String,
  isCompleted: { type: Boolean, default: false },
  chatId: { type: Number, required: true }, // Обязательное поле
  messageId: { type: Number }, // Опциональное поле
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Request', RequestSchema);