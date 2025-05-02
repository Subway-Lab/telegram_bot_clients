require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  // Берем ключ из .env
});

async function testOpenAI() {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Привет, GPT!' }],
    });
    console.log('Ответ от OpenAI:', response.choices[0].message.content);
  } catch (error) {
    console.error('Ошибка при запросе к OpenAI:', error);
  }
}

testOpenAI();