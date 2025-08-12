const axios = require('axios');

class ClaudeProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.isAvailable = !!apiKey;
  }

  async extractKeyValuePairs(text) {
    if (!this.isAvailable) {
      throw new Error('Claude API key not provided');
    }

    try {
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Extract key-value pairs from this document text. Return ONLY a valid JSON array with objects containing 'key' and 'value' properties. Focus on important information like names, dates, amounts, addresses, phone numbers, emails, etc.

Document text:
${text}

Return format example:
[{"key": "Name", "value": "John Doe"}, {"key": "Email", "value": "john@example.com"}]`
        }]
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        }
      });

      const content = response.data.content[0].text;
      console.log('Claude AI response:', content);
      
      const jsonMatch = content.match(/\[.*\]/s);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('Claude JSON parse error:', parseError);
          throw new Error('Failed to parse Claude response');
        }
      }
      
      throw new Error('No valid JSON found in Claude response');
      
    } catch (error) {
      console.error('Claude API error:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = ClaudeProvider;