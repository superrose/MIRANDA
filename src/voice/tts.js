require('dotenv').config();
const axios = require('axios');

async function speakText(text) {
  try {
    const cleanText = text.replace(/[*#[\]]/g, '').slice(0, 500);

    const response = await axios.post(
      `https://api.minimaxi.chat/v1/t2a_v2?GroupId=${process.env.MINIMAX_GROUP_ID}`,
      {
        model: 'speech-02-hd',
        text: cleanText,
        stream: false,
        voice_setting: {
          voice_id: 'Wise_Woman',
          speed: 1.0,
          vol: 1.0,
          pitch: 0
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: 'mp3',
          channel: 1
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.MINIMAX_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const audioHex = response.data?.data?.audio;
    if (!audioHex) throw new Error('No audio data returned');
    return Buffer.from(audioHex, 'hex').toString('base64');
  } catch (err) {
    console.error('TTS 错误:', err.response?.data || err.message);
    return null;
  }
}

module.exports = { speakText };
