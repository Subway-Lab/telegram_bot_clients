require('dotenv').config();
const Redis = require('ioredis');
const mongoose = require('mongoose');
const Request = require('../../models/Request'); // <== проверь путь, если что подправим

const MONGO_URI = process.env.MONGO_URI;
const REDIS_URL = process.env.REDIS_URL;

const redis = new Redis(REDIS_URL);

// Подключение к MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB подключена'))
  .catch((err) => console.error('❌ Ошибка подключения к MongoDB:', err));

// Подписка на канал Redis
redis.subscribe('new_request', (err, count) => {
  if (err) {
    console.error('❌ Ошибка подписки на Redis:', err);
  } else {
    console.log('✅ Подключено к Redis');
    console.log('📡 Слушаем Redis: канал new_request');
  }
});

// Обработка входящих сообщений
redis.on('message', async (channel, message) => {
  console.log(`📩 Получено сообщение из канала ${channel}: ${message}`);

  try {
    const request = await Request.findById(message);

    if (!request) {
      console.log('❌ Заявка не найдена в базе');
      return;
    }

    if (!request.isCompleted) {
      console.log('⚠️ Заявка ещё не завершена пользователем');
      return;
    }

    console.log('📦 Заявка найдена и завершена:');
    console.dir(request, { depth: null });

    // Тут будет логика для ChatGPT (пока пропустим)
  } catch (err) {
    console.error('💥 Ошибка при обработке заявки:', err);
  }
});
