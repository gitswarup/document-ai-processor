const ClaudeProvider = require('./providers/claudeProvider');
const GoogleProvider = require('./providers/googleProvider');
const MockProvider = require('./providers/mockProvider');

class AIService {
  constructor() {
    this.selectedProvider = this.initializeProvider();
  }

  initializeProvider() {
    const aiProvider = process.env.AI_PROVIDER?.toLowerCase();
    console.log(`Selected AI provider: ${aiProvider || 'default (Mock)'}`);
    switch (aiProvider) {
      case 'claude':
        const claudeProvider = new ClaudeProvider(process.env.CLAUDE_API_KEY);
        if (claudeProvider.isAvailable) {
          console.log('Using Claude AI provider');
          return claudeProvider;
        }
        console.warn('Claude provider selected but API key not available, falling back to Mock');
        return new MockProvider();
        
      case 'google':
        const googleProvider = new GoogleProvider(process.env.GOOGLE_API_KEY);
        if (googleProvider.isAvailable) {
          console.log('Using Google AI provider');
          return googleProvider;
        }
        console.warn('Google provider selected but API key not available, falling back to Mock');
        return new MockProvider();
        
      default:
        console.log('Using Mock AI provider (default)');
        return new MockProvider();
    }
  }

  async extractKeyValuePairs(text) {
    try {
      console.log(`Extracting with ${this.selectedProvider.constructor.name}`);
      console.log(text.substring(0, 100) + '...'); // Log first 100 chars for context
      const result = await this.selectedProvider.extractKeyValuePairs(text);
      console.log(`Successfully extracted ${result.length} key-value pairs`);
      return result;
    } catch (error) {
      console.error(`${this.selectedProvider.constructor.name} failed:`, error.message);
      console.error('Full error details:', error);
      
      // Don't fallback - let the error propagate to show the actual problem
      throw error;
    }
  }

  async chatQuery(userQuery, documentData) {
    try {
      console.log(`Chat query with ${this.selectedProvider.constructor.name}: "${userQuery}"`);
      const result = await this.selectedProvider.chatQuery(userQuery, documentData);
      console.log('Chat response generated successfully');
      return result;
    } catch (error) {
      console.error(`${this.selectedProvider.constructor.name} chat failed:`, error.message);
      throw error;
    }
  }

  getSelectedProvider() {
    return this.selectedProvider.constructor.name;
  }
}

module.exports = new AIService();