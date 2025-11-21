#!/usr/bin/env node

/**
 * Generate fields.json with financial services entities
 * Target: ~1000 total fields
 * - Keep TABLE1 and TABLE2 (16 fields) for existing tests
 * - Add 50-100 financial entities with 10-20 fields each
 * - Include 5 entities with 50+ fields
 */

const fs = require('fs');
const path = require('path');

// Preserve existing test tables
const existingTables = {
  "TABLE1": {
    "label": "Table 1",
    "type": "!struct",
    "subfields": {
      "TEXT_FIELD_01": {
        "label": "Text Field 01",
        "type": "text",
        "preferWidgets": ["text"]
      },
      "TEXT_FIELD_02": {
        "label": "Text Field 02",
        "type": "text",
        "preferWidgets": ["text"]
      },
      "NUMBER_FIELD_01": {
        "label": "Number Field 01",
        "type": "number",
        "preferWidgets": ["number"],
        "fieldSettings": {
          "min": 0
        }
      },
      "NUMBER_FIELD_02": {
        "label": "Number Field 02",
        "type": "number",
        "preferWidgets": ["number"],
        "fieldSettings": {
          "min": 0
        }
      },
      "DATE_FIELD_01": {
        "label": "Date Field 01",
        "type": "date",
        "preferWidgets": ["date"]
      },
      "DATE_FIELD_02": {
        "label": "Date Field 02",
        "type": "date",
        "preferWidgets": ["date"]
      },
      "BOOLEAN_FIELD_01": {
        "label": "Boolean Field 01",
        "type": "boolean",
        "preferWidgets": ["boolean"]
      },
      "BOOLEAN_FIELD_02": {
        "label": "Boolean Field 02",
        "type": "boolean",
        "preferWidgets": ["boolean"]
      }
    }
  },
  "TABLE2": {
    "label": "Table 2",
    "type": "!struct",
    "subfields": {
      "TEXT_FIELD_01": {
        "label": "Text Field 01",
        "type": "text",
        "preferWidgets": ["text"]
      },
      "TEXT_FIELD_02": {
        "label": "Text Field 02",
        "type": "text",
        "preferWidgets": ["text"]
      },
      "NUMBER_FIELD_01": {
        "label": "Number Field 01",
        "type": "number",
        "preferWidgets": ["number"],
        "fieldSettings": {
          "min": 0
        }
      },
      "NUMBER_FIELD_02": {
        "label": "Number Field 02",
        "type": "number",
        "preferWidgets": ["number"],
        "fieldSettings": {
          "min": 0
        }
      },
      "DATE_FIELD_01": {
        "label": "Date Field 01",
        "type": "date",
        "preferWidgets": ["date"]
      },
      "DATE_FIELD_02": {
        "label": "Date Field 02",
        "type": "date",
        "preferWidgets": ["date"]
      },
      "BOOLEAN_FIELD_01": {
        "label": "Boolean Field 01",
        "type": "boolean",
        "preferWidgets": ["boolean"]
      },
      "BOOLEAN_FIELD_02": {
        "label": "Boolean Field 02",
        "type": "boolean",
        "preferWidgets": ["boolean"]
      }
    }
  }
};

