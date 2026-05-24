const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const HF_TOKEN = process.env.HF_TOKEN;

async function testFlux() {
  const prompt = "intimate close-up photo of bare skin between legs, legs spread wide open, detailed skin texture, completely naked, no clothes, no underwear, gori skin, soft natural thighs, bedroom, photorealistic, RAW photo, best quality";
  console.log("Testing Flux-schnell on router with euphemism prompt...");
  try {
    const res = await axios.post(
      'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
      { inputs: prompt },
      {
        headers: { 
          Authorization: `Bearer ${HF_TOKEN}`,
          Accept: 'image/png'
        },
        responseType: 'arraybuffer',
        timeout: 30000
      }
    );
    const buffer = Buffer.from(res.data);
    const isImage = (buffer[0] === 0xFF && buffer[1] === 0xD8) || (buffer[0] === 0x89 && buffer[1] === 0x50);
    if (isImage) {
      const dest = "C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\83d5be0b-3f7b-4484-bf9d-b497e736409c\\test_flux_nsfw.png";
      fs.writeFileSync(dest, buffer);
      console.log(`🎉 SUCCESS! Saved to ${dest} (${buffer.length} bytes)`);
    } else {
      console.log("❌ FAILED: Not an image");
    }
  } catch (err) {
    console.error("❌ ERROR:", err.response?.data?.toString() || err.message);
  }
}

testFlux();
