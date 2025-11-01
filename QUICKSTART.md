# Quick Start Guide

## Fastest Way to Get Started (Dev Container)

1. Open this project in VS Code
2. Click "Reopen in Container" when prompted (or use Command Palette: Remote-Containers: Reopen in Container)
3. Wait for the container to build and dependencies to install
4. Open two terminals in VS Code:

**Terminal 1 - Backend:**
```bash
cd backend
mvn spring-boot:run
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

5. Open http://localhost:3000 in your browser

## Using the Rule Builder

1. **Create a Rule**: 
   - Click "+ Add Group" or "+ Add Rule" to start building
   - Select fields from TABLE1 or TABLE2
   - Choose operators (==, !=, <, >, contains, etc.)
   - Enter values
   - Combine rules with AND/OR conjunctions

2. **Save a Rule**:
   - Enter a Rule ID (e.g., "myRule")
   - Enter a Version (e.g., "1")
   - Click "Save Rule"

3. **Load a Rule**:
   - Enter the Rule ID and Version
   - Click "Load Rule"

4. **View JSON**:
   - Scroll down to see the JSON representation of your rule
   - This is the format saved to the backend

## Example Rule

Here's what a simple rule looks like:
- If TABLE1.TEXT_FIELD_01 contains "test"
- AND TABLE1.NUMBER_FIELD_01 > 100
- Then the rule evaluates to true

The JSON output shows the complete rule structure that can be used for validation, querying, or other business logic.

## Troubleshooting

**Backend won't start?**
- Check if port 8080 is available
- Run `mvn clean install` first

**Frontend won't start?**
- Check if port 3000 is available  
- Run `npm install` first
- Make sure backend is running (frontend proxies API calls to backend)

**Cannot save/load rules?**
- Ensure backend is running on port 8080
- Check browser console for errors
- Verify the `rules/` directory is created (backend creates it automatically)
