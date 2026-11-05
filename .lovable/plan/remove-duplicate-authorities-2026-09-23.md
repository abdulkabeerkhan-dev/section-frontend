# Remove duplicate authorities

## Goal
Show each precedent once, even when the backend returns duplicate records.

## Changes
- Deduplicate structured precedent cards before calculating the authority count or rendering the list.
- Prefer stable judgment/case identifiers, then normalized citation, with a title-and-court fallback.
- Preserve the first complete card and the backend’s original ordering.

## Verification
- Run the TypeScript check.
- Confirm the displayed count uses the deduplicated list.
