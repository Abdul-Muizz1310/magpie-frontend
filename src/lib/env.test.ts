import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigError, envValue, getBaseUrl } from "./env";

/** The production value on 2026-10-16: a Windows pipe's BOM and CRLF around the URL. */
const PIPED = "﻿https://magpie-backend-t4bb.onrender.com\r\n";

describe("envValue (T-ENV-1)", () => {
	it.each([
		[undefined, null],
		["", null],
		[" \r\n\t", null],
		["﻿", null],
		[PIPED, "https://magpie-backend-t4bb.onrender.com"],
		["  a secret with inner spaces \n", "a secret with inner spaces"],
	])("%j becomes %j", (raw, clean) => {
		expect(envValue(raw)).toBe(clean);
	});
});

describe("getBaseUrl (T-ENV-2)", () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("falls back to localhost:8000 when the value is unset or blank", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", undefined);
		expect(getBaseUrl()).toBe("http://localhost:8000");
		vi.stubEnv("NEXT_PUBLIC_API_URL", " \r\n");
		expect(getBaseUrl()).toBe("http://localhost:8000");
	});

	it("strips the BOM and CRLF a Windows pipe adds", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", PIPED);
		expect(getBaseUrl()).toBe("https://magpie-backend-t4bb.onrender.com");
	});

	it("drops trailing slashes so paths join cleanly", () => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com//");
		expect(getBaseUrl()).toBe("https://api.example.com");
	});

	it.each(["not a url", "ftp://files.example.com", "https://"])("rejects %j loudly", (raw) => {
		vi.stubEnv("NEXT_PUBLIC_API_URL", raw);
		expect(() => getBaseUrl()).toThrow(ConfigError);
		expect(() => getBaseUrl()).toThrow(/NEXT_PUBLIC_API_URL/);
	});
});
