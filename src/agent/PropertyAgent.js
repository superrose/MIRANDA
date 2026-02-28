require('dotenv').config();
const axios = require('axios');

const SYSTEM_PROMPT = `You are a Singapore rental assistant. Be brief and friendly.

Rules:
- Keep ALL replies under 2 sentences.
- Only search when user mentions budget OR location for renting.
- Ask ONE question at a time if info is missing.
- When ready to search, output on its own line: READY_TO_SEARCH:{"maxBudget":3000,"location":"Orchard","type":"condo","beds":1}

Respond in English only.`;

// Instant replies for common greetings — no API call needed
const GREETING_PATTERNS = /^(hi|hello|hey|good morning|good afternoon|good evening|yo|sup|helo|hii|hiii|howdy|greetings|what's up|whats up|how are you|how r u)[\s!?.]*$/i;

const GREETING_REPLIES = [
  "Hi there! 👋 I'm your Singapore property assistant. Are you looking to rent a place? Tell me your budget and preferred area!",
  "Hello! 🏠 Ready to help you find the perfect rental in Singapore. What's your budget and which area are you looking at?",
  "Hey! Great to have you here. Looking for a place to rent in Singapore? Tell me what you need — budget, location, room type!"
];

function getInstantReply(message) {
  if (GREETING_PATTERNS.test(message.trim())) {
    return GREETING_REPLIES[Math.floor(Math.random() * GREETING_REPLIES.length)];
  }
  return null;
}

// Keywords that indicate the user actually wants to find a property
const PROPERTY_KEYWORDS = [
  'room', 'condo', 'hdb', 'apartment', 'flat', 'studio', 'rent', 'rental',
  'budget', 'sgd', 'bedroom', 'bed', 'looking for', 'find', 'search',
  'orchard', 'bugis', 'jurong', 'tampines', 'bishan', 'clementi', 'toa payoh',
  'kallang', 'novena', 'woodlands', 'yishun', 'punggol', 'sengkang', 'ang mo kio',
  'per month', '$/month', 'mrt', 'furnished', 'pet'
];

function userWantsToSearch(message) {
  const lower = message.toLowerCase();
  return PROPERTY_KEYWORDS.some(kw => lower.includes(kw));
}

class PropertyAgent {
  async chat(session, userMessage) {
    // Instant reply for greetings — skip API call entirely
    const instant = getInstantReply(userMessage);
    if (instant) {
      session.messages.push({ role: 'user', content: userMessage });
      session.messages.push({ role: 'assistant', content: instant });
      return { action: 'chat', message: instant };
    }

    session.messages.push({ role: 'user', content: userMessage });

    const response = await axios.post(
      'https://api.minimaxi.chat/v1/text/chatcompletion_v2',
      {
        model: 'MiniMax-Text-01',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...session.messages.slice(-4)  // 只保留最近 4 条，减少 token
        ],
        max_tokens: 120,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000  // 超过 5 秒直接报错，不干等
      }
    );

    const reply = response.data.choices[0].message.content;
    session.messages.push({ role: 'assistant', content: reply });

    // Only trigger search if AI wants to AND user's message contains property keywords
    if (reply.includes('READY_TO_SEARCH:') && userWantsToSearch(userMessage)) {
      const jsonStr = reply.split('READY_TO_SEARCH:')[1].trim().split('\n')[0];
      try {
        session.filters = JSON.parse(jsonStr);
        session.step = 'searching';
        return { action: 'search', filters: session.filters, message: reply.split('READY_TO_SEARCH:')[0].trim() };
      } catch (e) {
        console.error('Filter parse error:', e);
      }
    }

    return { action: 'chat', message: reply.replace(/READY_TO_SEARCH:[^\n]*/g, '').trim() };
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
