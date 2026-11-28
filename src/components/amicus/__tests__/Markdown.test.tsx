import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { Markdown } from "@/components/amicus/Markdown";

test("headings render without a stray #", () => {
  const html = renderToStaticMarkup(
    <Markdown memorandum>{"### Direct Legal Opinion\nText.\n\n###Caveats\n- a"}</Markdown>,
  );
  expect(html).not.toMatch(/>#\s/);
  expect(html).toMatch(/<h3[^>]*>Direct Legal Opinion<\/h3>/);
  expect(html).toMatch(/<h3[^>]*>Caveats<\/h3>/);
});
