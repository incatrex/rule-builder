/**
 * RuleHistory Component Package
 * 
 * A standalone, reusable component for displaying and managing rule version history.
 * Fully customizable with dependency injection and theming support.
 */

// Main component (combines logic + UI)
export { RuleHistory, default } from './RuleHistory';

// Headless hook for custom UI implementations
export { useRuleHistory } from './useRuleHistory';

// Presentation component (UI only)
export { RuleHistoryUI } from './RuleHistoryUI';

// Styles (import separately if needed)
import './RuleHistory.css';
