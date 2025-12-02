import ARGUMENT_OPTIONS_SERVICES from '../config/argumentOptionsConfig';

/**
 * Service for fetching and caching dynamic argument options.
 * Supports both simple cached endpoints and paginated search-based endpoints.
 */
class ArgumentOptionsService {
  constructor(config = ARGUMENT_OPTIONS_SERVICES) {
    this.endpointMap = config;
    this.cache = {};
  }

  /**
   * Get options for a given optionsRef.
   * Simple endpoints are cached after first load.
   * Paginated endpoints fetch on each call with search support.
   * 
   * @param {string} optionsRef - The options reference name from schema
   * @param {string} searchTerm - Optional search term for paginated endpoints
   * @returns {Promise<Array>} Array of option objects with value and label
   */
  async getOptionsForRef(optionsRef, searchTerm = '') {
    const config = this.endpointMap[optionsRef];
    
    if (!config) {
      console.warn(`No service configured for optionsRef: ${optionsRef}`);
      return [];
    }
    
    try {
      // Simple case: string endpoint, cache all results
      if (typeof config === 'string') {
        // Check cache first
        if (this.cache[optionsRef]) {
          return this.cache[optionsRef];
        }
        
        const response = await fetch(config);
        
        if (!response.ok) {
          console.error(`Failed to fetch options for ${optionsRef}: ${response.status}`);
          return [];
        }
        
        const options = await response.json();
        this.cache[optionsRef] = options;
        return options;
      }
      
      // Paginated case: object config with search support
      if (config.paginated) {
        const searchParam = config.searchParam || 'q';
        const url = `${config.endpoint}?${searchParam}=${encodeURIComponent(searchTerm)}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`Failed to fetch paginated options for ${optionsRef}: ${response.status}`);
          return [];
        }
        
        const data = await response.json();
        // Support both array response and { items: [] } format
        return Array.isArray(data) ? data : (data.items || []);
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching options for ${optionsRef}:`, error);
      return [];
    }
  }

  /**
   * Check if an optionsRef uses paginated configuration.
   * 
   * @param {string} optionsRef - The options reference name
   * @returns {boolean} True if paginated, false otherwise
   */
  isPaginated(optionsRef) {
    const config = this.endpointMap[optionsRef];
    return typeof config === 'object' && config.paginated === true;
  }

  /**
   * Clear the cache. Useful for testing or forcing reload.
   */
  clearCache() {
    this.cache = {};
  }
}

// Export singleton instance
export default new ArgumentOptionsService();

// Also export class for testing
export { ArgumentOptionsService };
