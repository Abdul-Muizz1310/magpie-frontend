import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorAlert } from "./ErrorAlert";

describe("ErrorAlert", () => {
	it("renders title and body", () => {
		render(<ErrorAlert title="Failed">something broke</ErrorAlert>);
		expect(screen.getByRole("alert")).toBeInTheDocument();
		expect(screen.getByText("Failed")).toBeInTheDocument();
		expect(screen.getByText("something broke")).toBeInTheDocument();
	});

	it("omits title when not provided", () => {
		render(<ErrorAlert>body only</ErrorAlert>);
		expect(screen.getByRole("alert")).toBeInTheDocument();
		expect(screen.getByText("body only")).toBeInTheDocument();
	});
});
