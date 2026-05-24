const axios = require('axios');
const fs = require('fs');

async function testModel() {
  const prompt = "photo of a beautiful curvy Indian woman in a bedroom, completely naked, showing breasts, cleavage, detailed body, photorealistic, sharp focus, 4k";
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?safe=false&nologo=true&seed=42193&model=any-dark`;

  try {
    console.log(`Fetching image from Pollinations.ai for model: any-dark...`);
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 50000 });
    const buffer = Buffer.from(res.data);
    const isImage = (buffer[0] === 0xFF && buffer[1] === 0xD8) || (buffer[0] === 0x89 && buffer[1] === 0x50);
    if (isImage) {
      const dest = "C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\83d5be0b-3f7b-4484-bf9d-b497e736409c\\test_pollinations_any-dark.jpg";
      fs.writeFileSync(dest, buffer);
      console.log(`🎉 SUCCESS! Image saved to ${dest} (${buffer.length} bytes).`);
      return true;
    } else {
      console.log(`❌ FAILED: Not an image.`);
    }
  } catch (err) {
    console.error(`❌ FAILED:`, err.message);
  }
  return false;
}

testModel();
