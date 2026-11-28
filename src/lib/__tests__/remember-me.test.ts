import { beforeEach, expect, test } from "vitest";
import { rememberSignIn, rememberedEmail, shouldEndSessionOnBrowserClose } from "@/lib/remember-me";

class Mem {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}

beforeEach(() => {
  (globalThis as any).localStorage = new Mem();
  (globalThis as any).sessionStorage = new Mem();
});

test("remember me keeps the session and the email", () => {
  rememberSignIn(true, "a@firm.pk");
  (globalThis as any).sessionStorage = new Mem();          // browser closed and reopened
  expect(shouldEndSessionOnBrowserClose()).toBe(false);
  expect(rememberedEmail()).toBe("a@firm.pk");
});

test("without remember me the session ends after the browser closes, not before", () => {
  rememberSignIn(false, "a@firm.pk");
  expect(shouldEndSessionOnBrowserClose()).toBe(false);    // same browser session
  (globalThis as any).sessionStorage = new Mem();          // browser closed and reopened
  expect(shouldEndSessionOnBrowserClose()).toBe(true);
  expect(rememberedEmail()).toBe("");
});