// Financial entities with their typical field counts
const financialEntities = [
  // Large entities (50+ fields each) - 5 total
  { name: "GENERAL_LEDGER", label: "General Ledger", fields: 55 },
  { name: "ACCOUNTS_PAYABLE", label: "Accounts Payable", fields: 52 },
  { name: "ACCOUNTS_RECEIVABLE", label: "Accounts Receivable", fields: 54 },
  { name: "TRANSACTION_DETAIL", label: "Transaction Detail", fields: 58 },
  { name: "CUSTOMER_ACCOUNT", label: "Customer Account", fields: 51 },
  
  // Medium entities (10-20 fields each) - remaining to reach ~1000 total
  { name: "ASSET", label: "Asset", fields: 15 },
  { name: "LIABILITY", label: "Liability", fields: 14 },
  { name: "EQUITY", label: "Equity", fields: 12 },
  { name: "REVENUE", label: "Revenue", fields: 16 },
  { name: "EXPENSE", label: "Expense", fields: 18 },
  { name: "INVOICE", label: "Invoice", fields: 20 },
  { name: "PAYMENT", label: "Payment", fields: 17 },
  { name: "JOURNAL_ENTRY", label: "Journal Entry", fields: 19 },
  { name: "BANK_ACCOUNT", label: "Bank Account", fields: 14 },
  { name: "CREDIT_CARD", label: "Credit Card", fields: 16 },
  { name: "LOAN", label: "Loan", fields: 18 },
  { name: "MORTGAGE", label: "Mortgage", fields: 17 },
  { name: "INVESTMENT", label: "Investment", fields: 15 },
  { name: "PORTFOLIO", label: "Portfolio", fields: 13 },
  { name: "SECURITY", label: "Security", fields: 16 },
  { name: "BOND", label: "Bond", fields: 14 },
  { name: "STOCK", label: "Stock", fields: 15 },
  { name: "DERIVATIVE", label: "Derivative", fields: 17 },
  { name: "CONTRACT", label: "Contract", fields: 19 },
  { name: "VENDOR", label: "Vendor", fields: 16 },
  { name: "CUSTOMER", label: "Customer", fields: 18 },
  { name: "EMPLOYEE", label: "Employee", fields: 20 },
  { name: "PAYROLL", label: "Payroll", fields: 19 },
  { name: "TAX_RETURN", label: "Tax Return", fields: 17 },
  { name: "DEPRECIATION", label: "Depreciation", fields: 14 },
  { name: "AMORTIZATION", label: "Amortization", fields: 13 },
  { name: "BUDGET", label: "Budget", fields: 15 },
  { name: "FORECAST", label: "Forecast", fields: 14 },
  { name: "ACCRUAL", label: "Accrual", fields: 12 },
  { name: "RECONCILIATION", label: "Reconciliation", fields: 16 },
  { name: "AUDIT_TRAIL", label: "Audit Trail", fields: 18 },
  { name: "COMPLIANCE", label: "Compliance", fields: 15 },
  { name: "REGULATORY_REPORT", label: "Regulatory Report", fields: 17 },
  { name: "FINANCIAL_STATEMENT", label: "Financial Statement", fields: 16 },
  { name: "BALANCE_SHEET", label: "Balance Sheet", fields: 14 },
  { name: "INCOME_STATEMENT", label: "Income Statement", fields: 15 },
  { name: "CASH_FLOW", label: "Cash Flow", fields: 16 },
  { name: "RETAINED_EARNINGS", label: "Retained Earnings", fields: 11 },
  { name: "DIVIDEND", label: "Dividend", fields: 12 },
  { name: "CAPITAL_GAIN", label: "Capital Gain", fields: 13 },
  { name: "INTEREST_INCOME", label: "Interest Income", fields: 11 },
  { name: "FEE_SCHEDULE", label: "Fee Schedule", fields: 14 },
  { name: "COMMISSION", label: "Commission", fields: 13 },
  { name: "REBATE", label: "Rebate", fields: 12 },
  { name: "DISCOUNT", label: "Discount", fields: 11 },
  { name: "CREDIT_MEMO", label: "Credit Memo", fields: 14 },
  { name: "DEBIT_MEMO", label: "Debit Memo", fields: 14 },
  { name: "PURCHASE_ORDER", label: "Purchase Order", fields: 18 },
  { name: "SALES_ORDER", label: "Sales Order", fields: 17 },
  { name: "QUOTE", label: "Quote", fields: 15 },
  { name: "BILLING", label: "Billing", fields: 16 },
  { name: "STATEMENT", label: "Statement", fields: 14 },
  { name: "COLLECTION", label: "Collection", fields: 13 },
  { name: "WRITEOFF", label: "Write-off", fields: 12 },
  { name: "RESERVE", label: "Reserve", fields: 13 },
  { name: "PROVISION", label: "Provision", fields: 14 },
  { name: "ALLOWANCE", label: "Allowance", fields: 12 },
  { name: "GUARANTEE", label: "Guarantee", fields: 15 },
  { name: "COLLATERAL", label: "Collateral", fields: 14 },
  { name: "LIEN", label: "Lien", fields: 11 },
  { name: "SETTLEMENT", label: "Settlement", fields: 16 },
  { name: "CLEARING", label: "Clearing", fields: 15 },
  { name: "NETTING", label: "Netting", fields: 13 },
  { name: "HEDGING", label: "Hedging", fields: 14 },
  { name: "SWAP", label: "Swap", fields: 15 },
  { name: "OPTION", label: "Option", fields: 16 },
  { name: "FUTURES", label: "Futures", fields: 15 },
  { name: "FORWARD", label: "Forward", fields: 14 },
  { name: "CURRENCY_EXCHANGE", label: "Currency Exchange", fields: 13 },
  { name: "FX_RATE", label: "FX Rate", fields: 10 },
  { name: "TRADE", label: "Trade", fields: 18 },
  { name: "POSITION", label: "Position", fields: 16 },
  { name: "EXPOSURE", label: "Exposure", fields: 14 },
  { name: "RISK_METRIC", label: "Risk Metric", fields: 15 },
  { name: "VAR_CALCULATION", label: "VaR Calculation", fields: 13 },
  { name: "STRESS_TEST", label: "Stress Test", fields: 14 },
  { name: "SCENARIO_ANALYSIS", label: "Scenario Analysis", fields: 15 },
];

