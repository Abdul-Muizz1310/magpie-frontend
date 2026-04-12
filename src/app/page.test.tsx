import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "./page";

test("renders heading", () => {
	render(<Home />);
	expect(screen.getByRole("heading", { name: /magpie/i })).toBeInTheDocument();
});
