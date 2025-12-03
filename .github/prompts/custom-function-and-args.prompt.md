I Need a way to implement a generic configuration in the schema that UI can use to implement custom options for agurments and custom UI components for select functions.   

1.  Custom options for a function argument that can be pulled from a backend API 

Example: DATE.DAYS_TO_PAYMENT(payday:number, date:date)

the options for payday should be provided by backend as a list of numbers 1 to 31 instead of listing all of these in the enum in the schema.  This should work for both select and multi-select arguments.
the schema should just include a reference to an options list name (eg "daysOfMonth")that is used to reference the list provided by backend.

2.  Custom UI component for a given function

 When user selects a function that is marked as "custom" in the schema from the function selector dropdown - a pop-up will appear that allows capture of all relevant information and then saves it back to the Expression component

Example: CURRENCY.CONVERT(amount:number, fromCurrency:text, toCurency:text, rate:number)

but instead of showing the inline argument selectors this would pop-up a modal custom component named "CustomFunctionCurrencyConversion" to get the relevant info and then pass the results back to the Function component and display the function only in a collapsed form.   The CustomFunctionCurrencyConverstion component would be outside of the RuleBuilder component and would be passed in as a prop mapping of custom function names to React components.

To add a new custom function we should only need to:

1. Create a custom UI component and register it in the RuleBuilder props mapping (self registration would be even better)
2. Add the function definition to the schema with a "customUI": true flag

Please provide an implementation plan for this feature with these considerations:

- Please design tests first for both backend schema and frontend UI components and use a test-driven development approach.
- Do NOT worry about backward compatibility for now - this is a new feature and we are not yet in production.
- Make sure that the validation service can handle the new schema definitions for custom options and custom UI functions and that meaningful error messages are provided for invalid configurations that can be shown on the frontend in the JSONEditor.



