import { HttpHelper } from './RuleService.js';

/**
 * Config Service - Handles configuration-related API operations
 */
class ConfigService {
  constructor(httpHelper = new HttpHelper()) {
    this.http = httpHelper;
  }

  /**
   * Get application configuration
   * @returns {Object} - Configuration object with operators, types, functions
   */
  async getConfig() {
    const response = await this.http.get('/config');
    return response.data;
  }

  /**
   * Update application configuration
   * @param {Object} config - Configuration object
   * @returns {Object} - Updated configuration
   */
  async updateConfig(config) {
    const response = await this.http.put('/config', config);
    return response.data;
  }
}

// Export service
export { ConfigService };