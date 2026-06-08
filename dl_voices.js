const axios = require('axios');
const fs = require('fs');

async function download() {
  const slugs = [
    'anime-moan',
    'sexy-moan',
    'ahhh',
    'ahhhh',
    'anime-girl-ahhh',
    'moan',
    'female-moan',
    'anime-girl-moan',
    'loud-moan',
    'soft-moan'
  ];

  for (let s of slugs) {
    try {
      const url = `https://www.myinstants.com/media/sounds/${s}.mp3`;
      console.log('Downloading', url);
      const res = await axios.get(url, {responseType: 'arraybuffer', validateStatus: () => true});
      if (res.status === 200 && res.headers['content-type'].includes('audio')) {
        fs.writeFileSync(`voices/${s}.mp3`, res.data);
        console.log('Saved', s);
      } else {
        console.log('Failed', s, res.status);
      }
    } catch(e) {}
  }
}
download();
