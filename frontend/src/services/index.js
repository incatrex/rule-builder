import { HttpHelper } from './RuleService.js';

/**
 * Configuration Service - Manages application configuration
 */
class ConfigService {
  constructor(httpHelper = new HttpHelper()) {
    this.http = httpHelper;
  }

  /**
   * Get application configuration
   * @returns {Object} - Configuration object
   */
  async getConfig() {
    const response = await this.http.get('/config');
    return response.data;
  }

  /**
   * Update configuration
   * @param {Object} config - New configuration
   * @returns {Object} - Updated configuration
   */
  async updateConfig(config) {
    const response = await this.http.put('/config', config);
    return response.data;
  }
}

/**
 * Field Service - Manages field definitions and metadata
 */
class FieldService {
  constructor(httpHelper = new HttpHelper()) {
    this.http = httpHelper;
  }

  /**
   * Get available fields with pagination
   * @param {Object} options - { page, size, search, type }
   * @returns {Object} - Paginated field list
   */
  async getFields(options = {}) {
    const {
      page = 1,
      size = 100,
      search = '',
      type = ''
    } = options;

    const params = { page, size };
    if (search) params.search = search;
    if (type) params.type = type;

    const response = await this.http.get('/fields', params);
    return response.data;
  }

  /**
   * Get field metadata
   * @param {string} fieldId - Field identifier
   * @returns {Object} - Field metadata
   */
  async getField(fieldId) {
    const response = await this.http.get(`/fields/${fieldId}`);
    return response.data;
  }

  /**
   * Create new field definition
   * @param {Object} field - Field definition
   * @returns {Object} - Created field
   */
  async createField(field) {
    const response = await this.http.post('/fields', field);
    return response.data;
  }

  /**
   * Update field definition
   * @param {string} fieldId - Field identifier
   * @param {Object} field - Updated field definition
   * @returns {Object} - Updated field
   */
  async updateField(fieldId, field) {
    const response = await this.http.put(`/fields/${fieldId}`, field);
    return response.data;
  }

  /**
   * Delete field definition
   * @param {string} fieldId - Field identifier
   * @returns {Object} - Success response
   */
  async deleteField(fieldId) {
    const response = await this.http.delete(`/fields/${fieldId}`);
    return response.data;
  }
}

export { ConfigService, FieldService };