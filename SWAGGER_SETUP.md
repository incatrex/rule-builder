# Swagger/OpenAPI Interface Setup

This document provides instructions for accessing and using the Swagger UI interface for the Rule Builder API.

## Overview

The Rule Builder backend now includes a comprehensive Swagger/OpenAPI interface that provides:
- Interactive API documentation
- Request/response examples
- "Try it out" functionality to test endpoints directly from the browser
- Schema definitions for all data models

## Technology Stack

- **SpringDoc OpenAPI**: Version 2.3.0
- **OpenAPI Specification**: 3.0
- **Spring Boot**: 3.2.0

## Accessing Swagger UI

### 1. Start the Backend Server

First, ensure the backend server is running:

```bash
cd /workspaces/rule-builder
./scripts/start-backend.sh
```

Or manually:

```bash
cd backend
mvn spring-boot:run
```

The server will start on port **8080** by default.

### 2. Open Swagger UI in Browser

Once the server is running, access the Swagger UI at:

**http://localhost:8080/swagger-ui.html**

Alternative URL (redirects to the same page):

**http://localhost:8080/swagger-ui/index.html**

### 3. Access Raw OpenAPI Specification

To view or download the raw OpenAPI specification in JSON format:

**http://localhost:8080/api-docs**

## Using Swagger UI

### Exploring Endpoints

1. **View All Endpoints**: The main page displays all API endpoints grouped by tags
2. **Expand Endpoint**: Click on any endpoint to view its details
3. **View Parameters**: See required/optional parameters, their types, and descriptions
4. **View Response Schemas**: Examine the structure of successful and error responses

### Testing Endpoints

#### GET Requests

1. Click on a GET endpoint (e.g., `/api/fields`)
2. Click the **"Try it out"** button
3. Fill in any required parameters
4. Click **"Execute"**
5. View the response below, including:
   - HTTP status code
   - Response headers
   - Response body

#### POST/PUT Requests

1. Click on a POST or PUT endpoint (e.g., `/api/rules/validate`)
2. Click the **"Try it out"** button
3. Edit the request body JSON in the text area
4. Click **"Execute"**
5. View the response

### Example: Testing the Validate Rule Endpoint

1. Navigate to **POST /api/rules/validate**
2. Click **"Try it out"**
3. Paste a rule JSON into the request body:

```json
{
  "ruleId": "test-rule",
  "ruleType": "condition",
  "returnType": "boolean",
  "metadata": {
    "name": "Test Rule",
    "description": "A test rule"
  },
  "structure": {
    "type": "condition",
    "field": "age",
    "operator": "greaterThan",
    "value": 18
  }
}
```

4. Click **"Execute"**
5. View validation results in the response

## API Endpoints Reference

### Configuration & Metadata

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fields` | Get available fields for rule building |
| GET | `/api/config` | Get UI configuration from schema |

### Rule Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rules` | Create new rule (auto-generates UUID) |
| PUT | `/api/rules/{uuid}` | Update existing rule (creates new version) |
| GET | `/api/rules/{uuid}/versions/{version}` | Get specific version (use 'latest' or version #) |
| POST | `/api/rules/{ruleId}/{version}` | Save rule with specific ID/version |
| GET | `/api/rules/ids` | Get all rule IDs with metadata |

### Versioning & History

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rules/{uuid}/versions` | Get all versions with metadata |
| GET | `/api/rules/{uuid}/versions/{version}` | Get specific version (or 'latest') |
| POST | `/api/rules/{uuid}/restore/{version}` | Restore a previous version |

### Validation & SQL Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rules/validate` | Validate rule against JSON schema |
| POST | `/api/rules/to-sql` | Convert rule to Oracle SQL |

## Configuration

### Swagger UI Settings

The following settings are configured in `application.properties`:

```properties
# OpenAPI JSON endpoint
springdoc.api-docs.path=/api-docs

# Swagger UI HTML page
springdoc.swagger-ui.path=/swagger-ui.html

# Sort operations by HTTP method
springdoc.swagger-ui.operationsSorter=method

# Sort tags alphabetically
springdoc.swagger-ui.tagsSorter=alpha

# Enable "Try it out" by default
springdoc.swagger-ui.tryItOutEnabled=true
```

### Customization

To customize the OpenAPI documentation, edit:

**`backend/src/main/java/com/rulebuilder/config/OpenApiConfig.java`**

You can modify:
- API title and description
- Version information
- Contact details
- License information
- Server URLs

## Authentication

Currently, the API does not require authentication. If authentication is added in the future:

1. Click the **"Authorize"** button at the top of Swagger UI
2. Enter your API key or credentials
3. All subsequent requests will include the authentication token

## Troubleshooting

### Swagger UI Not Loading

1. **Check server is running**: Visit http://localhost:8080
2. **Check port**: Ensure port 8080 is not in use by another application
3. **Clear browser cache**: Try opening in an incognito/private window
4. **Check logs**: Look for errors in the backend console

### 404 Error on Swagger UI

If you get a 404 error:

1. Verify the URL is exactly: `http://localhost:8080/swagger-ui.html`
2. Check that SpringDoc dependency is in `pom.xml`
3. Restart the server after adding dependencies

### CORS Issues

If testing from a different origin:

1. The backend is configured to allow CORS from `http://localhost:3000`
2. To add more origins, edit `application.properties`:

```properties
spring.web.cors.allowed-origins=http://localhost:3000,http://localhost:5173
```

## Advanced Features

### Exporting OpenAPI Spec

To export the OpenAPI specification:

1. Visit: http://localhost:8080/api-docs
2. Copy the JSON
3. Save to a file (e.g., `openapi.json`)

### Importing to Postman

1. Open Postman
2. Go to File > Import
3. Select "Link" tab
4. Enter: `http://localhost:8080/api-docs`
5. Click "Import"

All endpoints will be imported as a Postman collection.

### Generating Client SDKs

You can use the OpenAPI spec to generate client libraries:

1. Install OpenAPI Generator: `npm install @openapitools/openapi-generator-cli -g`
2. Generate a client:

```bash
openapi-generator-cli generate \
  -i http://localhost:8080/api-docs \
  -g javascript \
  -o ./generated-client
```

Supported languages: JavaScript, TypeScript, Python, Java, Go, and many more.

## Integration with Frontend

The frontend application at http://localhost:3000 uses these APIs. You can:

1. Test endpoints in Swagger UI
2. Copy the JSON examples
3. Use them in your frontend code or tests

## Additional Resources

- [SpringDoc Documentation](https://springdoc.org/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)

## Support

For issues or questions about the Swagger interface:

1. Check server logs in the terminal
2. Review this documentation
3. Verify dependencies in `pom.xml`
4. Contact the development team

---

**Last Updated**: November 20, 2025
**Version**: 1.0.0
