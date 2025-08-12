import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import ResultDisplay from '../components/ResultDisplay';
import './HomePage.css';

const HomePage = () => {
  const [extractedData, setExtractedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const handleFileProcessed = (data) => {
    setExtractedData(data);
    setIsProcessing(false);
  };

  const handleProcessingStart = () => {
    setIsProcessing(true);
    setExtractedData(null);
  };

  return (
    <div className="homepage">
      <div className="hero-section">
        <h1>Document AI Processor</h1>
        <p>Upload PDF, JPEG, JPG, or PNG documents to extract key-value pairs using AI</p>
      </div>
      
      <div className="upload-section">
        <FileUpload 
          onFileProcessed={handleFileProcessed}
          onProcessingStart={handleProcessingStart}
          isProcessing={isProcessing}
        />
        
        {isProcessing && (
          <div className="processing-indicator">
            <div className="spinner"></div>
            <p>Processing document with AI...</p>
          </div>
        )}
        
        {extractedData && (
          <div className="result-section">
            <ResultDisplay data={extractedData} />
            <div className="next-steps">
              <button 
                className="view-all-btn"
                onClick={() => navigate('/documents')}
              >
                View All Documents
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;