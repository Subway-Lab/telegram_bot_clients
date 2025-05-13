require('dotenv').config();
const { OpenAI } = require('openai');
const Redis = require('ioredis');
const mongoose = require('mongoose');
const Request = require('../../models/Request'); // проверь путь, если нужно поправить

const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: process.env.SPACES_REGION,
  endpoint: process.env.SPACES_ENDPOINT,
  credentials: {
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET,
  },
});


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

(async () => {
  try {
    const data = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.SPACES_BUCKET,
      MaxKeys: 5, // можно поменять
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


// Подписка на канал Redis
redis.subscribe('new_request', (err) => {
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

  // Логируем нужные поля: description и imageUrl
  console.log(`📦 Получено ${requests.length} заявок. Детали:`);
  requests.forEach((req, idx) => {
    console.log(`  ${idx + 1}. description: "${req.description || '—'}", imageUrl: ${req.imageUrl || '—'}`);
  });

  // Собираем текстовые части и изображения
  const messageParts = [];
  const imageUrls = [];

  requests.forEach((req) => {
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
  try {
    // Отправляем описание в OpenAI для генерации ответа
    const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: 'system',
        content: `Ты — ассистент по оценке авто для СТО. 
        - Проанализируй предоставленные фотографии автомобиля и текст сообщений
        - ВАЖНО!: По харатерным деталям на фото определи марку и модель автомобиля
        - В ответе укажи марку и модель автомобиля
        - Опиши видимые и предполагаемые скрытые повреждения
        - Предложи список ремонтных работ`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Данные от клиента:\n${messageParts.join('\n')}\n\nПроанализируй повреждения:`
          },
          ...imageUrls.map(url => ({
            type: 'image_url',
            image_url: { url: url }
          }))
        ]
      }
    ],
  });

    console.log('Ответ от GPT:', response.choices[0].message.content);
    // TODO: здесь можно отправить ответ в Telegram
    console.log('✅ Запрос обработан с', imageUrls.length, 'изображениями');

  } catch (error) {
    console.error('❌ Ошибка при обработке заявки:', error);
  }
}); // ← Вот она, спасительная скобка!
