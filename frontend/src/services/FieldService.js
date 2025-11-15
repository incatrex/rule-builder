import { HttpHelper } from './RuleService.js';

/**
 * Field Service - Handles field-related API operations
 */
class FieldService {
  constructor(httpHelper = new HttpHelper()) {
    this.http = httpHelper;
  }

  /**
   * Get available fields configuration (returns fields directly, not paginated)
   * @returns {Object} - Fields object with field definitions
   */
  async getFields() {
    const response = await this.http.get('/fields');
    return response.data;
  }

  /**
   * Update fields configuration
   * @param {Object} fields - Fields configuration object
   * @returns {Object} - Updated fields configuration
   */
  async updateFields(fields) {
    const response = await this.http.put('/fields', fields);
    return response.data;
  }

  /**
   * Get field by name
   * @param {string} fieldName - Name of the field
   * @returns {Object} - Field definition
   */
  async getField(fieldName) {
    const response = await this.http.get(`/fields/${fieldName}`);
    return response.data;
  }
}

// Export service
export { FieldService };