# RuleBuilder Component Packaging - Questionnaire

**Purpose:** Answer these questions to guide the creation of a reusable, packageable RuleBuilder component suite.

**Date Created:** November 12, 2025

**Related Documents:**
- `COMPONENT_ANALYSIS.md` - Technical analysis of current components
- This questionnaire will be used to generate comprehensive packaging guidance

---

## Section 1: Configuration & API Questions

### 1.1 API Flexibility
**Question:** Should the component support multiple backend types (REST, GraphQL, custom)?

**Options:**
- [ ] REST only with configurable endpoints
- [ ] Multiple backend types (REST, GraphQL, custom)
- [ ] API calls completely replaceable via callback functions
- [ ] Hybrid: REST by default, but allow custom implementations

**Your Answer:**


**Follow-up:** If callback-based, should we provide default implementations?
- [ ] Yes, include default REST implementations
- [ ] No, consumer must provide all API functions
- [ ] Provide adapters/helpers for common patterns

**Your Answer:**


---

### 1.2 Configuration Scope
**Question:** The current `config` object has `operators`, `fields`, `funcs`, `types`. How should these be provided?

**Options:**
- [ ] Always passed as props (consumer responsible for loading)
- [ ] Loaded from API on component mount (component handles loading)
- [ ] Both: Accept props OR API config (props take precedence)
- [ ] Smart loading: Check props first, fall back to API

**Your Answer:**


**Follow-up:** Should the component handle loading states and errors for config?
- [ ] Yes, show loading spinner and error states
- [ ] No, consumer must provide loaded config
- [ ] Optional: Support both patterns

**Your Answer:**


---

### 1.3 State Management
**Question:** How should state management work?

**Options:**
- [ ] Fully controlled (parent manages all state, component is "dumb")
- [ ] Fully uncontrolled (component manages state internally, only fires callbacks)
- [ ] Hybrid: Support both controlled and uncontrolled modes
- [ ] Current pattern (internal state + onChange callbacks)

**Your Answer:**


**Follow-up:** Should we provide state management hooks/utilities?
- [ ] Yes, export `useRuleBuilder()` hook for easy integration
- [ ] No, keep component self-contained
- [ ] Optional separate package

**Your Answer:**


---

## Section 2: Dependency Questions

### 2.1 UI Library Strategy
**Question:** How should we handle Ant Design dependency?

**Options:**
- [ ] Keep Ant Design as peer dependency (consumer must install matching version)
- [ ] Bundle Ant Design with the package (increases bundle size)
- [ ] Provide headless/unstyled version with render props for custom UI
- [ ] Provide both: styled version (with AntD) AND headless version
- [ ] Replace with more lightweight UI library (specify: _________)

**Your Answer:**


**Follow-up:** Should styling be customizable?
- [ ] Accept theme/style props
- [ ] Use CSS variables for customization
- [ ] Accept custom class names
- [ ] CSS-in-JS with theme provider
- [ ] No customization needed

**Your Answer:**


---

### 2.2 Child Components Export Strategy
**Question:** Should child components (`Case`, `ConditionGroup`, `ExpressionGroup`, etc.) be exposed?

**Options:**
- [ ] Bundled as private/internal only (not exported)
- [ ] All exported for advanced customization
- [ ] Some exported (specify which: _________)
- [ ] Replaceable via props (component slots pattern)

**Your Answer:**


**Follow-up:** Should component composition be customizable?
- [ ] Yes, allow replacing any child component
- [ ] No, fixed composition for consistency
- [ ] Only top-level components replaceable

**Your Answer:**


---

## Section 3: Feature Scope Questions

### 3.1 Features to Include/Modify

#### Save Functionality
**Question:** Keep built-in "Save Rule" functionality?

**Options:**
- [ ] Keep as-is with API integration
- [ ] Make optional (can be disabled)
- [ ] Remove entirely (parent handles saving)
- [ ] Replace with `onSave` callback (no API call)

**Your Answer:**


---

#### Version Management
**Question:** Should version management be included?

