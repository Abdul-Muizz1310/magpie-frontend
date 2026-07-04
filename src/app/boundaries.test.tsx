// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { API_URL } from "../../test/msw/fixtures";
import { server } from "../../test/msw/server";
import GlobalError from "./error";
import Loading from "./loading";
import NotFound from "./not-found";

// PageFrame chrome mounts BackendStatusDot, which polls /health on render.
beforeEach(() => {
	server.use(
		http.get(`${API_URL}/health`, () =>
			HttpResponse.json({ status: "ok", service: "magpie", db: "ok" }),
		),
	);
});

describe("error boundary (P3 + no-leak finding)", () => {
	it("renders a generic message and NEVER the raw error text", () => {
		const reset = vi.fn();
		const error = Object.assign(
			new Error("Internal detail: body.config.item.fields.0.selector leaked"),
			{
				digest: "abc123",
			},
		);
		render(<GlobalError error={error} reset={reset} />);
		// Generic copy shown; raw backend detail must not appear anywhere.
		expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
		expect(screen.queryByText(/body\.config\.item\.fields/)).toBeNull();
		expect(screen.queryByText(/leaked/)).toBeNull();
		// Digest is surfaced for correlating server-side logs.
		expect(screen.getByText(/digest: abc123/)).toBeInTheDocument();
	});

	it("wires the retry button to reset()", async () => {
		const reset = vi.fn();
		const { getByRole } = render(<GlobalError error={new Error("boom")} reset={reset} />);
		getByRole("button", { name: /retry/i }).click();
		expect(reset).toHaveBeenCalled();
	});
});

describe("not-found boundary (P3)", () => {
	it("renders the custom 404 page with a link home", () => {
		render(<NotFound />);
		expect(screen.getByText(/isn't in the index/i)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /back to sources/i })).toHaveAttribute("href", "/");
	});
});

describe("loading boundary", () => {
	it("renders the boot skeleton", () => {
		render(<Loading />);
		expect(screen.getByText(/fetching data/i)).toBeInTheDocument();
	});
});
