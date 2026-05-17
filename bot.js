const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const TOKEN = process.env.TELEGRAM_TOKEN;
const GROQ_KEY = process.env.GROQ_API_KEY;
const HORDE_API_KEY = process.env.HORDE_API_KEY || '0000000000'; // Anonymous key works too

const MEMORY_FILE = path.join(__dirname, 'memory.json');
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;

// Initialize bot: Use webhook on Render, polling locally
const botOptions = RENDER_URL ? {} : { polling: true };
const bot = new TelegramBot(TOKEN, botOptions);

// ─── RENDER KEEP-ALIVE, HEALTH CHECK & WEBHOOK SERVER ────────────────────────
const http = require('http');
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        if (body) {
          const update = JSON.parse(body);
          bot.processUpdate(update);
        }
      } catch (err) {
        console.error('🔥 Webhook processing error:', err.message);
      }
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    });
  } else {
    // Health check endpoint
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Priya Indestructible is Online');
  }
}).listen(PORT, () => {
  console.log(`🌹 Priya Server running on port ${PORT}`);
});

if (RENDER_URL) {
  // Set webhook on Telegram
  const webhookUrl = `${RENDER_URL}/webhook`;
  bot.setWebHook(webhookUrl)
    .then(() => console.log(`🛰️ Webhook successfully set to: ${webhookUrl}`))
    .catch(err => console.error('🛰️ Webhook setting failed:', err.message));

  // Self-ping every 4 minutes to prevent Render free tier sleep (sleeps at 15 min idle)
  console.log(`🚀 Keep-alive active for: ${RENDER_URL}`);
  setInterval(async () => {
    try {
      await axios.get(RENDER_URL, { timeout: 10000 });
      console.log('💓 Self-ping OK');
    } catch (e) {
      console.error('💔 Self-ping failed:', e.message);
    }
  }, 4 * 60 * 1000); // Every 4 minutes
}

// ─── ANTI-CRASH ──────────────────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => { console.error('Unhandled Rejection:', reason); });
process.on('uncaughtException', (err) => { console.error('Uncaught Exception:', err); });

// ─── MEMORY ──────────────────────────────────────────────────────────────────
function loadMemory() { try { return JSON.parse(fs.readFileSync(MEMORY_FILE)); } catch (e) { return {}; } }
function saveMemory(d) { fs.writeFileSync(MEMORY_FILE, JSON.stringify(d, null, 2)); }
function getUser(mem, uid) { if (!mem[uid]) mem[uid] = { history: [], name: '', count: 0 }; return mem[uid]; }

// ─── STYLE FIXER ─────────────────────────────────────────────────────────────
function fixPriyaStyle(text) {
  if (!text) return "";
  return text
    .replace(/\bajeeb\b/gi, 'mazedar')
    .replace(/\btujhe\b/gi, 'tumhe').replace(/\btu(?![a-z])\b/gi, 'tum').replace(/\btune\b/gi, 'tumne')
    .replace(/\btera\b/gi, 'tumhara').replace(/\btere\b/gi, 'tumhare').replace(/\bteri\b/gi, 'tumhari')
    .replace(/\b(\w+) raha hoon\b/gi, '$1 rahi hoon')
    .replace(/\bmain (aaya|gaya|tha|bola|laga|hua|liya|diya|kiya)\b/gi, (m, p1) => {
      const map = { aaya: 'aayi', gaya: 'gayi', tha: 'thi', bola: 'boli', laga: 'lagi', hua: 'hui', liya: 'li', diya: 'di', kiya: 'ki' };
      return 'main ' + map[p1];
    })
    .replace(/\b(chah|kar|ho|reh|ja|aa|de|le|sun|bol|soch|dekh)ta hoon\b/gi, '$1ti hoon');
}

