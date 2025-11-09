
```.jsonc
/ Core reusable components
Expression = {
  source: "value" | "field" | "function",
  returnType: string,
  // + type-specific properties
}

ExpressionGroup = {
  source: "expressionGroup",
  returnType: string, // inferred from expressions
  firstExpression: Expression | ExpressionGroup,
  additionalExpressions: {
    operator: "+" | "-" | "*" | "/",
    expression: Expression | ExpressionGroup
  }[]
}

Function = {
  name: string,
  args: Arg[]
}

Arg = {
  name: string,
  value: Expression | ExpressionGroup  // recursive reference
}

Condition = {
  id: string,
  name: string,
  left: Expression | ExpressionGroup,
  operator: string,
  right: Expression | ExpressionGroup | (Expression | ExpressionGroup)[]  // array for operators like "between"
}

ConditionGroup = {
  id: string,
  name: string,
  conjunction: "AND" | "OR", 
  not: boolean,
  conditions: (Condition | ConditionGroup)[]  // recursive
}

// Rule-specific structures (not reusable components)
WhenClause = {
  when: ConditionGroup,
  then: {
    name: string,
    value: Expression | ExpressionGroup
  }
}

Rule = {
  structure: "case" | "condition" | "expression",
  returnType: string,
  metadata: {...},
  content: CaseContent | ConditionGroup | Expression | ExpressionGroup
}