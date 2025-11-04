I want to create a new parallel set of components (not touching or depending on the existing components) to cleanly setup up a rule component hierarchy that generates a matching JSON pattern for rules that can be validated against an intuitive JSON schema.

- The Parent UI component should be called "RuleBuilder".  This should leverage re-usable components for the following:

    <rule> has 3 different structures --> case, condition or expression
    <case> returns boolean value and contains multiple <conditionGoup> and <expression> components.  Model this component off the current CustomCaseBuilder component but clean up the JSON to match below structure.
    <conditionGroup> returns boolean value and contains a <conjunction> and one ore more <cocndition> and/or <conditionGroup> components
    <condition> returns boolean value and contains a left <expression>, <operator> and right <expression>
    <expression> returns number, text or date value (model this component off the current ExpressionBuilder component) but clean up the JSON to match below structure.

- A <rule> component will also include metadata.  For now this will just be the rule name and description

- I would like the UI component structure to follow this as closely as possible with names that match this and the resulting JSON to mirror the same structure so that it looks something like this:


<rule structure="case" returnType="boolean" uuId="9b88bb88-0123-4456-b89a-b19a4e4e53be" version=1>:
    <metadata
        id="User defined ID",
        description="User defined description of the rule"
    >,
    <case>: 
    [
        <when>:<conditionGroup name="Condition 1">,
        <then>:<expression name="Result 1">
    ],
    <elseClause>:<expression name="Default">

<rule structure="condition" returnType="boolean">:
    <conditionGroup>

<rule structure="expression" returnType="number|text|date">:
    <expression>

<conditionGroup returnType="boolean" name="">:
    <conjunction>,
    [
        <condition>|<conditionGroup>
    ]

<condition returnType="boolean">:
    <left>:<expression returnType="number|text|date|boolean">,
    <operator>,
    <right>:<expression returnType="number|text|date|boolean">

<expression returnType="number|text|date|boolean"
            source="value|field|function">:

<value returnType="number|text|date|boolean">

<field returnType="number|text|date|boolean">

<function returnType="number|text|date|boolean">
    <name>,
    [
        <arg>
    ]

<arg returnType="number|text|date|boolean">
    <name>,
    <value>:<expression>
