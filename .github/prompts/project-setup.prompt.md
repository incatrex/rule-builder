I want a simple project setup with the following specifications:

- configure a VS Code .devcontainer that for this project that can run both a Java backend (using Spring Boot framework) and React frontend application
- the .devcontainer postcreate script should refer the developer to a bash script they can run that will install all dependencies for both the backend and frontend and build the project.  It should NOT laucnh the install automatically on container startup.
- The project should also have bash scripts to start the backend and frontend applications separately for development with hot reload enabled.

- Simple React Application with a single page that displays an instance of https://github.com/ukrbublik/react-awesome-query-builder

- A java backend (using Spring Boot) that serves the React application and provides API endpoints for the following:

    - getFields() - returns the fields configuration for react-awesome-query-builder from a static JSON file
    - getConfig() - returns the configuration for react-awesome-query-builder from a static JSON file including cojunctions, operators, widgets, functions and settings
    - saveRule(ruleId, version, rule) - accepts a rule object from the frontend and saves it to a static file named {ruleId}.{version}.json on the server
    - getRule(ruleId, version) - returns the saved query object from the static file named {ruleId}.{version}.json on the server

- front end should use the API endpoints to load the fields and config for react-awesome-query-builder and allow the user to create and save rules using the saveRule and getRule endpoints
- use the antd design system for the React application UI components

- use Maven for the Java backend project management
- use npm for the React frontend project management
- provide instructions on how to run both the backend and frontend locally as well as tests for both parts of the project
- ensure that the project can be easily built and run within the VS Code devcontainer environment
- structure the project with clear separation between backend and frontend code
- include a README.md file with all necessary setup and run instructions 

The querybuilder config should inclue the following:

- "Add Rule" button should be configuured to say "Add Condition" instead of "Add Rule"

These types should be supported for fields, values, function return types, and function argument types:
- text
- number
- date  
- boolean

left hand side of each rule condition should be able to select from a list of fields or functions
right hand side of each rule condition should be able to input from a list of fields or functions or enter a literal value
any argument to a function should allow either a field, function, or literal value

- pre-configure the static JSON files for getFields() to include these fields:
    TABLE1.TEXT_FIELD_01: text
    TABLE1.TEXT_FIELD_02: text
    TABLE1.NUMBER_FIELD_01: number
    TABLE1.NUMBER_FIELD_02: number
    TABLE1.DATE_FIELD_01: date
    TABLE1.DATE_FIELD_02: date
    TABLE1.BOOLEAN_FIELD_01: boolean
    TABLE1.BOOLEAN_FIELD_02: boolean
    TABLE2.TEXT_FIELD_01: text
    TABLE2.TEXT_FIELD_02: text
    TABLE2.NUMBER_FIELD_01: number
    TABLE2.NUMBER_FIELD_02: number
    TABLE2.DATE_FIELD_01: date
    TABLE2.DATE_FIELD_02: date
    TABLE2.BOOLEAN_FIELD_01: boolean
    TABLE2.BOOLEAN_FIELD_02: boolean

- pre-configure these functions to be available in the querybuilder:
  - TEXT.CONCAT(text, text) -> text
  - TEXT.MID(text, number, number) -> text
  - TEXT.LEN(text) -> number
  - MATH.ROUND(number, number) -> number
  - MATH.ABS(number) -> number
  - DATE.DIFF(date, date) -> number
`
- include at least the following operators:
  - equal
  - not_equal
  - less
  - less_or_equal
  - greater
  - greater_or_equal
  - contains
  - starts_with
  - ends_with
  - is_empty
  - is_not_empty

- include at least the following widgets:
  - text
  - number
  - date
  - boolean
  - select
  - multiselect