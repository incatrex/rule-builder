config:

[x] widgetProps and opProps not used.
[x] valueSources from config not currently used
[ ] widget.operators - only used for Condition operators
[ ] widget type property not used - currently hardcoded mapping to returnType
[ ] widget-specific props (dateFormat, valueFormat) not used - date is currently hardcoded as 'YYYY-MM-DD'

[x] Add custom dropdown for DATE.DIFF (DAY, MONTH, YEAR)
[ ] Add GROUP.COUNT function with COUNT(field, groupBy multiselect)

[ ] Componentize RuleBuilder
    [ ] BaseExpression vs Expression
    [ ] HttpHelper(using Axios) + Services for each component

[ ] use schema for config (or derive config from schema)

[ ] Fold Rule Structure component (structure/returnType) into Rule Defintion
    [ ] change "content" in JSON to match "defintion"?

[ ] Fix double + + showing in expression

[ ] Change "content" to "definition" in schema

[ ] No RuleTypes found in config, using defaults