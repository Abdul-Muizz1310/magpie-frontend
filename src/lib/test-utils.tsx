import { render } from "@testing-library/react";
import type { ReactElement } from "react";

/**
 * Custom render that wraps components with any providers needed for testing.
 * For now it's a pass-through — add providers as needed.
 */
export function renderPage(ui: ReactElement) {
	return render(ui);
}
