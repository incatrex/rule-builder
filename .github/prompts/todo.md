config:

[x] widgetProps and opProps not used.
[x] valueSources from config not currently used
[x] widget.operators - only used for Condition operators
[x] widget type property not used - currently hardcoded mapping to returnType
[x] widget-specific props (dateFormat, valueFormat) not used - date is currently hardcoded as 'YYYY-MM-DD'

[x] Add custom dropdown for DATE.DIFF (DAY, MONTH, YEAR)
[ ] Add GROUP.COUNT function with COUNT(field, groupBy multiselect)

[ ] Componentize RuleBuilder
    [x] BaseExpression vs Expression
    [x] HttpHelper(using Axios) + Services for each component

[x] use schema for config (or derive config from schema)

[x] Fold Rule Structure component (structure/returnType) into Rule Defintion
    [ ] change "content" in JSON to match "defintion"?

[x] Fix double + + showing in expression

[x] Change "content" to "definition" in schema

[x] No RuleTypes found in config, using defaults

[ ] Re-work validation

[ ] Add Business Logic service + Component/Panel

[ ] Change Condition name style to match ConditionGroup

[x] Fix ... after Expresion operators

[ ] Adding ExpressionGroup automatically collapses?

[ ] Unit Test Coverage

[ ] Review / Simplify components

[ ] Rule Version History not working


Test:

Create new rule: v1
    NAME = "TEST_RULE_1"
    Condition Group = "Condition v1"
    NUMBER_FIELD_01 = NUMBER_FIELD_02
    Save


Load TEST_RULE_1
    Check that version 1 is loaded in Version History
    Change Condition Grooup = "Conditiion v2"
    NUMBER_FIELD_02 = NUMBER_FIELD02
