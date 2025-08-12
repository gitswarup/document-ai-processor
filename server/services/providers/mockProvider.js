class MockProvider {
  constructor() {
    this.isAvailable = true;
  }

  async extractKeyValuePairs(text) {
    const keyValuePairs = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        
        if (key.trim() && value) {
          keyValuePairs.push({
            key: key.trim(),
            value: value
          });
        }
      }
      
      const emailMatch = line.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        keyValuePairs.push({
          key: 'Email',
          value: emailMatch[1]
        });
      }
      
      const phoneMatch = line.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
      if (phoneMatch) {
        keyValuePairs.push({
          key: 'Phone',
          value: phoneMatch[1]
        });
      }
      
      const dateMatch = line.match(/(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/);
      if (dateMatch) {
        keyValuePairs.push({
          key: 'Date',
          value: dateMatch[1]
        });
      }
      
      const amountMatch = line.match(/(\$[\d,]+\.?\d*)/);
      if (amountMatch) {
        keyValuePairs.push({
          key: 'Amount',
          value: amountMatch[1]
        });
      }
    }
    
    const uniquePairs = keyValuePairs.filter((pair, index, self) => 
      index === self.findIndex(p => p.key === pair.key && p.value === pair.value)
    );
    
    return uniquePairs.slice(0, 20);
  }

  async chatQuery(userQuery, documentData) {
    // Simple mock implementation for development
    const queryLower = userQuery.toLowerCase();
    
    // Extract all values from the document data
    const allValues = [];
    if (Array.isArray(documentData)) {
      documentData.forEach(doc => {
        if (Array.isArray(doc.keyValuePairs)) {
          doc.keyValuePairs.forEach(pair => {
            allValues.push({ key: pair.key, value: pair.value, document: doc.originalFilename });
          });
        }
      });
    }
    
    // Look for relevant matches based on query keywords
    const relevantMatches = allValues.filter(item => {
      const keyLower = item.key.toLowerCase();
      const valueLower = String(item.value).toLowerCase();
      
      return queryLower.includes(keyLower) || 
             keyLower.includes('license') && queryLower.includes('license') ||
             keyLower.includes('number') && queryLower.includes('number') ||
             keyLower.includes('name') && queryLower.includes('name') ||
             keyLower.includes('phone') && queryLower.includes('phone') ||
             keyLower.includes('email') && queryLower.includes('email') ||
             keyLower.includes('address') && queryLower.includes('address');
    });
    
    if (relevantMatches.length === 0) {
      return "I couldn't find that information in your documents. Try rephrasing your question.";
    }
    
    // Return the most relevant match
    if (relevantMatches.length === 1) {
      return `**${relevantMatches[0].value}**`;
    }
    
    // Multiple matches - return the first few
    const uniqueValues = [...new Set(relevantMatches.map(m => m.value))];
    if (uniqueValues.length <= 3) {
      return uniqueValues.map(val => `**${val}**`).join(', ');
    }
    
    return `Found ${uniqueValues.length} matches: ${uniqueValues.slice(0, 3).map(val => `**${val}**`).join(', ')}...`;
  }
}

module.exports = MockProvider;