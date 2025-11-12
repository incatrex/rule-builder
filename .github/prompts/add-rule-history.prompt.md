I want a new component in the left hand panel below the RuleSearch component called RuleHistory.

This component will display a grid with all versions of the currently selected rule uuId from the RuleSearch component. This grid will show the history of changes made to the rule and allow user to select a previous version to view it in the RuleBuilder editor.  Or user can select a version to restore it as the current version.

| Rule ID | Version | Modified By | Modified On | Action |
|---------|---------|-------------|-------------|--------|

| Rule ID | Version | Modified By | Modified On | Action |
|---------|---------|-------------|-------------|--------|
| RUL123  | 1       | jsmith      | 2024-01-15  | [View] [Restore] |
| RUL123  | 2       | jdoe        | 2024-02-10  | [View] [Restore] |
| RUL123  | 3       | jsmith      | 2024-03-05  | [View] [Restore] |

Where:
- Rule ID = the user defined ID for the rule
- Version = the version number of the rule
- Modified By = the username of the person who made the change
- Modified On = the date the change was made
- Action = buttons to View or Restore that version
    View should trigger an event to load that version into the RuleBuilder editor
    Restore should trigger an event to set that version as the current version in the RuleBuilder editor

Please design this component to be reusable and easily integrated into the existing RuleBuilder or any other application that can provide the necessary data.

           