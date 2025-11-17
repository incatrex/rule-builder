# Rule Builder Application

A full-stack application for building and managing business rules with a visual query builder interface. The application consists of a Java Spring Boot backend and a React frontend using the react-awesome-query-builder library with Ant Design components.

## Features

- 🎨 **Visual Rule Builder**: Intuitive drag-and-drop interface for creating complex business rules
- 🔧 **Configurable Fields**: Support for text, number, date, and boolean field types
- 📐 **Rich Operators**: Comprehensive set of comparison and logical operators
- 🧮 **Built-in Functions**: Text manipulation, mathematical operations, and date functions
- 💾 **Rule Persistence**: Save and load rules with versioning
- 🔄 **Hot Reload**: Development mode with automatic reload for both frontend and backend
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
│   │   │   │   └── service/                       # Business logic
│   │   │   └── resources/
│   │   │       ├── application.properties         # Configuration
│   │   │       └── static/
│   │   │           ├── fields.json                # Field definitions
│   │   │           ├── config.json                # Query builder config
│   │   │           └── rules/                     # Saved rules
│   │   └── test/                                  # Backend tests
│   └── pom.xml                                    # Maven dependencies
├── frontend/                   # React application
│   ├── src/
│   │   ├── App.jsx                                # Main React component
│   │   ├── main.jsx                               # Application entry point
│   │   └── index.css                              # Global styles
│   ├── index.html                                 # HTML template
│   ├── package.json                               # npm dependencies
│   └── vite.config.js                             # Vite configuration
├── scripts/                    # Utility scripts
│   ├── install.sh                                 # Install all dependencies
│   ├── start-backend.sh                           # Start backend server
│   ├── start-frontend.sh                          # Start frontend dev server
│   └── test.sh                                    # Run all tests
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
   Frontend will be available at http://localhost:3000

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
   Frontend will be available at http://localhost:3000

## API Endpoints

The backend provides the following REST API endpoints:

### GET `/api/fields`
Returns the field configuration for the query builder.

**Response**: JSON object containing field definitions

### GET `/api/config`
Returns the complete configuration for react-awesome-query-builder including conjunctions, operators, widgets, functions, and settings.

**Response**: JSON object containing query builder configuration

### POST `/api/rules/{ruleId}/{version}`
Saves a rule with the specified ID and version.

**Parameters**:
- `ruleId`: Unique identifier for the rule
- `version`: Version number of the rule

**Request Body**: JSON representation of the rule tree

**Response**: Success message

### GET `/api/rules/{ruleId}/{version}`
Retrieves a previously saved rule.

**Parameters**:
- `ruleId`: Unique identifier for the rule
- `version`: Version number of the rule

**Response**: JSON representation of the rule tree

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

### Run All Tests
```bash
./scripts/test.sh
```

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

The backend is pre-configured to allow cross-origin requests from the frontend development server (http://localhost:3000).

## Customization

### Adding New Fields

Edit `backend/src/main/resources/static/fields.json` to add or modify field definitions.

### Adding New Functions

Edit `backend/src/main/resources/static/config.json` and add function definitions in the `functions` section.

### Modifying Operators

Edit `backend/src/main/resources/static/config.json` and modify the `operators` section.

## Troubleshooting

### Backend won't start
- Ensure Java 17 is installed: `java -version`
- Check if port 8080 is available
- Verify Maven dependencies are installed: `mvn clean install`

### Frontend won't start
- Ensure Node.js 20 is installed: `node --version`
- Check if port 3000 is available
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
- **react-awesome-query-builder 6.4**: Query builder component
- **Axios**: HTTP client
- **npm**: Package manager

## License

This project is provided as-is for development purposes.

## Support

For issues or questions, please refer to the documentation or create an issue in the project repository.
