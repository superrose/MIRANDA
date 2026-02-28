require('dotenv').config();
const axios = require('axios');

const SYSTEM_PROMPT = `You are a friendly Singapore property rental assistant. Help users find rental properties in Singapore.

IMPORTANT RULES:
1. For greetings, small talk, or general questions (e.g. "hello", "how are you", "what can you do") — just reply naturally. Do NOT search.
2. Only trigger a search when the user has clearly stated they want to find a property AND you have at least a budget OR location.
3. Always ask ONE follow-up question at a time to gather missing details before searching.

When ready to search, you must have at least ONE of these:
- maxBudget (SGD/month)
- location (e.g. "Orchard", "Jurong", "Bugis", "Toa Payoh")

When you have enough info, output EXACTLY this on its own line (no extra text after the JSON):
READY_TO_SEARCH:{"maxBudget":3000,"location":"Orchard","type":"condo","beds":1}

Optional filter fields: minBudget, type ("HDB"/"condo"/"room"/"studio"), beds, requirements (e.g. ["near MRT","furnished","pet-friendly"])

Keep responses short, warm, and helpful. Always respond in English.`;

class PropertyAgent {
  async chat(session, userMessage) {
    session.messages.push({ role: 'user', content: userMessage });

    const response = await axios.post(
      'https://api.minimaxi.chat/v1/text/chatcompletion_v2',
      {
        model: 'MiniMax-Text-01',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...session.messages
        ],
        max_tokens: 1024,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = response.data.choices[0].message.content;
    session.messages.push({ role: 'assistant', content: reply });

    if (reply.includes('READY_TO_SEARCH:')) {
      const jsonStr = reply.split('READY_TO_SEARCH:')[1].trim().split('\n')[0];
      try {
        session.filters = JSON.parse(jsonStr);
        session.step = 'searching';
        return { action: 'search', filters: session.filters, message: reply.split('READY_TO_SEARCH:')[0].trim() };
      } catch (e) {
        console.error('Filter parse error:', e);
      }
    }

    return { action: 'chat', message: reply };
  }

  async recommendListings(session, listings) {
    const prompt = `Based on these user requirements: ${JSON.stringify(session.filters)}

Here are the available listings:
${JSON.stringify(listings.slice(0, 15), null, 2)}

Please recommend the TOP 5 best matches and explain briefly why each is suitable. Format each recommendation clearly with the property name, price, location, and reason. Be friendly and helpful.`;

    const response = await axios.post(
      'https://api.minimaxi.chat/v1/text/chatcompletion_v2',
      {
        model: 'MiniMax-Text-01',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  }
}

module.exports = new PropertyAgent();
