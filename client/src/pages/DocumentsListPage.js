import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DocumentChat from '../components/DocumentChat';
import './DocumentsListPage.css';

const DocumentsListPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showChat, setShowChat] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents');
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setDocuments(documents.filter(doc => doc._id !== docId));
      } else {
        alert('Failed to delete document');
      }
    } catch (err) {
      alert('Error deleting document: ' + err.message);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.originalFilename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getKeyValuePairs = (doc) => {
    if (!doc.keyValuePairs) return {};
    
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

  const getFileTypeIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['jpg', 'jpeg', 'png'].includes(ext)) return '🖼️';
    return '📎';
  };

  if (loading) {
    return (
      <div className="documents-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="documents-page">
        <div className="error-container">
          <h2>Error Loading Documents</h2>
          <p>{error}</p>
          <button onClick={fetchDocuments}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="documents-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Your Documents</h1>
          <p>Manage and search through your processed documents</p>
        </div>
        
        <div className="header-actions">
          <button 
            className="chat-toggle-btn"
            onClick={() => setShowChat(!showChat)}
          >
            {showChat ? '📋 View Documents' : '💬 Ask AI'}
          </button>
          <button 
            className="upload-new-btn"
            onClick={() => navigate('/')}
          >
            + Upload New
          </button>
        </div>
      </div>

      {showChat ? (
        <DocumentChat documents={documents} />
      ) : (
        <div className="documents-content">
          <div className="search-section">
            <input
              type="text"
              placeholder="Search documents by filename..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <h3>No documents found</h3>
              <p>
                {searchTerm 
                  ? 'No documents match your search criteria' 
                  : 'Upload your first document to get started'
                }
              </p>
              {!searchTerm && (
                <button 
                  className="upload-first-btn"
                  onClick={() => navigate('/')}
                >
                  Upload Document
                </button>
              )}
            </div>
          ) : (
            <div className="documents-grid">
              {filteredDocuments.map((doc) => (
                <div key={doc._id} className="document-card">
                  <div className="document-header">
                    <div className="file-icon">
                      {getFileTypeIcon(doc.originalFilename)}
                    </div>
                    <div className="document-actions">
                      <button
                        onClick={() => navigate(`/documents/${doc._id}`)}
                        className="view-btn"
                        title="View Details"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc._id)}
                        className="delete-btn"
                        title="Delete Document"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <div className="document-content">
                    <h3 className="document-title">{doc.originalFilename}</h3>
                    <p className="document-date">
                      Processed on {formatDate(doc.createdAt)}
                    </p>
                    
                    <div className="document-stats">
                      <span className="stat-item">
                        🔑 {Object.keys(getKeyValuePairs(doc)).length} fields
                      </span>
                      <span className="stat-item">
                        📊 {Math.round(doc.confidence * 100)}% confidence
                      </span>
                      <span className="stat-item">
                        🤖 {doc.processingMethod}
                      </span>
                    </div>

                    {doc.metadata?.fileSize && (
                      <div className="file-info">
                        <span className="file-size">
                          📦 {Math.round(doc.metadata.fileSize / 1024)} KB
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="document-preview">
                    {Object.keys(getKeyValuePairs(doc)).slice(0, 3).map((key) => {
                      const pairs = getKeyValuePairs(doc);
                      return (
                        <div key={key} className="preview-field">
                          <span className="preview-key">{key}:</span>
                          <span className="preview-value">
                            {String(pairs[key]).substring(0, 30)}
                            {String(pairs[key]).length > 30 ? '...' : ''}
                          </span>
                        </div>
                      );
                    })}
                    {Object.keys(getKeyValuePairs(doc)).length > 3 && (
                      <div className="more-fields">
                        +{Object.keys(getKeyValuePairs(doc)).length - 3} more fields
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentsListPage;