import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { API_URL, makeRun, UUID_A } from "../../test/msw/fixtures";
import { server } from "../../test/msw/server";
import { useRunPoll } from "./useRunPoll";

describe("useRunPoll", () => {
	it("reaches 'done' when backend returns status=ok", async () => {
		server.use(
			http.get(`${API_URL}/api/runs/${UUID_A}`, () =>
				HttpResponse.json(makeRun({ status: "ok", items_new: 5, duration_ms: 60_000 })),
			),
		);
		const { result } = renderHook(() => useRunPoll(UUID_A));
		await waitFor(() => expect(result.current.kind).toBe("done"));
		if (result.current.kind === "done") {
			expect(result.current.run.status).toBe("ok");
			expect(result.current.run.items_new).toBe(5);
		}
	});

	it("is idle when runId is null", () => {
		const { result } = renderHook(() => useRunPoll(null));
		expect(result.current.kind).toBe("idle");
	});

	it("surfaces 404 as error state", async () => {
		server.use(
			http.get(`${API_URL}/api/runs/${UUID_A}`, () =>
				HttpResponse.json({ detail: "not found" }, { status: 404 }),
			),
		);
		const { result } = renderHook(() => useRunPoll(UUID_A));
		await waitFor(() => expect(result.current.kind).toBe("error"));
		if (result.current.kind === "error") expect(result.current.status).toBe(404);
	});

	it("transitions through queued → running → ok", async () => {
		let call = 0;
		server.use(
			http.get(`${API_URL}/api/runs/${UUID_A}`, () => {
				call += 1;
				if (call === 1) return HttpResponse.json(makeRun({ status: "queued", ended_at: null }));
				if (call === 2) return HttpResponse.json(makeRun({ status: "running", ended_at: null }));
				return HttpResponse.json(makeRun({ status: "ok" }));
			}),
		);
		const { result } = renderHook(() => useRunPoll(UUID_A));
		await waitFor(() => expect(result.current.kind).toBe("done"), { timeout: 15_000 });
		expect(call).toBeGreaterThanOrEqual(3);
	}, 20_000);

	it("retries transient 5xx then succeeds", async () => {
		let call = 0;
		server.use(
			http.get(`${API_URL}/api/runs/${UUID_A}`, () => {
				call += 1;
				if (call === 1) return HttpResponse.json({ detail: "temporary" }, { status: 503 });
				return HttpResponse.json(makeRun({ status: "ok" }));
			}),
		);
		const { result } = renderHook(() => useRunPoll(UUID_A));
		await waitFor(() => expect(result.current.kind).toBe("done"), { timeout: 15_000 });
		expect(call).toBe(2);
	}, 20_000);

	it("surfaces non-retryable client errors as error state", async () => {
		server.use(
			http.get(`${API_URL}/api/runs/${UUID_A}`, () =>
				HttpResponse.json({ detail: "bad request" }, { status: 400 }),
			),
		);
		const { result } = renderHook(() => useRunPoll(UUID_A));
		await waitFor(() => expect(result.current.kind).toBe("error"));
	});
});
