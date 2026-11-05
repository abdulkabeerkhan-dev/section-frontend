# Legal chatbot interface refresh

## Goal
Make the workspace feel like a focused legal assistant conversation: consistent text sizing, a clear question-and-answer flow, and structured authorities that support the answer without overpowering it.

## Changes

### 1. Restore a clear chat hierarchy
- Keep each user prompt as a compact, right-aligned message bubble.
- Present each assistant response as one left-aligned conversation turn with a small Section identity label.
- Remove the large framed “document inside chat” treatment from ordinary answers and intake replies.
- Show the legal answer first, then related precedents, so the response reads naturally from conclusion to authority.
- Keep mode information as quiet metadata rather than a prominent decorative pill.

### 2. Normalize legal typography
- Use the sans-serif interface font for chat text and controls at a consistent 15px body size.
- Reserve the serif font for legal section headings and case names only.
- Replace oversized, highly varied headings with a restrained scale: body, subsection, and section heading.
- Remove excessive uppercase labels and wide letter spacing that make parts of the answer look disconnected.
- Keep paragraphs, lists, quotations, tables, and statutory extracts comfortably spaced and readable.

### 3. Simplify memorandum presentation
- Render memorandum sections as one continuous, well-spaced answer instead of tabbed fragments.
- Keep “Copy memorandum” and “Export court pleading” as compact actions attached to the answer.
- Preserve citation links, legal quotations, truncation notices, and continuation controls.

### 4. Refine precedent results
- Place a compact “Authorities” heading after the answer with the result count.
- Make every precedent card use one consistent type scale and spacing system.
- Keep citation, case name, court/date, outcome, verification, issue, holding, relevance, statutes, and judgment/PDF actions.
- Reduce decorative pills and oversized case titles so multiple authorities remain easy to scan.

### 5. Improve loading and mobile behavior
- Replace the oversized loading message with a subtle assistant “Researching…” state.
- Keep the composer fixed and visually connected to the conversation.
- Ensure answer controls, metadata, cards, and long legal text stack cleanly on narrow screens without crowding or horizontal overflow.

## Scope
Frontend presentation only. Query behavior, authentication, stored conversations, downloads, citations, judgment retrieval, and backend contracts remain unchanged.

## Verification
- Run the TypeScript check and targeted lint checks.
- Check the signed-out screen and the available chat layout at desktop and mobile widths.
- Confirm typography is consistent, the answer precedes authorities, and controls do not overlap.
