import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Layers, 
  Cpu, 
  TrendingUp, 
  Receipt, 
  ShieldCheck, 
  Zap, 
  Database,
  ArrowRight
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import UploadReceipt from '../components/UploadReceipt';
import ExpenseTable from '../components/ExpenseTable';
import CategoryChart from '../components/CategoryChart';
import { getExpenses, getBudgets, getSystemHealth } from '../api';

export default function Dashboard() {
  const [expenses, setExpenses] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [summary, setSummary] = useState({ totalSpent: 0, totalTax: 0, count: 0 });
  const [budgets, setBudgets] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [currencySymbol, setCurrencySymbol] = useState('₹'); // Default INR
  const [copiedResume, setCopiedResume] = useState(false);
  const [showArchInfo, setShowArchInfo] = useState(false);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const RESUME_BULLET = "Built an AI expense tracker (React, Node.js, PostgreSQL) that reads receipts with OCR and auto-categorises them using Groq LPUs & Gemini.";

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expData, budData, healthData] = await Promise.all([
        getExpenses({ category: selectedCategory }),
        getBudgets().catch(() => ({ budgets: [] })),
        getSystemHealth().catch(() => null)
      ]);

      if (expData.success) {
        setExpenses(expData.expenses || []);
        setCategoryStats(expData.categoryStats || []);
        setSummary(expData.summary || { totalSpent: 0, totalTax: 0, count: 0 });
      }

      if (budData.success) {
        setBudgets(budData.budgets || []);
      }

      if (healthData) {
        setSystemHealth(healthData);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const handleCopyResume = () => {
    navigator.clipboard.writeText(RESUME_BULLET);
    setCopiedResume(true);
    setTimeout(() => setCopiedResume(false), 2500);
  };

  return (
    <div className="min-h-screen text-slate-900 relative flex flex-col justify-between">
      <div className="hero-glow"></div>

      {/* NEW HEADER WITH SCROLL PROGRESS LOADER */}
      <Header 
        currencySymbol={currencySymbol}
        onSelectCurrency={setCurrencySymbol}
        onOpenBlueprint={() => setShowArchInfo(true)}
        systemHealth={systemHealth}
      />

      {/* MAIN RESPONSIVE CONTENT CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 space-y-10 sm:space-y-12 w-full flex-1">
        {/* ======================================================== */}
        {/* SECTION 1: HERO TITLE & LIVE AI ENGINE STATUS */}
        {/* ======================================================== */}
        <section className="text-left space-y-4 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-[11px] sm:text-xs font-mono text-brand-600 font-bold uppercase tracking-widest">
            PROJECT 1 · AI FULL STACK
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.15] sm:leading-[1.1]">
            Smart expense classifier <br className="hidden sm:block" />
            <span className="text-brand-600">+ receipt scanner.</span>
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-slate-500 font-normal leading-relaxed max-w-2xl">
            Upload a receipt. OCR reads it. An LLM categorises it. A dashboard tracks it.
          </p>

          {/* Quick status pill banner */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-white border border-slate-200 text-slate-600 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              DB: {systemHealth?.database?.toUpperCase() || 'SQLITE'} / Postgres
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-white border border-slate-200 text-slate-600 shadow-2xs">
              <Cpu className="w-3.5 h-3.5 text-brand-600" />
              OCR: Tesseract.js (Grayscale + Sharpen)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-amber-50 border border-amber-200/80 text-amber-800 font-semibold shadow-2xs">
              <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
              Primary: Groq LPU (GPT-OSS 120B)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-blue-50 border border-blue-200/80 text-blue-800 font-semibold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Backup: Gemini 3.5 Flash
            </span>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION 2: RECEIPT INTAKE & DYNAMIC RECENT RECEIPTS */}
        {/* ======================================================== */}
        <section className="space-y-3">
          <UploadReceipt 
            onExpenseAdded={fetchData} 
            recentExpenses={expenses}
            currencySymbol={currencySymbol} 
          />
        </section>

        {/* ======================================================== */}
        {/* SECTION 3: macOS DASHBOARD WINDOW (TABLE & LOGGED DATA) */}
        {/* ======================================================== */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-extrabold text-slate-900 text-xl tracking-tight">
                Classified Transactions
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified transactions saved with category breakdowns, tax tracking, and receipt inspection.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-2xs self-start sm:self-auto">
              {expenses.length} Records in Database
            </span>
          </div>

          <ExpenseTable
            expenses={expenses}
            onExpenseDeleted={fetchData}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            currencySymbol={currencySymbol}
          />
        </section>

        {/* ======================================================== */}
        {/* SECTION 4: SPENDING BREAKDOWN & MONTHLY BUDGETS */}
        {/* ======================================================== */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-slate-900 text-xl tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-600" />
              Spending Analytics & Budgets
            </h2>
            <span className="text-xs font-mono text-slate-400 hidden sm:inline">
              Real-time Category Aggregations
            </span>
          </div>

          <CategoryChart
            categoryStats={categoryStats}
            budgets={budgets}
            onBudgetUpdated={fetchData}
            currencySymbol={currencySymbol}
          />
        </section>

        {/* ======================================================== */}
        {/* SECTION 5: KPI SUMMARY METRICS */}
        {/* ======================================================== */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 pt-2">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] sm:text-xs font-mono text-slate-400 font-bold uppercase tracking-wider block">
              Total Spending
            </span>
            <div className="mt-1.5 text-xl sm:text-3xl font-extrabold font-mono text-slate-900 truncate">
              {currencySymbol}{summary.totalSpent.toFixed(2)}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 mt-1 block">
              Across {summary.count} classified receipts
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] sm:text-xs font-mono text-slate-400 font-bold uppercase tracking-wider block">
              Tracked Tax / GST
            </span>
            <div className="mt-1.5 text-xl sm:text-3xl font-extrabold font-mono text-slate-900 truncate">
              {currencySymbol}{summary.totalTax.toFixed(2)}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 mt-1 block">
              Calculated tax deductions
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] sm:text-xs font-mono text-slate-400 font-bold uppercase tracking-wider block">
              Active Categories
            </span>
            <div className="mt-1.5 text-xl sm:text-3xl font-extrabold font-mono text-slate-900">
              {categoryStats.length}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 mt-1 block">
              Auto-categorized by AI
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] sm:text-xs font-mono text-slate-400 font-bold uppercase tracking-wider block">
              Monitored Budgets
            </span>
            <div className="mt-1.5 text-xl sm:text-3xl font-extrabold font-mono text-slate-900">
              {budgets.length}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-500 mt-1 block">
              Monthly threshold rules
            </span>
          </div>
        </section>

        {/* ======================================================== */}
        {/* SECTION 6: PROJECT BLUEPRINT & RESUME MODAL / DRAWER */}
        {/* ======================================================== */}
        {showArchInfo && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                  <Layers className="w-5 h-5 text-brand-600" />
                  Engineering Specification & Carousel Blueprint
                </h3>
                <button
                  type="button"
                  onClick={() => setShowArchInfo(false)}
                  className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-200/60"
                >
                  Close
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Problem (Slide 2) */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      THE PROBLEM
                    </span>
                    <h4 className="font-bold text-slate-900 text-base">Nobody logs expenses.</h4>
                    <div className="space-y-2 text-xs text-slate-600">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-800">1. Manual typing:</span> Users enter category, amount and tax by hand.
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-800">2. Receipts pile up:</span> Paper fades and photos get lost.
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="font-bold text-slate-800">3. No insight:</span> Without categories you cannot see where money goes.
                      </div>
                    </div>
                  </div>

                  {/* Tech Stack (Slide 3) */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      TECH STACK
                    </span>
                    <h4 className="font-bold text-slate-900 text-base">What you will use.</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2.5 p-2 bg-blue-50/50 rounded-xl border border-blue-100">
                        <span className="w-6 h-6 rounded-md bg-blue-100 text-brand-600 flex items-center justify-center font-bold font-mono">R</span>
                        <span className="text-slate-700"><strong>React:</strong> Upload form, expense table, charts</span>
                      </div>
                      <div className="flex items-center gap-2.5 p-2 bg-blue-50/50 rounded-xl border border-blue-100">
                        <span className="w-6 h-6 rounded-md bg-blue-100 text-brand-600 flex items-center justify-center font-bold font-mono">N</span>
                        <span className="text-slate-700"><strong>Node + Express:</strong> REST API and Multer upload</span>
                      </div>
                      <div className="flex items-center gap-2.5 p-2 bg-amber-50/60 rounded-xl border border-amber-100">
                        <span className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center font-bold font-mono">Q</span>
                        <span className="text-slate-700"><strong>Groq LPUs:</strong> Primary GPT-OSS 120B inference</span>
                      </div>
                      <div className="flex items-center gap-2.5 p-2 bg-blue-50/50 rounded-xl border border-blue-100">
                        <span className="w-6 h-6 rounded-md bg-blue-100 text-brand-600 flex items-center justify-center font-bold font-mono">G</span>
                        <span className="text-slate-700"><strong>Gemini Flash:</strong> Multimodal backup parser</span>
                      </div>
                      <div className="flex items-center gap-2.5 p-2 bg-blue-50/50 rounded-xl border border-blue-100">
                        <span className="w-6 h-6 rounded-md bg-blue-100 text-brand-600 flex items-center justify-center font-bold font-mono">O</span>
                        <span className="text-slate-700"><strong>Tesseract.js:</strong> Image to raw OCR text</span>
                      </div>
                    </div>
                  </div>

                  {/* Data Flow & Mitigations (Slide 4) */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      SAFEGUARDS
                    </span>
                    <h4 className="font-bold text-slate-900 text-base">How data flows safely.</h4>
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-900 space-y-2">
                      <p className="font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-amber-700" />
                        Pitfalls Mitigated:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-[11px]">
                        <li><strong>Blurry photos:</strong> Auto-resized to 2000px, grayscale & unsharp mask.</li>
                        <li><strong>Hallucinations:</strong> Verified against OCR candidate numbers.</li>
                        <li><strong>Review screen:</strong> User confirms before DB insertion.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Resume Ready Callout */}
                <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold block mb-1">
                      PORTFOLIO & RESUME READY BULLET
                    </span>
                    <p className="text-xs sm:text-sm font-medium text-slate-100">
                      "{RESUME_BULLET}"
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyResume}
                    className="shrink-0 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                  >
                    {copiedResume ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedResume ? 'Copied to Clipboard' : 'Copy Resume Bullet'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* NEW FOOTER */}
      <Footer onOpenBlueprint={() => setShowArchInfo(true)} />
    </div>
  );
}
