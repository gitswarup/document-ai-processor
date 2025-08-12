import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './DocumentDetailPage.css';

const DocumentDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDocument();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDocument = async () => {
    try {
      const response = await fetch(`/api/documents/${id}`);
      if (!response.ok) {
        throw new Error('Document not found');
      }
      const data = await response.json();
      setDocument(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getKeyValuePairs = (doc) => {
    if (!doc || !doc.keyValuePairs) return {};
    
    // Handle array format: [{key: "...", value: "..."}]
    if (Array.isArray(doc.keyValuePairs)) {
      const pairs = {};
      doc.keyValuePairs.forEach(pair => {
        if (pair.key && pair.value !== null && pair.value !== undefined && pair.value !== '') {
          pairs[pair.key] = pair.value;
        }
      });
      return pairs;
    }
    
    // Handle object format: {key: value}
    return doc.keyValuePairs;
  };

  if (loading) {
    return (
      <div className="document-detail-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading document details...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="document-detail-page">
        <div className="error-container">
          <h2>Document Not Found</h2>
          <p>{error || 'The requested document could not be found.'}</p>
          <button onClick={() => navigate('/documents')}>Back to Documents</button>
        </div>
      </div>
    );
  }

  return (
    <div className="document-detail-page">
      <div className="detail-header">
        <button onClick={() => navigate('/documents')} className="back-btn">
          ← Back to Documents
        </button>
        
        <div className="document-info">
          <h1>{document.originalFilename}</h1>
          <p className="upload-date">Processed on {formatDate(document.createdAt)}</p>
        </div>
      </div>

      <div className="detail-content">
        <div className="document-metadata">
          <h3>Document Information</h3>
          <div className="metadata-grid">
            <div className="metadata-item">
              <span className="label">File Size:</span>
              <span className="value">
                {document.metadata?.fileSize 
                  ? `${Math.round(document.metadata.fileSize / 1024)} KB`
                  : 'Unknown'
                }
              </span>
            </div>
            <div className="metadata-item">
              <span className="label">Processing Method:</span>
              <span className="value">{document.processingMethod || 'Unknown'}</span>
            </div>
            <div className="metadata-item">
              <span className="label">Confidence:</span>
              <span className="value">{Math.round(document.confidence * 100)}%</span>
            </div>
            <div className="metadata-item">
              <span className="label">Fields Extracted:</span>
              <span className="value">{Object.keys(getKeyValuePairs(document)).length}</span>
            </div>
            {document.metadata?.processingTime && (
              <div className="metadata-item">
                <span className="label">Processing Time:</span>
                <span className="value">{document.metadata.processingTime}ms</span>
              </div>
            )}
          </div>
        </div>

        <div className="extracted-data">
          <h3>Extracted Key-Value Pairs</h3>
          {Object.keys(getKeyValuePairs(document)).length === 0 ? (
            <div className="no-data">
              <p>No key-value pairs were extracted from this document.</p>
            </div>
          ) : (
            <div className="kv-pairs-container">
              {Object.entries(getKeyValuePairs(document)).map(([key, value], index) => (
                <div key={index} className="kv-pair-item">
                  <div className="kv-key">{key}</div>
                  <div className="kv-value">{String(value)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {document.extractedText && (
          <div className="extracted-text">
            <h3>Full Extracted Text</h3>
            <div className="text-content">
              <pre>{document.extractedText}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentDetailPage;