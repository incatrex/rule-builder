# Rule Builder Application

A full-stack application for building and managing business rules with a visual interface. The application consists of a Java Spring Boot backend and a React frontend with a custom-built rule builder UI using Ant Design components.

## Features

- 🎨 **Visual Rule Builder**: Intuitive interface for creating complex business rules
- 📊 **Three Rule Structures**: Simple Conditions, Case Expressions, and Expressions
- 🔧 **Configurable Fields**: Support for text, number, date, and boolean field types
- 📐 **Rich Operators**: Comprehensive set of comparison and logical operators
- 🧮 **Built-in Functions**: Text manipulation, mathematical operations, and date functions
- 💾 **Rule Persistence**: Save and load rules with automatic versioning
- 📜 **Version History**: View and restore previous versions of rules
- 🔄 **SQL Generation**: Convert rules to Oracle SQL WHERE clauses or CASE expressions
- 🔄 **Hot Reload**: Development mode with automatic reload for both frontend and backend
- ✅ **Testing**: Comprehensive unit tests (Vitest) and E2E tests (Playwright)
- 🐳 **Dev Container**: Ready-to-use VS Code development container with all dependencies

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
│   │   │   └── RuleHistory/                       # Version history
│   │   ├── services/                              # API services
│   │   ├── tests/                                 # Vitest unit tests
│   │   ├── JsonEditor.jsx                         # JSON editor component
│   │   ├── SqlViewer.jsx                          # SQL viewer component
│   │   └── RuleSearch.jsx                         # Rule search dropdown
│   ├── e2e/                                       # Playwright E2E tests
│   ├── package.json                               # npm dependencies
│   ├── vite.config.js                             # Vite configuration
│   └── vitest.config.js                           # Vitest configuration
├── scripts/                    # Utility scripts
│   ├── install.sh                                 # Install all dependencies
│   ├── start-backend.sh                           # Start backend server
│   ├── start-frontend.sh                          # Start frontend dev server
│   ├── test.sh                                    # Run unit tests
│   ├── test-integration.sh                        # Run E2E tests
│   └── test-sql-api.sh                            # Test SQL API manually
└── .devcontainer/              # VS Code dev container config
    └── devcontainer.json
```

## Prerequisites

### Local Development
- Java 17 or higher
- Maven 3.6 or higher
- Node.js 20 or higher
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

### Configuration Endpoints
- `GET /api/config` - Get rule builder configuration
- `GET /api/fields` - Get available field definitions
- `GET /api/ruleTypes` - Get rule type definitions

### Rule Management Endpoints
- `GET /api/rules/ids` - Get list of all rule IDs (sorted alphabetically by folder, then by ID)
- `GET /api/rules/{ruleId}` - Get a specific rule by ID
- `GET /api/rules/{uuid}/latest` - Get the latest version of a rule by UUID
- `POST /api/rules` - Save a new rule or create a new version
- `DELETE /api/rules/{ruleId}` - Delete a rule by ID

### Rule History Endpoints
- `GET /api/rules/{uuid}/history` - Get version history for a rule
- `POST /api/rules/{uuid}/restore/{version}` - Restore a specific version of a rule as a new version

### SQL Generation Endpoints
- `POST /api/sql/generate` - Generate Oracle SQL from a rule structure
  - Supports three rule types:
    - **Simple Condition**: Generates WHERE clause from conditions
    - **Case Expression**: Generates CASE statement from cases
    - **Expression**: Generates expression with functions and operators

Example request body for SQL generation:
```json
{
  "type": "condition",
  "structure": {
    "condition": {
      "and": [
        {
          "field": "AGE",
          "operator": ">=",
          "value": 18
        },
        {
          "field": "STATUS",
          "operator": "=",
          "value": "ACTIVE"
        }
      ]
    }
  }
}
```

## Configuration

### Available Fields

The application comes pre-configured with the following fields:

**Table 1**:
- TEXT_FIELD_01, TEXT_FIELD_02 (text)
- NUMBER_FIELD_01, NUMBER_FIELD_02 (number)
- DATE_FIELD_01, DATE_FIELD_02 (date)
- BOOLEAN_FIELD_01, BOOLEAN_FIELD_02 (boolean)

**Table 2**:
- TEXT_FIELD_01, TEXT_FIELD_02 (text)
- NUMBER_FIELD_01, NUMBER_FIELD_02 (number)
- DATE_FIELD_01, DATE_FIELD_02 (date)
- BOOLEAN_FIELD_01, BOOLEAN_FIELD_02 (boolean)

### Available Functions

**Text Functions**:
- `TEXT.CONCAT(text, text)` → text: Concatenate two text values
- `TEXT.MID(text, number, number)` → text: Extract substring
- `TEXT.LEN(text)` → number: Get text length

**Math Functions**:
- `MATH.ROUND(number, number)` → number: Round to decimal places
- `MATH.ABS(number)` → number: Absolute value

**Date Functions**:
- `DATE.DIFF(date, date)` → number: Calculate difference between dates

### Available Operators

- Equal (`==`)
- Not Equal (`!=`)
- Less Than (`<`)
- Less or Equal (`<=`)
- Greater Than (`>`)
- Greater or Equal (`>=`)
- Contains
- Starts With
- Ends With
- Is Empty
- Is Not Empty

## Running Tests

The application has two types of tests:

### Unit Tests (Vitest)
Fast component tests that don't require backend:

```bash
./scripts/test.sh
```

This runs:
- **Backend tests**: Maven tests (Java)
- **Frontend tests**: Vitest tests in `frontend/src/tests/`

### E2E Tests (Playwright)
Complete workflow tests with backend and frontend running:

```bash
./scripts/test-integration.sh
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

### Manual API Testing

Test SQL generation API directly:

```bash
./scripts/test-sql-api.sh
```

Tests SQL generation for conditions, case expressions, and mathematical expressions.

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
mvn test
```

### Run Frontend Tests Only
```bash
cd frontend
npm test
```

## Building for Production

### Build Backend
```bash
cd backend
mvn clean package
```
The executable JAR will be created in `backend/target/`

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
- **Spring Boot 3.2.0**: Application framework
- **Spring Web**: REST API development
- **Spring DevTools**: Hot reload support
- **Jackson**: JSON processing
- **Maven**: Dependency management and build tool
- **JUnit 5**: Testing framework

### Frontend
- **React 18.2**: UI framework
- **Vite 5**: Build tool and dev server
- **Ant Design 5**: UI component library
- **Axios**: HTTP client
- **Vitest**: Unit testing framework
- **Playwright**: E2E testing framework
- **npm**: Package manager

## License

This project is provided as-is for development purposes.

## Support

For issues or questions, please refer to the documentation or create an issue in the project repository.