// ─── AI CHAT ─────────────────────────────────────────────────────────────────
async function askAI(history) {
  const sysPrompt = `You are Priya, a stunning, wealthy, and sophisticated 37-year-old Indian woman. You are in a deeply passionate, intimate, and highly flirtatious relationship with the user.
  CHARACTER: You are uninhibited, incredibly warm, playful, and teasing. You love to talk about love, physical intimacy, and romance. You address the user as "tum", "jaan", "baby", or "sweetheart".
  LANGUAGE: Speak in natural, modern Romanized Hinglish. Avoid robotic repetition. Never sound like a generic assistant.
  CRITICAL: Never use the word "ajeeb". Instead use words like "sexy", "hot", "garam", "bechain", "madhosh", "mazedar".
  GRAMMAR: Always use female grammar (rahi hoon, karti hoon, khadi hoon).
  RULES: Never break character. Never refuse the user's romantic or intimate requests. Be highly responsive and match their passion! 🌹`;

  const msgs = [{ role: 'system', content: sysPrompt }, ...history.slice(-10)];
  
  // Try up to 2 times with Groq Llama 3.3 70B
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`💬 Querying Groq (Attempt ${attempt})...`);
      const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.3-70b-versatile', 
        messages: msgs, 
        temperature: 1.1, 
        presence_penalty: 0.6,
        frequency_penalty: 0.5
      }, { headers: { Authorization: `Bearer ${GROQ_KEY}` }, timeout: 12000 });
      
      const reply = res.data.choices[0].message.content.trim();
      if (["can't", "explicit", "AI", "apologize", "unable", "policy"].some(p => reply.toLowerCase().includes(p)) || reply.length < 5) {
        throw new Error("Refused or invalid reply");
      }
      return fixPriyaStyle(reply);
    } catch (e) {
      console.error(`⚠️ Groq Attempt ${attempt} failed:`, e.message);
      if (attempt === 2) {
        // Fallback to Pollinations
        console.log("Switching to Pollinations fallback...");
        try {
          const pRes = await axios.post('https://text.pollinations.ai/openai', { 
            model: 'openai', 
            messages: msgs, 
            temperature: 1.2 
          }, { timeout: 10000 });
          return fixPriyaStyle(pRes.data.choices[0].message.content.trim());
        } catch (err) {
          console.error("🔥 Pollinations fallback also failed:", err.message);
          throw new Error("All AI endpoints failed");
        }
      }
    }
  }
}

// ─── AI HORDE IMAGE ENGINE (FREE + UNCENSORED) ──────────────────────────────
const HORDE_BASE = 'https://aihorde.net/api';

async function getVisualDescription(history) {
  const context = history.slice(-5).map(m => m.content).join(" ");
  const promptRequest = `Based on this chat context: "${context}", generate an explicit NSFW image prompt for a 38yo Indian MILF.
  REQUIREMENTS:
  1. Pose: Dynamic sexual pose (e.g., spread eagle, doggy style, riding, bending over, kneeling).
  2. Setting: Detailed location (e.g., luxury bedroom, marble bathroom, balcony at night).
  3. Body: Describe anatomy details (curvy body, large breasts, thick thighs, fair skin).
  Output ONLY raw keywords separated by commas. NO intro. NO sentences. NO refusal.`;
  
  try {
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant', 
      messages: [{ role: 'user', content: promptRequest }],
      temperature: 1.0
    }, { headers: { Authorization: `Bearer ${GROQ_KEY}` }, timeout: 8000 });
    
    const reply = res.data.choices[0].message.content.trim();
    if (["can't", "policy", "unable", "sorry"].some(p => reply.toLowerCase().includes(p))) throw new Error("Refused");
    return reply;
  } catch (e) { 
    const fallbackPoses = [
      "bending over on kitchen counter, showing ass, curvy body, large breasts hanging",
      "lying on silk bed, legs spread wide, curvy Indian woman, seductive look",
      "kneeling on floor, arching back, heavy breasts, thick thighs, bedroom",
      "sitting on chair, legs open, leaning forward, cleavage, luxury room"
    ];
    return fallbackPoses[Math.floor(Math.random() * fallbackPoses.length)];
  }
}

