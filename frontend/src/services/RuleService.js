/**
 * HTTP Helper - Base service for making API calls
 */
class HttpHelper {
  constructor(baseURL = '/api') {
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
   * Get rules with pagination and filtering
   * @param {Object} options - { page, size, search, type, returnType }
   * @returns {Object} - Paginated rule list
   */
  async getRules(options = {}) {
    const {
      page = 1,
      size = 20,
      search = '',
      type = '',
      returnType = ''
    } = options;

    const params = { page, size };
    if (search) params.search = search;
    if (type) params.type = type;
    if (returnType) params.returnType = returnType;

    const response = await this.http.get('/rules', params);
    return response.data;
  }

  /**
   * Get specific rule (latest version)
   * @param {string} uuid - Rule UUID
   * @returns {Object} - Rule object
   */
  async getRule(uuid) {
    const response = await this.http.get(`/rules/${uuid}`);
    return response.data;
  }

  /**
   * Get specific rule version
   * @param {string} uuid - Rule UUID
   * @param {number} version - Version number
   * @returns {Object} - Rule object
   */
  async getRuleVersion(uuid, version) {
    const response = await this.http.get(`/rules/${uuid}/versions/${version}`);
    return response.data;
  }

  /**
   * Get all versions of a rule
   * @param {string} uuid - Rule UUID
   * @returns {Array} - Array of version numbers
   */
  async getRuleVersions(uuid) {
    const response = await this.http.get(`/rules/${uuid}/versions`);
    return response.data;
  }

  /**
   * Get rule history
   * @param {string} uuid - Rule UUID
   * @returns {Array} - Rule history entries
   */
  async getRuleHistory(uuid) {
    const response = await this.http.get(`/rules/${uuid}/history`);
    return response.data;
  }

  /**
   * Restore a specific rule version
   * @param {string} uuid - Rule UUID
   * @param {number} version - Version to restore
   * @returns {Object} - Success response
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
   * @param {string} uuid - Rule UUID
   * @param {number} version - Optional version (uses latest if not provided)
   * @returns {Object} - SQL conversion result
   */
  async convertToSql(uuid, version = null) {
    const endpoint = version 
      ? `/rules/${uuid}/versions/${version}/sql`
      : `/rules/${uuid}/sql`;
    
    const response = await this.http.post(endpoint);
    return response.data;
  }

  /**
   * Delete rule (all versions)
   * @param {string} uuid - Rule UUID
   * @returns {Object} - Success response
   */
  async deleteRule(uuid) {
    const response = await this.http.delete(`/rules/${uuid}`);
    return response.data;
  }
}

// Export services
export { HttpHelper, RuleService };