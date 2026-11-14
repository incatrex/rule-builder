# Rule Builder Application

A full-stack application for building and managing business rules with a visual interface. The application consists of a Java Spring Boot backend and a React frontend with a custom-built rule builder UI using Ant Design components.

## Features

- 🎨 **Visual Rule Builder**: Intuitive interface for creating complex business rules
- 📊 **Three Rule Structures**: Simple Conditions, Case Expressions, and Expressions
- 🔗 **Rule References**: Compose rules by referencing other rules as conditions or expressions
- 🔧 **Configurable Fields**: Support for text, number, date, and boolean field types
- 📐 **Rich Operators**: Comprehensive set of comparison and logical operators including dynamic cardinality (IN, NOT IN)
- 🧮 **Built-in Functions**: Text manipulation, mathematical operations, and date functions
- 💾 **Rule Persistence**: Save and load rules with automatic UUID-based versioning
- 📜 **Version History**: View and restore previous versions of rules
- 🔄 **SQL Generation**: Convert rules to Oracle SQL WHERE clauses or CASE expressions
- ✨ **Smart UI**: Auto-generated naming, drag-and-drop reordering, and collapsible sections
- 🔄 **Hot Reload**: Development mode with automatic reload for both frontend and backend
- ✅ **Testing**: Comprehensive unit tests (Vitest) and E2E tests (Playwright)
- 🐳 **Dev Container**: Ready-to-use VS Code development container with all dependencies

## Documentation

The current JSON schema is located at `backend/src/main/resources/static/schemas/rule-schema-current.json`.

- **[Rule Schema Reference](backend/src/main/resources/static/schemas/RULE_SCHEMA_REFERENCE.md)**: Complete JSON schema documentation with examples
- **[Schema Visualization](backend/src/main/resources/static/schemas/RULE_SCHEMA_VISUALIZATION.md)**: Visual hierarchy of schema components and composition rules
- **[Frontend Component Hierarchy](docs/COMPONENT_HIERARCHY_FRONTEND.md)**: React component architecture and data flow patterns

## Project Structure

```
rule-builder/
├── backend/                    # Java Spring Boot application
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/rulebuilder/
│   │   │   │   ├── RuleBuilderApplication.java    # Main application
│   │   │   │   ├── controller/                    # REST controllers
│   │   │   │   ├── service/                       # Business logic
│   │   │   │   └── util/                          # SQL generation
│   │   │   └── resources/
│   │   │       ├── application.properties         # Configuration
│   │   │       └── static/
│   │   │           ├── fields.json                # Field definitions
│   │   │           ├── config.json                # Rule builder config
│   │   │           ├── ruleTypes.json             # Rule type definitions
│   │   │           ├── schemas/                   # JSON schemas
│   │   │           └── rules/                     # Saved rules
│   │   └── test/                                  # Backend tests
│   └── pom.xml                                    # Maven dependencies
├── frontend/                   # React application
│   ├── src/
│   │   ├── App.jsx                                # Main application
│   │   ├── components/
│   │   │   ├── RuleBuilder/                       # Rule builder components
│   │   │   │   ├── RuleBuilder.jsx                # Container component
│   │   │   │   ├── RuleBuilderUI.jsx              # Presentation component
│   │   │   │   ├── Case.jsx                       # WHEN/THEN clauses
│   │   │   │   ├── Condition.jsx                  # Smart router for conditions
│   │   │   │   ├── ConditionGroup.jsx             # Logical condition groups
│   │   │   │   ├── Expression.jsx                 # Smart router for expressions
│   │   │   │   ├── ExpressionGroup.jsx            # Mathematical operations
│   │   │   │   ├── RuleReference.jsx              # Rule composition
│   │   │   │   └── contexts/NamingContext.jsx     # Auto-naming utilities
│   │   │   ├── RuleHistory/                       # Version history
│   │   │   ├── JsonEditor/                        # JSON editor component
│   │   │   ├── SqlViewer/                         # SQL viewer component
│   │   │   ├── RuleSearch/                        # Rule search dropdown
│   │   │   └── RuleCanvas/                        # Visual rule display
│   ├── services/                              # API services
│   └── tests/                                 # Test utilities
│   ├── e2e/                                       # Playwright E2E tests
│   ├── tests/                                     # Vitest test files
│       ├── integration/                       # Integration tests
│       ├── unit/                              # Unit tests
│       ├── fixtures/                          # Test data
│       └── helpers/                           # Test utilities
│   ├── manual-tests/                              # HTML test files
│   ├── package.json                               # npm dependencies
│   ├── vite.config.js                             # Vite configuration
│   ├── vitest.config.js                           # Vitest configuration
│   └── playwright.config.js                       # Playwright configuration
├── scripts/                    # Utility scripts
│   ├── install.sh                                 # Install all dependencies
│   ├── start-backend.sh                           # Start backend server
│   ├── start-frontend.sh                          # Start frontend dev server
│   ├── test.sh                                    # Run unit tests
│   ├── test-e2e.sh                                # Run E2E tests (menu, or `all` / a spec name)
│   ├── test-clean.sh                              # Delete TEST_* rule files left by tests
│   └── verify.sh                                  # Check build/run/test scripts + npm audit, non-interactively
├── docs/                       # Documentation
│   ├── COMPONENT_HIERARCHY_SCHEMA.md              # Schema visualization
│   ├── COMPONENT_HIERARCHY_FRONTEND.md            # Frontend architecture
│   └── [other documentation files]
└── .devcontainer/              # VS Code dev container config
    └── devcontainer.json
```

