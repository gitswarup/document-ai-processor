const KeyValueIndex = require('../models/KeyValueIndex');

class KeyValueIndexService {
  
  static normalizeKey(key) {
    return key.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, '_');
  }

  static getValueType(value) {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
  }

  static async indexKeyValuePairs(documentId, filename, originalFilename, keyValuePairs, extractedAt = new Date()) {
    try {
      const indexEntries = [];

      // Handle both array format [{key, value}] and object format {key: value}
      let pairs;
      if (Array.isArray(keyValuePairs)) {
        // Convert array format to object format for consistent processing
        pairs = {};
        keyValuePairs.forEach(pair => {
          if (pair.key && pair.value !== null && pair.value !== undefined && pair.value !== '') {
            pairs[pair.key] = pair.value;
          }
        });
      } else if (typeof keyValuePairs === 'object' && keyValuePairs !== null) {
        pairs = keyValuePairs;
      } else {
        throw new Error('keyValuePairs must be an array or object');
      }

      for (const [key, value] of Object.entries(pairs)) {
        // Skip empty or null values
        if (value === null || value === undefined || value === '') continue;

        indexEntries.push({
          documentId,
          filename,
          originalFilename,
          key,
          keyNormalized: this.normalizeKey(key),
          value,
          valueType: this.getValueType(value),
          extractedAt
        });
      }

      if (indexEntries.length > 0) {
        await KeyValueIndex.insertMany(indexEntries);
        console.log(`Indexed ${indexEntries.length} key-value pairs for document ${documentId}`);
      }

      return indexEntries.length;
    } catch (error) {
      console.error('Error indexing key-value pairs:', error);
      throw error;
    }
  }

  static async removeDocumentIndex(documentId) {
    try {
      const result = await KeyValueIndex.deleteMany({ documentId });
      console.log(`Removed ${result.deletedCount} index entries for document ${documentId}`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error removing document index:', error);
      throw error;
    }
  }

  static async searchByKeyExact(keyName, limit = 100) {
    try {
      const results = await KeyValueIndex.find({ key: keyName })
        .sort({ extractedAt: -1 })
        .limit(limit)
        .lean();

      const uniqueValues = [...new Set(results.map(r => r.value))];
      
      const valueFrequency = uniqueValues.map(value => {
        const matchingResults = results.filter(r => r.value === value);
        return {
          value,
          count: matchingResults.length,
          filenames: [...new Set(matchingResults.map(r => r.originalFilename))]
        };
      });

      return {
        searchKey: keyName,
        searchType: 'exact',
        results,
        uniqueValues,
        totalDocuments: new Set(results.map(r => r.documentId.toString())).size,
        totalResults: results.length,
        valueFrequency
      };
    } catch (error) {
      console.error('Error in exact key search:', error);
      throw error;
    }
  }

  static async searchByKeyPartial(keyName, limit = 100) {
    try {
      const normalizedSearch = this.normalizeKey(keyName);
      
      const results = await KeyValueIndex.find({
        keyNormalized: { $regex: normalizedSearch, $options: 'i' }
      })
      .sort({ extractedAt: -1 })
      .limit(limit)
      .lean();

      // Group by document
      const documentGroups = {};
      results.forEach(result => {
        const docId = result.documentId.toString();
        if (!documentGroups[docId]) {
          documentGroups[docId] = {
            documentId: result.documentId,
            filename: result.filename,
            originalFilename: result.originalFilename,
            extractedAt: result.extractedAt,
            matches: []
          };
        }
        documentGroups[docId].matches.push({
          key: result.key,
          value: result.value,
          valueType: result.valueType
        });
      });

      const groupedResults = Object.values(documentGroups);

      return {
        searchKey: keyName,
        searchType: 'partial',
        results: groupedResults,
        totalDocuments: groupedResults.length,
        totalMatches: results.length
      };
    } catch (error) {
      console.error('Error in partial key search:', error);
      throw error;
    }
  }

  // Search methods for ChatService
  static async searchByKey(searchTerm, limit = 50) {
    try {
      // Search for keys that contain the search term
      const results = await KeyValueIndex.find({
        $or: [
          { key: { $regex: searchTerm, $options: 'i' } },
          { keyNormalized: { $regex: this.normalizeKey(searchTerm), $options: 'i' } }
        ]
      })
      .sort({ extractedAt: -1 })
      .limit(limit)
      .lean();

      return results;
    } catch (error) {
      console.error('Error in searchByKey:', error);
      throw error;
    }
  }

  static async searchByValue(searchTerm, limit = 50) {
    try {
      // Search for values that contain the search term
      const results = await KeyValueIndex.find({
        value: { $regex: searchTerm, $options: 'i' }
      })
      .sort({ extractedAt: -1 })
      .limit(limit)
      .lean();

      return results;
    } catch (error) {
      console.error('Error in searchByValue:', error);
      throw error;
    }
  }

  static async getKeyStatistics() {
    try {
      const stats = await KeyValueIndex.aggregate([
        {
          $group: {
            _id: '$key',
            count: { $sum: 1 },
            uniqueValues: { $addToSet: '$value' },
            lastSeen: { $max: '$extractedAt' }
          }
        },
        {
          $project: {
            key: '$_id',
            count: 1,
            uniqueValueCount: { $size: '$uniqueValues' },
            lastSeen: 1,
            _id: 0
          }
        },
        { $sort: { count: -1 } },
        { $limit: 50 }
      ]);

      return stats;
    } catch (error) {
      console.error('Error getting key statistics:', error);
      throw error;
    }
  }
}

module.exports = KeyValueIndexService;