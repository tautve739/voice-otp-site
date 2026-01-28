import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
app.use(cors());
app.use(express.json());

const otpStore = new Map(); // phone -> { hash, expires }

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
}

function hashOTP(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

// Request OTP endpoint
app.post('/api/request-otp', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });

  const otp = generateOTP();
  otpStore.set(phone, { hash: hashOTP(otp), expires: Date.now() + 2*60*1000 });

  // 🔊 PLACEHOLDER: send voice OTP using your API here
  console.log(`Voice OTP for ${phone}: ${otp}`);

  res.json({ success: true });
});

// Verify OTP endpoint
app.post('/api/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  const record = otpStore.get(phone);
  if (!record || Date.now() > record.expires || hashOTP(otp) !== record.hash) {
    return res.json({ success: false });
  }
  otpStore.delete(phone);
  res.json({ success: true });
});

app.listen(3000, () => console.log('Server running on port 3000'));
