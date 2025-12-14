import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

interface FeedbackItem {
  id: number;
  subject?: string;
  message: string;
  type: string;
  rating?: number;
  category?: string;
  attachments?: string;
  priority?: boolean;
  createdAt: string;
}

const feedbackSchema = yup.object({
  rating: yup.number().required('Rating is required').min(1, 'Please provide a rating'),
  category: yup.string().required('Category is required'),
  subject: yup.string().optional(),
  message: yup.string().required('Message is required').min(10, 'Message must be at least 10 characters'),
});

const categories = [
  { value: 'feedback', label: 'General Feedback', color: 'from-blue-500 to-indigo-500' },
  { value: 'bug', label: 'Bug Report', color: 'from-red-500 to-rose-500' },
  { value: 'feature', label: 'Feature Request', color: 'from-emerald-500 to-teal-500' },
  { value: 'ui', label: 'UI/UX Issue', color: 'from-purple-500 to-violet-500' },
  { value: 'performance', label: 'Performance', color: 'from-amber-500 to-orange-500' },
  { value: 'other', label: 'Other', color: 'from-slate-500 to-gray-500' },
];

const Feedback: React.FC = () => {
  const [rating, setRating] = useState<number | null>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackItem[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [envError, setEnvError] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [user, setUser] = useState<any>(null);
  const [submitProgress, setSubmitProgress] = useState(0);

  const { control, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm({
    resolver: yupResolver(feedbackSchema),
    defaultValues: {
      rating: 1,
      category: '',
      subject: '',
      message: '',
    },
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    fetchFeedbackHistory();
    if (!process.env.REACT_APP_API_BASE) {
      setEnvError(true);
    }
  }, []);

  const fetchFeedbackHistory = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    console.log('Fetching feedback history');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/feedback`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setFeedbackHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch feedback history:', error);
    }
    setHistoryLoading(false);
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    setMessage(null);
    setSubmitProgress(0);
    console.log('Submitting feedback', data, { anonymous, attachments: attachments.map(f => ({ name: f.name, size: f.size })) });

    const token = localStorage.getItem('token');
    if (!token) {
      setMessage({ type: 'error', text: 'Not authenticated' });
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('subject', data.subject || '');
    formData.append('message', data.message);
    formData.append('type', data.category);
    formData.append('rating', data.rating.toString());
    formData.append('category', data.category);
    formData.append('anonymous', anonymous.toString());

    attachments.forEach((file, index) => {
      formData.append('attachments', file);
    });

    const progressInterval = setInterval(() => {
      setSubmitProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 10;
      });
    }, 200);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setSubmitProgress(100);

      if (response.ok) {
        setMessage({ type: 'success', text: 'Feedback submitted successfully!' });
        reset();
        setRating(1);
        setSelectedCategory('');
        setAttachments([]);
        setTimeout(() => setSubmitProgress(0), 1000);
        fetchFeedbackHistory();
      } else {
        let errorText = 'Error submitting feedback';
        try {
          const errorData = await response.json();
          errorText = errorData.message || `Error: ${response.status} ${response.statusText}`;
        } catch {
          errorText = `Error: ${response.status} ${response.statusText}`;
        }
        setMessage({ type: 'error', text: errorText });
      }
    } catch (error) {
      clearInterval(progressInterval);
      setMessage({ type: 'error', text: 'Error submitting feedback' });
    }
    setLoading(false);
    setTimeout(() => setSubmitProgress(0), 2000);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      console.log('Files selected', files.map(f => ({ name: f.name, size: f.size })));
      if (attachments.length + files.length > 3) {
        setMessage({ type: 'error', text: 'Maximum 3 files allowed' });
        return;
      }
      const totalSize = [...attachments, ...files].reduce((sum, file) => sum + file.size, 0);
      if (totalSize > 5 * 1024 * 1024) { // 5MB
        setMessage({ type: 'error', text: 'Total file size must be less than 5MB' });
        return;
      }
      setAttachments([...attachments, ...files]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setValue('category', category);
  };

  const watchedRating = watch('rating');
  const watchedMessage = watch('message');

  const toggleExpanded = (id: number) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedItems(newSet);
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 animate-in fade-in duration-500">
      <div className="w-full max-w-4xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/60 rounded-3xl shadow-2xl p-6 md:p-12 relative overflow-hidden">
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-white/20 dark:hidden" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200/20 via-transparent to-slate-200/10 dark:from-slate-800/30 dark:to-slate-700/20" />
        
        <div className="text-center mb-12 relative z-10">
          <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent mb-4 drop-shadow-2xl tracking-tight">Feedback</h2>
          <p className="text-xl text-slate-600 dark:text-slate-300 font-medium max-w-lg mx-auto leading-relaxed">Help us improve by sharing your thoughts and experiences</p>
        </div>

        {envError && (
          <div className="bg-gradient-to-r from-rose-500/95 to-red-500/95 border-2 border-rose-400/60 backdrop-blur-xl rounded-3xl p-8 mb-12 shadow-2xl text-white text-center animate-pulse relative z-10 mx-auto max-w-2xl">
            <p className="text-lg font-semibold">API base URL is not configured. Please check your environment variables.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10 mb-12">
          {/* Submit Form Card */}
          <div className="feedback-card bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 animate-in zoom-in-50 duration-700 lg:col-span-1 order-2 lg:order-1">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent drop-shadow-lg text-center lg:text-left">Submit Feedback</h3>
            {user && user.tier === 'BUSINESS' && (
              <div className="bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-900 px-6 py-3 rounded-2xl mb-8 shadow-lg animate-bounce text-center font-bold tracking-wide backdrop-blur-md border border-yellow-300/50">
                ⭐ Priority Support Enabled
              </div>
            )}
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              {/* Rating */}
              <div>
                <label className="block text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">Rate your experience</label>
                <Controller
                  name="rating"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="number"
                      min="1"
                      max="5"
                      value={field.value || 1}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        field.onChange(val);
                        setRating(val);
                      }}
                      className="w-28 h-16 text-3xl font-black text-center border-4 border-slate-300 dark:border-slate-600 rounded-3xl bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 backdrop-blur-md shadow-xl hover:shadow-2xl focus:outline-none focus:ring-8 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 appearance-none"
                    />
                  )}
                />
                {errors.rating && <p className="mt-2 text-red-500 font-medium text-sm">{errors.rating.message}</p>}
              </div>

              {/* Category Chips */}
              <div>
                <label className="block text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      className={`px-6 py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-300 backdrop-blur-sm border-2 border-transparent hover:border-slate-300/50 dark:hover:border-slate-600/50 ${selectedCategory === cat.value ? `bg-gradient-to-r ${cat.color} text-white shadow-2xl border-white/50 scale-105` : 'bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 hover:bg-white/90 dark:hover:bg-slate-700/90'}`}
                      onClick={() => handleCategorySelect(cat.value)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                {errors.category && <p className="mt-2 text-red-500 font-medium text-sm">{errors.category.message}</p>}
              </div>

              <Controller
                name="subject"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    className="w-full px-6 py-5 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-purple-500/50 focus:border-purple-500 transition-all duration-300 shadow-inner hover:shadow-md text-lg font-medium"
                    placeholder="Subject (optional)"
                  />
                )}
              />

              <Controller
                name="message"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    className="w-full px-6 py-5 border border-slate-300 dark:border-slate-600 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 focus:border-indigo-500 resize-vertical transition-all duration-300 shadow-inner hover:shadow-md text-lg font-medium min-h-[120px]"
                    placeholder="Tell us more about your experience..."
                    rows={4}
                    maxLength={1000}
                  />
                )}
              />
              <p className="text-right text-sm text-slate-500 dark:text-slate-400 font-mono">
                {(watchedMessage?.length || 0)}/1000 characters
              </p>
              {errors.message && <p className="text-red-500 font-medium text-sm mt-1">{errors.message.message}</p>}

              {/* File Upload */}
              <div>
                <label className="block text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">Attachments (Optional)</label>
                <label htmlFor="file-upload" className="block w-full h-16 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl font-bold text-xl shadow-2xl hover:shadow-3xl cursor-pointer flex items-center justify-center transition-all duration-300 hover:-translate-y-1 active:scale-95 backdrop-blur-md border-2 border-white/50">
                  Choose Files (Max 3, 5MB total)
                </label>
                <input
                  accept="image/*,.pdf,.txt"
                  className="hidden"
                  id="file-upload"
                  multiple
                  type="file"
                  onChange={handleFileChange}
                />
                {attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-slate-100/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
                        <span className="font-medium text-slate-800 dark:text-slate-200 flex-1 truncate">
                          {file.name} 
                          <span className="ml-2 text-sm text-slate-500 font-mono">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </span>
                        <button
                          type="button"
                          className="ml-4 text-red-500 hover:text-red-600 font-bold text-xl hover:rotate-90 transition-all duration-200 hover:scale-110"
                          onClick={() => removeAttachment(index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Anonymous Toggle */}
              <div className="flex items-center p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 rounded-2xl border-2 border-slate-200/50 dark:border-slate-700/50 shadow-inner">
                <label className="relative inline-flex items-center cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                  />
                  <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 rounded-lg after:h-6 after:w-6 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600 shadow-md"></div>
                  <span className="ml-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Submit anonymously</span>
                </label>
              </div>

              <button 
                className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white py-6 px-8 rounded-3xl font-black text-2xl shadow-2xl hover:shadow-3xl transform hover:-translate-y-3 hover:rotate-1 active:scale-95 transition-all duration-500 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 tracking-wide uppercase letter-spacing-1 relative overflow-hidden group"
                type="submit" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Feedback'
                )}
                {submitProgress > 0 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/80 to-teal-400/80 backdrop-blur-sm animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
              </button>
              {loading && submitProgress > 0 && (
                <div className="w-full bg-slate-200/60 dark:bg-slate-700/60 rounded-full h-3 overflow-hidden backdrop-blur-sm border border-slate-300/50">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 shadow-inner rounded-full transition-all duration-700"
                    style={{ width: `${submitProgress}%` }}
                  />
                </div>
              )}
            </form>
          </div>

          {/* History Card */}
          <div className="feedback-card bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-3xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-500 animate-in zoom-in-50 duration-700 lg:col-span-1 order-1 lg:order-2">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent drop-shadow-lg text-center lg:text-left">Previous Feedback</h3>
            {historyLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="w-16 h-16 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin shadow-xl" />
              </div>
            ) : feedbackHistory.length === 0 ? (
              <p className="text-xl text-slate-500 dark:text-slate-400 text-center py-12 font-medium italic backdrop-blur-sm rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 p-8">No previous feedback found.</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-slate-100/50 dark:scrollbar-track-slate-900/50">
                {feedbackHistory.map((item) => {
                  const isExpanded = expandedItems.has(item.id);
                  return (
                    <div key={item.id} className="feedback-accordion border border-slate-200/50 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] backdrop-blur-md bg-white/60 dark:bg-slate-800/60">
                      <div 
                        className="feedback-accordion-header p-6 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/70 dark:to-slate-800/70 cursor-pointer flex items-center justify-between hover:from-slate-100 hover:to-slate-200 dark:hover:from-slate-800 dark:hover:to-slate-700 transition-all duration-300 hover:shadow-inner rounded-t-2xl"
                        onClick={() => toggleExpanded(item.id)}
                      >
                        <div className="flex flex-wrap items-center gap-4 flex-1">
                          <span className="text-2xl font-black text-amber-500 drop-shadow-lg">{item.rating || 1}⭐</span>
                          <div className="space-y-1">
                            <span className="font-bold text-xl text-slate-900 dark:text-slate-100 capitalize">{item.subject || 'No subject'}</span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>
                          <span className={`px-4 py-2 rounded-full text-xs font-bold shadow-md ${item.category ? `bg-gradient-to-r from-${item.category === 'bug' ? 'red' : item.category === 'feature' ? 'emerald' : 'blue'}-400 to-${item.category === 'bug' ? 'rose' : item.category === 'feature' ? 'teal' : 'indigo'}-400 text-white` : 'bg-indigo-400 text-white'}`}>{item.category || item.type}</span>
                          {item.priority && (
                            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-slate-900 px-4 py-2 rounded-full text-sm font-black shadow-lg animate-pulse backdrop-blur-sm border border-yellow-300/50">Priority</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="text-2xl font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors duration-200 p-2 rounded-xl hover:bg-white/50 dark:hover:bg-slate-700/50 transform hover:rotate-90"
                        >
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>
                      <div className={`feedback-accordion-content overflow-hidden transition-all duration-700 ease-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="p-8 pt-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200/50 dark:border-slate-700/50 rounded-b-2xl">
                          <p className="text-lg text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap mb-6">{item.message}</p>
                          {item.attachments && JSON.parse(item.attachments).length > 0 && (
                            <div className="space-y-2">
                              <h6 className="font-bold text-slate-900 dark:text-slate-100 text-lg mb-3">Attachments:</h6>
                              {JSON.parse(item.attachments).map((path: string, index: number) => (
                                <div key={index} className="flex items-center gap-3 p-3 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl backdrop-blur-sm">
                                  <span className="text-slate-700 dark:text-slate-300 font-mono text-sm">📎 {path.split('/').pop() || path}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {message && (
          <div className={`fixed top-6 right-6 w-96 p-6 rounded-3xl shadow-2xl backdrop-blur-xl border-2 transform translate-x-full animate-slide-in-from-right-96 fade-in duration-300 z-50 group ${message.type === 'success' ? 'bg-emerald-500/95 border-emerald-400/60 text-white shadow-emerald-500/25' : 'bg-red-500/95 border-red-400/60 text-white shadow-red-500/25'} hover:!translate-x-0 transition-all duration-300`} role="alert">
            <p className="font-semibold text-lg mb-2 leading-relaxed">{message.text}</p>
            <button 
              className="absolute top-3 right-3 text-white/80 hover:text-white w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all duration-200 hover:rotate-180 scale-110"
              onClick={() => setMessage(null)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feedback;