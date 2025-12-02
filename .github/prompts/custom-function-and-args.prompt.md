I Need a way to implement a generic configuration in the schema that UI can use to implement custom options for agurments and custom UI components for select functions.   

1.  Custom options for a function argument that can be pulled from a backend API 

Example: DATE.DAYS_TO_PAYMENT(payday:number, date:date)

the options for payday should be provided by backend as a list of numbers 1 to 31 instead of listing all of these in the enum in the schema.  This should work for both select and multi-select arguments.
the schema should just include a reference to an options list name (eg "daysOfMonth")that is used to reference the list provided by backend.

2.  Custom UI component for a given function

 When user selects a function that is marked as "custom" in the schema from the function selector dropdown - a pop-up will appear that allows capture of all relevant information and then saves it back to the Expression component

Example: CURRENCY.CONVERT(amount:number, fromCurrency:text, toCurency:text, rate:number)

but instead of showing the inline argument selectors this would pop-up a modal custom component named "CustomFunctionCurrencyConversion" to get the relevant info and then pass the results back to the Function component and display the function only in a collapsed form.   The CustomFunctionCurrencyConverstion component would be outside of the RuleBuilder component and would be passed in as a prop mapping of custom function names to React components.

I think as part of this I'd like to break out the logic and UI to create separate Function and FunctionArgument components that can be used inside an Expression and contain all their respective logic.

To add a new custom function we should only need to:

1. Create a custom UI component and register it in the RuleBuilder props mapping (self registration would be even better)
2. Add the function definition to the schema with a "customUI": true flag

