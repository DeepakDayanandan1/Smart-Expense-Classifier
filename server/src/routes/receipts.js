const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db/pool');
const { performOCR } = require('../services/ocr');
const { classifyReceipt } = require('../services/classifier');

const router = express.Router();

// Multer storage setup for receipt images
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed!'), false);
    }
  }
});

/**
 * STEP 1 & 2 & 3: Upload -> OCR -> LLM Extraction
 * Does NOT immediately insert into DB; returns data for the User Review Screen.
 */
router.post('/scan', upload.single('receipt'), async (req, res) => {
  try {
    let filePath;
    let imageUrl;

    if (req.file) {
      filePath = req.file.path;
      imageUrl = `/uploads/${req.file.filename}`;
    } else if (req.body.sampleReceiptPath) {
      // Allow selecting built-in sample receipts reliably
      const cleanName = path.basename(req.body.sampleReceiptPath);
      const possiblePaths = [
        path.join(__dirname, '../../samples', cleanName),
        path.join(__dirname, '../../samples', req.body.sampleReceiptPath),
        path.resolve(req.body.sampleReceiptPath),
        path.join(process.cwd(), req.body.sampleReceiptPath)
      ];
      filePath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
      imageUrl = req.body.sampleReceiptUrl || `/samples/${cleanName}`;
    } else {
      return res.status(400).json({ error: 'No receipt image uploaded or selected.' });
    }

    console.log(`[Route] Scanning receipt: ${filePath}`);

    // Step 2: OCR with image preprocessing
    const ocrResult = await performOCR(filePath);
    if (!ocrResult.success || !ocrResult.rawText.trim()) {
      return res.status(422).json({
        error: 'Unable to extract legible text from receipt. Please ensure photo is clear and well-lit.',
        details: ocrResult.error
      });
    }

    // Step 3: LLM Classification & Cross-checking
    const classification = await classifyReceipt(ocrResult.rawText, ocrResult.candidateAmounts);

    res.json({
      success: true,
      data: {
        merchant: classification.merchant,
        date: classification.date,
        total: classification.total,
        tax: classification.tax,
        category: classification.category,
        notes: classification.notes,
        confidenceScore: classification.confidenceScore,
        aiModel: classification.aiModel,
        crossCheck: classification.crossCheck,
        rawOcrText: ocrResult.rawText,
        candidateAmounts: ocrResult.candidateAmounts,
        imageUrl
      }
    });
  } catch (error) {
    console.error('[Route] Scan error:', error);
    res.status(500).json({ error: 'Server error while processing receipt.', message: error.message });
  }
});

/**
 * STEP 4: User Review & Confirmation -> Validate & Save to DB
 */
