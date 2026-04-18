import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge, statusDot } from "./StatusBadge";

describe("StatusBadge", () => {
	it("shows 'idle' when status is null", () => {
		render(<StatusBadge status={null} />);
		expect(screen.getByTestId("status-badge")).toHaveTextContent(/idle/i);
	});

	it("shows the status label", () => {
		render(<StatusBadge status="ok" />);
		expect(screen.getByTestId("status-badge")).toHaveTextContent(/ok/i);
	});
});

describe("statusDot", () => {
	it("maps running → emerald (pulsing)", () => {
		expect(statusDot("running")).toBe("emerald");
	});
	it("maps ok → green", () => {
		expect(statusDot("ok")).toBe("green");
	});
	it("maps error → red", () => {
		expect(statusDot("error")).toBe("red");
	});
	it("maps queued → off", () => {
		expect(statusDot("queued")).toBe("off");
	});
	it("falls back to off for unknown", () => {
		expect(statusDot("mystery")).toBe("off");
	});
});
