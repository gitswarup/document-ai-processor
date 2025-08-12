const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const vision = require('@google-cloud/vision');
require('dotenv').config();

class DocumentProcessor {
  constructor() {
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    
    if (credentials && fs.existsSync(credentials)) {
      this.visionClient = new vision.ImageAnnotatorClient({
        keyFilename: credentials,
        projectId: projectId
      });
    } else {
      console.warn('Google Cloud Vision credentials not found. Vision API will be unavailable.');
      this.visionClient = null;
    }
  }
  async extractText(filePath, mimeType) {
    try {
      console.log(`Starting text extraction for ${mimeType} file: ${filePath}`);
      
      if (mimeType === 'application/pdf') {
        return await this.extractFromPDF(filePath);
      } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg' || mimeType === 'image/png') {
        return await this.extractFromImage(filePath);
      } else {
        const error = new Error(`Unsupported file type: ${mimeType}`);
        error.processingStep = 'FILE_TYPE_CHECK';
        throw error;
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      if (!error.processingStep) {
        error.processingStep = 'UNKNOWN';
      }
      throw error;
    }
  }

  async extractFromPDF(filePath) {
    try {
      console.log('Processing PDF file:', filePath);
      const dataBuffer = fs.readFileSync(filePath);
      
      // Check if file is actually a PDF
      const fileHeader = dataBuffer.slice(0, 4).toString();
      if (fileHeader !== '%PDF') {
        throw new Error('File does not appear to be a valid PDF');
      }
      
      const data = await pdfParse(dataBuffer);
      
      console.log(`PDF parsed. Pages: ${data.numpages}, Text length: ${data.text.length}`);
      
      // If PDF has meaningful text content, return it
      const cleanText = data.text.trim();
      if (cleanText.length > 20) {
        // Check if it's mostly meaningful text (not just metadata or symbols)
        const meaningfulChars = cleanText.replace(/[\\s\\n\\r\\t]/g, '').length;
        const alphanumericChars = (cleanText.match(/[a-zA-Z0-9]/g) || []).length;
        
        if (alphanumericChars / meaningfulChars > 0.3) {
          console.log('PDF contains readable text content');
          return cleanText;
        }
      }
      
      console.log('PDF appears to be scanned/image-based or contains minimal text, attempting OCR...');
      return await this.extractFromScannedPDF(filePath);
      
    } catch (error) {
      console.error('PDF extraction error:', error);
      
      // If it's our helpful message about scanned PDFs, pass it through
      if (error.processingStep === 'PDF_IMAGE_CONVERSION_UNAVAILABLE') {
        throw error;
      }
      
      error.processingStep = 'PDF_TEXT_EXTRACTION';
      
      // If pdf-parse fails completely, try OCR approach
      console.log('PDF parsing failed, attempting OCR extraction...');
      try {
        return await this.extractFromScannedPDF(filePath);
      } catch (ocrError) {
        console.error('PDF OCR extraction also failed:', ocrError);
        
        // Return the more helpful error message
        if (ocrError.processingStep === 'PDF_IMAGE_CONVERSION_UNAVAILABLE') {
          throw ocrError;
        }
        
        ocrError.processingStep = 'PDF_OCR_FALLBACK';
        const combinedError = new Error(`PDF processing failed: ${error.message}. ${ocrError.message}`);
        combinedError.processingStep = 'PDF_COMPLETE_FAILURE';
        throw combinedError;
      }
    }
  }

  async preprocessImage(filePath) {
    const tempPath = path.join(path.dirname(filePath), 'temp_processed_' + path.basename(filePath));
    
    try {
      await sharp(filePath)
        .grayscale()
        .normalise()
        .sharpen()
        .resize(null, 1200, { 
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3
        })
        .png({ quality: 100 })
        .toFile(tempPath);
      
      return tempPath;
    } catch (error) {
      console.error('Image preprocessing error:', error);
      error.processingStep = 'IMAGE_PREPROCESSING';
      throw error;
    }
  }

  async extractWithGoogleVision(filePath) {
    if (!this.visionClient) {
      throw new Error('Google Cloud Vision client not initialized');
    }
    
    try {
      const [result] = await this.visionClient.textDetection(filePath);
      const detections = result.textAnnotations;
      
      if (detections && detections.length > 0) {
        return detections[0].description.trim();
      }
      
      return '';
    } catch (error) {
      console.error('Google Vision API Error:', error);
      error.processingStep = 'GOOGLE_VISION_API';
      throw error;
    }
  }

  async extractWithTesseract(filePath) {
    let processedImagePath = null;
    
    try {
      processedImagePath = await this.preprocessImage(filePath);
      
      const { data: { text } } = await Tesseract.recognize(processedImagePath, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`Tesseract OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
        tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:!?()[]{}"\'-/@#$%^&*+=<>|\\~`_ \n\t',
        preserve_interword_spaces: '1'
      });
      
      return text.trim();
    } catch (error) {
      console.error('Tesseract OCR Error:', error);
      error.processingStep = 'TESSERACT_OCR';
      throw error;
    } finally {
      if (processedImagePath && fs.existsSync(processedImagePath)) {
        try {
          fs.unlinkSync(processedImagePath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup temporary file:', cleanupError);
        }
      }
    }
  }

  async extractFromScannedPDF(filePath) {
    // For now, provide a helpful error message for scanned PDFs
    // This avoids dependency issues while still being informative
    
    console.log('PDF appears to contain images or scanned content...');
    
    const error = new Error([
      'This PDF appears to contain scanned images or forms that require OCR processing.',
      'Current options:',
      '1. Convert the PDF to JPG/PNG format and upload the image instead',
      '2. Use a PDF with selectable text content',
      '3. For automatic PDF processing, install ImageMagick or GraphicsMagick on your system',
      '',
      'To install ImageMagick on macOS: brew install imagemagick',
      'Then restart the server to enable PDF image conversion.'
    ].join('\\n'));
    
    error.processingStep = 'PDF_IMAGE_CONVERSION_UNAVAILABLE';
    throw error;
  }

  async extractFromImage(filePath) {
    try {
      console.log('Attempting OCR with Google Vision API...');
      const text = await this.extractWithGoogleVision(filePath);
      
      if (text && text.length > 0) {
        console.log('Google Vision API extraction successful');
        return text;
      }
      
      console.log('Google Vision API returned empty result, falling back to Tesseract...');
      return await this.extractWithTesseract(filePath);
      
    } catch (visionError) {
      console.log('Google Vision API failed, falling back to Tesseract...', visionError.message);
      visionError.processingStep = 'GOOGLE_VISION_OCR';
      
      try {
        return await this.extractWithTesseract(filePath);
      } catch (tesseractError) {
        console.error('Both OCR methods failed');
        tesseractError.processingStep = 'TESSERACT_OCR';
        const combinedError = new Error(`Failed to extract text from image. Google Vision error: ${visionError.message}. Tesseract error: ${tesseractError.message}`);
        combinedError.processingStep = 'IMAGE_OCR_COMPLETE_FAILURE';
        throw combinedError;
      }
    }
  }
}

module.exports = new DocumentProcessor();