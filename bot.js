require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const mime = require('mime-types');
const mongoose = require('mongoose');
const connectDB = require('./db');
const Request = require('./models/Request');
const uploadBuffer = require('./services/uploadPhoto'); // Для загрузки фото в DigitalOcean Spaces

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Подключение к базе данных
connectDB();

// ========================
// Основные команды
// ========================
bot.start((ctx) => {
  ctx.reply('Привет! Отправь фото повреждения или описание. После завершения нажми кнопку "📨 Отправить заявку".');
});

bot.command('new', (ctx) => {
  ctx.reply('Пожалуйста, отправьте фото повреждения или описание.');
});

// ========================
// Служебные функции
// ========================
const getFilePath = async (fileId) => {
  try {
    const res = await axios.get(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`);
    return res.data.result.file_path;
  } catch (err) {
    console.error('[getFilePath] Ошибка:', err.message);
    throw err;
  }
};

const downloadPhoto = async (filePath) => {
  try {
    const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;
    console.log('[downloadPhoto] Скачиваем фото по URL:', url);
    const res = await axios.get(url, { responseType: 'arraybuffer' });
    return {
      buffer: Buffer.from(res.data),
      contentType: mime.lookup(filePath) || 'application/octet-stream',
    };
  } catch (err) {
    console.error('[downloadPhoto] Ошибка:', err.message);
    throw err;
  }
};

// ========================
// Обработчики контента
// ========================
const handleRequest = async (ctx, content) => {
  const { id, username, first_name, last_name, language_code, is_bot } = ctx.from;
  const location = ctx.message.location;

  try {
    const previousRequests = await Request.find({ chatId: ctx.chat.id, isCompleted: false });

    await Promise.all(previousRequests.map(async (req) => {
      try {
        await ctx.deleteMessage(req.messageId);
        console.log(`[CLEANUP] Удалено сообщение ${req.messageId}`);
      } catch (e) {
        console.log('[CLEANUP] Сообщение уже удалено:', e.message);
      }
    }));

    const requestData = {
      userId: id.toString(),
      username: username || 'unknown',
      firstName: first_name || '',
      lastName: last_name || '',
      languageCode: language_code || '',
      isBot: is_bot || false,
      ...(location ? { location: { type: 'Point', coordinates: [location.longitude, location.latitude] } } : {}),
      chatId: ctx.chat.id,
      messageId: null,
      ...content,
      isCompleted: false,
      createdAt: new Date(),
    };

    const request = new Request(requestData);
    const savedRequest = await request.save();

    const msg = await ctx.reply(
      '✅ Сообщение сохранено!\nПосле завершения отправки информации нажмите:',
      Markup.inlineKeyboard([Markup.button.callback('📨 Отправить заявку', 'SUBMIT_REQUEST')])
    );

    await Request.updateOne({ _id: savedRequest._id }, { messageId: msg.message_id });
    console.log(`[SAVED] Новая заявка ${savedRequest._id}`);

  } catch (error) {
    console.error('[handleRequest] Ошибка:', error.message);
    await ctx.reply('🚨 Ошибка при сохранении данных. Попробуйте еще раз.');
  }
};

// ========================
// Обработчик кнопки
// ========================
bot.action('SUBMIT_REQUEST', async (ctx) => {
  try {
    const result = await Request.updateMany({ chatId: ctx.chat.id, isCompleted: false }, { isCompleted: true });
    const requests = await Request.find({ chatId: ctx.chat.id, isCompleted: true });

    await Promise.all(requests.map(async (req) => {
      try {
        await ctx.deleteMessage(req.messageId);
        console.log(`[SUBMIT] Удалено сообщение ${req.messageId}`);
      } catch (e) {
        console.log('[SUBMIT] Не удалось удалить сообщение:', e.message);
      }
    }));

    ctx.answerCbQuery(`✅ Отправлено заявок: ${result.modifiedCount}`);
  } catch (error) {
    console.error('[SUBMIT] Ошибка:', error);
    ctx.answerCbQuery('🚨 Ошибка при отправке');
  }
});

// Обработка фото
bot.on('photo', async (ctx) => {
  const photoArray = ctx.message.photo;
  const fileId = photoArray[photoArray.length - 1].file_id;

  try {
    const filePath = await getFilePath(fileId);
    const { buffer, contentType } = await downloadPhoto(filePath);

    // Загрузка фото в DigitalOcean Spaces
    const key = `${ctx.chat.id}/${Date.now()}.jpg`;
    console.log('[photo] Загружаем фото в Spaces с ключом:', key);
    const imageUrl = await uploadBuffer(buffer, key);
    console.log('[photo] Фото доступно по URL:', imageUrl);

    // Сохраняем в MongoDB вместе с photoBuffer и URL
    await handleRequest(ctx, { photoBuffer: buffer, photoContentType: contentType, imageUrl });

  } catch (error) {
    console.error('[photo] Ошибка:', error.message);
    ctx.reply('🚨 Не удалось сохранить фото');
  }
});

// Обработка текста
bot.on('text', async (ctx) => {
  await handleRequest(ctx, { description: ctx.message.text });
});

// ========================
// Запуск бота
// ========================
bot.launch().then(() => console.log('🤖 Бот запущен')).catch((err) => console.error('🚨 Ошибка запуска:', err));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
