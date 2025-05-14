// AIChat.js
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function analyzeRequests(messageParts, imageUrls) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Ты — ассистент по оценке авто для СТО. 
- Проанализируй предоставленные фотографии автомобиля и текст сообщений
- ВАЖНО!: По характерным деталям на фото определи марку и модель автомобиля
- В ответе укажи марку и модель автомобиля
- Опиши видимые и предполагаемые скрытые повреждения
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
    return answer;
  } catch (error) {
    console.error('❌ Ошибка при обработке заявки:', error);
    throw error;
  }
}

module.exports = { analyzeRequests };
