import { HttpHelper } from './RuleService.js';

/**
 * RuleConfigService - Handles configuration-related API operations
 */
class RuleConfigService {
  constructor(httpHelper = new HttpHelper()) {
    this.http = httpHelper;
  }

  /**
   * Get application configuration
   * @returns {Object} - Configuration object with operators, types, functions
   */
  async getConfig() {
    const response = await this.http.get('/rules/ui/config');
    return response.data;
  }

  // Note: No PUT endpoint exists for config - it's generated from schema
  // Configuration is read-only and comes from rule-schema-current.json
  // If you need to modify config, update the schema file directly
}

// Export service
export { RuleConfigService };