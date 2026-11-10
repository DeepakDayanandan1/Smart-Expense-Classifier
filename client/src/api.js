const API_BASE = '/api/receipts';

/**
 * Fetch expenses list and category breakdown stats
 */
export async function getExpenses({ category, search, limit = 100 } = {}) {
  const params = new URLSearchParams();
  if (category && category !== 'All') params.append('category', category);
  if (search) params.append('search', search);
  if (limit) params.append('limit', limit);

  const res = await fetch(`${API_BASE}/expenses?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to fetch expenses');
  }
  return res.json();
}

/**
 * Scan receipt image: OCR + Gemini Flash Classification
 * Returns candidate extraction for review
 */
export async function scanReceipt(formDataOrBody, isSample = false) {
  let options = {};
  if (isSample) {
    options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formDataOrBody)
    };
  } else {
    options = {
      method: 'POST',
      body: formDataOrBody
    };
  }

  const res = await fetch(`${API_BASE}/scan`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Receipt scanning failed');
  }
  return res.json();
}

/**
 * Confirm and save reviewed expense to PostgreSQL / Database
 */
export async function confirmExpense(expenseData) {
  const res = await fetch(`${API_BASE}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expenseData)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to save expense');
  }
  return res.json();
}

/**
 * Delete expense
 */
export async function deleteExpense(id) {
  const res = await fetch(`${API_BASE}/expenses/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete expense');
  return res.json();
}

/**
 * Update expense
 */
export async function updateExpense(id, updatedData) {
  const res = await fetch(`${API_BASE}/expenses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData)
  });
  if (!res.ok) throw new Error('Failed to update expense');
  return res.json();
}

/**
 * Fetch category budgets
 */
export async function getBudgets() {
  const res = await fetch(`${API_BASE}/budgets`);
  if (!res.ok) throw new Error('Failed to fetch budgets');
  return res.json();
}

/**
 * Update a category budget limit
 */
export async function updateBudget(category, monthly_limit, alert_threshold = 80) {
  const res = await fetch(`${API_BASE}/budgets/${category}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monthly_limit, alert_threshold })
  });
  if (!res.ok) throw new Error('Failed to update budget');
  return res.json();
}

/**
 * System health
 */
export async function getSystemHealth() {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('System health check failed');
  return res.json();
}