// Field name templates for financial data
const fieldTemplates = {
  text: [
    { name: "ACCOUNT_NUMBER", label: "Account Number" },
    { name: "ACCOUNT_NAME", label: "Account Name" },
    { name: "DESCRIPTION", label: "Description" },
    { name: "REFERENCE_NUMBER", label: "Reference Number" },
    { name: "TRANSACTION_ID", label: "Transaction ID" },
    { name: "MEMO", label: "Memo" },
    { name: "NOTES", label: "Notes" },
    { name: "STATUS", label: "Status" },
    { name: "CATEGORY", label: "Category" },
    { name: "SUBCATEGORY", label: "Subcategory" },
    { name: "CURRENCY_CODE", label: "Currency Code" },
    { name: "PAYMENT_METHOD", label: "Payment Method" },
    { name: "ROUTING_NUMBER", label: "Routing Number" },
    { name: "SWIFT_CODE", label: "SWIFT Code" },
    { name: "IBAN", label: "IBAN" },
    { name: "TAX_ID", label: "Tax ID" },
    { name: "GL_CODE", label: "GL Code" },
    { name: "COST_CENTER", label: "Cost Center" },
    { name: "DEPARTMENT", label: "Department" },
    { name: "DIVISION", label: "Division" },
    { name: "REGION", label: "Region" },
    { name: "ENTITY_CODE", label: "Entity Code" },
    { name: "LEGAL_ENTITY", label: "Legal Entity" },
    { name: "COUNTERPARTY", label: "Counterparty" },
    { name: "BENEFICIARY", label: "Beneficiary" },
  ],
  number: [
    { name: "AMOUNT", label: "Amount" },
    { name: "BALANCE", label: "Balance" },
    { name: "DEBIT_AMOUNT", label: "Debit Amount" },
    { name: "CREDIT_AMOUNT", label: "Credit Amount" },
    { name: "NET_AMOUNT", label: "Net Amount" },
    { name: "GROSS_AMOUNT", label: "Gross Amount" },
    { name: "TAX_AMOUNT", label: "Tax Amount" },
    { name: "FEE_AMOUNT", label: "Fee Amount" },
    { name: "INTEREST_RATE", label: "Interest Rate" },
    { name: "DISCOUNT_RATE", label: "Discount Rate" },
    { name: "EXCHANGE_RATE", label: "Exchange Rate" },
    { name: "QUANTITY", label: "Quantity" },
    { name: "UNIT_PRICE", label: "Unit Price" },
    { name: "TOTAL_PRICE", label: "Total Price" },
    { name: "PERCENTAGE", label: "Percentage" },
    { name: "TERM_MONTHS", label: "Term (Months)" },
    { name: "DAYS_OUTSTANDING", label: "Days Outstanding" },
    { name: "PAYMENT_TERMS", label: "Payment Terms (Days)" },
    { name: "CREDIT_LIMIT", label: "Credit Limit" },
    { name: "AVAILABLE_CREDIT", label: "Available Credit" },
  ],
  date: [
    { name: "TRANSACTION_DATE", label: "Transaction Date" },
    { name: "POST_DATE", label: "Post Date" },
    { name: "VALUE_DATE", label: "Value Date" },
    { name: "DUE_DATE", label: "Due Date" },
    { name: "MATURITY_DATE", label: "Maturity Date" },
    { name: "EFFECTIVE_DATE", label: "Effective Date" },
    { name: "SETTLEMENT_DATE", label: "Settlement Date" },
    { name: "CREATED_DATE", label: "Created Date" },
    { name: "MODIFIED_DATE", label: "Modified Date" },
    { name: "CLOSED_DATE", label: "Closed Date" },
    { name: "PERIOD_START_DATE", label: "Period Start Date" },
    { name: "PERIOD_END_DATE", label: "Period End Date" },
    { name: "FISCAL_YEAR_END", label: "Fiscal Year End" },
  ],
  boolean: [
    { name: "IS_ACTIVE", label: "Is Active" },
    { name: "IS_RECONCILED", label: "Is Reconciled" },
    { name: "IS_POSTED", label: "Is Posted" },
    { name: "IS_APPROVED", label: "Is Approved" },
    { name: "IS_PAID", label: "Is Paid" },
    { name: "IS_TAXABLE", label: "Is Taxable" },
    { name: "IS_RECURRING", label: "Is Recurring" },
    { name: "IS_REVERSED", label: "Is Reversed" },
    { name: "IS_VOID", label: "Is Void" },
    { name: "IS_LOCKED", label: "Is Locked" },
  ]
};

