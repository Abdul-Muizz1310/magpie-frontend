import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { API_URL, makeRun, makeRunItem, UUID_A } from "../../../test/msw/fixtures";
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
			http.get(`${API_URL}/api/runs/${UUID_A}/items`, () => HttpResponse.json([])),
		);
		renderUI(<LiveRunView runId={UUID_A} />);
		await waitFor(() => expect(screen.getByText(/run finished/i)).toBeInTheDocument());
		expect(screen.getByText(/7 new/)).toBeInTheDocument();
	});

	it("renders scraped items once status is ok", async () => {
		server.use(
			http.get(`${API_URL}/api/runs/${UUID_A}`, () => HttpResponse.json(makeRun({ status: "ok" }))),
			http.get(`${API_URL}/api/runs/${UUID_A}/items`, () =>
				HttpResponse.json([
					makeRunItem({ title: "First item", url: "https://x.example/1" }),
					makeRunItem({
						stable_id: "item-2",
						title: "Second item",
						url: "https://x.example/2",
						id: "99999999-1111-4111-8111-111111111111",
					}),
				]),
			),
		);
		renderUI(<LiveRunView runId={UUID_A} />);
		await waitFor(() =>
			expect(screen.getByRole("link", { name: /first item/i })).toBeInTheDocument(),
		);
		expect(screen.getByRole("link", { name: /second item/i })).toBeInTheDocument();
		expect(screen.getByText(/items \(2\)/i)).toBeInTheDocument();
	});

	it("shows items-load error if /items fails after ok", async () => {
		server.use(
			http.get(`${API_URL}/api/runs/${UUID_A}`, () => HttpResponse.json(makeRun({ status: "ok" }))),
			http.get(`${API_URL}/api/runs/${UUID_A}/items`, () =>
				HttpResponse.json({ detail: "broken" }, { status: 500 }),
			),
		);
		renderUI(<LiveRunView runId={UUID_A} />);
		await waitFor(() => expect(screen.getByText(/failed to load items/i)).toBeInTheDocument());
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

	it("shows the scrape error when run.status is error and skips items fetch", async () => {
		server.use(
			http.get(`${API_URL}/api/runs/${UUID_A}`, () =>
				HttpResponse.json(makeRun({ status: "error", error: "selector broke" })),
			),
		);
		renderUI(<LiveRunView runId={UUID_A} />);
		await waitFor(() => expect(screen.getByText(/scrape error/i)).toBeInTheDocument());
		expect(screen.getByText("selector broke")).toBeInTheDocument();
		// No items panel on error state.
		expect(screen.queryByText(/scraped/i)).toBeNull();
	});
});
