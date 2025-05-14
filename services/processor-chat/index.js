// index.js
require('dotenv').config();

const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const Redis = require('ioredis');
const mongoose = require('mongoose');
const Request = require('../../models/Request'); // проверь путь, если нужно поправить

const { analyzeRequests } = require('./AIChat');

// Константы из .env
const MONGO_URI = process.env.MONGO_URI;
const REDIS_URL = process.env.REDIS_URL;
const SPACES_REGION = process.env.SPACES_REGION;
const SPACES_ENDPOINT = process.env.SPACES_ENDPOINT;
const SPACES_KEY = process.env.SPACES_KEY;
const SPACES_SECRET = process.env.SPACES_SECRET;
const SPACES_BUCKET = process.env.SPACES_BUCKET;

// MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB подключена'))
  .catch(err => console.error('❌ Ошибка подключения к MongoDB:', err));

// Redis
const redis = new Redis(REDIS_URL);
redis.on('error', err => console.error('❌ Redis ошибка:', err));
redis.on('connect', () => console.log('✅ Подключено к Redis'));

// DigitalOcean Spaces (S3-совместимый)
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

// Подписка на канал new_request
redis.subscribe('new_request', err => {
  if (err) {
    console.error('❌ Ошибка подписки на Redis:', err);
  } else {
    console.log('📡 Слушаем Redis: канал new_request');
  }
});

redis.on('message', async (channel, message) => {
  console.log('🔍 Анализ полученных данных...');
  console.log(`📩 Получено от bot.js в канале ${channel}`);
  console.log('▶ raw payload:', message);

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

  console.log(`📦 Получено ${requests.length} заявок. Детали:`);
  requests.forEach((req, idx) => {
    console.log(`  ${idx + 1}. description: "${req.description || '—'}", imageUrl: ${req.imageUrl || '—'}`);
  });

  const messageParts = [];
  const imageUrls = [];

  requests.forEach(req => {
    if (req.description) {
      messageParts.push(`Текст: ${req.description}`);
    }
    if (req.imageUrl) {
      messageParts.push(`Фото: ${req.imageUrl}`);
      imageUrls.push(req.imageUrl);
    }
  });

  console.log(`📝 Данные для GPT:\n${messageParts.join('\n')}`);
  console.log(`🖼️ Обнаружено изображений: ${imageUrls.length}`);

  // Вызов функции из AIChat.js
  try {
    await analyzeRequests(messageParts, imageUrls);
  } catch (err) {
    // Уже залогировано внутри analyzeRequests
  }
});
