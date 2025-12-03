config:

[x] widgetProps and opProps not used.
[x] valueSources from config not currently used
[x] widget.operators - only used for Condition operators
[x] widget type property not used - currently hardcoded mapping to returnType
[x] widget-specific props (dateFormat, valueFormat) not used - date is currently hardcoded as 'YYYY-MM-DD'

[x] Add custom dropdown for DATE.DIFF (DAY, MONTH, YEAR)
[x] Add GROUP.COUNT function with COUNT(field, groupBy multiselect)

[x] Componentize RuleBuilder
    [x] BaseExpression vs Expression
    [x] HttpHelper(using Axios) + Services for each component

[x] use schema for config (or derive config from schema)

[x] Fold Rule Structure component (structure/returnType) into Rule Defintion
    [x] change "content" in JSON to match "defintion"?

[x] Fix double + + showing in expression

[x] Change "content" to "definition" in schema

[x] No RuleTypes found in config, using defaults

[x] Change Condition name style to match ConditionGroup

[x] Fix ... after Expresion operators

[x] Adding ExpressionGroup automatically collapses?

[x] Rule Version History not working

[x] load dropdown options from an api for a list in an argument

[x] valueSources on argument to override default

[x] multiselect for function args like groupBy

[x] distinguish buttons for add Expression vs add ExpressionGroup

[x] version min to be 0 instead of 1 - NOT REQUIRED

[X] Re-work validation - Move error translation to backend

[ ] Services
    [x] GET api/rules/ids = /list?
    [x] GET api/config = /api/rules/config
    [x] POST /api/rules - confirm how this is being used.
    [ ] get rules is sending folderPath - thought it was doing that in service

[x] ruleRef / named conditions
    [x] ruleRef expansion?
    [x] ruleRef for condition?

[x] rule Ref errors
    [x] error message shows uuid
    [x] expressions type defaulting to number

[x] add + exppression outside outside of ExpressionGroup

[x] expression groups and condition groups behave same way

[x] custom argument options
[x] custom function modals

[ ] allow multiple options (but subset) of rule types for Condition / Condition Group 
[ ] configure URL:
    load: uuid={uuid}, version={version or latest}
    new: structure = {condition|case|expression}, ruleType = {ruleType}, returnType = {boolean|number|text|date}

[ ] Type checking + warnings on UI
    [ ] Allow edit of return type

[ ] Date format - add to schema? (YYYY-MM-DD)

[ ] Rule History MVP - requires SQL

[ ] Add Business Logic service + Component/Panel

[ ] Review / Simplify components
    [ ] expand / collapse logic - standardize and test

[ ] Testing
    [ ] Vitest vs Jest?
    [ ] Playwright vs cucumber + selenium?
    [ ] data-test-id every element
    [ ] coverage - backend
    [ ] coverage - frontend vitest
    [ ] coverage - e2e
    [ ] validate - more good + bad rule samples
    [ ] optimize for speed

[ ] uuid to lowercase
