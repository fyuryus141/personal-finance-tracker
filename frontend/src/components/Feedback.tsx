import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import './Feedback.css';

interface FeedbackItem {
  id: number;
  subject?: string;
  message: string;
  type: string;
  rating?: number;
  category?: string;
  attachments?: string;
  createdAt: string;
}

const feedbackSchema = yup.object({
  rating: yup.number().required('Rating is required').min(1, 'Please provide a rating'),
  category: yup.string().required('Category is required'),
  subject: yup.string().optional(),
  message: yup.string().required('Message is required').min(10, 'Message must be at least 10 characters'),
});

const categories = [
  { value: 'feedback', label: 'General Feedback' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'ui', label: 'UI/UX Issue' },
  { value: 'performance', label: 'Performance' },
  { value: 'other', label: 'Other' },
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

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE}/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Feedback submitted successfully!' });
        reset();
        setRating(1);
        setSelectedCategory('');
        setAttachments([]);
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
      setMessage({ type: 'error', text: 'Error submitting feedback' });
    }
    setLoading(false);
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

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="feedback-header">
          <h2 className="feedback-title">Feedback</h2>
          <p className="feedback-subtitle">Help us improve by sharing your thoughts and experiences.</p>
        </div>

        {envError && (
          <div className="feedback-alert error">
            <p>API base URL is not configured. Please check your environment variables.</p>
          </div>
        )}

        <div className="feedback-card">
          <h3 className="feedback-card-title">Submit Feedback</h3>
          <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="feedback-rating">
              <label className="feedback-rating-label">Rate your experience</label>
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
                      field.onChange(parseInt(e.target.value));
                      setRating(parseInt(e.target.value));
                    }}
                    className="login-input"
                    style={{ width: 'auto' }}
                  />
                )}
              />
              {errors.rating && <p style={{ color: 'red', marginTop: '8px' }}>{errors.rating.message}</p>}
            </div>

            <div className="feedback-category">
              <label className="feedback-category-label">Category</label>
              <div className="feedback-chips">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    className={`feedback-chip ${selectedCategory === cat.value ? 'selected' : ''}`}
                    onClick={() => handleCategorySelect(cat.value)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              {errors.category && <p style={{ color: 'red', marginTop: '8px' }}>{errors.category.message}</p>}
            </div>

            <Controller
              name="subject"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  className="login-input"
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
                  className="login-input"
                  placeholder="Message"
                  rows={4}
                  maxLength={1000}
                  style={{ resize: 'vertical' }}
                />
              )}
            />
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              {watchedMessage?.length || 0}/1000 characters
            </p>
            {errors.message && <p style={{ color: 'red' }}>{errors.message.message}</p>}

            <div className="feedback-file-input">
              <label className="feedback-file-button" htmlFor="file-upload">Choose Files</label>
              <input
                accept="image/*,.pdf,.txt"
                style={{ display: 'none' }}
                id="file-upload"
                multiple
                type="file"
                onChange={handleFileChange}
              />
              {attachments.length > 0 && (
                <div className="feedback-attachments">
                  {attachments.map((file, index) => (
                    <div key={index} className="feedback-attachment">
                      <span className="feedback-attachment-text">
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                      <button
                        type="button"
                        className="feedback-delete-button"
                        onClick={() => removeAttachment(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="feedback-anonymous">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
              />
              <label>Submit anonymously</label>
            </div>

            <button className="feedback-submit-button" type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
            {loading && <div className="feedback-progress"><div className="feedback-progress-bar" style={{ width: '100%' }}></div></div>}
          </form>
        </div>

        <div className="feedback-card">
          <h3 className="feedback-card-title">Previous Feedback</h3>
          {historyLoading ? (
            <div className="feedback-progress"><div className="feedback-progress-bar" style={{ width: '100%' }}></div></div>
          ) : feedbackHistory.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No previous feedback found.</p>
          ) : (
            feedbackHistory.map((item) => {
              const isExpanded = expandedItems.has(item.id);
              return (
                <div key={item.id} className="feedback-accordion">
                  <div className="feedback-accordion-header">
                    <div className="feedback-rating-display">
                      <span>Rating: {item.rating || 1}</span>
                      <span>{item.subject || 'No subject'} - {new Date(item.createdAt).toLocaleDateString()}</span>
                      <span className="feedback-category-chip">{item.category || item.type}</span>
                    </div>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', fontSize: '18px' }}
                      onClick={() => {
                        const newSet = new Set(expandedItems);
                        if (isExpanded) {
                          newSet.delete(item.id);
                        } else {
                          newSet.add(item.id);
                        }
                        setExpandedItems(newSet);
                      }}
                    >
                      {isExpanded ? '▲' : '▼'}
                    </button>
                  </div>
                  <div className={`feedback-accordion-content ${isExpanded ? 'expanded' : ''}`}>
                    <p>{item.message}</p>
                    {item.attachments && JSON.parse(item.attachments).length > 0 && (
                      <div>
                        <strong>Attachments:</strong>
                        {JSON.parse(item.attachments).map((path: string, index: number) => (
                          <p key={index}>{path.split('/').pop()}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {message && (
          <div className={`feedback-alert ${message.type}`}>
            <p className="feedback-alert-text">{message.text}</p>
            <button onClick={() => setMessage(null)}>×</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feedback;