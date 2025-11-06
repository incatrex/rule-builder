/ Core reusable components
Expression = {
  source: "value" | "field" | "function",
  returnType: string,
  // + type-specific properties
}

Function = {
  name: string,
  args: Arg[]
}

Arg = {
  name: string,
  value: Expression  // recursive reference
}

Condition = {
  id: string,
  name: string,
  left: Expression,
  operator: string,
  right: Expression | Expression[]  // array for operators like "between"
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
    value: Expression
  }
}

Rule = {
  structure: "case" | "condition" | "expression",
  returnType: string,
  metadata: {...},
  content: CaseContent | ConditionGroup | Expression
}