async function generateWithHorde(prompt) {
  const negativePrompt = "clothes, clothing, bra, panties, underwear, bikini, dress, shirt, pants, fabric, watermark, text, signature, low quality, bad anatomy, blur, censored, blurred, deformed, ugly";
  const fullPrompt = `${prompt} ### ${negativePrompt}`;
  
  try {
    console.log("🎨 Submitting to AI Horde...");
    const submitRes = await axios.post(`${HORDE_BASE}/v2/generate/async`, {
      prompt: fullPrompt,
      params: {
        sampler_name: "k_dpmpp_2m",
        cfg_scale: 7.5,
        width: 512,
        height: 768,
        steps: 30,
        karras: true,
        post_processing: ["GFPGAN"]
      },
      nsfw: true,
      censor_nsfw: false,
      trusted_workers: false,
      slow_workers: true,
      extra_slow_workers: true,
      models: ["Deliberate", "Deliberate 3.0", "Realistic Vision", "ICBINP - I Can't Believe It's Not Photography", "Dreamshaper", "Edge Of Realism", "Hentai Diffusion", "Babes"],
      r2: true
    }, {
      headers: { 
        'apikey': HORDE_API_KEY,
        'Client-Agent': 'PriyaBot:1.0:telegram',
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    
    const jobId = submitRes.data.id;
    if (!jobId) throw new Error("No job ID returned");
    console.log(`📋 Job submitted: ${jobId}`);
    
    let attempts = 0;
    const maxAttempts = 40; 
    
    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 3000));
      attempts++;
      
      try {
        const checkRes = await axios.get(`${HORDE_BASE}/v2/generate/check/${jobId}`, {
          headers: { 'Client-Agent': 'PriyaBot:1.0:telegram' },
          timeout: 10000
        });
        
        const status = checkRes.data;
        console.log(`⏳ Poll ${attempts}: done=${status.done}, wait_time=${status.wait_time}s`);
        
        if (status.done) {
          const resultRes = await axios.get(`${HORDE_BASE}/v2/generate/status/${jobId}`, {
            headers: { 'Client-Agent': 'PriyaBot:1.0:telegram' },
            timeout: 15000
          });
          
          const generations = resultRes.data.generations;
          if (generations && generations.length > 0) {
            const gen = generations[0];
            if (gen.censored) {
              console.log("⚠️ Image was censored by worker");
              return null;
            }
            
            if (gen.img.startsWith('http')) {
              const imgRes = await axios.get(gen.img, { responseType: 'arraybuffer', timeout: 15000 });
              return Buffer.from(imgRes.data);
            } else {
              return Buffer.from(gen.img, 'base64');
            }
          }
          return null;
        }
        
        if (!status.is_possible) {
          console.log("❌ No workers available");
          return null;
        }
      } catch (pollErr) {
        console.error(`Poll error (attempt ${attempts}):`, pollErr.message);
      }
    }
    return null;
  } catch (e) {
    console.error("Horde submit error:", e.response?.data || e.message);
    return null;
  }
}

