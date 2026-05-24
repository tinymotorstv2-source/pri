const fs = require('fs');

try {
  const flux = fs.readFileSync('test_poll_soft_flux.jpg');
  const grok = fs.readFileSync('test_poll_soft_grok-imagine.jpg');
  console.log("Flux vs Groq Soft:", flux.equals(grok));
  
  // Let's copy one of these to the artifacts directory as well
  fs.copyFileSync('test_poll_soft_flux.jpg', 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\83d5be0b-3f7b-4484-bf9d-b497e736409c\\test_poll_soft_flux.jpg');
} catch (e) {
  console.error("Error:", e.message);
}
