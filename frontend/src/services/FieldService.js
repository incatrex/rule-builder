import { HttpHelper } from './RuleService.js';

/**
 * Field Service - Handles field-related API operations
 */
class FieldService {
  constructor(httpHelper = new HttpHelper()) {
    this.http = httpHelper;
  }

  /**
   * Get available fields with hierarchical structure and entity-level pagination
   * Returns hierarchical field structure where pagination applies to entities
   * 
   * @param {Object} options - { page, size, search }
   * @returns {Object} - Paginated response with { content (hierarchical), page, size, totalElements, totalPages, first, last }
   */
  async getFields(options = {}) {
    const { page = 0, size = 5, search = '' } = options;
    const params = { page, size };
    if (search) params.search = search;
    
    const response = await this.http.get('/fields', params);
    return response.data;
  }

  /**
   * Get complete hierarchical field structure (no pagination)
   * Use this for initial load or when you need the full structure
   * 
   * @param {Object} options - { page, size, search }
   * @returns {Object} - Hierarchical fields object
   */
  async getFieldsHierarchy(options = {}) {
    const { page = 0, size = 100, search = '' } = options;
    const params = { page, size };
    if (search) params.search = search;
    
    const response = await this.http.get('/fields', params);
    // Return the content (hierarchical structure) from paginated response
    return response.data.content || response.data;
  }

  // Note: Fields are read-only and come from static fields.json
  // To modify, edit backend/src/main/resources/static/fields.json
  // Pagination is at entity level (default 5 entities per page)
}

// Export service
export { FieldService };