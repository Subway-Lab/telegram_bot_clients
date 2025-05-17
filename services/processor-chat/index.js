// index.js
require('dotenv').config();

const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const Redis = require('ioredis');
const mongoose = require('mongoose');
const Request = require('../../models/Request');

const { analyzeRequests } = require('./AIChat');

// Константы из .env
const MONGO_URI = process.env.MONGO_URI;
const REDIS_URL = process.env.REDIS_URL;
const SPACES_REGION = process.env.SPACES_REGION;
const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT;
const SPACES_KEY = process.env.SPACES_KEY;
const SPACES_SECRET = process.env.SPACES_SECRET;
const SPACES_BUCKET = process.env.SPACES_BUCKET;

// NODE: Подключение к MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB подключена'))
  .catch(err => console.error('❌ Ошибка подключения к MongoDB:', err));

// NODE: Подключение к Redis
const redis = new Redis(REDIS_URL);
redis.on('error', err => console.error('❌ Redis ошибка:', err));
redis.on('connect', () => console.log('✅ Подключено к Redis'));

// NODE: Подключение к DigitalOcean Spaces
const s3 = new S3Client({
  region: SPACES_REGION,
  endpoint: SPACES_ENDPOINT,
  credentials: {
    accessKeyId: SPACES_KEY,
    secretAccessKey: SPACES_SECRET,
  },
});

(async () => {
  try {
    const data = await s3.send(new ListObjectsV2Command({
      Bucket: SPACES_BUCKET,
      MaxKeys: 5,
    }));

    console.log('📸 Файлы в Spaces:');
    if (data.Contents) {
      data.Contents.forEach(obj => console.log(' -', obj.Key));
    } else {
      console.log('❌ Файлы не найдены в Spaces');
    }
  } catch (err) {
    console.error('❌ Ошибка доступа к DigitalOcean Spaces:', err.message);
  }
})();

// NODE: Подписка на канал new_request
redis.subscribe('new_request', err => {
  if (err) {
    console.error('❌ Ошибка подписки на Redis:', err);
  } else {
    console.log('📡 Слушаем Redis: канал new_request');
  }
});

redis.on('message', async (channel, message) => {
  let requests;
  try {
    requests = JSON.parse(message);
  } catch (e) {
    console.error('❌ Не удалось распарсить JSON из Redis:', e.message);
    return;
  }

  if (!Array.isArray(requests) || !requests.length) {
    console.warn('⚠️ Пустой список заявок. Прерываем обработку.');
    return;
  }

  // Группируем по chatId только завершённые заявки
  const grouped = {};
  requests.forEach(req => {
    if (!req.isCompleted) return;
    if (!grouped[req.chatId]) grouped[req.chatId] = [];
    grouped[req.chatId].push(req);
  });

  for (const chatId in grouped) {
    const group = grouped[chatId];
    const messageParts = [];
    const imageUrls = [];
    let meta = {};

    group.forEach(req => {
      if (req.description) messageParts.push(`Текст: ${req.description}`);
      if (req.imageUrl) {
        messageParts.push(`Фото: ${req.imageUrl}`);
        imageUrls.push(req.imageUrl);
      }
      // Сохраняем метаданные из первой заявки (или обновляйте по необходимости)
      if (!meta.userId) {
        meta = {
          chatId: req.chatId,
          userId: req.userId,
          username: req.username,
          firstName: req.firstName,
          lastName: req.lastName,
          languageCode: req.languageCode,
        };
      }
    });

    console.log(`📝 Данные для GPT (chatId ${chatId}):\n${messageParts.join('\n')}`);
    console.log(`🖼️ Обнаружено изображений: ${imageUrls.length}`);

    try {
      await analyzeRequests(messageParts, imageUrls, meta);
    } catch (err) {
      // Уже залогировано внутри analyzeRequests
    }
  }
});
