import React, { useState, useEffect } from 'react';

const ReceiptScanner: React.FC<{
  setAmount: (value: string) => void;
  setDescription: (value: string) => void;
  setDate: (value: string) => void;
}> = ({ setAmount, setDescription, setDate }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<string>('FREE');

  useEffect(() => {
    const fetchTier = async () => {
      const response = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/users/1`);
      const data = await response.json();
      setTier(data.tier);
    };
    fetchTier();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const response = await fetch(`https://financial-tracker-ai-insight-a194fc716874.herokuapp.com/ocr`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('OCR failed');
      }

      const data = await response.json();
      if (data.amount) setAmount(data.amount.toString());
      if (data.merchant) setDescription(data.merchant);
      if (data.date) setDate(data.date);
    } catch (err) {
      setError('Failed to process receipt. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (tier === 'FREE') {
    return (
      <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', margin: '16px', position: 'relative' }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          zIndex: 1
        }}>
          <div style={{ textAlign: 'center', color: '#FFFFFF' }}>
            <h4>Premium Feature</h4>
            <p>Upgrade to scan receipts</p>
          </div>
        </div>
        <h2 style={{ color: '#212121' }}>Scan Receipt</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#212121' }}>Upload Receipt Image:</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ width: '100%', padding: '8px', border: '1px solid #757575', borderRadius: '4px' }}
              required
              disabled
            />
          </div>
          {error && <p style={{ color: '#F44336' }}>{error}</p>}
          <button
            type="submit"
            disabled
            style={{
              backgroundColor: '#E0E0E0',
              color: '#757575',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'not-allowed',
            }}
          >
            Scan Receipt
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', margin: '16px' }}>
      <h2 style={{ color: '#212121' }}>Scan Receipt</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#212121' }}>Upload Receipt Image:</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ width: '100%', padding: '8px', border: '1px solid #757575', borderRadius: '4px' }}
            required
          />
        </div>
        {preview && (
          <div style={{ marginBottom: '16px' }}>
            <img src={preview} alt="Receipt preview" style={{ maxWidth: '100%', maxHeight: '200px' }} />
          </div>
        )}
        {error && <p style={{ color: '#F44336' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading || !file}
          style={{
            backgroundColor: loading ? '#757575' : '#009688',
            color: '#FFFFFF',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          {loading ? 'Processing...' : 'Scan Receipt'}
        </button>
      </form>
    </div>
  );
};

export default ReceiptScanner;