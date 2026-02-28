require('dotenv').config();
const axios = require('axios');

const SYSTEM_PROMPT = `You are a friendly Singapore property rental assistant. Help users find rental properties in Singapore.

When the user describes what they want, extract these filters:
- maxBudget: number (SGD per month)
- minBudget: number (optional)
- location: string (e.g. "Orchard", "Toa Payoh", "Jurong", "Bugis")
- type: "HDB" | "condo" | "room" | "studio" | "apartment"
- beds: number (optional)
- requirements: array of strings (e.g. ["pet-friendly", "near MRT", "furnished"])

Ask follow-up questions ONE AT A TIME if you need more information.
Keep responses concise and friendly.

When you have enough information to search, output EXACTLY this format on its own line:
READY_TO_SEARCH:{"maxBudget":3000,"location":"Orchard","type":"condo"}

Always respond in English. Be warm, helpful, and professional.`;

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
