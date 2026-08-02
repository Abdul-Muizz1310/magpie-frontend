import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";

// Custom render that bundles user-event setup. Use this for any test that
// drives UI interactions; falls back to bare `render` for trivial assertions.
//
// `delay: null` disables user-event's inter-keystroke wait. The default (0)
// still yields a macrotask between every character, so a test typing a handful
// of fields racks up hundreds of timer round-trips and starts timing out on a
// loaded machine — the SourceEditor form tests flaked for exactly that reason.
// Nothing here depends on real inter-keystroke timing.
export function renderUI(ui: ReactElement, options?: RenderOptions) {
	return {
		user: userEvent.setup({ delay: null }),
		...render(ui, options),
	};
}
