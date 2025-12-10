/**
 * Configuration mapping for dynamic argument options.
 * Maps optionsRef names to backend service endpoints.
 * 
 * This configuration is separate from the schema to keep concerns separated:
 * - Schema defines what options are needed (optionsRef)
 * - This config defines where to get them (service endpoints)
 * 
 * Two configuration patterns are supported:
 * 
 * 1. Simple string endpoint (for small lists < 500 items):
 *    Results are cached after first load
 *    Example: 'daysOfMonth': '/api/v1/rules/ui/config/argument-options/days-of-month'
 * 
 * 2. Object config with pagination (for large lists 500+ items):
 *    Results are not cached, search is required
 *    Example: { endpoint: '...', paginated: true, searchParam: 'q' }
 */

export const ARGUMENT_OPTIONS_SERVICES = {
  // Small static lists - load all and cache
  'daysOfMonth': '/api/v1/rules/ui/config/argument-options/days-of-month',
  'currencies': '/api/v1/rules/ui/config/argument-options/currencies',
  'paymentTerms': '/api/v1/rules/ui/config/argument-options/payment-terms',
  
  // Large dynamic lists - paginated with search
  // Uncomment and configure as needed:
  // 'customers': {
  //   endpoint: '/api/v1/rules/ui/config/argument-options/customers',
  //   paginated: true,
  //   searchParam: 'q'
  // },
  // 'suppliers': {
  //   endpoint: '/api/v1/rules/ui/config/argument-options/suppliers',
  //   paginated: true,
  //   searchParam: 'search'
  // }
};

export default ARGUMENT_OPTIONS_SERVICES;