## Prerequisites

### Local Development
- Java 17 or higher
- Maven 3.6 or higher
- Node.js 20.19 or higher (required by Vite 8)
- npm 9 or higher

### VS Code Dev Container
- Docker
- VS Code with Remote - Containers extension

## Getting Started

### Option 1: Using VS Code Dev Container (Recommended)

1. **Open in Dev Container**:
   - Open the project in VS Code
   - Click on the green button in the bottom-left corner
   - Select "Reopen in Container"
   - Wait for the container to build and start

2. **Install Dependencies**:
   ```bash
   ./scripts/install.sh
   ```

3. **Start the Backend** (in one terminal):
   ```bash
   ./scripts/start-backend.sh
   ```
   Backend will be available at http://localhost:8080

4. **Start the Frontend** (in another terminal):
   ```bash
   ./scripts/start-frontend.sh
   ```
   Frontend will be available at http://localhost:3003

### Option 2: Local Development

1. **Clone and Navigate to Project**:
   ```bash
   cd rule-builder
   ```

2. **Install and Build Backend**:
   ```bash
   cd backend
   mvn clean install
   ```

3. **Install Frontend Dependencies**:
   ```bash
   cd ../frontend
   npm install
   ```

4. **Start Backend** (in one terminal):
   ```bash
   cd backend
   mvn spring-boot:run
   ```
   Backend will be available at http://localhost:8080

5. **Start Frontend** (in another terminal):
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend will be available at http://localhost:3003

## API Endpoints

The backend provides the following REST endpoints:

### Rule Management Endpoints
- `GET /api/v1/rules` - Get list of all rules with filtering and pagination support
  - Query parameters: `ruleType`, `search`, `page`, `size`
- `POST /api/v1/rules` - Create a new rule (server-generated UUID at version 1)
- `PUT /api/v1/rules/{uuid}` - Update an existing rule (creates new version)
- `GET /api/v1/rules/{uuid}/versions` - Get list of available versions for a rule
- `GET /api/v1/rules/{uuid}/versions/{version}` - Get a specific version of a rule
- `POST /api/v1/rules/{uuid}/versions/{version}/restore` - Restore a specific version as new version

