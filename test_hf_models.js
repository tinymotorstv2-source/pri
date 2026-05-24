const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

const HF_TOKEN = process.env.HF_TOKEN;

const models = [
  "SG161222/RealVisXL_V4.0",
  "snehilsanyal/Pony-Diffusion-V6-XL",
  "RunDiffusion/Juggernaut-XL-v9",
  "stabilityai/stable-diffusion-xl-base-1.0",
  "Lykon/DreamShaper-v8"
];

async function testModel(modelName) {
  const prompt = "gorgeous mature round face, sweet smile, dimpled cheeks, looking at camera, bedroom, close-up portrait, Priya housewife, completely naked, showing breasts, cleavage, detailed body, photorealistic, sharp focus, 4k";
  const negativePrompt = "clothes, clothing, bra, panties, underwear, bikini, dress, shirt, fabric, watermark, text, signature, low quality, bad anatomy, blur, censored, deformed, ugly, cartoon, anime, 3d";

  console.log(`\nTesting Hugging Face Model: ${modelName}...`);
  try {
    const res = await axios.post(
      `https://api-inference.huggingface.co/models/${modelName}`,
      {
        inputs: prompt,
        parameters: { 
          negative_prompt: negativePrompt, 
          width: 512, 
          height: 768,
          num_inference_steps: 25
        }
      },
      {
        headers: { Authorization: `Bearer ${HF_TOKEN}` },
        responseType: 'arraybuffer',
        timeout: 30000
      }
    );

    const buffer = Buffer.from(res.data);
    
    // Check if the response is a JSON error or a valid image
    // JPEG starts with 0xFFD8, PNG starts with 0x89504E47
    const isImage = (buffer[0] === 0xFF && buffer[1] === 0xD8) || (buffer[0] === 0x89 && buffer[1] === 0x50);
    
    if (isImage) {
      const filename = `test_hf_${modelName.replace('/', '_')}.jpg`;
      fs.writeFileSync(filename, buffer);
      console.log(`🎉 SUCCESS! Image saved as ${filename} (${buffer.length} bytes).`);
      return true;
    } else {
      console.log("❌ Response was not a valid image (likely JSON error or blocked):", buffer.toString('utf8').substring(0, 200));
    }
  } catch (err) {
    console.error("❌ Failed:", err.response?.data ? Buffer.from(err.response.data).toString('utf8') : err.message);
  }
  return false;
}

async function runTests() {
  if (!HF_TOKEN) {
    console.error("No HF_TOKEN found in .env file.");
    return;
  }
  console.log("Using HF Token:", HF_TOKEN.substring(0, 10) + "...");
  for (const model of models) {
    const success = await testModel(model);
    if (success) {
      console.log(`\nFound working model: ${model}`);
    }
    // Small sleep to avoid rate limits
    await new Promise(r => setTimeout(r, 2000));
  }
}

runTests();
