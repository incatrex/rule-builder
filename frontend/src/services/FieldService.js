import { HttpHelper } from './RuleService.js';

/**
 * Field Service - Handles field-related API operations
 */
class FieldService {
  constructor(httpHelper = new HttpHelper()) {
    this.http = httpHelper;
  }

  /**
   * Get available fields with search and pagination
   * Returns flattened field list where each field has:
   * - path: "entity.attribute" (full path for JSON)
   * - label: Display name for the attribute
   * - type: Field data type
   * - entity: Entity name
   * - entityLabel: Display name for entity
   * - attribute: Attribute name
   * 
   * @param {Object} options - { page, size, search }
   * @returns {Object} - Paginated response with { content, page, size, totalElements, totalPages, first, last }
   */
  async getFields(options = {}) {
    const { page = 0, size = 50, search = '' } = options;
    const params = { page, size };
    if (search) params.search = search;
    
    const response = await this.http.get('/fields', params);
    return response.data;
  }

  /**
   * Get complete hierarchical field structure (no pagination)
   * Use this for initial load or when you need the full structure
   * 
   * @returns {Object} - Hierarchical fields object
   */
  async getFieldsHierarchy() {
    const response = await this.http.get('/fields/hierarchy');
    return response.data;
  }

  // Note: No PUT endpoint exists for fields - they come from static fields.json
  // Fields are read-only. To modify, edit backend/src/main/resources/static/fields.json
}

// Export service
export { FieldService };