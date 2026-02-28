require('dotenv').config();
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

async function speakText(text) {
  try {
    const audio = await elevenlabs.textToSpeech.convert(
      process.env.ELEVENLABS_VOICE_ID,
      {
        text: text.slice(0, 500), // 限制长度
        model_id: 'eleven_turbo_v2_5',
        output_format: 'mp3_44100_128'
      }
    );

    const chunks = [];
    for await (const chunk of audio) chunks.push(chunk);
    return Buffer.concat(chunks).toString('base64');
  } catch (err) {
    console.error('TTS 错误:', err.message);
    return null;
  }
}

module.exports = { speakText };
