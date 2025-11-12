#!/bin/bash

echo "Testing SQL Generation Endpoint"
echo "================================"
echo ""

# Test 1: Condition Structure
echo "Test 1: Condition Structure (WHERE clause)"
echo "-------------------------------------------"
curl -X POST http://localhost:8080/api/rules/to-sql \
  -H "Content-Type: application/json" \
  -d '{
    "structure": "condition",
    "returnType": "boolean",
    "content": {
      "type": "conditionGroup",
      "conjunction": "AND",
      "conditions": [
        {
          "type": "condition",
          "left": {
            "type": "field",
            "field": "customer_status"
          },
          "operator": "=",
          "right": {
            "type": "value",
            "returnType": "text",
            "value": "ACTIVE"
          }
        },
        {
          "type": "condition",
          "left": {
            "type": "field",
            "field": "total_purchases"
          },
          "operator": ">",
          "right": {
            "type": "value",
            "returnType": "number",
            "value": "1000"
          }
        }
      ]
    }
  }' | jq '.'

echo ""
echo ""

# Test 2: Case Structure
echo "Test 2: Case Structure (CASE WHEN)"
echo "-----------------------------------"
curl -X POST http://localhost:8080/api/rules/to-sql \
  -H "Content-Type: application/json" \
  -d '{
    "structure": "case",
    "returnType": "text",
    "content": {
      "whenClauses": [
        {
          "when": {
            "type": "conditionGroup",
            "conjunction": "AND",
            "conditions": [
              {
                "type": "condition",
                "left": {
                  "type": "field",
                  "field": "age"
                },
                "operator": "<",
                "right": {
                  "type": "value",
                  "returnType": "number",
                  "value": "18"
                }
              }
            ]
          },
          "then": {
            "type": "value",
            "returnType": "text",
            "value": "Minor"
          }
        },
        {
          "when": {
            "type": "conditionGroup",
            "conjunction": "AND",
            "conditions": [
              {
                "type": "condition",
                "left": {
                  "type": "field",
                  "field": "age"
                },
                "operator": ">=",
                "right": {
                  "type": "value",
                  "returnType": "number",
                  "value": "18"
                }
              }
            ]
          },
          "then": {
            "type": "value",
            "returnType": "text",
            "value": "Adult"
          }
        }
      ],
      "elseClause": {
        "type": "value",
        "returnType": "text",
        "value": "Unknown"
      }
    }
  }' | jq '.'

echo ""
echo ""

# Test 3: Expression Structure with Function
echo "Test 3: Expression Structure (Function)"
echo "----------------------------------------"
curl -X POST http://localhost:8080/api/rules/to-sql \
  -H "Content-Type: application/json" \
  -d '{
    "structure": "expression",
    "returnType": "text",
    "content": {
      "type": "function",
      "function": {
        "name": "TEXT.CONCAT",
        "args": [
          {
            "name": "arg1",
            "value": {
              "type": "field",
              "field": "first_name"
            }
          },
          {
            "name": "arg2",
            "value": {
              "type": "value",
              "returnType": "text",
              "value": " "
            }
          },
          {
            "name": "arg3",
            "value": {
              "type": "field",
              "field": "last_name"
            }
          }
        ]
      }
    }
  }' | jq '.'

echo ""
echo ""

echo "Tests completed!"
