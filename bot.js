const { Telegraf } = require('telegraf');
const connectDB = require('./db');
const Request = require('./models/Request');
require('dotenv').config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

connectDB();

// Команда /start
bot.start((ctx) => {
  ctx.reply('Привет! Отправь фото повреждения или описание.');
});

// Команда /new — для подачи новой заявки
bot.command('new', (ctx) => {
  ctx.reply('Пожалуйста, отправьте фото повреждения или описание.');
});

// Обработка фото
bot.on('photo', async (ctx) => {
  const { id, username } = ctx.from;
  const photoArray = ctx.message.photo;
  const fileId = photoArray[photoArray.length - 1].file_id; // Берём самое крупное фото

  try {
    const request = new Request({
      userId: id.toString(),
      username: username || 'unknown',
      photo: fileId,
    });

    await request.save();
    ctx.reply('Фото сохранено! 📷');
  } catch (error) {
    console.error('Ошибка при сохранении фото:', error);
    ctx.reply('Не получилось сохранить фото 😓');
  }
});

// Обработка текстовых сообщений
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
    ctx.reply('Сохранено!');
  } catch (error) {
    console.error('Ошибка при сохранении текста:', error);
    ctx.reply('Ошибка при сохранении 😢');
  }
});

// Запуск бота
bot.launch();
console.log('Бот запущен!');
