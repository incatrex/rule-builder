# Rule Builder Application

A full-stack rule builder application with a Java Spring Boot backend and React frontend, featuring [react-awesome-query-builder](https://github.com/ukrbublik/react-awesome-query-builder) for creating complex query rules with a visual interface.

## Features

- **Visual Rule Builder**: Intuitive UI for creating complex rules using react-awesome-query-builder
- **Ant Design UI**: Modern, responsive interface using Ant Design components
- **REST API**: Java Spring Boot backend with endpoints for managing rules and configurations
- **Persistent Storage**: Save and load rules to/from JSON files
- **Multiple Field Types**: Support for text, number, date, and boolean fields
- **Rich Operators**: Includes equal, not_equal, less, greater, contains, starts_with, ends_with, is_empty, and more
- **Dev Container**: VS Code development container with pre-configured Java and Node.js environments

## Project Structure

```
rule-builder/
├── .devcontainer/           # VS Code dev container configuration
│   └── devcontainer.json
├── backend/                 # Java Spring Boot backend
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/rulebuilder/
│   │   │   │   ├── RuleBuilderApplication.java
│   │   │   │   └── controller/
│   │   │   │       └── RuleBuilderController.java
│   │   │   └── resources/
│   │   │       ├── application.properties
│   │   │       └── static/
│   │   │           ├── fields.json
│   │   │           └── config.json
│   │   └── test/
│   │       └── java/com/rulebuilder/controller/
│   │           └── RuleBuilderControllerTest.java
│   └── pom.xml
├── frontend/                # React frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.test.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Prerequisites

### Option 1: Using VS Code Dev Container (Recommended)
- Docker Desktop
- Visual Studio Code with Remote - Containers extension

### Option 2: Local Development
- Java 21 or higher
- Maven 3.8+
- Node.js 20.x or higher
- npm 9.x or higher

## Getting Started

### Using VS Code Dev Container

1. **Open in Container**:
   ```bash
   # Open the project in VS Code
   code .
   
   # When prompted, click "Reopen in Container"
   # Or use Command Palette: "Remote-Containers: Reopen in Container"
   ```

2. **Wait for Setup**: The container will automatically:
   - Install Java 21 and Maven
   - Install Node.js 20
   - Run `mvn clean install` in the backend
   - Run `npm install` in the frontend

3. **Run the Application** (see Running the Application section below)

### Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd rule-builder
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   mvn clean install
   ```

3. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   ```

## Running the Application

### Start Backend (Terminal 1)

```bash
cd backend
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`

### Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:3000`

### Access the Application

Open your browser and navigate to: `http://localhost:3000`

## API Endpoints

### GET `/api/fields`
Returns the field configuration for react-awesome-query-builder.

**Response**: JSON object with field definitions for TABLE1 and TABLE2.

### GET `/api/config`
Returns the configuration including conjunctions, operators, widgets, and settings.

**Response**: JSON object with query builder configuration.

### POST `/api/rules/{ruleId}/{version}`
Saves a rule to the server.

**Parameters**:
- `ruleId`: Unique identifier for the rule
- `version`: Version number

**Request Body**: JSON rule object from query builder

**Response**: 
```json
{
  "success": true,
  "message": "Rule saved successfully",
  "ruleId": "rule1",
  "version": "1"
}
```

### GET `/api/rules/{ruleId}/{version}`
Retrieves a saved rule from the server.

**Parameters**:
- `ruleId`: Unique identifier for the rule
- `version`: Version number

**Response**: JSON rule object

## Running Tests

### Backend Tests

```bash
cd backend
mvn test
```

### Frontend Tests

```bash
cd frontend
npm test
```

## Field Configuration

The application comes pre-configured with the following fields:

### TABLE1
- `TEXT_FIELD_01`, `TEXT_FIELD_02` (text)
- `NUMBER_FIELD_01`, `NUMBER_FIELD_02` (number)
- `DATE_FIELD_01`, `DATE_FIELD_02` (date)
- `BOOLEAN_FIELD_01`, `BOOLEAN_FIELD_02` (boolean)

### TABLE2
- `TEXT_FIELD_01`, `TEXT_FIELD_02` (text)
- `NUMBER_FIELD_01`, `NUMBER_FIELD_02` (number)
- `DATE_FIELD_01`, `DATE_FIELD_02` (date)
- `BOOLEAN_FIELD_01`, `BOOLEAN_FIELD_02` (boolean)

## Supported Operators

- `equal` (==)
- `not_equal` (!=)
- `less` (<)
- `less_or_equal` (<=)
- `greater` (>)
- `greater_or_equal` (>=)
- `like` (Contains)
- `not_like` (Not contains)
- `starts_with`
- `ends_with`
- `is_empty`
- `is_not_empty`

## Supported Widgets

- `text`: Text input
- `number`: Number input
- `date`: Date picker
- `boolean`: Boolean switch
- `select`: Single select dropdown
- `multiselect`: Multi-select dropdown

## Building for Production

### Backend

```bash
cd backend
mvn clean package
java -jar target/rule-builder-backend-1.0.0.jar
```

### Frontend

```bash
cd frontend
npm run build
```

The build output will be in the `frontend/dist` directory.

## Customization

### Adding New Fields

Edit `backend/src/main/resources/static/fields.json` to add new fields with their types and configurations.

### Modifying Operators

Edit `backend/src/main/resources/static/config.json` to add or modify operators, widgets, and other query builder settings.

### Styling

- Global styles: `frontend/src/index.css`
- Component styles: Inline in `frontend/src/App.jsx` or create separate CSS files

## Troubleshooting

### Port Already in Use

If ports 8080 or 3000 are already in use:

**Backend**: Edit `backend/src/main/resources/application.properties`
```properties
server.port=8081
```

**Frontend**: Edit `frontend/vite.config.js`
```javascript
server: {
  port: 3001
}
```

### CORS Issues

The backend is configured to accept requests from any origin. For production, update the `@CrossOrigin` annotation in `RuleBuilderController.java`:

```java
@CrossOrigin(origins = "https://your-production-domain.com")
```

### Module Not Found Errors

Run `npm install` again in the frontend directory:
```bash
cd frontend
npm install
```

## Technology Stack

### Backend
- Java 21
- Spring Boot 3.2.0
- Maven
- Jackson (JSON processing)

### Frontend
- React 18
- Vite
- Ant Design 5
- react-awesome-query-builder 6.6.1
- Axios

### Development
- VS Code Dev Containers
- Docker

## License

This project is provided as-is for educational and development purposes.

## Support

For issues related to react-awesome-query-builder, see: https://github.com/ukrbublik/react-awesome-query-builder