const { GoogleGenAI } = require('@google/genai');

class GoogleProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.isAvailable = !!apiKey;
    
    if (this.isAvailable) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  async extractKeyValuePairs(text) {
    if (!this.isAvailable) {
      throw new Error('Google API key not provided');
    }

    try {
      const prompt = `Extract key-value pairs from this document text. Return ONLY a valid JSON array with objects containing 'key' and 'value' properties. Focus on important information like names, dates, amounts, addresses, phone numbers, emails, etc.

Document text:
${text}

Return format example:
[{"key": "Name", "value": "John Doe"}, {"key": "Email", "value": "john@example.com"}]`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      
      const content = response.text;
      console.log('Google AI response:', content);
      
      const jsonMatch = content.match(/\[.*\]/s);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('Google JSON parse error:', parseError);
          throw new Error('Failed to parse Google response');
        }
      }
      
      throw new Error('No valid JSON found in Google response');
      
    } catch (error) {
      console.error('Google API error:', error.message);
      throw error;
    }
  }

  async chatQuery(userQuery, documentData) {
    if (!this.isAvailable) {
      throw new Error('Google API key not provided');
    }

    try {
      const prompt = `You are a helpful AI assistant that can answer questions about user documents. The user has uploaded documents and you have access to extracted key-value pairs from those documents.

User Question: "${userQuery}"

Available Document Data:
${JSON.stringify(documentData, null, 2)}

Instructions:
- Provide a direct, concise answer based on the document data
- If the answer is a single value (like a number, date, name), return just that value
- If there are multiple relevant values, list them clearly
- If you can't find the specific information requested, say so clearly
- Keep responses short and focused
- Use markdown formatting for emphasis when helpful

Answer:`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      
      return response.text.trim();
      
    } catch (error) {
      console.error('Google AI chat error:', error.message);
      throw error;
    }
  }
}

module.exports = GoogleProvider;