require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const Request = require('./models/Request');
const connectDB = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Подключаемся к Mongo
connectDB();

// Эндпоинт для получения фото по ID
app.get('/photo/:id', async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request || !request.photoBuffer) {
      return res.status(404).send('Фото не найдено');
    }

    res.set('Content-Type', request.photoContentType || 'image/jpeg');
    res.send(request.photoBuffer);
  } catch (error) {
    console.error('[GET /photo/:id] Ошибка:', error);
    res.status(500).send('Ошибка сервера');
  }
});

// Запускаем сервер
app.listen(PORT, () => {
  console.log(`🖼 Сервер запущен: http://localhost:${PORT}`);
});