router.post('/confirm', async (req, res) => {
  try {
    const {
      merchant,
      date,
      total,
      tax = 0.0,
      category,
      rawOcrText = '',
      imageUrl = '',
      confidenceScore = 0.95,
      ocrCrosscheckStatus = 'matched',
      notes = ''
    } = req.body;

    if (!merchant || total === undefined || isNaN(parseFloat(total))) {
      return res.status(400).json({ error: 'Merchant name and valid numeric total are required.' });
    }

    const totalVal = parseFloat(total);
    const taxVal = parseFloat(tax) || 0.0;
    const finalDate = date || new Date().toISOString().split('T')[0];
    const finalCategory = category || 'Other';

    const insertSql = `
      INSERT INTO expenses (
        merchant, expense_date, total, tax, category,
        raw_ocr_text, image_url, confidence_score, ocr_crosscheck_status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    const result = await db.query(insertSql, [
      merchant,
      finalDate,
      totalVal,
      taxVal,
      finalCategory,
      rawOcrText,
      imageUrl,
      confidenceScore,
      ocrCrosscheckStatus,
      notes
    ]);

    const createdId = result.lastID || (result.rows && result.rows[0]?.id);

    // Fetch complete saved record
    const fetchSql = `SELECT * FROM expenses WHERE id = $1`;
    const saved = await db.query(fetchSql, [createdId]);

    res.status(201).json({
      success: true,
      message: 'Expense saved successfully to database.',
      expense: saved.rows[0] || {
        id: createdId,
        merchant,
        expense_date: finalDate,
        total: totalVal,
        tax: taxVal,
        category: finalCategory
      }
    });
  } catch (error) {
    console.error('[Route] Confirm save error:', error);
    res.status(500).json({ error: 'Failed to save expense.', message: error.message });
  }
});

/**
 * STEP 5: Dashboard -> Fetch expenses, stats, category breakdown
 */
router.get('/expenses', async (req, res) => {
  try {
    const { category, search, limit = 100 } = req.query;
    let querySql = `SELECT * FROM expenses`;
    const params = [];
    const conditions = [];

    if (category && category !== 'All') {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(merchant LIKE $${params.length} OR notes LIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      querySql += ` WHERE ` + conditions.join(' AND ');
    }

    querySql += ` ORDER BY expense_date DESC, id DESC LIMIT ${parseInt(limit, 10)}`;

    const { rows: expenses } = await db.query(querySql, params);

    // Category breakdown totals for charts
    const categoryTotalsSql = `
      SELECT category, SUM(total) as total_amount, COUNT(*) as count
      FROM expenses
      GROUP BY category
      ORDER BY total_amount DESC
    `;
    const { rows: categoryStats } = await db.query(categoryTotalsSql);

    // Summary calculations
    const totalSpent = expenses.reduce((acc, curr) => acc + parseFloat(curr.total || 0), 0);
    const totalTax = expenses.reduce((acc, curr) => acc + parseFloat(curr.tax || 0), 0);

    res.json({
      success: true,
      expenses,
      categoryStats: categoryStats.map(s => ({
        category: s.category,
        total_amount: parseFloat(s.total_amount || 0),
        count: parseInt(s.count, 10)
      })),
      summary: {
        totalSpent: Math.round(totalSpent * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        count: expenses.length
      }
    });
  } catch (error) {
    console.error('[Route] Fetch expenses error:', error);
    res.status(500).json({ error: 'Failed to fetch expenses.', message: error.message });
  }
});

/**
 * Update existing expense
 */
router.put('/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { merchant, expense_date, total, tax, category, notes } = req.body;

    const updateSql = `
      UPDATE expenses
      SET merchant = $1, expense_date = $2, total = $3, tax = $4, category = $5, notes = $6
      WHERE id = $7
    `;
    await db.query(updateSql, [merchant, expense_date, total, tax, category, notes, id]);

    res.json({ success: true, message: 'Expense updated successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update expense.' });
  }
});

/**
 * Delete expense
 */
router.delete('/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM expenses WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Expense deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense.' });
  }
});

/**
 * Budgets Extension: Fetch category budgets and compare with monthly spend
 */
router.get('/budgets', async (req, res) => {
  try {
    const budgetsQuery = `SELECT * FROM budgets ORDER BY monthly_limit DESC`;
    const { rows: budgets } = await db.query(budgetsQuery);

    const spendQuery = `
      SELECT category, SUM(total) as current_spend
      FROM expenses
      GROUP BY category
    `;
    const { rows: spends } = await db.query(spendQuery);
    const spendMap = {};
    spends.forEach(s => {
      spendMap[s.category] = parseFloat(s.current_spend || 0);
    });

    const enrichedBudgets = budgets.map(b => {
      const spent = spendMap[b.category] || 0;
      const limit = parseFloat(b.monthly_limit);
      const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      return {
        ...b,
        monthly_limit: limit,
        current_spend: spent,
        remaining: Math.max(0, limit - spent),
        percentage,
        isWarning: percentage >= (b.alert_threshold || 80) && percentage < 100,
        isExceeded: percentage >= 100
      };
    });

    res.json({ success: true, budgets: enrichedBudgets });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch budgets.', message: error.message });
  }
});

/**
 * Update category budget
 */
router.put('/budgets/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { monthly_limit, alert_threshold = 80.0 } = req.body;

    await db.query(
      `UPDATE budgets SET monthly_limit = $1, alert_threshold = $2, updated_at = CURRENT_TIMESTAMP WHERE category = $3`,
      [monthly_limit, alert_threshold, category]
    );

    res.json({ success: true, message: 'Budget updated successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update budget.' });
  }
});

/**
 * CSV Export Extension
 */
router.get('/export-csv', async (req, res) => {
  try {
    const { rows: expenses } = await db.query(`SELECT * FROM expenses ORDER BY expense_date DESC`);

    // Build CSV string
    const headers = ['ID', 'Date', 'Merchant', 'Category', 'Total (INR)', 'Tax (INR)', 'Confidence', 'OCR Status', 'Notes'];
    const csvRows = [headers.join(',')];

    expenses.forEach(e => {
      const row = [
        e.id,
        `"${e.expense_date}"`,
        `"${(e.merchant || '').replace(/"/g, '""')}"`,
        `"${e.category}"`,
        e.total,
        e.tax,
        e.confidence_score,
        e.ocr_crosscheck_status,
        `"${(e.notes || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\r\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="smart-expense-report.csv"');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate CSV export.' });
  }
});

module.exports = router;

