import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";

// Custom render that bundles user-event setup. Use this for any test that
// drives UI interactions; falls back to bare `render` for trivial assertions.
export function renderUI(ui: ReactElement, options?: RenderOptions) {
	return {
		user: userEvent.setup(),
		...render(ui, options),
	};
}
