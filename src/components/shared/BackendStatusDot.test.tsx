import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import { API_URL } from "../../../test/msw/fixtures";
import { server } from "../../../test/msw/server";
import { renderUI } from "../../../test/utils/render";
import { BackendStatusDot } from "./BackendStatusDot";

describe("BackendStatusDot", () => {
	it("renders ok state when health returns db=ok", async () => {
		server.use(
			http.get(`${API_URL}/health`, () =>
				HttpResponse.json({ status: "ok", service: "magpie", db: "ok" }),
			),
		);
		renderUI(<BackendStatusDot />);
		const dot = screen.getByTestId("backend-status-dot");
		await waitFor(() => expect(dot.getAttribute("title")).toMatch(/ok/));
	});

	it("renders degraded state when db is not ok", async () => {
		server.use(
			http.get(`${API_URL}/health`, () =>
				HttpResponse.json({ status: "degraded", service: "magpie", db: "down" }),
			),
		);
		renderUI(<BackendStatusDot />);
		const dot = screen.getByTestId("backend-status-dot");
		await waitFor(() => expect(dot.getAttribute("title")).toMatch(/degraded/));
	});

	it("renders down state when the endpoint is unreachable", async () => {
		server.use(http.get(`${API_URL}/health`, () => HttpResponse.error()));
		renderUI(<BackendStatusDot />);
		const dot = screen.getByTestId("backend-status-dot");
		await waitFor(() => expect(dot.getAttribute("title")).toMatch(/unreachable/));
	});

	it("does not poll while the tab is hidden, and starts when it becomes visible (REL-3)", async () => {
		let hits = 0;
		server.use(
			http.get(`${API_URL}/health`, () => {
				hits += 1;
				return HttpResponse.json({ status: "ok", service: "magpie", db: "ok" });
			}),
		);
		const visSpy = vi.spyOn(document, "visibilityState", "get");
		try {
			visSpy.mockReturnValue("hidden");
			renderUI(<BackendStatusDot />);
			const dot = screen.getByTestId("backend-status-dot");
			// Hidden on mount: no request issued, indicator stays in "checking" state.
			await new Promise((r) => setTimeout(r, 50));
			expect(hits).toBe(0);
			expect(dot.getAttribute("title")).toMatch(/checking/i);

			// Tab becomes visible → polling starts and health is fetched.
			visSpy.mockReturnValue("visible");
			document.dispatchEvent(new Event("visibilitychange"));
			await waitFor(() => expect(dot.getAttribute("title")).toMatch(/ok/));
			expect(hits).toBeGreaterThan(0);
		} finally {
			visSpy.mockRestore();
		}
	});
});