**Options:**
- [ ] Keep version dropdown and API loading
- [ ] Remove (parent handles versions)
- [ ] Make optional via config flag
- [ ] Simplified: just show current version, no history

**Your Answer:**


---

#### Rule Validation
**Question:** Should schema validation be bundled?

**Options:**
- [ ] Include validation API calls
- [ ] Make validation optional via config
- [ ] Remove (validation handled externally)
- [ ] Provide validation utilities but no automatic calls

**Your Answer:**


---

#### Rule Types Dropdown
**Question:** Should component load rule types from API?

**Options:**
- [ ] Keep API loading of rule types
- [ ] Require rule types in config/props
- [ ] Make optional (both patterns supported)
- [ ] Remove rule types feature

**Your Answer:**


---

### 3.2 Features to Remove/Make Optional

#### Dark Mode
**Question:** How should theming/dark mode work?

**Options:**
- [ ] Keep darkMode boolean prop
- [ ] Replace with full theme object
- [ ] Use CSS variables only (no theme prop)
- [ ] Remove (rely on parent app theming)

**Your Answer:**


---

#### Messaging/Notifications
**Question:** Replace `antd.message` global with callbacks?

**Options:**
- [ ] Yes, use callback props (onSuccess, onError, etc.)
- [ ] No, keep message library usage
- [ ] Make configurable (accept custom notification function)

**Your Answer:**


---

#### UUID Generation
**Question:** How should UUIDs be generated?

**Options:**
- [ ] Keep internal generator
- [ ] Require from consumer via prop
- [ ] Accept optional generator function (with fallback)
- [ ] Remove (parent provides IDs)

**Your Answer:**


---

## Section 4: Packaging Questions

### 4.1 Build & Distribution

#### Package Registry
**Question:** Where should package be published?

**Options:**
- [ ] Public npm registry
- [ ] Private npm registry (specify: _________)
- [ ] GitHub Packages
- [ ] Multiple registries
- [ ] Not published (local use only)

**Your Answer:**


---

#### Language/Types
**Question:** TypeScript or JavaScript?

**Options:**
- [ ] TypeScript source + declarations
- [ ] JavaScript with JSDoc types
- [ ] JavaScript only (no types)
- [ ] Provide both .js and .d.ts files

**Your Answer:**


---

#### Build Output
**Question:** What build outputs should be provided?

**Options (check all that apply):**
- [ ] ESM (ES Modules)
- [ ] CommonJS
- [ ] UMD (browser global)
- [ ] Source maps
- [ ] Unminified version
- [ ] Minified version

**Your Answer:**


---

### 4.2 Documentation Requirements

**Question:** What documentation should be included?

**Options (check all that apply):**
- [ ] README with quick start
- [ ] Full API reference (all props, methods, types)
- [ ] Migration guide from current implementation
- [ ] Storybook examples
- [ ] CodeSandbox/StackBlitz demos
- [ ] Architecture/design docs
- [ ] Contributing guide

**Your Answer:**


---

### 4.3 Backward Compatibility

**Question:** Must maintain compatibility with current usage in this app?

