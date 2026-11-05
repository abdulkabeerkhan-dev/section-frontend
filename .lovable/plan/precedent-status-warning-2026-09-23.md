# Precedent status warning

## Goal
Make adverse precedent treatment unmistakable and let lawyers immediately research the controlling authority.

## Changes
- Extend structured precedent data with status, warning text, and superseding-authority fields.
- Add a reusable warning shown directly beneath each case heading and citation, before the issue, holding, or preview content.
- Use red for overruled decisions and amber for other flagged statuses as an explicit legal-safety exception to the monochrome interface.
- Route the controlling-authority action through the workspace’s existing query submission flow.
- Keep the warning accessible, responsive, and compatible with dark mode.

## Technical details
- Use the existing design-system Button for the citation action and Lucide warning/external-link icons.
- Thread an `onCitationClick` callback from the workspace through the results and precedent-card list.
- Normalize warning prefixes defensively and humanize underscore-separated status labels.

## Verification
- Run the project’s automatic checks.
- Confirm the warning’s placement and citation action wiring in the rendered card structure.
