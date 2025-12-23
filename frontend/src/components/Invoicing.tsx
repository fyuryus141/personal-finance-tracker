import React, { useState, useEffect } from 'react';

interface Invoice {
  id: number;
  title: string;
  invoiceDate: string;
  dueDate?: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  status: string;
  items: Array<{description: string; amount: number; category: string; date: string}>;
}

interface InvoicingProps {
  user: any;
  token: string | null;
}

const Invoicing: React.FC<InvoicingProps> = ({ user, token }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    endDate: '',
    dueDate: '',
  });

  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3001';

  useEffect(() => {
    if (user && token && user.tier === 'BUSINESS') {
      fetchInvoices();
      fetchCount();
    }
  }, [user, token]);

  const fetchInvoices = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/invoices`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setInvoices(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/invoices/count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { count } = await res.json();
      setCount(count);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE}/api/invoices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      setShowModal(false);
      setFormData({ title: '', startDate: '', endDate: '', dueDate: '' });
      fetchInvoices();
      fetchCount();
    } catch (error) {
      console.error(error);
    }
  };

  if (user.tier !== 'BUSINESS') {
    return (
      <div className="p-8 text-center bg-gradient-to-r from-yellow-50 to-orange-50 rounded-3xl">
        <h2 className="text-3xl font-bold mb-4 text-yellow-800">Business Feature</h2>
        <p className="text-xl text-yellow-700 mb-8">Automated invoicing available for Business tier users.</p>
        <a href="https://ko-fi.com/paul5150" target="_blank" rel="noopener noreferrer" className="inline-block bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-12 py-4 rounded-2xl font-bold text-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
          Upgrade to Business
        </a>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-black text-gray-900 dark:text-white">Invoices ({count})</h2>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-2"
        >
          + New Invoice
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-2xl text-gray-500 animate-pulse">Loading invoices...</div>
        </div>
      ) : (
        <div className="grid gap-6">
          {invoices.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-xl text-gray-500 mb-4">No invoices yet. Create your first one!</p>
            </div>
          ) : (
            invoices.map((inv) => (
              <div key={inv.id} className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 border border-gray-200 dark:border-slate-700">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-3xl font-black text-gray-900 dark:text-white">{inv.title}</h3>
                  <span className={`px-4 py-2 rounded-2xl font-bold text-sm ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>{inv.status}</span>
                </div>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">Invoice Date: {new Date(inv.invoiceDate).toLocaleDateString()}</p>
                {inv.dueDate && <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">Due Date: {new Date(inv.dueDate).toLocaleDateString()}</p>}
                <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 mb-2">${inv.total.toFixed(2)}</div>
                <p className="text-sm text-gray-500">Subtotal: ${inv.subtotal.toFixed(2)} | Tax: ${inv.taxAmount.toFixed(2)}</p>
              </div>
            ))
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-slate-700">
            <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">New Invoice</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                placeholder="Invoice Title (e.g. Monthly Expenses)"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full p-4 border border-gray-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-700 text-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              />
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                className="w-full p-4 border border-gray-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-700 text-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              />
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                className="w-full p-4 border border-gray-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-700 text-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              />
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                className="w-full p-4 border border-gray-300 dark:border-slate-600 rounded-2xl bg-white dark:bg-slate-700 text-lg focus:ring-4 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              <div className="flex gap-4 pt-4">
                <button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-4 px-6 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                >
                  Create Invoice
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-slate-600 dark:hover:bg-slate-500 text-gray-900 dark:text-white py-4 px-6 rounded-2xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoicing;