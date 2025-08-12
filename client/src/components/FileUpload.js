import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import './FileUpload.css';

const FileUpload = ({ onFileProcessed, onProcessingStart, isProcessing }) => {
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    const formData = new FormData();
    formData.append('document', file);
    
    onProcessingStart();
    
    try {
      const response = await axios.post('/api/process-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      onFileProcessed(response.data);
    } catch (error) {
      console.error('Error processing file:', error);
      onFileProcessed({
        error: 'Failed to process document. Please try again.',
        keyValuePairs: []
      });
    }
  }, [onFileProcessed, onProcessingStart]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/jpg': ['.jpg'],
      'image/png': ['.png']
    },
    maxFiles: 1,
    disabled: isProcessing
  });

  return (
    <div className="file-upload-container">
      <div 
        {...getRootProps()} 
        className={`dropzone ${isDragActive ? 'active' : ''} ${isProcessing ? 'disabled' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="upload-content">
          <div className="upload-icon">📄</div>
          {isDragActive ? (
            <p>Drop the document here...</p>
          ) : (
            <>
              <p><strong>Click to upload</strong> or drag and drop</p>
              <p className="supported-formats">Supported formats: PDF, JPEG, JPG, PNG</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;