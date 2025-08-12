import React from 'react';
import './ResultDisplay.css';

const ResultDisplay = ({ data }) => {
  if (data.error) {
    return (
      <div className="result-container error">
        <h3>Processing Error</h3>
        <div className="error-message">
          <p>{data.error}</p>
        </div>
        
        {/* Show detailed error information in development mode */}
        {data.details && (
          <details className="error-details">
            <summary>Technical Details</summary>
            <div className="error-details-content">
              <p><strong>File:</strong> {data.details.filename}</p>
              <p><strong>Type:</strong> {data.details.mimeType}</p>
              <p><strong>Size:</strong> {data.details.fileSize} bytes</p>
              <p><strong>Step:</strong> {data.details.processingStep}</p>
              <p><strong>Time:</strong> {new Date(data.details.timestamp).toLocaleString()}</p>
              
              {data.details.message && (
                <div className="error-technical">
                  <p><strong>Technical Message:</strong></p>
                  <code>{data.details.message}</code>
                </div>
              )}
            </div>
          </details>
        )}
        
        <div className="error-suggestions">
          <h4>Suggestions:</h4>
          <ul>
            <li>Try converting PDF to JPG/PNG format for scanned documents</li>
            <li>Ensure the document contains readable text or clear images</li>
            <li>Check that the file isn't corrupted</li>
          </ul>
        </div>
      </div>
    );
  }

  if (!data.keyValuePairs || data.keyValuePairs.length === 0) {
    return (
      <div className="result-container">
        <h3>No Data Extracted</h3>
        <p>No key-value pairs were found in the document.</p>
      </div>
    );
  }

  return (
    <div className="result-container">
      <div className="result-header">
        <h3>Extracted Key-Value Pairs</h3>
        <p>Found {data.keyValuePairs.length} key-value pairs in the document</p>
      </div>
      
      <div className="kv-pairs-grid">
        {data.keyValuePairs.map((pair, index) => (
          <div key={index} className="kv-pair">
            <div className="key">{pair.key}</div>
            <div className="value">{pair.value}</div>
          </div>
        ))}
      </div>
      
      {data.confidence && (
        <div className="confidence-score">
          <span>AI Confidence: {Math.round(data.confidence * 100)}%</span>
        </div>
      )}
      
      <div className="export-options">
        <button 
          className="export-btn"
          onClick={() => downloadAsJSON(data.keyValuePairs)}
        >
          Export as JSON
        </button>
        <button 
          className="export-btn"
          onClick={() => downloadAsCSV(data.keyValuePairs)}
        >
          Export as CSV
        </button>
      </div>
    </div>
  );
};

const downloadAsJSON = (data) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'extracted-data.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const downloadAsCSV = (data) => {
  const csvContent = [
    'Key,Value',
    ...data.map(pair => `"${pair.key}","${pair.value}"`)
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'extracted-data.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export default ResultDisplay;