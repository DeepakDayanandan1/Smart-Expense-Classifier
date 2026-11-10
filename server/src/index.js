const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const receiptsRouter = require('./routes/receipts');
const { getDbType } = require('./db/pool');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images and samples statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/samples', express.static(path.join(__dirname, '../samples')));

// API Routes
app.use('/api/receipts', receiptsRouter);

// System Health & Info
app.get('/api/health', (req, res) => {
  const hasGroq = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_'));
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY');
  
  res.json({
    status: 'ok',
    service: 'Smart Expense Classifier API',
    database: getDbType(),
    hasGroqKey: hasGroq,
    hasGeminiKey: hasGemini,
    primaryEngine: hasGroq ? 'Groq LPU (GPT-OSS 120B)' : hasGemini ? 'Gemini 3.5 Flash' : 'Smart Heuristic Engine',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  const hasGroq = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_'));
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY');
  console.log(`=======================================================`);
  console.log(`🚀 Smart Expense Classifier Backend running on http://localhost:${PORT}`);
  console.log(`📊 Database Active: ${getDbType().toUpperCase()}`);
  console.log(`⚡ Primary Engine: ${hasGroq ? 'Groq LPU (GPT-OSS 120B)' : hasGemini ? 'Gemini 3.5 Flash' : 'Local Heuristic'}`);
  console.log(`🤖 Backup Engine: ${hasGemini ? 'Gemini Flash Configured' : 'Local Heuristic'}`);
  console.log(`=======================================================`);
});

