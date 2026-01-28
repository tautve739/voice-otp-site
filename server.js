import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fetch from 'node-fetch'; // npm install node-fetch@3

const app = express();
app.use(cors());
app.use(express.json());

const otpStore = new Map(); // phone -> { hash, expires }

// ------------------- OTP generation -------------------
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
}

function hashOTP(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

// ------------------- DIDWW Voice Call -------------------
// Replace +1234567890 with your DIDWW number
const DIDWW_NUMBER = '+37066108493';

// IMPORTANT: ENTER YOUR API KEY HERE
const DIDWW_API_KEY = 'v1lRcAtqwwVyk7W8QVscgZ5cuui8wfTT'; // <-- REPLACE THIS

async function makeVoiceCall(toNumber, otp) {
  // call_url points to a dynamic endpoint returning VoiceXML
  const callUrl = `https://your-server.com/voice-otp?otp=${otp}`;

  const body = {
    data: {
      type: "calls",
      attributes: {
        from: DIDWW_NUMBER,
        to: toNumber,
        call_url: callUrl
      }
    }
  };

  try {
    const res = await fetch('https://api.didww.com/v3/voice/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DIDWW_API_KEY}`, // <-- API KEY USED HERE
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    console.log('DIDWW call response:', data);
  } catch (err) {
    console.error('Error initiating DIDWW call:', err);
  }
}

// ------------------- Request OTP Endpoint -------------------
app.post('/api/request-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  const otp = generateOTP();
  otpStore.set(phone, { hash: hashOTP(otp), expires: Date.now() + 2*60*1000 });

  // Trigger DIDWW voice call
  await makeVoiceCall(phone, otp);

  res.json({ success: true });
});

// ------------------- Verify OTP Endpoint -------------------
app.post('/api/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  const record = otpStore.get(phone);
  if (!record || Date.now() > record.expires || hashOTP(otp) !== record.hash) {
    return res.json({ success: false });
  }
  otpStore.delete(phone);
  res.json({ success: true });
});

// ------------------- VoiceXML endpoint -------------------
// This returns a small XML snippet DIDWW fetches when the call is answered
app.get('/voice-otp', (req, res) => {
  const { otp } = req.query;
  res.set('Content-Type', 'application/xml');
  res.send(`
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Your verification code is ${otp.split('').join(' ')}</Say>
</Response>
  `);
});

// ------------------- Start server -------------------
app.listen(3000, () => console.log('Server running on port 3000'));
