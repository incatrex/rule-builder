/**
 * RuleBuilder Component Package
 * 
 * Exports all parts of the RuleBuilder component for flexible usage:
 * - RuleBuilder: Complete component (hook + UI + services)
 * - useRuleBuilder: Headless hook for custom UI
 * - RuleBuilderUI: Presentation component for custom logic
 */

export { default as RuleBuilder } from './RuleBuilder';
export { useRuleBuilder } from './useRuleBuilder';
export { RuleBuilderUI } from './RuleBuilderUI';
export { default as RuleBuilderExamples } from './Examples';
