"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, fetchRun } from "@/lib/api";
import type { Run } from "@/lib/schemas";

export type PollState =
	| { kind: "idle" }
	| { kind: "loading"; run?: Run; attempt: number }
	| { kind: "done"; run: Run }
	| { kind: "error"; message: string; status?: number };

const BACKOFF_SCHEDULE_MS = [1_000, 2_000, 3_000, 5_000, 5_000, 8_000, 10_000];
const MAX_TRANSIENT_RETRIES = 3;

function delayForAttempt(attempt: number): number {
	const idx = Math.min(attempt, BACKOFF_SCHEDULE_MS.length - 1);
	return BACKOFF_SCHEDULE_MS[idx];
}

function isTerminal(status: Run["status"]): boolean {
	return status === "ok" || status === "error";
}

export function useRunPoll(runId: string | null): PollState {
	const [state, setState] = useState<PollState>(() =>
		runId ? { kind: "loading", attempt: 0 } : { kind: "idle" },
	);
	const stateRef = useRef(state);
	stateRef.current = state;

	const runPoll = useCallback((id: string, abort: AbortSignal) => {
		let attempt = 0;
		let transientFailures = 0;
		let cancelled = false;
		let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

		async function tick() {
			if (cancelled || abort.aborted) return;
			try {
				const run = await fetchRun(id, abort);
				transientFailures = 0;
				if (cancelled || abort.aborted) return;
				if (isTerminal(run.status)) {
					setState({ kind: "done", run });
					return;
				}
				setState({ kind: "loading", run, attempt });
				attempt += 1;
				timeoutHandle = setTimeout(tick, delayForAttempt(attempt));
			} catch (e) {
				if (abort.aborted || cancelled) return;
				if (e instanceof ApiError && e.status === 404) {
					setState({ kind: "error", message: "Run not found", status: 404 });
					return;
				}
				if (e instanceof ApiError && e.status >= 500 && transientFailures < MAX_TRANSIENT_RETRIES) {
					transientFailures += 1;
					attempt += 1;
					timeoutHandle = setTimeout(tick, delayForAttempt(attempt));
					return;
				}
				setState({
					kind: "error",
					message: e instanceof Error ? e.message : "Poll failed",
					status: e instanceof ApiError ? e.status : undefined,
				});
			}
		}

		tick();
		return () => {
			cancelled = true;
			if (timeoutHandle) clearTimeout(timeoutHandle);
		};
	}, []);

	useEffect(() => {
		if (!runId) {
			setState({ kind: "idle" });
			return;
		}
		setState({ kind: "loading", attempt: 0 });
		const controller = new AbortController();
		const cancel = runPoll(runId, controller.signal);
		return () => {
			cancel();
			controller.abort();
		};
	}, [runId, runPoll]);

	return state;
}
