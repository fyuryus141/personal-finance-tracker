import React from 'react';
import { TrendingUp } from 'lucide-react';

interface BudgetProgressProps {
  spent: number;
  budget: number;
}

const BudgetProgress: React.FC<BudgetProgressProps> = ({ spent, budget }) => {
  const percentage = (spent / budget) * 100;
  const isOver = percentage > 100;
  const progressColor = isOver ? 'var(--error)' : 'var(--success)';

  return (
    <div className="budget-progress">
      <h3 className="component-title">
        <TrendingUp size={20} />
        Budget Progress
      </h3>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: progressColor
          }}
        ></div>
      </div>
      <div className="progress-text">
        {percentage.toFixed(1)}% used
      </div>
    </div>
  );
};

export default BudgetProgress;