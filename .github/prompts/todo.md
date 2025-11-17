config:

[x] widgetProps and opProps not used.
[x] valueSources from config not currently used
[ ] widget.operators - only used for Condition operators
[ ] widget type property not used - currently hardcoded mapping to returnType
[ ] widget-specific props (dateFormat, valueFormat) not used - date is currently hardcoded as 'YYYY-MM-DD'

[x] Add custom dropdown for DATE.DIFF (DAY, MONTH, YEAR)
[ ] Add GROUP.COUNT function with COUNT(field, groupBy multiselect)

[ ] Componentize RuleBuilder
    [x] BaseExpression vs Expression
    [x] HttpHelper(using Axios) + Services for each component

[ ] use schema for config (or derive config from schema)

[x] Fold Rule Structure component (structure/returnType) into Rule Defintion
    [ ] change "content" in JSON to match "defintion"?

[x] Fix double + + showing in expression

[x] Change "content" to "definition" in schema

[ ] No RuleTypes found in config, using defaults

[ ] Re-work validation

[ ] Add Business Logic service + Component/Panel

[ ] Change Condition name style to match ConditionGroup

[ ] Fix ... after Expresion operators

[ ] Adding ExpressionGroup automatically collapses?

[ ] Unit Test Coverage

[ ] Review / Simplify components

[ ] Rule Version History not working

