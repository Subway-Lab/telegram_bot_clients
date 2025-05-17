// AIChat.js
const { OpenAI } = require('openai');
const Request = require('../../models/Request'); 

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

 async function analyzeRequests(messageParts, imageUrls, meta = {}) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Ты — ассистент по оценке авто для СТО. 
            - Проанализируй предоставленные фотографии автомобиля и текст сообщений
            - ВАЖНО!: По характерным деталям на фото определи марку, модель автомобиля и предпологаемый год выпуска
            - В ответе укажи марку и модель автомобиля и год выпуска
            - Опиши видимые на фото повреждения
            - Предложи список ремонтных работ`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Данные от клиента:\n${messageParts.join('\n')}\n\nПроанализируй повреждения:`,
            },
            ...imageUrls.map(url => ({
              type: 'image_url',
              image_url: { url },
            })),
          ],
        },
      ],
    });

    const answer = response.choices[0].message.content;
    console.log('Ответ от GPT:', answer);
    console.log('✅ Запрос обработан с', imageUrls.length, 'изображениями');
  
    // Сохраняем ответ в MongoDB
    try {
      const newRequest = new Request({
        type: 'Post',
        description: answer, // NODE: Ответ ChatGPT
        imageUrl: imageUrls[0], // Сохраняем первое изображение (или можно массив преобразовать в строку)
        // Дополнительные обязательные поля:
        userId: 'chatgpt-assistant', // Можно задать специальное значение для бота
        username: 'chatgpt-assistant',
        chatId: meta.chatId || 0,
        firstName: meta.firstName || '',
        lastName: meta.lastName || '',
        languageCode: meta.languageCode || '',
        isBot: true,
        isCompleted: true,
        // Можете добавить другие поля по необходимости
      });
      
      await newRequest.save();
      console.log('📁 Ответ успешно сохранен в MongoDB как Post');
    } catch (dbError) {
      console.error('❌ Ошибка сохранения в MongoDB:', dbError);
    }

  } catch (error) {  // <-- Эта закрывающая скобка была пропущена
    console.error('❌ Ошибка при обработке заявки:', error);
    throw error;
  }
}

module.exports = { analyzeRequests };