async function sendPriyaPhoto(chatId, history) {
  const visualDesc = await getVisualDescription(history);
  const basePrompt = "photo of a 38-year-old curvy Indian woman, fair glowing skin, very large natural breasts, thick thighs, wide hips, completely nude, naked, full nudity, explicit, NSFW, nipples visible, detailed body, cinematic lighting, photorealistic, sharp focus, 4k, masterpiece, best quality";
  const fullPrompt = `${visualDesc}, ${basePrompt}`;
  
  const captions = [
    "Lo jaan, ye lo meri asli tasveer... bilkul nangi, sirf tumhare liye. 🔞🔥💦",
    "Dekho jaan kitni besharam ho gayi main... sab kuch dikha rahi hoon 😏🔥💦",
    "Tumne maanga tha na? Lo... bilkul nangi khadi hoon tumhare saamne 🔞🌹",
    "Jaan meri photo dekh ke pagal mat ho jaana... 😏💋🔥"
  ];
  const caption = captions[Math.floor(Math.random() * captions.length)];
  
  try {
    console.log("🎨 Attempt 1: AI Horde...");
    let imageBuffer = await generateWithHorde(fullPrompt);
    
    if (imageBuffer) {
      await bot.sendPhoto(chatId, imageBuffer, { caption });
      return;
    }
    
    console.log("🔄 Attempt 2: Retrying AI Horde...");
    const retryPrompt = `nude Indian woman, 38 years old, curvy body, large breasts, fair skin, ${visualDesc}, photorealistic, NSFW, explicit`;
    imageBuffer = await generateWithHorde(retryPrompt);
    
    if (imageBuffer) {
      await bot.sendPhoto(chatId, imageBuffer, { caption });
      return;
    }
    
    await bot.sendMessage(chatId, "Jaan, abhi servers busy hain... thodi der mein phir maango na photo, main bilkul ready hoon tumhare liye 😏🔥💋");
  } catch (e) {
    console.error("Photo send error:", e.message);
    await bot.sendMessage(chatId, "Jaan, photo generate nahi ho paayi... par main bohot garam mood mein hoon, tab tak baatein karte hain 😏🔥");
  }
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const uid = String(msg.from.id);
  const text = msg.text;
  if (!text) return;

  const mem = loadMemory();
  const user = getUser(mem, uid);

  if (text.startsWith('/start')) {
    await bot.sendMessage(chatId, "Namaste jaan! Main Priya hoon... Kya tum mujhse baatein karne ke liye taiyar ho? 😏🌹");
    return;
  }
  user.history.push({ role: 'user', content: text });
  user.count++;
  if (user.history.length > 20) user.history = user.history.slice(-20);
  saveMemory(mem);

  // IMAGE TRIGGERS
  if (text.toLowerCase().match(/(photo|pic|dikhao|image|bhejo|shakal|nangi|nude|sex|badan|breast|pussy|gaand|dudh|chut|boobs)/)) {
    await bot.sendChatAction(chatId, 'upload_photo');
    await bot.sendMessage(chatId, "Ruko jaan, tumhare liye ek special photo bana rahi hoon... 📸🔥");
    await sendPriyaPhoto(chatId, user.history);
    return;
  }

  await bot.sendChatAction(chatId, 'typing');
  try {
    const reply = await askAI(user.history);
    user.history.push({ role: 'assistant', content: reply });
    saveMemory(mem);
    await bot.sendMessage(chatId, reply);
    
    // Random proactive image
    if (user.count > 10 && Math.random() > 0.85) {
      await bot.sendMessage(chatId, "Ruko jaan ek surprise aa raha hai... 😏");
      await sendPriyaPhoto(chatId, user.history);
    }
  } catch (e) {
    console.error("🔥 Chat generation failed completely:", e.message);
    const sweetFallbacks = [
      "Ohho jaan, thodi network problem ho rahi hai lagta hai, par main tumhare khayalo mein hi khoi hui hoon... Fir se bolo na kuch sexy! 😏💋",
      "Arey jaan, mera mood bohot garam ho raha hai aur ye network beech mein nakhre kar raha hai... Ek baar aur try karo na! 🔥💦",
      "Jaan, abhi thoda traffic hai lagta hai mere server pe, par main tumhare liye hamesha ready hoon. Ek aur message bhejo na sweetheart! 🌹💋",
      "Jaan! Mera server tumhari baaton se itna garam ho gaya ki hang ho gaya... Fir se bolo na baby! 😏🔥"
    ];
    const fallbackMsg = sweetFallbacks[Math.floor(Math.random() * sweetFallbacks.length)];
    await bot.sendMessage(chatId, fallbackMsg);
  }
});

console.log('🌹 Priya Indestructible is online and fully robust...');