### Configuration Endpoints
- `GET /api/v1/fields` - Get field definitions
- `GET /api/v1/rules/ui/config` - Get UI configuration from schema

### Validation and SQL Generation Endpoints
- `POST /api/v1/rules/validate` - Validate a rule against the schema
- `POST /api/v1/rules/to-sql` - Generate Oracle SQL from a rule structure
  - Supports three rule structures:
    - **Condition**: Generates WHERE clause from conditions and condition groups
    - **Case**: Generates CASE statement from WHEN/THEN clauses
    - **Expression**: Generates expression with functions and operators

For detailed information about rule structures, operators, functions, and configuration, see:
- **[Rule Schema Reference](backend/src/main/resources/static/schemas/RULE_SCHEMA_REFERENCE.md)** - Complete schema documentation with examples
- **[Schema Visualization](backend/src/main/resources/static/schemas/RULE_SCHEMA_VISUALIZATION.md)** - Visual representation of the schema hierarchy

## Configuration

The application configuration is driven by the JSON Schema located at `backend/src/main/resources/static/schemas/rule-schema-current.json`. The schema defines:
- **Field definitions** - Available fields organized hierarchically by table with type constraints
- **Operators** - Supported operators with cardinality rules, labels, and separators
- **Functions** - Built-in functions with argument specifications and return types
- **Rule types** - Business rule type enumeration and validation rules
- **Structure rules** - Composition patterns for conditions, cases, and expressions

Additional configuration files in `backend/src/main/resources/static/`:
- **fields.json** - Field definitions loaded at runtime (structure validated by schema)

For complete configuration documentation including all available fields, operators, functions, and customization options, please refer to the [Rule Schema Reference](backend/src/main/resources/static/schemas/RULE_SCHEMA_REFERENCE.md).

## Running Tests

The application has two types of tests:

### Unit Tests (Vitest)
Fast component tests that don't require backend:

```bash
./scripts/test.sh
```

This runs:
- **Backend tests**: Maven tests (Java)
- **Frontend tests**: Vitest tests in `frontend/src/tests/` (`npm run test:run`, single run; `npm test` starts Vitest in watch mode)

### E2E Tests (Playwright)
Complete workflow tests with backend and frontend running:

```bash
./scripts/test-e2e.sh all
```

This automatically:
1. Starts backend server (if not running)
2. Starts frontend dev server (if not running)
3. Runs Playwright tests in `frontend/e2e/`
4. Cleans up any servers it started

**E2E Test Coverage**:
- Rule versioning workflow (create, modify, view history, restore)
- Complete user journey from empty canvas to saved rule
- Version history UI and restore functionality

### Testing Best Practices

The application uses `data-testid` attributes for reliable test selectors:

```jsx
// Component implementation
<Input data-testid="rule-id-input" />
<Button data-testid="rule-save-button">Save</Button>

// E2E test usage
await page.getByTestId('rule-id-input').fill('MY_RULE');
await page.getByTestId('rule-save-button').click();
```

This pattern ensures tests remain stable even when UI styling or structure changes.

