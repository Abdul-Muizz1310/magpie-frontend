import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
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
});