**Options:**
- [ ] Yes, must work as drop-in replacement
- [ ] No, breaking changes acceptable (we'll update this app)
- [ ] Hybrid: Provide compatibility layer/adapter

**Your Answer:**


**Follow-up:** If breaking changes acceptable, what's the migration strategy?
- [ ] Provide codemod scripts
- [ ] Manual migration guide
- [ ] Both versions supported temporarily

**Your Answer:**


---

## Section 5: Implementation Strategy

### 5.1 Phasing Approach

**Question:** Implement in phases or all at once?

**Options:**
- [ ] All features at once (comprehensive package)
- [ ] Phase 1: Minimal viable package (core features only)
- [ ] Phase 2: Advanced features (validation, versioning, etc.)
- [ ] Phase 3: Developer experience (TypeScript, docs, examples)

**Your Answer:**


**If phased, define Phase 1 scope:**
- Core features to include: 
- Features to defer:


---

### 5.2 AI Implementation Target

**Question:** Should AI refactor existing code or create new from scratch?

**Options:**
- [ ] Refactor existing components (preserve logic, restructure for packaging)
- [ ] Create new package from scratch (use existing as reference)
- [ ] Hybrid: Extract and clean up existing code

**Your Answer:**


**Follow-up:** Should original components remain in this repo?
- [ ] Yes, keep both versions during migration
- [ ] No, replace with package import
- [ ] Keep until package is stable

**Your Answer:**


---

### 5.3 Testing Strategy

**Question:** What testing should be included in package?

**Options (check all that apply):**
- [ ] Unit tests (Jest/Vitest)
- [ ] Integration tests
- [ ] E2E tests (Playwright/Cypress)
- [ ] Visual regression tests
- [ ] Accessibility tests
- [ ] Performance tests
- [ ] No tests (consumer responsibility)

**Your Answer:**


**Follow-up:** Test coverage target:
- [ ] 80%+ coverage required
- [ ] Critical paths only
- [ ] No specific target

**Your Answer:**


---

## Section 6: Advanced Considerations

### 6.1 Extensibility

**Question:** How extensible should the component be?

**Options (check all that apply):**
- [ ] Plugin system for custom rule types
- [ ] Custom validator plugins
- [ ] Custom renderer plugins
- [ ] Event system for hooks/middleware
- [ ] None (fixed functionality)

**Your Answer:**


---

### 6.2 Performance Optimizations

**Question:** What performance features are needed?

**Options (check all that apply):**
- [ ] Code splitting (lazy load child components)
- [ ] Virtualization for large rule sets
- [ ] Memoization/React.memo optimizations
- [ ] Debounced updates
- [ ] Bundle size optimization (<100kb, <200kb, <500kb)
- [ ] No specific requirements

**Your Answer:**


---

### 6.3 Accessibility

**Question:** Accessibility requirements?

**Options:**
- [ ] WCAG 2.1 AA compliant
- [ ] WCAG 2.1 AAA compliant
- [ ] Basic keyboard navigation only
- [ ] No specific requirements

**Your Answer:**


---

### 6.4 Browser Support

**Question:** What browsers must be supported?

**Options:**
- [ ] Modern browsers only (last 2 versions)
- [ ] IE11 support required
- [ ] Specific versions (specify: _________)

**Your Answer:**


---

## Section 7: Package Naming & Metadata

### 7.1 Package Information

**Package Name:** 
- Suggested: `@yourorg/rule-builder` or `@incatrex/rule-builder`
- Your preference: 

**Package Version:** 
- Start at: `1.0.0` or `0.1.0`
- Your preference:

**License:**
- [ ] MIT
- [ ] Apache 2.0
- [ ] Private/Proprietary
- [ ] Other (specify: _________)

**Keywords for npm:**
(for discoverability, e.g., "rules engine", "visual builder", "json schema")
- 
- 
- 

---

## Section 8: Additional Requirements

### 8.1 Special Requirements

**Any specific requirements not covered above?**




---

### 8.2 Known Constraints

**Any technical constraints to be aware of?**
(e.g., company policies, existing architecture requirements, deployment environment)




---

### 8.3 Success Criteria

**How will you measure if the packaged component is successful?**

- [ ] Easy to integrate (< X lines of code to use)
- [ ] Well documented
- [ ] Performant (specify metrics: _________)
- [ ] Stable (no breaking changes for X months)
- [ ] Other: 




---

## Next Steps

Once you've completed this questionnaire:

1. Review `COMPONENT_ANALYSIS.md` to understand current implementation
2. Provide this completed questionnaire
3. AI will generate `PACKAGING_GUIDE.md` with:
   - Detailed refactoring plan
   - File structure for package
   - API design specifications
   - Implementation steps
   - Testing strategy
   - Documentation templates

4. AI can then implement the package based on the guide

---

**Completion Checklist:**
- [ ] All questions answered
- [ ] Follow-up questions addressed
- [ ] Special requirements documented
- [ ] Ready for AI to generate packaging guide
