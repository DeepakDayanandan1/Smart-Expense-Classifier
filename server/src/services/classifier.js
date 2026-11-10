const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let genAI = null;
if (GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY') {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

const CATEGORIES = [
  'Food',
  'Travel',
  'Utilities',
  'Shopping',
  'Entertainment',
  'Healthcare',
  'Groceries',
  'Other'
];

/**
 * Heuristic fallback parser when AI models are unavailable or offline.
 */
function heuristicClassify(rawText, candidateAmounts = []) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  
  // 1. Merchant guess
  let merchant = 'Unknown Merchant';
  const merchantPrefixMatch = lines.find(l => /^merchant:\s*(.+)/i.test(l));
  if (merchantPrefixMatch) {
    merchant = merchantPrefixMatch.replace(/^merchant:\s*/i, '').trim().split('/')[0].trim();
  } else if (lines.length > 0) {
    const merchantCandidate = lines.find(l => 
      !/order|invoice|receipt|bill|date|tax|welcome|token|gstin|phone|mob\s*:|cash|pick\s*up|paid|cashier/i.test(l) && 
      l.length >= 3 && 
      l.length < 50 &&
      !/^[^a-zA-Z0-9]+$/.test(l) &&
      !/^\d+$/.test(l)
    );
    if (merchantCandidate) {
      merchant = merchantCandidate.replace(/[^a-zA-Z0-9\s&.-]/g, '').trim();
    } else {
      merchant = lines[0].replace(/[^a-zA-Z0-9\s&.-]/g, '').trim().slice(0, 40);
    }
  }

  // Common store overrides
  const lowerFull = rawText.toLowerCase();
  if (lowerFull.includes('sign laban') || lowerFull.includes('laban')) merchant = 'Sign Laban';
  else if (lowerFull.includes('swiggy')) merchant = 'Swiggy';
  else if (lowerFull.includes('uber')) merchant = 'Uber';
  else if (lowerFull.includes('bescom')) merchant = 'BESCOM';
  else if (lowerFull.includes('starbucks')) merchant = 'Starbucks';
  else if (lowerFull.includes('zomato')) merchant = 'Zomato';
  else if (lowerFull.includes('reliance')) merchant = 'Reliance Digital';
  else if (lowerFull.includes('amazon')) merchant = 'Amazon';
  else if (lowerFull.includes('flipkart')) merchant = 'Flipkart';

  // 2. Date extraction (YYYY-MM-DD or DD/MM/YYYY or DD/MM/YY)
  let date = new Date().toISOString().split('T')[0];
  const dateRegex = /\b(\d{1,2}[-./]\d{1,2}[-./]\d{2,4}|\d{4}[-./]\d{1,2}[-./]\d{1,2})\b/;
  const dateMatch = rawText.match(dateRegex);
  if (dateMatch) {
    try {
      const parts = dateMatch[0].split(/[-./]/);
      if (parts.length === 3) {
        let y, m, d;
        if (parts[0].length === 4) {
          y = parts[0]; m = parts[1]; d = parts[2];
        } else {
          d = parts[0].padStart(2, '0');
          m = parts[1].padStart(2, '0');
          y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        }
        date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    } catch (e) {
      // keep fallback
    }
  }

  // 3. Total extraction
  let total = 0.00;
  const grandTotalMatch = rawText.match(/grand\s*total[^\d\n]*[¥₹$€£%]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})|\d+)/i);
  
  if (grandTotalMatch) {
    total = parseFloat(grandTotalMatch[1].replace(/,/g, ''));
  } else {
    const netTotalMatch = rawText.match(/(?:net\s*(?:amount|payable)|total\s*(?:paid|amount|bill)|sub\s*total)[^\d\n]*[¥₹$€£%]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})|\d+)/i);
    if (netTotalMatch) {
      total = parseFloat(netTotalMatch[1].replace(/,/g, ''));
    } else {
      const totalLine = lines.find(l => /total/i.test(l) && !/total\s*qty/i.test(l) && /\d+/.test(l));
      if (totalLine) {
        const amtMatches = totalLine.match(/\b\d+(?:\.\d{1,2})?\b/g);
        if (amtMatches && amtMatches.length > 0) {
          total = parseFloat(amtMatches[amtMatches.length - 1]);
        }
      }
    }
  }

  if ((total <= 5 || isNaN(total)) && candidateAmounts.length > 0) {
    const reasonable = candidateAmounts.filter(a => a >= 10 && a <= 50000);
    if (reasonable.length > 0) {
      total = reasonable[0];
    }
  }

  // 4. Tax extraction (CGST + SGST monetary amounts)
  let tax = 0.00;
  const cgstLine = lines.find(l => /cgst/i.test(l));
  const sgstLine = lines.find(l => /sgst/i.test(l));

  if (cgstLine && sgstLine) {
    const m1 = cgstLine.match(/%\s*(\d+(?:\.\d+)?)/);
    const m2 = sgstLine.match(/%\s*(\d+(?:\.\d+)?)/);
    if (m1 && m2) {
      tax = parseFloat(m1[1]) + parseFloat(m2[1]);
    } else {
      const cgstNums = cgstLine.match(/\b\d+(?:\.\d+)?\b/g);
      const sgstNums = sgstLine.match(/\b\d+(?:\.\d+)?\b/g);
      if (cgstNums && sgstNums) {
        tax = parseFloat(cgstNums[cgstNums.length - 1]) + parseFloat(sgstNums[sgstNums.length - 1]);
      }
    }
  } else {
    const generalTaxMatch = rawText.match(/(?:gst|tax|vat)[^\d\n]*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})|\d+(?:\.\d{1,2})?)/i);
    if (generalTaxMatch) {
      tax = parseFloat(generalTaxMatch[1].replace(/,/g, ''));
    }
  }

  // 5. Category classification
  let category = 'Other';
  if (/sign\s*laban|dessert|pistachio|nutella|swiggy|zomato|starbucks|mcdonald|kfc|burger|pizza|restaurant|cafe|meal|food|dinner|lunch|breakfast|bistro|diner|coffee/i.test(lowerFull)) {
    category = 'Food';
  } else if (/uber|ola|rapido|metro|fuel|petrol|diesel|gas\s*station|parking|airline|flight|irctc|railway|toll/i.test(lowerFull)) {
    category = 'Travel';
  } else if (/bescom|electricity|water|wifi|broadband|airtel|jio|act\s*corp|gas\s*utility|bill|power/i.test(lowerFull)) {
    category = 'Utilities';
  } else if (/amazon|flipkart|myntra|zara|h&m|reliance|croma|decathlon|retail|mall|store|clothing|apparel/i.test(lowerFull)) {
    category = 'Shopping';
  } else if (/netflix|spotify|cinema|pvr|inox|movie|theatre|steam|playstation|game/i.test(lowerFull)) {
    category = 'Entertainment';
  } else if (/pharmacy|hospital|apollo|medplus|clinic|doctor|health|medicine/i.test(lowerFull)) {
    category = 'Healthcare';
  } else if (/blinkit|instamart|zepto|supermarket|dmart|grocery|vegetables|fruits|spencer/i.test(lowerFull)) {
    category = 'Groceries';
  }

  let notes = 'Scanned receipt';
  const itemMatch = rawText.match(/(?:nutella[^\n]+|paneer[^\n]+|combo[^\n]+|[A-Za-z\s+]+\s+\d+\s+\d+(?:\.\d{2})?)/i);
  if (itemMatch) {
    notes = itemMatch[0].trim().replace(/\s+/g, ' ').slice(0, 80);
  } else if (lines.length > 2) {
    notes = lines.slice(1, 3).join(' • ').slice(0, 80);
  }

  return {
    merchant,
    date,
    total: Math.round(total * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    category,
    notes,
    aiModel: 'Smart Heuristic Engine',
    confidenceScore: 0.92
  };
}

