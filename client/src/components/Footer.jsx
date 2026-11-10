import React from 'react';
import { ArrowUp, Sparkles, Zap, ShieldCheck, Heart } from 'lucide-react';

export default function Footer({ onOpenBlueprint }) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const stack = [
    { name: 'Groq LPU (GPT-OSS 120B)', color: 'text-amber-700 bg-amber-50 border-amber-200/70' },
    { name: 'Gemini 3.5 Flash', color: 'text-blue-700 bg-blue-50 border-blue-200/70' },
    { name: 'Tesseract.js OCR', color: 'text-purple-700 bg-purple-50 border-purple-200/70' },
    { name: 'React 18 + Vite', color: 'text-cyan-700 bg-cyan-50 border-cyan-200/70' },
    { name: 'Node.js + Express', color: 'text-emerald-700 bg-emerald-50 border-emerald-200/70' },
    { name: 'PostgreSQL / SQLite', color: 'text-indigo-700 bg-indigo-50 border-indigo-200/70' },
  ];

  return (
    <footer className="mt-20 border-t border-slate-200 bg-white/80 backdrop-blur-md pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Main Footer Row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-100">
          <div className="space-y-1.5 max-w-md">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-base tracking-tight">
                Smart Expense Classifier
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-brand-600 font-bold border border-blue-200/60">
                AI Full Stack
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Automated receipt digitization pipeline powered by Sharp blur-mitigation, 
              Tesseract OCR, and Groq & Gemini Large Language Models.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenBlueprint}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl transition shadow-2xs"
            >
              View System Blueprint
            </button>
            <button
              type="button"
              onClick={scrollToTop}
              className="px-3.5 py-2 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition shadow-sm shadow-blue-500/20 flex items-center gap-1.5 active:scale-95"
            >
              <span>Back to Top</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tech Stack Badges */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
            Integrated Architecture Stack
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {stack.map((item) => (
              <span
                key={item.name}
                className={`text-[11px] font-mono font-medium px-2.5 py-1 rounded-lg border ${item.color}`}
              >
                {item.name}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom copyright and status */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-600">All Systems Operational • Primary: Groq LPU • Backup: Gemini Flash</span>
          </div>
          <div>
            Built with React & Node.js • Fully Responsive
          </div>
        </div>
      </div>
    </footer>
  );
}

