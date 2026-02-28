require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuid } = require('uuid');
const sessionManager = require('./agent/SessionManager');
const agent = require('./agent/PropertyAgent');
const { speakText } = require('./voice/tts');
const { transcribeAudio } = require('./voice/stt');
const scraperOrchestrator = require('./scraper/ScraperOrchestrator');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static('../frontend/build'));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SG Property Agent is running! 🏠' });
});

// TTS 单独接口 — 前端拿到文字后再来取音频
app.post('/tts', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.json({ audioBase64: null });
  const audioBase64 = await speakText(text);
  res.json({ audioBase64 });
});

// 文字对话 — 立刻返回文字，不等语音
app.post('/chat', async (req, res) => {
  try {
    const { sessionId = uuid(), message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const sess = sessionManager.getSession(sessionId);
    const result = await agent.chat(sess, message);

    if (result.action === 'search') {
      console.log('🔍 开始搜索房源，筛选条件:', result.filters);
      const listings = await scraperOrchestrator.searchAll(result.filters);
      const recommendation = await agent.recommendListings(sess, listings);
      sessionManager.saveSession(sessionId, sess);
      return res.json({
        sessionId,
        message: recommendation,
        listings: listings.slice(0, 5),
        searchCompleted: true
      });
    }

    sessionManager.saveSession(sessionId, sess);
    res.json({ sessionId, message: result.message });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// 语音对话
app.post('/voice', async (req, res) => {
  try {
    const { sessionId = uuid(), audioBase64 } = req.body;
    if (!audioBase64) return res.status(400).json({ error: 'Audio is required' });

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const transcript = await transcribeAudio(audioBuffer);

    if (!transcript) return res.status(400).json({ error: 'Could not transcribe audio' });

    console.log(`🎤 用户说: "${transcript}"`);

    const sess = sessionManager.getSession(sessionId);
    const result = await agent.chat(sess, transcript);

    let responseMessage = result.message;

    if (result.action === 'search') {
      const listings = await scraperOrchestrator.searchAll(result.filters);
      responseMessage = await agent.recommendListings(sess, listings);
      sess.listings = listings;
    }

    sessionManager.saveSession(sessionId, sess);

    const audioBase64Out = await speakText(responseMessage);

    res.json({
      sessionId,
      transcript,
      message: responseMessage,
      audioBase64: audioBase64Out
    });
  } catch (err) {
    console.error('Voice error:', err.message);
    res.status(500).json({ error: 'Voice processing failed.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🏠 SG Property Agent 已启动！`);
  console.log(`📡 服务器地址: http://localhost:${PORT}`);
  console.log(`🔍 健康检查: http://localhost:${PORT}/health\n`);
});
