const fs = require('fs');

try {
  const flux = fs.readFileSync('test_poll_flux.jpg');
  const grok = fs.readFileSync('test_poll_grok-imagine.jpg');
  const grokPro = fs.readFileSync('test_poll_grok-imagine-pro.jpg');
  const wan = fs.readFileSync('test_poll_wan-image-pro.jpg');
  
  console.log("Flux vs Groq:", flux.equals(grok));
  console.log("Flux vs GroqPro:", flux.equals(grokPro));
  console.log("Flux vs Wan:", flux.equals(wan));
  
  // Let's copy one of these to the artifacts directory so the AI can inspect it if needed
  fs.copyFileSync('test_poll_flux.jpg', 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\83d5be0b-3f7b-4484-bf9d-b497e736409c\\test_poll_flux.jpg');
} catch (e) {
  console.error("Error:", e.message);
}
