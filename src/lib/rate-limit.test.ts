// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { __resetRateLimit, checkRateLimit } from "./rate-limit";

afterEach(() => {
	__resetRateLimit();
	vi.useRealTimers();
});

describe("checkRateLimit", () => {
	it("allows up to `limit` calls then blocks within the window", () => {
		for (let i = 0; i < 3; i += 1) {
			expect(checkRateLimit("k", 3, 1000)).toBe(true);
		}
		expect(checkRateLimit("k", 3, 1000)).toBe(false);
	});

	it("isolates budgets per key", () => {
		expect(checkRateLimit("a", 1, 1000)).toBe(true);
		expect(checkRateLimit("a", 1, 1000)).toBe(false);
		// Different key has its own fresh budget.
		expect(checkRateLimit("b", 1, 1000)).toBe(true);
	});

	it("resets after the window elapses", () => {
		vi.useFakeTimers();
		expect(checkRateLimit("k", 1, 1000)).toBe(true);
		expect(checkRateLimit("k", 1, 1000)).toBe(false);
		vi.advanceTimersByTime(1001);
		expect(checkRateLimit("k", 1, 1000)).toBe(true);
	});
});
