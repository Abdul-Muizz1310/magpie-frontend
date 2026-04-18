import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { API_URL, makeRun, UUID_A } from "../../../test/msw/fixtures";
import { server } from "../../../test/msw/server";
import { renderUI } from "../../../test/utils/render";
import { LiveRunView } from "./LiveRunView";

describe("LiveRunView", () => {
	it("renders loading state initially", () => {
		renderUI(<LiveRunView runId={UUID_A} />);
		expect(screen.getByText(/queued — waiting for worker/i)).toBeInTheDocument();
	});

	it("transitions to done state with stats when backend returns ok", async () => {
		server.use(
			http.get(`${API_URL}/api/runs/${UUID_A}`, () =>
				HttpResponse.json(makeRun({ status: "ok", items_new: 7 })),
			),
		);
		renderUI(<LiveRunView runId={UUID_A} />);
		await waitFor(() => expect(screen.getByText(/run finished/i)).toBeInTheDocument());
		expect(screen.getByText(/7 new/)).toBeInTheDocument();
	});

	it("shows error panel when backend returns 404", async () => {
		server.use(
			http.get(`${API_URL}/api/runs/${UUID_A}`, () =>
				HttpResponse.json({ detail: "gone" }, { status: 404 }),
			),
		);
		renderUI(<LiveRunView runId={UUID_A} />);
		await waitFor(() => expect(screen.getByText(/run polling failed/i)).toBeInTheDocument());
	});

	it("shows the scrape error when run.status is error", async () => {
		server.use(
			http.get(`${API_URL}/api/runs/${UUID_A}`, () =>
				HttpResponse.json(makeRun({ status: "error", error: "selector broke" })),
			),
		);
		renderUI(<LiveRunView runId={UUID_A} />);
		await waitFor(() => expect(screen.getByText(/scrape error/i)).toBeInTheDocument());
		expect(screen.getByText("selector broke")).toBeInTheDocument();
	});
});
