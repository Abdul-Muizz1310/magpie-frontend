import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OriginBadge } from "./OriginBadge";

describe("OriginBadge", () => {
	it("renders 'file' label with lock chrome", () => {
		render(<OriginBadge origin="file" />);
		expect(screen.getByText(/file/i)).toBeInTheDocument();
	});

	it("renders 'api' label with pencil chrome", () => {
		render(<OriginBadge origin="api" />);
		expect(screen.getByText(/api/i)).toBeInTheDocument();
	});
});
