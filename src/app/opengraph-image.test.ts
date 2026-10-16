// @vitest-environment node
import { cacheLife } from "next/cache";
import { describe, expect, it, vi } from "vitest";
import { pngSize } from "@/lib/site/image-headers.test-helpers";
import OpengraphImage, { alt, contentType, size } from "./opengraph-image";

// cacheLife() only runs inside a Next build or server; here it is a spy.
vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

describe("opengraph-image route (T-FE-10)", () => {
	it("declares its alt text, size and content type", () => {
		expect(alt).toBe("magpie — collect everything, heal automatically.");
		expect(size).toEqual({ width: 1200, height: 630 });
		expect(contentType).toBe("image/png");
	});

	it("renders the share card as a 1200×630 PNG", async () => {
		const response = await OpengraphImage();
		expect(response.headers.get("content-type")).toBe("image/png");
		expect(pngSize(Buffer.from(await response.arrayBuffer()))).toBe("1200x630");
	});

	it("draws the card in a long-lived cache, so the build can prerender it", async () => {
		await OpengraphImage();
		expect(cacheLife).toHaveBeenCalledWith("max");
	});
});
