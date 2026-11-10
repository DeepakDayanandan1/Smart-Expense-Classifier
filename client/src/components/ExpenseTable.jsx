import React, { useState } from 'react';
import { 
  Download, 
  Trash2, 
  Search, 
  Tag, 
  Calendar, 
  Receipt, 
  CheckCircle, 
  AlertCircle, 
  Filter,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon
} from 'lucide-react';
import { deleteExpense } from '../api';

const CATEGORY_COLORS = {
  Food: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  Travel: 'bg-blue-50 text-blue-700 border-blue-200/60',
  Utilities: 'bg-amber-50 text-amber-700 border-amber-200/60',
  Shopping: 'bg-purple-50 text-purple-700 border-purple-200/60',
  Entertainment: 'bg-pink-50 text-pink-700 border-pink-200/60',
  Healthcare: 'bg-rose-50 text-rose-700 border-rose-200/60',
  Groceries: 'bg-teal-50 text-teal-700 border-teal-200/60',
  Other: 'bg-slate-50 text-slate-700 border-slate-200/60'
};

export default function ExpenseTable({ 
  expenses = [], 
  onExpenseDeleted, 
  selectedCategory, 
  onSelectCategory,
  currencySymbol = '₹'
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [activeReceiptPreview, setActiveReceiptPreview] = useState(null);

  const categories = ['All', 'Food', 'Travel', 'Utilities', 'Shopping', 'Entertainment', 'Healthcare', 'Groceries', 'Other'];

  const filteredExpenses = expenses.filter(exp => {
    const matchesCategory = selectedCategory === 'All' || exp.category === selectedCategory;
    const matchesSearch = searchTerm === '' || 
      exp.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.notes && exp.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (confirm('Delete this expense entry?')) {
      try {
        await deleteExpense(id);
        if (onExpenseDeleted) onExpenseDeleted();
      } catch (err) {
        alert('Failed to delete expense.');
      }
    }
  };

  const handleExportCSV = () => {
    window.location.href = '/api/receipts/export-csv';
  };

  return (
    <div className="w-full">
      {/* Mockup Card Shell (Matching Image 1: expense-ai.app/dashboard) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all">
        {/* macOS Window Controls & URL bar header */}
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#EF4444] inline-block shadow-sm"></span>
            <span className="w-3 h-3 rounded-full bg-[#F59E0B] inline-block shadow-sm"></span>
            <span className="w-3 h-3 rounded-full bg-[#10B981] inline-block shadow-sm"></span>
          </div>

          <div className="px-4 py-1 rounded-full bg-white border border-slate-200/80 text-[12px] font-mono text-slate-500 shadow-2xs select-none">
            expense-ai.app/dashboard
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              title="Export all to CSV"
              className="px-2.5 py-1 text-xs font-mono text-slate-600 hover:text-brand-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5 transition shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV Export</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search merchant or item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
            />
          </div>
        </div>

        {/* Expense List (Matching rows in Image 1: Swiggy | Food | ₹420) */}
        <div className="divide-y divide-slate-100">
          {filteredExpenses.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-sm font-medium text-slate-600">No expenses found</p>
              <p className="text-xs text-slate-400 mt-0.5">Upload a receipt or pick an instant sample above.</p>
            </div>
          ) : (
            filteredExpenses.map((expense) => {
              const isExpanded = expandedId === expense.id;
              const catBadgeStyle = CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.Other;

              return (
                <div 
                  key={expense.id} 
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                    className="px-5 py-4 flex items-center justify-between gap-4 cursor-pointer"
                  >
                    {/* Left: Merchant Name + Date */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/70 flex items-center justify-center font-bold text-slate-800 text-xs shrink-0 font-mono">
                        {expense.merchant.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                          {expense.merchant}
                          {expense.ocr_crosscheck_status === 'matched' && (
                            <span title="OCR Cross-checked: verified matching total" className="inline-flex">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            </span>
                          )}
                          {expense.ocr_crosscheck_status === 'flagged' && (
                            <span title="Discrepancy flagged: cross-checked with OCR" className="inline-flex">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{expense.expense_date}</span>
                          {expense.notes && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[140px] sm:max-w-xs text-slate-500 font-sans">
                                {expense.notes}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Category Pill */}
                    <div className="hidden sm:block">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${catBadgeStyle}`}>
                        {expense.category}
                      </span>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="font-mono font-bold text-base text-slate-900">
                          {currencySymbol}{parseFloat(expense.total).toFixed(0)}
                        </div>
                        {parseFloat(expense.tax || 0) > 0 && (
                          <div className="text-[10px] font-mono text-slate-400">
                            Tax {currencySymbol}{parseFloat(expense.tax).toFixed(0)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleDelete(expense.id, e)}
                          title="Delete expense"
                          className="p-1.5 text-slate-300 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <span className="text-slate-300">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail Tray */}
                  {isExpanded && (
                    <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in duration-150">
                      <div>
                        <span className="font-mono uppercase text-[10px] text-slate-400 font-bold block mb-1">
                          Financial Breakdown
                        </span>
                        <p>Total Amount: <span className="font-mono font-bold text-slate-800">{currencySymbol}{parseFloat(expense.total).toFixed(2)}</span></p>
                        <p>Tax / GST: <span className="font-mono text-slate-800">{currencySymbol}{parseFloat(expense.tax || 0).toFixed(2)}</span></p>
                        <p>Net Amount: <span className="font-mono text-slate-800">{currencySymbol}{(parseFloat(expense.total) - parseFloat(expense.tax || 0)).toFixed(2)}</span></p>
                      </div>

                      <div>
                        <span className="font-mono uppercase text-[10px] text-slate-400 font-bold block mb-1">
                          AI & OCR Verification
                        </span>
                        <p>Confidence: <span className="font-mono font-semibold">{Math.round((expense.confidence_score || 0.95) * 100)}%</span></p>
                        <p>OCR Cross-check: <span className="font-mono font-semibold capitalize">{expense.ocr_crosscheck_status || 'matched'}</span></p>
                        <p className="truncate">Notes: {expense.notes || 'None'}</p>
                      </div>

                      <div>
                        <span className="font-mono uppercase text-[10px] text-slate-400 font-bold block mb-1">
                          Attached Receipt
                        </span>
                        {expense.image_url ? (
                          <button
                            type="button"
                            onClick={() => setActiveReceiptPreview(expense.image_url)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-brand-600 hover:text-brand-700 font-medium hover:bg-slate-100 transition"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            View Receipt Image
                          </button>
                        ) : (
                          <span className="text-slate-400">No image attached</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {activeReceiptPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 relative shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-800 font-mono">Receipt Inspection</h4>
              <button
                onClick={() => setActiveReceiptPreview(null)}
                className="text-slate-400 hover:text-slate-700 text-xs px-2 py-1 rounded-md hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <div className="py-4 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={activeReceiptPreview}
                alt="Receipt Document"
                className="max-h-[60vh] object-contain rounded-lg border border-slate-200 shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

