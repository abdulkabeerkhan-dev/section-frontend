import { expect, test } from "vitest";
import { RESEARCH_MARKER, detectCourt, detectDocument, withDraftChoice } from "@/lib/draft-intent";

test("a complete instruction drafts straight away", () => {
  const q =
    "Draft a pre-arrest bail petition under Section 498 CrPC before the Sessions Court for my client.";
  expect(detectDocument(q)).toBe("Pre-arrest bail petition (s.498 CrPC)");
  expect(detectCourt(q)).toBe("Sessions Court");
});

test("a vague instruction leaves document and court unknown, so Counsel asks", () => {
  expect(detectDocument("Draft something for this matter")).toBeNull();
  expect(detectCourt("Draft something for this matter")).toBeNull();
});

test("research handed over from Jurist does not count as the instruction", () => {
  const q = `Prepare the court document for this matter using the research below.\n\n${RESEARCH_MARKER}\nThe writ petition in the High Court...`;
  expect(detectDocument(q)).toBeNull();
  expect(detectCourt(q)).toBeNull();
});

test("the choice is added to the request", () => {
  expect(withDraftChoice("Facts...", "Writ petition (Article 199)", "High Court")).toBe(
    "Facts...\n\nDocument to draft: Writ petition (Article 199)\nCourt: High Court",
  );
});
