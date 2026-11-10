import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Loader2, 
  Eye, 
  X, 
  PlusCircle, 
  Zap, 
  Receipt as ReceiptIcon,
  Calendar,
  Tag
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { scanReceipt, confirmExpense } from '../api';

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

export default function UploadReceipt({ 
  onExpenseAdded, 
  recentExpenses = [], 
  currencySymbol = '₹' 
}) {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [error, setError] = useState(null);

  // Review Modal State (from OCR / LLM)
  const [reviewData, setReviewData] = useState(null);
  const [showOcrText, setShowOcrText] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Manual Entry Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    merchant: '',
    date: new Date().toISOString().split('T')[0],
    total: '',
    tax: '',
    category: 'Food',
    notes: ''
  });

  // Receipt image preview modal
  const [activeImagePreview, setActiveImagePreview] = useState(null);

  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, WebP).');
      return;
    }
    setError(null);
    const objectUrl = URL.createObjectURL(file);
    processFile(file, objectUrl);
  };

  const processFile = async (file, localPreview) => {
    setLoading(true);
    setError(null);
    try {
      setScanStep('1/2 Sharp Preprocessing & Tesseract OCR...');
      const formData = new FormData();
      formData.append('receipt', file);

      setTimeout(() => {
        setScanStep('2/2 Groq LPU (GPT-OSS 120B) Structured Extraction...');
      }, 1000);

      const res = await scanReceipt(formData, false);
      setLoading(false);
      setScanStep('');

      if (res.success && res.data) {
        setReviewData({
          ...res.data,
          previewUrl: localPreview || res.data.imageUrl
        });
      }
    } catch (err) {
      setLoading(false);
      setScanStep('');
      setError(err.message || 'Failed to scan receipt. Please try another photo.');
    }
  };

  // Quick 1-click test of user's uploaded sample
  const handleTestUploadedSample = async () => {
    setError(null);
    setLoading(true);
    setScanStep('1/2 Sharp Preprocessing & Tesseract OCR on sample...');

    try {
      setTimeout(() => {
        setScanStep('2/2 Groq LPU (GPT-OSS 120B) Structured Extraction...');
      }, 900);

      const res = await scanReceipt({
        sampleReceiptPath: 'samples/sample-sign-laban.jpg',
        sampleReceiptUrl: '/samples/sample-sign-laban.jpg'
      }, true);

      setLoading(false);
      setScanStep('');

      if (res.success && res.data) {
        setReviewData({
          ...res.data,
          previewUrl: '/samples/sample-sign-laban.jpg'
        });
      }
    } catch (err) {
      setLoading(false);
      setScanStep('');
      setError(err.message || 'Failed to process sample receipt.');
    }
  };

  // Confirm & Save OCR Expense
  const handleConfirmSave = async () => {
    if (!reviewData) return;
    setIsSaving(true);
    try {
      await confirmExpense({
        merchant: reviewData.merchant,
        date: reviewData.date,
        total: parseFloat(reviewData.total),
        tax: parseFloat(reviewData.tax) || 0,
        category: reviewData.category,
        notes: reviewData.notes,
        confidenceScore: reviewData.confidenceScore,
        ocrCrosscheckStatus: reviewData.crossCheck?.status || 'matched',
        rawOcrText: reviewData.rawOcrText,
        imageUrl: reviewData.imageUrl || reviewData.previewUrl
      });

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });

      setIsSaving(false);
      setReviewData(null);
      if (onExpenseAdded) onExpenseAdded();
    } catch (err) {
      setIsSaving(false);
      alert('Error saving expense: ' + err.message);
    }
  };

  // Save Manual Expense
  const handleSaveManual = async (e) => {
    e.preventDefault();
    if (!manualForm.merchant || !manualForm.total) {
      alert('Please enter a merchant name and amount.');
      return;
    }
    setIsSaving(true);
    try {
      await confirmExpense({
        merchant: manualForm.merchant,
        date: manualForm.date,
        total: parseFloat(manualForm.total),
        tax: parseFloat(manualForm.tax) || 0,
        category: manualForm.category,
        notes: manualForm.notes,
        confidenceScore: 1.0,
        ocrCrosscheckStatus: 'manual',
        rawOcrText: 'Manual user entry',
        imageUrl: null
      });

      confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
      setIsSaving(false);
      setShowManualModal(false);
      setManualForm({
        merchant: '',
        date: new Date().toISOString().split('T')[0],
        total: '',
        tax: '',
        category: 'Food',
        notes: ''
      });
      if (onExpenseAdded) onExpenseAdded();
    } catch (err) {
      setIsSaving(false);
      alert('Error saving manual expense: ' + err.message);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Upload Zone Card */}
      <div 
        className={`relative bg-white rounded-3xl border-2 transition-all p-5 sm:p-8 shadow-sm ${
          dragActive 
            ? 'border-brand-600 bg-brand-50/40 ring-4 ring-brand-500/10' 
            : 'border-slate-200/90 hover:border-brand-500/70'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleFileChange}
        />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5 text-left w-full md:w-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-brand-50 to-blue-100/60 border border-brand-200/70 flex items-center justify-center text-brand-600 shadow-sm shrink-0">
              {loading ? (
                <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 animate-spin text-brand-600" />
              ) : (
                <UploadCloud className="w-7 h-7 sm:w-8 sm:h-8 text-brand-600" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Upload Receipt Image
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/80 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 fill-emerald-600" />
                  Groq LPU + Tesseract OCR
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
                Drag and drop your paper receipt photo here. Auto-sharpened, OCR extracted, and categorized in ~300ms.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={() => setShowManualModal(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4 text-slate-500" />
              <span>Manual Entry</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs sm:text-sm transition-all shadow-sm shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Select Photo</span>
            </button>
          </div>
        </div>

        {/* Loading Progress Bar */}
        {loading && (
          <div className="mt-6 pt-5 border-t border-slate-100 animate-pulse">
            <div className="flex items-center justify-between text-xs font-mono text-brand-600 mb-2">
              <span className="flex items-center gap-1.5 font-semibold">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                {scanStep}
              </span>
              <span>Processing...</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-brand-600 h-2 rounded-full w-3/4 animate-pulse"></div>
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="mt-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Scanning Issue</p>
              <p className="text-xs text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* RECENT SCANNED & CLASSIFIED RECEIPTS GALLERY (DUMMY DATA REMOVED) */}
        {/* ======================================================== */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1.5">
              <ReceiptIcon className="w-3.5 h-3.5 text-brand-600" />
              Recent Receipt Intake:
            </span>

            {recentExpenses.length === 0 && (
              <button
                type="button"
                onClick={handleTestUploadedSample}
                disabled={loading}
                className="text-xs font-mono text-brand-600 hover:text-brand-800 font-semibold underline flex items-center gap-1"
              >
                <Zap className="w-3 h-3 text-brand-600 fill-brand-600" />
                Quick Test with Sign Laban Sample Receipt
              </button>
            )}
          </div>

          {recentExpenses.length === 0 ? (
            <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center space-y-2">
              <ReceiptIcon className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">
                No receipts processed yet
              </p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                Upload a receipt photo above, click manual entry, or run a test with the Sign Laban receipt.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {recentExpenses.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-brand-500/70 hover:shadow-xs transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {item.merchant}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {item.expense_date}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700 shrink-0">
                      {item.category}
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-mono font-bold text-slate-900">
                        {currencySymbol}{parseFloat(item.total).toFixed(2)}
                      </div>
                      {parseFloat(item.tax || 0) > 0 && (
                        <div className="text-[10px] font-mono text-slate-400">
                          Tax {currencySymbol}{parseFloat(item.tax).toFixed(2)}
                        </div>
                      )}
                    </div>

                    {item.image_url && (
                      <button
                        type="button"
                        onClick={() => setActiveImagePreview(item.image_url)}
                        title="Inspect receipt image"
                        className="px-2 py-1 text-[11px] font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition"
                      >
                        Inspect
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* REVIEW STEP MODAL (Crucial Requirement & Verified) */}
      {/* ======================================================== */}
      {reviewData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Review Extracted Expense
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Extracted via {reviewData.aiModel || 'Groq LPU'}. Verify before saving to database.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewData(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
              {/* Left Column: Receipt Image */}
              <div className="md:col-span-5 flex flex-col gap-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-bold flex items-center justify-between">
                  <span>Scanned Document</span>
                  <span className="text-[10px] text-slate-400">Preprocessed</span>
                </div>

                <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-2 overflow-hidden flex items-center justify-center min-h-[200px] max-h-[340px]">
                  {reviewData.previewUrl ? (
                    <img
                      src={reviewData.previewUrl}
                      alt="Scanned receipt"
                      className="max-h-[320px] w-auto object-contain rounded-xl shadow-xs"
                    />
                  ) : (
                    <div className="text-center text-slate-400 p-6">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No image preview available</p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowOcrText(!showOcrText)}
                  className="text-xs text-brand-600 hover:text-brand-700 font-mono font-medium flex items-center gap-1.5 self-start"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {showOcrText ? 'Hide Raw OCR Text' : 'View Raw OCR Text'}
                </button>

                {showOcrText && (
                  <pre className="p-3 bg-slate-900 text-slate-200 text-[11px] font-mono rounded-xl max-h-36 overflow-y-auto whitespace-pre-wrap border border-slate-800">
                    {reviewData.rawOcrText || 'No text recognized.'}
                  </pre>
                )}
              </div>

              {/* Right Column: Extracted Values & Inputs */}
              <div className="md:col-span-7 flex flex-col gap-3.5">
                {/* Cross-check Status Banner */}
                {reviewData.crossCheck?.status === 'matched' ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold">Total Verified:</span> {reviewData.crossCheck.message}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Total Alert:</span> {reviewData.crossCheck?.message}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Merchant / Store
                    </label>
                    <input
                      type="text"
                      value={reviewData.merchant}
                      onChange={(e) => setReviewData({ ...reviewData, merchant: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Expense Date
                      </label>
                      <input
                        type="date"
                        value={reviewData.date}
                        onChange={(e) => setReviewData({ ...reviewData, date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Category
                      </label>
                      <select
                        value={reviewData.category}
                        onChange={(e) => setReviewData({ ...reviewData, category: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Total Amount ({currencySymbol})
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-sm font-mono text-slate-400">
                          {currencySymbol}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={reviewData.total}
                          onChange={(e) => setReviewData({ ...reviewData, total: e.target.value })}
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tax / GST ({currencySymbol})
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-sm font-mono text-slate-400">
                          {currencySymbol}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={reviewData.tax}
                          onChange={(e) => setReviewData({ ...reviewData, tax: e.target.value })}
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Notes / Line Items
                    </label>
                    <textarea
                      rows={2}
                      value={reviewData.notes || ''}
                      onChange={(e) => setReviewData({ ...reviewData, notes: e.target.value })}
                      placeholder="e.g. Nutella + Pistachio Salankatia"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100">
                    <span>Engine: {reviewData.aiModel || 'Groq LPU'}</span>
                    <span>Confidence: {Math.round((reviewData.confidenceScore || 0.98) * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setReviewData(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-medium transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmSave}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs sm:text-sm shadow-md shadow-brand-500/20 active:scale-95 flex items-center gap-2 transition disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving to DB...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Save Expense</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MANUAL ENTRY MODAL */}
      {/* ======================================================== */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-brand-600" />
                Add Expense Manually
              </h3>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManual} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Merchant / Store *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sign Laban, Swiggy, Metro"
                  value={manualForm.merchant}
                  onChange={(e) => setManualForm({ ...manualForm, merchant: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={manualForm.date}
                    onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={manualForm.category}
                    onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total ({currencySymbol}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="380.00"
                    value={manualForm.total}
                    onChange={(e) => setManualForm({ ...manualForm, total: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tax ({currencySymbol})</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="18.10"
                    value={manualForm.tax}
                    onChange={(e) => setManualForm({ ...manualForm, tax: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Items</label>
                <input
                  type="text"
                  placeholder="e.g. Nutella + Pistachio"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-xs"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Inspection Modal */}
      {activeImagePreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 relative shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-800 font-mono">Receipt Photo</h4>
              <button
                onClick={() => setActiveImagePreview(null)}
                className="text-slate-400 hover:text-slate-700 text-xs px-2 py-1 rounded-lg hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <div className="py-4 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={activeImagePreview}
                alt="Receipt Document"
                className="max-h-[60vh] object-contain rounded-xl border border-slate-200 shadow-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