function generateField(type, template, index) {
  const field = {
    label: template ? template.label : `${type.charAt(0).toUpperCase() + type.slice(1)} Field ${index}`,
    type: type,
    preferWidgets: [type]
  };
  
  if (type === 'number') {
    field.fieldSettings = { min: 0 };
  }
  
  return field;
}

function generateEntity(entityConfig) {
  const entity = {
    label: entityConfig.label,
    type: "!struct",
    subfields: {}
  };
  
  const fieldCount = entityConfig.fields;
  const templates = {
    text: [...fieldTemplates.text],
    number: [...fieldTemplates.number],
    date: [...fieldTemplates.date],
    boolean: [...fieldTemplates.boolean]
  };
  
  // Distribute fields across types
  const textCount = Math.floor(fieldCount * 0.4);
  const numberCount = Math.floor(fieldCount * 0.35);
  const dateCount = Math.floor(fieldCount * 0.15);
  const booleanCount = fieldCount - textCount - numberCount - dateCount;
  
  let fieldIndex = 1;
  
  // Generate text fields
  for (let i = 0; i < textCount; i++) {
    const template = templates.text[i % templates.text.length];
    const fieldName = template ? `${template.name}_${Math.floor(i / templates.text.length) + 1}` : `TEXT_FIELD_${fieldIndex}`;
    entity.subfields[fieldName] = generateField('text', template, fieldIndex++);
  }
  
  // Generate number fields
  for (let i = 0; i < numberCount; i++) {
    const template = templates.number[i % templates.number.length];
    const fieldName = template ? `${template.name}_${Math.floor(i / templates.number.length) + 1}` : `NUMBER_FIELD_${fieldIndex}`;
    entity.subfields[fieldName] = generateField('number', template, fieldIndex++);
  }
  
  // Generate date fields
  for (let i = 0; i < dateCount; i++) {
    const template = templates.date[i % templates.date.length];
    const fieldName = template ? `${template.name}_${Math.floor(i / templates.date.length) + 1}` : `DATE_FIELD_${fieldIndex}`;
    entity.subfields[fieldName] = generateField('date', template, fieldIndex++);
  }
  
  // Generate boolean fields
  for (let i = 0; i < booleanCount; i++) {
    const template = templates.boolean[i % templates.boolean.length];
    const fieldName = template ? `${template.name}_${Math.floor(i / templates.boolean.length) + 1}` : `BOOLEAN_FIELD_${fieldIndex}`;
    entity.subfields[fieldName] = generateField('boolean', template, fieldIndex++);
  }
  
  return entity;
}

// Build complete fields object
const fields = { ...existingTables };

let totalFields = 16; // TABLE1 + TABLE2
for (const entityConfig of financialEntities) {
  fields[entityConfig.name] = generateEntity(entityConfig);
  totalFields += entityConfig.fields;
  
  if (totalFields >= 1000) break;
}

// Write to file
const outputPath = path.join(__dirname, '../backend/src/main/resources/static/fields.json');
fs.writeFileSync(outputPath, JSON.stringify(fields, null, 2));

console.log(`✓ Generated fields.json with ${Object.keys(fields).length} entities and ~${totalFields} total fields`);
console.log(`  - Preserved: TABLE1, TABLE2 (16 fields)`);
console.log(`  - Added: ${Object.keys(fields).length - 2} financial entities`);
console.log(`  - Large entities (50+ fields): 5`);
console.log(`  - File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
