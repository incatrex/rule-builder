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

[ ] uuid to lowercase

[ ] version min to be 0 instead of 1 - not required?

[ ] Re-work validation
    [x] Move error translation to backend
    [ ] Confirm/test key validationi points

[ ] Add Business Logic service + Component/Panel

[ ] Review / Simplify components
    [ ] expand / collapse logic - standardize and test

[ ] Testing
    [ ] data-test-id every element
    [ ] integration test coverage
    [ ] unit test coverage
    [ ] rationalize front round trip tests - get rid of those not deeded

[ ] Rule History
    [x] Release Tags/
    [ ] SQL
    [ ] double check test-integration.sh (4 vs 3 versions?)


[ ] Services
    [ ] filter by tenant/sub-tenant?
    [x] GET api/rules/ids = /list?
    [x] GET api/config = /api/rules/config
    [x] POST /api/rules - confirm how this is being used.
    [ ] get rules is sending folderPath - thought it was doing that in service

[ ] ruleRef / named conditions
    [ ] ruleRef expansion?
    [ ] ruleRef for condition?

[ ] rule Ref errors
    [ ] error message shows uuid
    [ ] expressions type defaulting to number

[x] add + exppression outside outside of ExpressionGroup

[ ] expression groups and condition groups behave same way



Expand / Collapse Logic:

New Rule:
    structure = condition: default to show these all expanded:
        Condition Group --> Condition --> Expression
    structure = case: default to show these all expanded:
        WHEN Conndition Group --> Condition --> Expresion
        THEN --> Expression
        ELSE --> Expression

    structure = expression: default to show these all expanded:
        Expresion --> Value 