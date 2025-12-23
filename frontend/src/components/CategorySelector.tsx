import React, { useState, useEffect } from 'react';

interface Category {
  id: number;
  name: string;
}

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
  user: any;
  token: string | null;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ value, onChange, user, token }) => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user]);

  const fetchCategories = async () => {
    const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';
    const response = await fetch(`${API_BASE}/categories?userId=${user.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    setCategories(data);
  };

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', backgroundColor: 'var(--bg-primary)', transition: 'border-color 0.3s ease, color 0.3s ease, background-color 0.3s ease' }}
      required
    >
      <option value="">Select Category</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );
};

export default CategorySelector;