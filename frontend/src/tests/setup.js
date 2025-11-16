import '@testing-library/jest-dom';

// Mock fetch for API calls during tests
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
    
    // Mock /api/config endpoint  
    if (url === '/api/config' || url.endsWith('/api/config')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          conjunctions: { AND: { label: "AND" }, OR: { label: "OR" } },
          operators: {},
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
