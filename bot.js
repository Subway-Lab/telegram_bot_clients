require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const mime = require('mime-types');
const mongoose = require('mongoose');
const connectDB = require('./db');
const Request = require('./models/Request');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Подключение к базе данных
connectDB();

// Команда /start
bot.start((ctx) => {
  ctx.reply('Привет! Отправь фото повреждения или описание.');
});

// Команда /new
bot.command('new', (ctx) => {
  ctx.reply('Пожалуйста, отправьте фото повреждения или описание.');
});

// Получить путь к файлу через Telegram API
const getFilePath = async (fileId) => {
  try {
    const res = await axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
    return res.data.result.file_path;
  } catch (err) {
    console.error('[getFilePath] Ошибка получения пути к файлу:', err.message);
    throw err;
  }
};

// Скачать файл как Buffer
const downloadPhoto = async (filePath) => {
  try {
    const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    return {
      buffer: Buffer.from(res.data),
      contentType: mime.lookup(filePath) || 'application/octet-stream',
    };
  } catch (err) {
    console.error('[downloadPhoto] Ошибка скачивания фото:', err.message);
    throw err;
  }
};

// Обработка фото
bot.on('photo', async (ctx) => {
  const { id, username } = ctx.from;
  const photoArray = ctx.message.photo;
  const fileId = photoArray[photoArray.length - 1].file_id; // Самое крупное фото

  try {
    const filePath = await getFilePath(fileId);
    const { buffer, contentType } = await downloadPhoto(filePath);

    const request = new Request({
      userId: id.toString(),
      username: username || 'unknown',
      photoBuffer: buffer,
      photoContentType: contentType,
    });

    await request.save();
    console.log(`[photo] Фото сохранено: userId=${id}, MIME=${contentType}`);
    ctx.reply('Фото сохранено! 📷');
  } catch (error) {
    console.error('[photo] Ошибка при обработке фото:', error.message);
    ctx.reply('Не получилось сохранить фото 😓');
  }
});

// Обработка текста
bot.on('text', async (ctx) => {
  const { id, username } = ctx.from;
  const message = ctx.message.text;

  try {
    const newRequest = new Request({
      userId: id.toString(),
      username: username || 'unknown',
      description: message,
    });

    await newRequest.save();
    console.log(`[text] Заявка с текстом сохранена: userId=${id}`);
    ctx.reply('Сохранено!');
  } catch (error) {
    console.error('[text] Ошибка при сохранении текста:', error.message);
    ctx.reply('Ошибка при сохранении 😢');
  }
});

// Запуск
bot.launch()
  .then(() => console.log('🤖 Бот запущен и ждёт ваши команды...'))
  .catch((err) => console.error('🚨 Ошибка запуска бота:', err.message));