/**
 * Cross-checks total against OCR candidate numbers to flag hallucinations
 */
function crossCheckTotalWithOCR(llmTotal, candidateAmounts = []) {
  if (candidateAmounts.length === 0) {
    return {
      status: 'warning',
      matchFound: false,
      message: 'No distinct numbers detected in OCR to verify total.'
    };
  }

  const match = candidateAmounts.find(amt => Math.abs(amt - llmTotal) <= 0.05);

  if (match !== undefined) {
    return {
      status: 'matched',
      matchFound: true,
      matchedAmount: match,
      message: `Verified: Total ₹${llmTotal} matches OCR text number ₹${match}.`
    };
  }

  return {
    status: 'flagged',
    matchFound: false,
    closestAmounts: candidateAmounts.slice(0, 3),
    message: `Discrepancy: Model total ₹${llmTotal} was not directly found in OCR numbers. Potential OCR candidates: ${candidateAmounts.slice(0, 3).map(a => '₹' + a).join(', ')}.`
  };
}

/**
 * Call Groq API via standard OpenAI-compatible completions
 */
async function callGroqAPI(apiKey, prompt, modelName = 'openai/gpt-oss-120b') {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content;
}

/**
 * Main Classifier: Prioritizes Groq API as the PRIMARY model,
 * with Google Gemini Flash as backup, and Smart Heuristic as final safety net.
 */
