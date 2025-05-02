require('dotenv').config();
const { OpenAI } = require('openai');
const Redis = require('ioredis');
const mongoose = require('mongoose');
const Request = require('../../models/Request'); // проверь путь, если нужно поправить

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  // Ключ API
});

const MONGO_URI = process.env.MONGO_URI;
const REDIS_URL = process.env.REDIS_URL;

// Подключение к MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB подключена'))
  .catch((err) => console.error('❌ Ошибка подключения к MongoDB:', err));

// Подключение к Redis
const redis = new Redis(REDIS_URL);
redis.on('error', (err) => console.error('❌ Redis ошибка:', err));
redis.on('connect', () => console.log('✅ Подключено к Redis'));

// Подписка на канал Redis
redis.subscribe('new_request', (err) => {
  if (err) {
    console.error('❌ Ошибка подписки на Redis:', err);
  } else {
    console.log('📡 Слушаем Redis: канал new_request');
  }
});

// Обработка входящих сообщений
redis.on('message', async (channel, message) => {
  console.log(`📩 Получено сообщение из канала ${channel}: ${message}`);
  console.log('🧠 Вошли в message handler');

  const chatId = message.trim();
  if (!chatId) {
    console.warn('⚠️ Пустой chatId. Прерываем обработку.');
    return;
  }

  try {
    // Найдём все заявки с этим chatId
    const requests = await Request.find({ chatId }).sort({ createdAt: 1 });

    if (!requests.length) {
      console.log(`⚠️ Заявки с chatId "${chatId}" не найдены.`);
      return;
    }

    console.log(`📦 Найдено ${requests.length} сообщений для chatId ${chatId}`);

    // Объединяем все description в одно поле
    const fullDescription = requests
      .map((req, index) => `- ${req.description || `[пусто ${index + 1}]`}`)
      .join('\n');

    const finalMessage = `📝 Общая заявка для GPT:\n${fullDescription}`;
    console.log(finalMessage);

    // Отправляем описание в OpenAI для генерации ответа
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: finalMessage }],
    });

    console.log('Ответ от GPT:', response.choices[0].message.content);
    // TODO: здесь можно отправить ответ в Telegram

  } catch (error) {
    console.error('❌ Ошибка при обработке заявки:', error);
  }
});