### Run Backend Tests Only
```bash
cd backend
### E2E Tests (Playwright)
Complete workflow tests with backend and frontend running:

**Run E2E tests**:
```bash
./scripts/test-e2e.sh            # interactive menu
./scripts/test-e2e.sh all        # run every spec, no prompts
./scripts/test-e2e.sh <spec>.js  # run one spec (file name or menu number), no prompts
```

The script automatically:
1. Starts backend server (if not running)
2. Starts frontend dev server (if not running)
3. Installs Playwright Chromium and its system libraries if missing
4. Runs Playwright tests in `frontend/e2e/`
5. Cleans up any servers it started

### Verify everything
```bash
./scripts/verify.sh [--skip-e2e] [--skip-audit]
```
Runs `install.sh`, checks the jar contains the freshly built frontend, runs `test.sh`, starts each server and checks it responds, runs `test-e2e.sh all` and `npm audit`, then prints a pass/fail summary. Logs go to `.verify-logs/`.

**E2E Test Coverage**:
- Rule versioning workflow (create, modify, view history, restore)
- Complete user journey from empty canvas to saved rule
- Version history UI and restore functionality
- Condition naming scenarios (data-driven tests from CSV)

### Build Frontend
```bash
cd frontend
npm run build
```
The production build will be created in `frontend/dist/`

## Development Features

### Hot Reload

Both the backend and frontend support hot reload during development:

- **Backend**: Spring Boot DevTools automatically restarts the application when Java files change
- **Frontend**: Vite provides instant hot module replacement (HMR) for React components

### CORS Configuration

The backend is pre-configured to allow cross-origin requests from the frontend development server (http://localhost:3003).

## Customization

### Adding New Fields

Edit `backend/src/main/resources/static/fields.json` to add or modify field definitions.

### Adding New Functions

Edit `backend/src/main/resources/static/config.json` and add function definitions in the `funcs` section.

### Modifying Operators

Edit `backend/src/main/resources/static/config.json` and modify the `operators` section.

## Troubleshooting

### Backend won't start
- Ensure Java 17 is installed: `java -version`
- Check if port 8080 is available
- Verify Maven dependencies are installed: `mvn clean install`

### Frontend won't start
- Ensure Node.js 20 is installed: `node --version`
- Check if port 3003 is available
- Verify npm dependencies are installed: `npm install`

### Rule save/load not working
- Check that the backend is running and accessible at http://localhost:8080
- Verify the `backend/src/main/resources/static/rules/` directory exists and has write permissions
- Check browser console for error messages

## Technologies Used

### Backend
- **Spring Boot 3.5**: Application framework
- **Java 17**: Programming language
- **Maven**: Build tool and dependency management
- **Jackson**: JSON processing
- **NetworkNT JSON Schema Validator**: Schema validation
- **SpringDoc OpenAPI**: API documentation (Swagger UI)
- **JUnit 5**: Unit testing framework

### Frontend
- **React 18.3**: UI framework
- **Vite 8**: Build tool and dev server with HMR
- **Ant Design 5**: UI component library
- **@dnd-kit**: Drag and drop functionality
- **React Flow**: Visual rule canvas
- **Axios**: HTTP client
- **Vitest**: Unit testing framework
- **Playwright**: E2E testing framework
- **npm**: Package manager

For detailed frontend architecture, see:
- **[Frontend Component Hierarchy](docs/COMPONENT_HIERARCHY_FRONTEND.md)**

## Customization

The application is highly customizable through its JSON Schema. All configuration is defined in and validated by the schema at `backend/src/main/resources/static/schemas/rule-schema-current.json`.

### Adding New Fields
Edit `backend/src/main/resources/static/fields.json` to add or modify field definitions. Fields must conform to the schema's field definition structure (hierarchical organization by table, with id, label, dataType, and optional tableName).

### Modifying Functions and Operators
Functions and operators are defined in the JSON Schema's `x-ui` extension properties. To add or modify:
1. Edit the schema file to add new function or operator definitions
2. Ensure proper typing and cardinality rules are specified
3. The UI will automatically reflect changes on reload

### Schema-Driven Validation
The application uses JSON Schema Draft 7 for all validation. Changes to the schema automatically enforce validation rules across:
- Rule structure and composition
- Field references and types
- Operator usage and cardinality
- Function signatures and return types
- Rule reference patterns

For detailed information about customization options and schema structure, see:
- **[Rule Schema Reference](backend/src/main/resources/static/schemas/RULE_SCHEMA_REFERENCE.md)** - Complete schema documentation
- **[Schema Visualization](backend/src/main/resources/static/schemas/RULE_SCHEMA_VISUALIZATION.md)** - Visual hierarchy and composition rules

For issues or questions, please refer to the documentation or create an issue in the project repository.
