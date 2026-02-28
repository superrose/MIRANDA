require('dotenv').config();
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

async function transcribeAudio(audioBuffer) {
  try {
    const blob = new Blob([audioBuffer], { type: 'audio/webm' });
    const transcript = await elevenlabs.speechToText.convert({
      audio: blob,
      model_id: 'scribe_v1',
      language_code: 'en'
    });
    return transcript.text;
  } catch (err) {
    console.error('STT 错误:', err.message);
    return null;
  }
}

module.exports = { transcribeAudio };
