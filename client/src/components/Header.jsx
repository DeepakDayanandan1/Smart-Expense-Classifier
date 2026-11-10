import React, { useState, useEffect } from 'react';
import { Sparkles, Layers, Zap, Cpu, CheckCircle } from 'lucide-react';

export default function Header({ 
  currencySymbol = '₹', 
  onSelectCurrency, 
  onOpenBlueprint,
  systemHealth
}) {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const current = (window.scrollY / scrollHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, current)));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const currencies = ['₹', '$', '€', '£'];

  const primaryEngineLabel = systemHealth?.hasGroqKey 
    ? 'Groq LPU (GPT-OSS 120B)' 
    : systemHealth?.hasGeminiKey 
    ? 'Gemini 3.5 Flash' 
    : 'Local Engine';

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-blue-500 flex items-center justify-center text-white font-black text-sm shadow-sm shadow-blue-500/30">
            {currencySymbol}
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight truncate max-w-[150px] sm:max-w-none">
                Smart Expense Classifier
              </span>
              <span className="hidden sm:inline-flex text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-emerald-600 fill-emerald-600" />
                {primaryEngineLabel}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono hidden md:block">
              AI Receipt Scanner & Spending Tracker
            </p>
          </div>
        </div>

        {/* Right: Actions, Currency Switcher & Scroll Percentage */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Scroll progress readout */}
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/70">
            <span>Scroll</span>
            <span className="font-bold text-slate-800 w-8 text-right">{Math.round(scrollProgress)}%</span>
          </div>

          {/* Currency Switcher */}
          <div className="flex items-center bg-slate-100/90 rounded-xl p-0.5 border border-slate-200 text-xs font-mono shadow-2xs">
            {currencies.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => onSelectCurrency(sym)}
                className={`px-2 sm:px-2.5 py-1 rounded-lg transition-all text-xs ${
                  currencySymbol === sym
                    ? 'bg-white font-bold text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>

          {/* Blueprint Drawer Trigger */}
          <button
            type="button"
            onClick={onOpenBlueprint}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center gap-1.5 transition shadow-2xs active:scale-95"
          >
            <Layers className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            <span className="hidden sm:inline">Blueprint</span>
          </button>
        </div>
      </div>

      {/* DYNAMIC SCROLL LOADER BAR */}
      <div className="w-full bg-slate-100 h-[3px] overflow-hidden relative">
        <div 
          className="h-full bg-gradient-to-r from-brand-600 via-blue-500 to-indigo-600 transition-all duration-75 shadow-xs shadow-brand-500/50"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
    </header>
  );
}

