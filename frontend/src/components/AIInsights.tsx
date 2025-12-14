import React, { useEffect, useState } from 'react';

interface Expense {
  id: number;
  amount: number;
  description: string;
  date: string;
  category: {
    name: string;
  };
}

interface Anomaly {
  id: number;
  explanation: string;
}

interface CategoryRecommendation {
  category: string;
  recommendation: string;
}

interface AIInsightsData {
  spendingTrends: string;
  categoryRecommendations: CategoryRecommendation[];
  financialAdvice: string;
}

interface AIInsightsProps {
  user: any;
  token: string | null;
}

const AIInsights: React.FC<AIInsightsProps> = ({ user, token }) => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [insights, setInsights] = useState<AIInsightsData | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tier, setTier] = useState<string>('FREE');
  const [loading, setLoading] = useState(true);

  const API_BASE = process.env.REACT_APP_API_BASE || 'https://financial-tracker-ai-insight-a194fc716874.herokuapp.com';

  useEffect(() => {
    if (user && token) {
      fetchTier();
      fetchExpenses();
    }
  }, [user]);

  const fetchTier = async () => {
    try {
      const response = await fetch(`${API_BASE}/users/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setTier(data.tier || 'FREE');
    } catch (error) {
      console.error('Error fetching tier:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`${API_BASE}/expenses?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setExpenses(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expenses.length > 0 && !loading) {
      const newInsights = computeInsights(expenses, tier);
      setInsights(newInsights);
      if (tier !== 'FREE') {
        computeAnomalies(expenses);
      } else {
        setAnomalies([]);
      }
    }
  }, [expenses, tier, loading]);

  const computeInsights = (exps: Expense[], t: string): AIInsightsData => {
    const total = exps.reduce((s, e) => s + e.amount, 0);
    const catTotals: Record<string, number> = {};
    exps.forEach((e) => {
      catTotals[e.category.name] = (catTotals[e.category.name] || 0) + e.amount;
    });
    const topCatEntry = Object.entries(catTotals).reduce((a, b) => (a[1] > b[1] ? a : b), ['', 0] as [string, number]);
    const topCat = topCatEntry[0];
    const topAmt = topCatEntry[1];

    let spendingTrends: string;
    let financialAdvice: string;
    let categoryRecommendations: CategoryRecommendation[] = [];

    if (t === 'FREE') {
      spendingTrends = `Basic: Total spent $<span className="font-bold">${total.toFixed(2)}</span>. Top category: <strong>${topCat}</strong> ($<span className="font-bold">${topAmt.toFixed(2)}</span>).`;
      financialAdvice = 'Upgrade to Pro for predictive trends, anomaly detection, and personalized advice.';
    } else {
      // Predictive trends
      const monthKeys = Array.from(new Set(exps.map((e) => e.date.slice(0, 7)))).sort();
      const recentMonths = monthKeys.slice(-3).map((key) => {
        const mExps = exps.filter((e) => e.date.startsWith(key));
        return mExps.reduce((s, e) => s + e.amount, 0);
      });
      const avgMonthly = recentMonths.reduce((a, b) => a + b, 0) / recentMonths.length;
      const growth = recentMonths.length > 1 ? (recentMonths[recentMonths.length - 1] - recentMonths[0]) / recentMonths[0] : 0;
      spendingTrends = `Trend analysis (last 3 months): Average $${avgMonthly.toFixed(2)}/month. Growth: ${growth > 0 ? '+' : ''}${(growth * 100).toFixed(1)}%. <strong>Predicted next month: $${(avgMonthly * (1 + growth)).toFixed(2)}</strong>.`;
      categoryRecommendations = Object.entries(catTotals)
        .map(([cat, amt]) => ({
          category: cat,
          recommendation: `$${(amt / total * 100).toFixed(1)}% of total. ${amt > avgMonthly ? 'Review high spending.' : 'Well managed.'}`,
        }))
        .slice(0, 5);
      financialAdvice = `Personalized advice: Your top category <strong>${topCat}</strong> is  ${(topAmt / total * 100).toFixed(1)}% of spending. Reduce by 15% to boost savings. Set category budgets.`;
    }

    return { spendingTrends, categoryRecommendations, financialAdvice };
  };

  const computeAnomalies = (exps: Expense[]) => {
    const amounts = exps.map((e) => e.amount);
    if (amounts.length === 0) return;
    const n = amounts.length;
    const mean = amounts.reduce((a, b) => a + b, 0) / n;
    const variance = amounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const std = Math.sqrt(variance);
    const anoms = exps
      .filter((e) => Math.abs(e.amount - mean) > 2 * std)
      .map((e) => ({
        id: e.id,
        explanation: `$${e.amount.toFixed(2)} is ${(Math.abs(e.amount - mean) / std).toFixed(1)} std devs from mean ($${mean.toFixed(2)}). Unusual expense.`,
      }));
    setAnomalies(anoms);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="text-lg text-gray-500">Loading AI Insights...</div>
    </div>;
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-xl shadow-xl mx-4 md:mx-6 mb-8 border border-gray-200 dark:border-slate-700">
      <h2 className="text-3xl font-bold text-red-500 dark:text-red-400 mb-8 text-center md:text-left">🤖 AI Insights</h2>

      {insights && (
        <>
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border-l-4 border-blue-500">
            <h3 className="text-2xl font-semibold text-blue-600 dark:text-blue-400 mb-4">📈 Spending Trends</h3>
            <div className="text-lg text-gray-800 dark:text-gray-200 prose max-w-none" dangerouslySetInnerHTML={{ __html: insights.spendingTrends }} />
          </div>

          {insights.categoryRecommendations.length > 0 && (
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-green-600 dark:text-green-400 mb-6">🎯 Category Recommendations</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {insights.categoryRecommendations.map((rec, index) => (
                  <div key={index} className="p-5 bg-green-50 dark:bg-green-900/30 rounded-xl border border-green-200 dark:border-green-800 hover:shadow-md transition-shadow">
                    <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2">{rec.category}</h4>
                    <p className="text-gray-700 dark:text-gray-300">{rec.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border-l-4 border-purple-500">
            <h3 className="text-2xl font-semibold text-purple-600 dark:text-purple-400 mb-4">💡 Personalized Advice</h3>
            <div className="text-lg text-gray-800 dark:text-gray-200 prose max-w-none" dangerouslySetInnerHTML={{ __html: insights.financialAdvice }} />
          </div>
        </>
      )}

      <div>
        <h3 className="text-2xl font-semibold text-red-500 dark:text-red-400 mb-6">🚨 Anomaly Detection</h3>
        {anomalies.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 italic text-lg bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border border-green-200">
            ✅ No anomalies detected. Your spending patterns are consistent – excellent financial discipline!
          </p>
        ) : (
          <div className="space-y-4">
            {anomalies.map((anom) => {
              const exp = expenses.find((e) => e.id === anom.id);
              if (!exp) return null;
              return (
                <div key={anom.id} className="p-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl shadow-md hover:shadow-lg transition-shadow">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-3 gap-2">
                    <span className="font-bold text-xl text-gray-900 dark:text-gray-100">{exp.description}</span>
                    <span className="font-bold text-2xl text-red-600">-${exp.amount.toFixed(2)}</span>
                  </div>
                  <p className="text-red-700 dark:text-red-300 font-semibold mb-2 text-lg">{anom.explanation}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {exp.category.name} • {new Date(exp.date).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIInsights;