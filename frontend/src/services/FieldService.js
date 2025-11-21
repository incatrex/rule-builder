import { HttpHelper } from './RuleService.js';

/**
 * Field Service - Handles field-related API operations
 */
class FieldService {
  constructor(httpHelper = new HttpHelper()) {
    this.http = httpHelper;
  }

  /**
   * Get available fields with pagination and search
   * @param {Object} options - { page, size, search }
   * @returns {Object} - Paginated response with { content, page, size, totalElements, totalPages, first, last }
   */
  async getFields(options = {}) {
    const { page = 0, size = 20, search = '' } = options;
    const params = { page, size };
    if (search) params.search = search;
    
    const response = await this.http.get('/fields', params);
    return response.data;
  }

  // Note: No PUT endpoint exists for fields - they come from static fields.json
  // Fields are read-only. To modify, edit backend/src/main/resources/static/fields.json

  // Note: No GET /fields/{name} endpoint exists
  // Use getFields() and filter client-side if needed
}

// Export service
export { FieldService };