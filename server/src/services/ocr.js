const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

/**
 * Preprocesses an image for optimal OCR extraction:
 * - Resizes if dimensions are small
 * - Converts to grayscale
 * - Normalizes contrast and applies unsharp mask to reduce blur
 */
async function preprocessImage(inputPath) {
  const ext = path.extname(inputPath);
  const processedPath = inputPath.replace(ext, `_preprocessed${ext}`);

  try {
    const metadata = await sharp(inputPath).metadata();
    let pipeline = sharp(inputPath).grayscale();

    // Resize up if the image is too low-res (blurry photo pitfall mitigation)
    if (metadata.width && metadata.width < 1500) {
      pipeline = pipeline.resize({ width: 2000, withoutEnlargement: false });
    }

    // Enhance contrast and sharpen text edges
    pipeline = pipeline
      .normalize()
      .sharpen({ sigma: 1.5, m1: 1.0, m2: 2.0 })
      .linear(1.2, -10); // slight contrast boost

    await pipeline.toFile(processedPath);
    return processedPath;
  } catch (err) {
    console.warn('[OCR] Image preprocessing failed, falling back to original:', err.message);
    return inputPath;
  }
}

/**
 * Extracts all numeric and currency-like amounts from raw OCR text
 * Used for cross-checking LLM hallucinated totals
 */
function extractAmountsFromOCR(text) {
  if (!text) return [];

  // Match numbers with optional currency symbols: ₹, ¥, Rs, INR, $, €, £, %
  const regex = /(?:₹|¥|Rs\.?|INR|\$|€|£|%)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})|\d+(?:\.\d{1,2})?)/gi;
  const amounts = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const cleanNumStr = match[1].replace(/,/g, '');
    const num = parseFloat(cleanNumStr);
    if (!isNaN(num) && num > 0 && num < 10000000) {
      amounts.push(num);
    }
  }

  // Return unique amounts sorted descending (highest first)
  return Array.from(new Set(amounts)).sort((a, b) => b - a);
}

/**
 * Performs OCR on the given receipt image file
 */
async function performOCR(imagePath) {
  console.log(`[OCR] Starting OCR process for ${imagePath}...`);
  const startTime = Date.now();

  // 1. Blurry image mitigation via Sharp preprocessing
  const targetPath = await preprocessImage(imagePath);

  try {
    // 2. Run Tesseract OCR engine
    const result = await Tesseract.recognize(targetPath, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && Math.round(m.progress * 100) % 25 === 0) {
          console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    const rawText = result.data.text ? result.data.text.trim() : '';
    const confidence = result.data.confidence ? (result.data.confidence / 100).toFixed(2) : 0.85;
    const candidateAmounts = extractAmountsFromOCR(rawText);

    // Clean up temporary preprocessed file if created
    if (targetPath !== imagePath && fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
      } catch (e) {
        // ignore cleanup error
      }
    }

    console.log(`[OCR] Finished in ${Date.now() - startTime}ms. Detected ${candidateAmounts.length} candidate amounts.`);

    return {
      success: true,
      rawText,
      confidence: parseFloat(confidence),
      candidateAmounts
    };
  } catch (error) {
    console.error('[OCR] Extraction error:', error);
    // Cleanup if needed
    if (targetPath !== imagePath && fs.existsSync(targetPath)) {
      try { fs.unlinkSync(targetPath); } catch (e) {}
    }
    return {
      success: false,
      error: error.message,
      rawText: '',
      confidence: 0,
      candidateAmounts: []
    };
  }
}

module.exports = {
  performOCR,
  extractAmountsFromOCR,
  preprocessImage
};