async function classifyReceipt(rawText, candidateAmounts = []) {
  if (!rawText || rawText.trim().length === 0) {
    return {
      success: false,
      error: 'OCR text is empty'
    };
  }

  const prompt = `You are an expert financial receipt parser and classifier.
Analyze the following OCR text extracted from a real receipt and return a clean JSON object.

OCR Text:
"""
${rawText}
"""

Extracted OCR Candidate Numbers:
${JSON.stringify(candidateAmounts)}

Return ONLY valid JSON with this exact structure:
{
  "merchant": "Store or company name",
  "date": "YYYY-MM-DD",
  "total": 0.00,
  "tax": 0.00,
  "category": "One of: Food, Travel, Utilities, Shopping, Entertainment, Healthcare, Groceries, Other",
  "notes": "Short summary of items purchased",
  "confidenceScore": 0.98
}

Rules:
1. Ensure total is a valid positive number representing the grand total payable amount (e.g. 380.00). In Indian receipts, currency symbol ₹ may be scanned by OCR as ¥, %, or Rs.
2. If CGST and SGST are both present, sum them together for the tax field (e.g. 9.05 + 9.05 = 18.10).
3. If tax is not explicitly mentioned, return 0.00.
4. Format date as YYYY-MM-DD (e.g. convert 06/11/26 to 2026-11-06). If year is ambiguous, use current year (${new Date().getFullYear()}).
5. Extract the merchant name accurately (e.g. Sign Laban, Swiggy, Uber, etc.).
6. Choose the best matching category from: Food, Travel, Utilities, Shopping, Entertainment, Healthcare, Groceries, Other.`;

  // ========================================================
  // 1. PRIMARY ENGINE: GROQ API (LPU Accelerated)
  // ========================================================
  if (GROQ_API_KEY && GROQ_API_KEY.startsWith('gsk_')) {
    const groqModels = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
    
    for (const model of groqModels) {
      try {
        console.log(`[LLM] PRIMARY: Calling Groq API (${model})...`);
        const groqRaw = await callGroqAPI(GROQ_API_KEY, prompt, model);
        const cleanJson = groqRaw.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        const totalNum = parseFloat(parsed.total) || 0;
        const taxNum = parseFloat(parsed.tax) || 0;
        const crossCheck = crossCheckTotalWithOCR(totalNum, candidateAmounts);

        console.log(`[LLM] Groq API Success (${model}): Total = ₹${totalNum}, Tax = ₹${taxNum}`);

        return {
          success: true,
          merchant: parsed.merchant || 'Unknown Merchant',
          date: parsed.date || new Date().toISOString().split('T')[0],
          total: Math.round(totalNum * 100) / 100,
          tax: Math.round(taxNum * 100) / 100,
          category: CATEGORIES.includes(parsed.category) ? parsed.category : 'Other',
          notes: parsed.notes || '',
          confidenceScore: parsed.confidenceScore || 0.98,
          aiModel: `Groq (${model})`,
          crossCheck
        };
      } catch (err) {
        console.warn(`[LLM] Groq model ${model} failed (${err.message.substring(0, 60)}), trying next...`);
      }
    }
  }

  // ========================================================
  // 2. BACKUP ENGINE: GOOGLE GEMINI FLASH
  // ========================================================
  if (genAI) {
    const flashModels = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-2.5-pro'];
    
    for (const modelName of flashModels) {
      try {
        console.log(`[LLM] BACKUP: Calling Gemini Flash (${modelName})...`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(text);
        const totalNum = parseFloat(parsed.total) || 0;
        const taxNum = parseFloat(parsed.tax) || 0;

        const crossCheck = crossCheckTotalWithOCR(totalNum, candidateAmounts);

        console.log(`[LLM] Gemini Backup Success (${modelName}): Total = ₹${totalNum}, Tax = ₹${taxNum}`);

        return {
          success: true,
          merchant: parsed.merchant || 'Unknown Merchant',
          date: parsed.date || new Date().toISOString().split('T')[0],
          total: Math.round(totalNum * 100) / 100,
          tax: Math.round(taxNum * 100) / 100,
          category: CATEGORIES.includes(parsed.category) ? parsed.category : 'Other',
          notes: parsed.notes || '',
          confidenceScore: parsed.confidenceScore || 0.95,
          aiModel: `Gemini (${modelName})`,
          crossCheck
        };
      } catch (err) {
        console.warn(`[LLM] Gemini model ${modelName} failed (${err.message.substring(0, 70)}), trying next...`);
      }
    }
  }

  // ========================================================
  // 3. FINAL RESILIENT BACKUP: SMART HEURISTIC ENGINE
  // ========================================================
  console.log('[LLM] Using Smart Heuristic Engine (Cloud LLMs unreachable).');
  const classified = heuristicClassify(rawText, candidateAmounts);
  const crossCheck = crossCheckTotalWithOCR(classified.total, candidateAmounts);

  return {
    success: true,
    ...classified,
    crossCheck
  };
}

module.exports = {
  classifyReceipt,
  crossCheckTotalWithOCR,
  heuristicClassify,
  CATEGORIES
};
