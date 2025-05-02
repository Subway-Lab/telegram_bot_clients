// services/openaiClient.js
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // не забудь .env
});

module.exports = openai;