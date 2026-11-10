# Smart Expense Classifier + Receipt Scanner

> **PROJECT 1 · AI FULL STACK**  
> *Upload a receipt. OCR reads it. An LLM categorises it. A dashboard tracks it.*

[![Node.js](https://img.shields.io/badge/Node.js-v22+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Compatible-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Gemini](https://img.shields.io/badge/Gemini_Flash-LLM_Parser-4285F4?logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Tesseract.js](https://img.shields.io/badge/Tesseract.js-OCR_Engine-5C2D91)](https://tesseract.projectnaptha.com/)

---

## ❓ The Problem
**Nobody logs expenses.**
1. **Manual typing**: Users enter category, amount, and tax by hand.
2. **Receipts pile up**: Paper fades and photos get lost in phone galleries.
3. **No insight**: Without categories, you cannot track where money goes.

**The Solution:** Photo in, structured expense out. Zero typing.

---

## 🛠️ Tech Stack
- **React**: Clean minimalist dashboard, drag-and-drop receipt uploader, verification review modal, category breakdown charts.
- **Node.js + Express**: REST API, Multer file upload handling, CSV export.
- **PostgreSQL / SQLite**: Resilient database layer with category aggregations and monthly budget limits.
- **Tesseract.js + Sharp**: Optical Character Recognition with blur mitigation (auto-resize to 2000px, grayscale, unsharp mask contrast enhancement).
- **Gemini Flash**: Converts messy OCR text into clean, structured JSON (merchant, date, total, tax, category, line-items).

---

## 🔁 Data Flow Architecture
```
[1. Upload Receipt] ──> [2. Image Preprocessing & OCR] ──> [3. Gemini Flash LLM]
                                                                  │
                                                                  ▼
[5. Dashboard Charts] <── [4. Review Screen & DB Save] <── [Cross-Check Totals]
```

1. **Upload**: React sends image multipart payload to `POST /api/receipts/scan`.
2. **OCR**: Sharp enhances contrast/grayscale/sharpness; Tesseract extracts text & candidate numbers.
3. **LLM**: Gemini Flash parses merchant, date, total, tax, and categorizes into standard buckets.
4. **Cross-Check & Review Step**: Verifies that LLM total matches OCR-detected numbers; flags discrepancies before user confirms and saves to PostgreSQL/SQLite.
5. **Dashboard & Budget Tracking**: React fetches categorized totals, renders charts, tracks monthly budget burn rates, and enables CSV export.

---

## ⚠️ Pitfalls & Mitigations Implemented
| Pitfall | Problem | Engineering Mitigation |
| :--- | :--- | :--- |
| **Blurry Photos** | Poor OCR accuracy on low-res camera shots | `sharp` preprocessing pipeline: upscale width to 2000px, grayscale conversion, and unsharp mask normalization. |
| **Invalid JSON** | LLMs occasionally wrap responses with markdown | Strict prompt schema + robust regex fence stripping & heuristic fallback parser. |
| **Hallucinated Totals**| Never trust LLMs with arithmetic or final totals | Candidate numeric tokens extracted from OCR are cross-checked (`Math.abs(ocrNum - llmTotal) <= 0.05`). Flagged with warnings if unmatched. |
| **Unchecked Saves** | Saving errors directly into the database | **Review Modal**: Side-by-side receipt image preview and editable fields before persisting. |

---

## 📂 Project Structure
```
expense-classifier/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadReceipt.jsx      # Upload zone, sample selector & review modal
│   │   │   ├── ExpenseTable.jsx       # macOS-styled table (Swiggy, Uber, BESCOM)
│   │   │   └── CategoryChart.jsx      # Recharts donut & monthly budget progress
│   │   ├── pages/
│   │   │   └── Dashboard.jsx          # Hero, KPI metrics, architecture drawer
│   │   ├── api.js                     # REST API client
│   │   ├── App.jsx
│   │   ├── index.css                  # Modern high-contrast grid aesthetic
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   └── receipts.js            # /scan, /confirm, /expenses, /budgets, /export-csv
│   │   ├── services/
│   │   │   ├── ocr.js                 # Sharp preprocessing + Tesseract engine
│   │   │   └── classifier.js          # Gemini Flash + OCR number cross-checking
│   │   ├── db/
│   │   │   ├── pool.js                # PostgreSQL / SQLite universal adapter
│   │   │   └── schema.sql             # SQL table definitions and initial seed
│   │   └── index.js                   # Express server entry point
│   ├── uploads/                       # User-uploaded receipt storage
│   ├── samples/                       # Built-in instant test receipts (Swiggy, Uber, BESCOM)
│   ├── .env                           # Environment configuration
│   └── package.json
├── README.md
└── package.json
```

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd server
npm install
npm start
```
*Backend starts on `http://localhost:5000` with zero configuration (SQLite default, PostgreSQL optional via `.env`).*

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 📝 Resume Bullet
> *"Built an AI expense tracker (React, Node.js, PostgreSQL) that reads receipts with OCR and auto-categorises them using an LLM."*

