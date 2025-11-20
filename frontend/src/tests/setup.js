import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock axios for API calls during tests
vi.mock('axios', () => {
  const mockResponse = (url) => {
    // Mock /api/rules/ui/config endpoint
    if (url.includes('/api/rules/ui/config') || url.includes('/api/config')) {
      return Promise.resolve({
        data: {
          conjunctions: { AND: { label: "AND" }, OR: { label: "OR" } },
          operators: {
            number: {
              equal: { label: "=" },
              not_equal: { label: "!=" },
              greater: { label: ">" },
              less: { label: "<" }
            }
          },
          expressionOperators: {
            number: {
              add: { symbol: "+", label: "Add" },
              subtract: { symbol: "-", label: "Subtract" },
              multiply: { symbol: "*", label: "Multiply" },
              divide: { symbol: "/", label: "Divide" }
            },
            text: {
              concat: { symbol: "+", label: "Concatenate" }
            }
          },
          functions: { 
            MATH: { 
              label: "Math Functions",
              subfields: {
                ADD: { label: "Add", returnType: "number" },
                MULTIPLY: { label: "Multiply", returnType: "number" }
              }
            },
            TEXT: {
              label: "Text Functions",
              subfields: {
                CONCAT: { label: "Concatenate", returnType: "text" }
              }
            }
          },
          widgets: { text: { type: "text" }, number: { type: "number" } },
          types: { text: { defaultOperator: "equal" }, number: { defaultOperator: "equal" } },
          settings: {}
        }
      });
    }
    
    // Mock /api/fields endpoint
    if (url.includes('/api/fields')) {
      return Promise.resolve({
        data: [
          { label: "TABLE1.TEXT_FIELD_01", value: "TABLE1.TEXT_FIELD_01", type: "text" },
          { label: "TABLE1.NUMBER_FIELD_01", value: "TABLE1.NUMBER_FIELD_01", type: "number" }
        ]
      });
    }
    
    // Default: return empty response
    return Promise.resolve({ data: {} });
  };
  
  const mockAxios = vi.fn((config) => mockResponse(config.url));
  mockAxios.get = vi.fn((url) => mockResponse(url));
  mockAxios.post = vi.fn(() => Promise.resolve({ data: {} }));
  mockAxios.put = vi.fn(() => Promise.resolve({ data: {} }));
  mockAxios.delete = vi.fn(() => Promise.resolve({ data: {} }));
  mockAxios.create = vi.fn(() => mockAxios);
  
  return {
    default: mockAxios
  };
});

// Mock fetch for API calls during tests (for legacy code)
global.fetch = vi.fn();

// Suppress React act() warnings for third-party components
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: An update to') &&
      args[0].includes('was not wrapped in act')
    ) {
      return; // Suppress act() warnings from Ant Design components
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Setup default mock responses
beforeEach(() => {
  fetch.mockClear();
  
  // Mock /api/ruleTypes endpoint
  fetch.mockImplementation((url) => {
    if (url === '/api/ruleTypes' || url.endsWith('/api/ruleTypes')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(['Reporting', 'Transformation', 'Aggregation', 'Validation'])
      });
    }
    
    // Mock /api/rules/ui/config endpoint  
    if (url === '/api/rules/ui/config' || url.endsWith('/api/rules/ui/config') || url === '/api/config' || url.endsWith('/api/config')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          conjunctions: { AND: { label: "AND" }, OR: { label: "OR" } },
          operators: {},
          expressionOperators: {
            number: {
              add: { symbol: "+", label: "Add" },
              subtract: { symbol: "-", label: "Subtract" },
              multiply: { symbol: "*", label: "Multiply" },
              divide: { symbol: "/", label: "Divide" }
            },
            text: {
              concat: { symbol: "+", label: "Concatenate" },
              join: { symbol: "&", label: "Join" }
            },
            date: {
              add: { symbol: "+", label: "Add Days" },
              subtract: { symbol: "-", label: "Subtract Days" }
            },
            boolean: {
              and: { symbol: "&", label: "AND" },
              or: { symbol: "|", label: "OR" }
            }
          },
          functions: { MATH: { subfields: {} } },
          widgets: { text: { type: "text" } },
          types: { text: { defaultOperator: "equal" } },
          settings: {}
        })
      });
    }
    
    // Default mock for unknown endpoints
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' })
    });
  });
});
