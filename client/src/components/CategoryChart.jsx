import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon, Sliders, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { updateBudget } from '../api';

const COLORS = [
  '#10B981', // Food - Emerald
  '#0066FF', // Travel - Electric Blue
  '#F59E0B', // Utilities - Amber
  '#8B5CF6', // Shopping - Purple
  '#EC4899', // Entertainment - Pink
  '#F43F5E', // Healthcare - Rose
  '#14B8A6', // Groceries - Teal
  '#64748B'  // Other - Slate
];

export default function CategoryChart({ 
  categoryStats = [], 
  budgets = [], 
  onBudgetUpdated,
  currencySymbol = '₹' 
}) {
  const [editingBudget, setEditingBudget] = useState(null);
  const [newLimit, setNewLimit] = useState('');

  const totalSpend = categoryStats.reduce((sum, item) => sum + item.total_amount, 0);

  // Prepare chart data with percentages
  const chartData = categoryStats.map((item, index) => ({
    name: item.category,
    value: item.total_amount,
    percentage: totalSpend > 0 ? Math.round((item.total_amount / totalSpend) * 100) : 0,
    color: COLORS[index % COLORS.length]
  }));

  const handleOpenEdit = (budget) => {
    setEditingBudget(budget);
    setNewLimit(budget.monthly_limit.toString());
  };

  const handleSaveBudget = async () => {
    if (!editingBudget || !newLimit || isNaN(parseFloat(newLimit))) return;
    try {
      await updateBudget(editingBudget.category, parseFloat(newLimit));
      setEditingBudget(null);
      if (onBudgetUpdated) onBudgetUpdated();
    } catch (err) {
      alert('Failed to update budget.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Category Spending Breakdown Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h4 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-brand-600" />
              Category Spending Breakdown
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Real-time distribution across categories</p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
            Total: {currencySymbol}{totalSpend.toFixed(0)}
          </span>
        </div>

        {/* Donut Chart */}
        <div className="h-56 w-full my-2">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${currencySymbol}${parseFloat(value).toFixed(2)}`,
                    name
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '12px',
                    fontFamily: 'monospace'
                  }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400 font-mono">
              No expense data to graph
            </div>
          )}
        </div>

        {/* Category Pills matching Carousel Image 1 (Food 38%, Travel 12%) */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-100">
          {chartData.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-slate-50/70 border-slate-200/80 text-slate-700"
            >
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ backgroundColor: item.color }}
              ></span>
              <span>{item.name}</span>
              <span className="font-mono font-bold text-slate-900">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Budget Tracking Extension Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h4 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Monthly Budgets & Limits
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Automated tracking vs category allowances</p>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Monthly</span>
        </div>

        {/* Budgets List with Progress Bars */}
        <div className="space-y-4 mt-4">
          {budgets.map((b) => {
            let statusColor = 'bg-emerald-500';
            let textColor = 'text-emerald-700';
            if (b.isExceeded) {
              statusColor = 'bg-rose-500';
              textColor = 'text-rose-700';
            } else if (b.isWarning) {
              statusColor = 'bg-amber-500';
              textColor = 'text-amber-700';
            }

            return (
              <div key={b.category} className="group">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{b.category}</span>
                    {b.isExceeded && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Exceeded
                      </span>
                    )}
                    {b.isWarning && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Near Limit
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500">
                      <strong className="text-slate-900">{currencySymbol}{b.current_spend.toFixed(0)}</strong> / {currencySymbol}{b.monthly_limit.toFixed(0)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(b)}
                      title="Adjust budget limit"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 transition"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${statusColor}`}
                    style={{ width: `${Math.min(b.percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Budget Modal */}
      {editingBudget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h4 className="font-bold text-sm text-slate-900 mb-1">
              Adjust {editingBudget.category} Budget
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Set monthly spending ceiling in {currencySymbol}.
            </p>

            <div className="relative mb-4">
              <span className="absolute left-3 top-2.5 text-xs font-mono text-slate-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingBudget(null)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBudget}
                className="px-4 py-1.5 text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-xs"
              >
                Save Limit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

