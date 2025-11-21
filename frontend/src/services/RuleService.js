import axios from 'axios';

/**
 * HTTP Helper - Base service for making API calls
 */
class HttpHelper {
  constructor(baseURL = '/api/v1') {
    this.baseURL = baseURL;
  }

  async request(method, url, data = null, params = {}) {
    const config = {
      method,
      url: `${this.baseURL}${url}`,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      config.data = data;
    }

    if (Object.keys(params).length > 0) {
      config.params = params;
    }

    try {
      const response = await axios(config);
      return response;
    } catch (error) {
      console.error('HTTP Request failed:', error);
      throw error;
    }
  }

  async get(url, params = {}) {
    return this.request('GET', url, null, params);
  }

  async post(url, data) {
    return this.request('POST', url, data);
  }

  async put(url, data) {
    return this.request('PUT', url, data);
  }

  async delete(url) {
    return this.request('DELETE', url);
  }
}

/**
 * Rule Service - Handles all rule-related API operations
 */
class RuleService {
  constructor(httpHelper = new HttpHelper()) {
    this.http = httpHelper;
  }

  /**
   * Create a new rule - server generates UUID
   * @param {Object} rule - Rule object without UUID
   * @returns {Object} - { uuid, version, ruleId, rule }
   */
  async createRule(rule) {
    // Remove UUID and version if accidentally included - server controls these
    const cleanRule = { ...rule };
    delete cleanRule.uuId;
    delete cleanRule.version;
    
    const response = await this.http.post('/rules', cleanRule);
    return response.data;
  }

  /**
   * Update existing rule - creates new version
   * @param {string} uuid - Existing rule UUID
   * @param {Object} rule - Updated rule object
   * @returns {Object} - { uuid, version, ruleId, rule }
   */
  async updateRule(uuid, rule) {
    // Remove UUID and version - server handles these
    const cleanRule = { ...rule };
    delete cleanRule.uuId;
    delete cleanRule.version;
    
    const response = await this.http.put(`/rules/${uuid}`, cleanRule);
    return response.data;
  }

  /**
   * Get all rules with pagination and filtering
   * @param {Object} options - { page, size, search, ruleType }
   * @returns {Object} - Paginated response with { content, page, size, totalElements, totalPages, first, last }
   */
  async getRules(options = {}) {
    const { page = 0, size = 20, search = '', ruleType = '' } = options;
    const params = { page, size };
    if (search) params.search = search;
    if (ruleType) params.ruleType = ruleType;

    const response = await this.http.get('/rules', params);
    return response.data;
  }

  /**
   * Get all rule IDs with metadata (no pagination - fetches all)
   * @param {string} ruleType - Optional rule type filter (Reporting, Transformation, etc.)
   * @returns {Array} - Array of rule summaries with {ruleId, uuid, latestVersion, folderPath, returnType, ruleType}
   */
  async getRuleIds(ruleType = null) {
    const params = { page: 0, size: 10000 }; // Large size to get all
    if (ruleType) {
      params.ruleType = ruleType;
    }
    const response = await this.http.get('/rules', params);
    return response.data.content || response.data; // Handle both paginated and non-paginated responses
  }

  /**
   * Get specific rule (latest version)
   * @param {string} uuid - Rule UUID
   * @returns {Object} - Rule object
   */
  async getRule(uuid) {
    return this.getRuleVersion(uuid, 'latest');
  }

  /**
   * Get specific rule version
   * @param {string} uuid - Rule UUID
   * @param {number|string} version - Version number or 'latest'
   * @returns {Object} - Rule object
   */
  async getRuleVersion(uuid, version) {
    const response = await this.http.get(`/rules/${uuid}/versions/${version}`);
    return response.data;
  }

  /**
   * Get all versions with full metadata
   * @param {string} uuid - Rule UUID
   * @returns {Array} - Array of version objects with metadata
   */
  async getRuleVersions(uuid) {
    const response = await this.http.get(`/rules/${uuid}/versions`);
    return response.data;
  }

  /**
   * Get all version numbers only
   * @param {string} uuid - Rule UUID
   * @returns {Array} - Array of version numbers
   */
  async getVersionNumbers(uuid) {
    const versions = await this.getRuleVersions(uuid);
    return versions.map(entry => entry.version).sort((a, b) => b - a);
  }

  /**
   * Restore a previous version (creates new version)
   * @param {string} uuid - Rule UUID
   * @param {number} version - Version to restore
   * @returns {Object} - Success response with new version info
   */
  async restoreRuleVersion(uuid, version) {
    const response = await this.http.post(`/rules/${uuid}/restore/${version}`);
    return response.data;
  }

  /**
   * Validate rule structure
   * @param {Object} rule - Rule to validate
   * @returns {Object} - Validation result
   */
  async validateRule(rule) {
    const response = await this.http.post('/rules/validate', rule);
    return response.data;
  }

  /**
   * Convert rule to SQL
   * @param {Object} rule - Rule object to convert
   * @returns {Object} - SQL conversion result with { sql, errors }
   */
  async convertToSql(rule) {
    const response = await this.http.post('/rules/to-sql', rule);
    return response.data;
  }

  // Note: No DELETE endpoint exists
  // Rules are permanent - you can only create new versions or restore old ones
}

// Export services
export { HttpHelper, RuleService };