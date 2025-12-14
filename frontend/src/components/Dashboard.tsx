import React from 'react';
import { DollarSign, TrendingUp, AlertTriangle, Users, Receipt, Camera, TrendingDown } from 'lucide-react';
import SpendingCharts from './SpendingCharts';

interface DashboardProps {
  user: any;
  token: string;
}

const Dashboard: React.FC<DashboardProps> = ({ user, token }) => {
  // Mock data - replace with real fetches
  const metrics = [
    {
      title: 'Total Expenses',
      value: '$1,420',
      change: '+12%',
      trend: 'down',
      icon: DollarSign,
    },
    {
      title: 'Savings Rate',
      value: '85%',
      change: '+5%',
      trend: 'up',
      icon: TrendingUp,
    },
    {
      title: 'AI Alerts',
      value: '3',
      change: '',
      trend: 'warning',
      icon: AlertTriangle,
    },
    {
      title: 'Groups',
      value: '2',
      change: '',
      trend: 'neutral',
      icon: Users,
    },
  ];

  const recentExpenses = [
    { description: 'Grocery shopping', amount: 45, date: 'Today', category: 'Food' },
    { description: 'Salary deposit', amount: -2000, date: '2 days ago', category: 'Income' },
    { description: 'Coffee', amount: 5, date: 'Yesterday', category: 'Food' },
  ];

  const getColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'success';
      case 'warning': return 'warning';
      case 'down': return 'error';
      default: return 'accent';
    }
  };

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Hero Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="group bg-bg-primary border border-border rounded-3xl p-6 lg:p-8 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-accent/5 group-hover:to-accent/10 transition-all duration-500" />
            <div className="relative flex items-start gap-4">
              <div className={`p-3 rounded-2xl bg-${getColor(metric.trend)}/10 group-hover:bg-${getColor(metric.trend)}/20 transition-all duration-300 shrink-0`}>
                <metric.icon size={28} className={`text-${getColor(metric.trend)}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text-secondary text-sm font-medium uppercase tracking-wide mb-1">{metric.title}</p>
                <p className="text-3xl lg:text-4xl font-black text-text-primary leading-tight">{metric.value}</p>
                {metric.change && (
                  <p className={`text-sm font-semibold mt-1 ${metric.trend === 'up' ? 'text-success' : 'text-error'}`}>
                    {metric.change}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Charts and Recent */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="group bg-bg-primary border border-border rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 order-2 lg:order-1">
          <h3 className="text-2xl font-bold text-text-primary mb-6 flex items-center gap-3">
            <Receipt size={32} />
            Recent Expenses
          </h3>
          <div className="space-y-4">
            {recentExpenses.map((expense, index) => (
              <div key={index} className="flex justify-between items-center p-5 bg-bg-secondary/50 hover:bg-accent/5 rounded-2xl transition-all duration-300 hover:-translate-x-1 group/item">
                <div>
                  <p className="text-text-primary font-semibold">{expense.description}</p>
                  <p className="text-text-secondary text-sm">{expense.category} • {expense.date}</p>
                </div>
                <p className={`text-2xl font-black ${expense.amount > 0 ? 'text-success' : 'text-error'}`}>
                  {expense.amount > 0 ? `+$${expense.amount}` : `-$${Math.abs(expense.amount)}`}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="group bg-bg-primary border border-border rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 order-1 lg:order-2">
          <h3 className="text-2xl font-bold text-text-primary mb-6 flex items-center gap-3">
            <TrendingDown size={32} />
            Quick Actions
          </h3>
          <div className="space-y-4">
            <button className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-accent to-blue-600 text-bg-primary font-semibold shadow-lg hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-lg">
              <Receipt size={24} />
              Add Expense
            </button>
            <button className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-success to-emerald-600 text-bg-primary font-semibold shadow-lg hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-lg">
              <Camera size={24} />
              Scan Receipt
            </button>
            <button className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-warning to-orange-500 text-bg-primary font-semibold shadow-lg hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-lg">
              <TrendingUp size={24} />
              Set Budget
            </button>
          </div>
        </div>
      </section>

      {/* Charts */}
      <section className="group bg-bg-primary border border-border rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
        <h2 className="text-3xl font-bold text-text-primary mb-8 flex items-center gap-3">
          <TrendingDown size={36} />
          Spending Overview
        </h2>
        <div className="h-[500px] lg:h-[600px]">
          <SpendingCharts user={user} token={token} />
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
