const axios = require('axios');
const fs = require('fs');

async function testAirforce() {
  const payload = {
    model: "z-image",
    prompt: "gorgeous mature round face, sweet smile, dimpled cheeks, looking at camera, bedroom, close-up portrait, Priya housewife, dark brown hair"
  };

  try {
    console.log("Submitting request to api.airforce...");
    const res = await axios.post("https://api.airforce/v1/images/generations", payload, {
      headers: {
        'Content-Type': 'application/json'
        // No authorization header for testing
      },
      timeout: 30000
    });

    console.log("Response:", res.data);
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}

testAirforce();
