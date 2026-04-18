import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routerSpies } from "../../../test/mocks/next-navigation";
import { makeSourceDetail } from "../../../test/msw/fixtures";
import { renderUI } from "../../../test/utils/render";
import { SourceEditor } from "./SourceEditor";

vi.mock("@/lib/actions", () => ({
	createSourceAction: vi.fn(),
	updateSourceAction: vi.fn(),
}));

const actions = await import("@/lib/actions");
const createSourceAction = vi.mocked(actions.createSourceAction);
const updateSourceAction = vi.mocked(actions.updateSourceAction);

afterEach(() => {
	createSourceAction.mockReset();
	updateSourceAction.mockReset();
});

describe("SourceEditor (create mode)", () => {
	it("starts in form mode for new sources", () => {
		renderUI(<SourceEditor mode="create" />);
		expect(screen.getByTestId("form-builder")).toBeInTheDocument();
	});

	it("toggles to YAML mode and renders the textarea", async () => {
		const { user } = renderUI(<SourceEditor mode="create" />);
		await user.click(screen.getByRole("button", { name: /^yaml$/i }));
		expect(screen.getByRole("textbox")).toBeInTheDocument();
	});

	it("blocks form→yaml round trip when YAML is invalid", async () => {
		const { user } = renderUI(<SourceEditor mode="create" />);
		await user.click(screen.getByRole("button", { name: /^yaml$/i }));
		const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
		// Set invalid YAML directly — user.type would interpret `[` as a modifier.
		await user.clear(textarea);
		await user.click(textarea);
		await user.paste("[1, 2, 3"); // unterminated flow sequence
		await user.click(screen.getByRole("button", { name: /^form$/i }));
		expect(await screen.findByText(/cannot switch mode/i)).toBeInTheDocument();
	});

	it("calls createSourceAction with config when submitting in form mode", async () => {
		createSourceAction.mockResolvedValueOnce({ ok: true, data: makeSourceDetail() });
		const { user } = renderUI(<SourceEditor mode="create" />);

		// Fill enough fields to satisfy basic SourceConfigSchema.
		await user.type(screen.getByTestId("name-input"), "my-source");
		const urlInput = screen.getByPlaceholderText(/news.ycombinator/i);
		await user.type(urlInput, "https://example.com");

		const containerInput = screen.getByPlaceholderText(/tr.athing/i);
		await user.type(containerInput, "article");

		// Field 0 selector input (placeholder "span.titleline > a::text")
		const fieldSelector = screen.getByPlaceholderText(/span.titleline/i);
		await user.type(fieldSelector, "h2::text");

		await user.click(screen.getByRole("button", { name: /create source/i }));

		await waitFor(() => expect(createSourceAction).toHaveBeenCalledTimes(1));
		const body = createSourceAction.mock.calls[0][0];
		expect(body.config).toBeDefined();
		expect(routerSpies.push).toHaveBeenCalledWith("/sources/custom-one");
	});

	it("renders 422 Pydantic issues inline", async () => {
		createSourceAction.mockResolvedValueOnce({
			ok: false,
			status: 422,
			message: "url: invalid url",
			issues: [{ loc: ["body", "url"], msg: "invalid url", type: "value_error" }],
		});
		const { user } = renderUI(<SourceEditor mode="create" />);
		await user.type(screen.getByTestId("name-input"), "my-source");
		await user.type(screen.getByPlaceholderText(/news.ycombinator/i), "https://example.com");
		await user.type(screen.getByPlaceholderText(/tr.athing/i), "a");
		await user.type(screen.getByPlaceholderText(/span.titleline/i), "b");
		await user.click(screen.getByRole("button", { name: /create source/i }));
		expect(await screen.findByText(/^validation failed$/i)).toBeInTheDocument();
		expect(screen.getAllByText(/invalid url/i).length).toBeGreaterThan(0);
	});

	it("renders 409 conflict as a banner", async () => {
		createSourceAction.mockResolvedValueOnce({
			ok: false,
			status: 409,
			message: "source 'my-source' already exists",
		});
		const { user } = renderUI(<SourceEditor mode="create" />);
		await user.type(screen.getByTestId("name-input"), "my-source");
		await user.type(screen.getByPlaceholderText(/news.ycombinator/i), "https://example.com");
		await user.type(screen.getByPlaceholderText(/tr.athing/i), "a");
		await user.type(screen.getByPlaceholderText(/span.titleline/i), "b");
		await user.click(screen.getByRole("button", { name: /create source/i }));
		expect(await screen.findByText(/^conflict$/i)).toBeInTheDocument();
		expect(screen.getByText(/already exists/i)).toBeInTheDocument();
	});
});

describe("SourceEditor (edit mode)", () => {
	it("prefills YAML textarea from initial.config_yaml", async () => {
		const initial = makeSourceDetail({
			name: "pre-filled",
			config_yaml: "name: pre-filled\nurl: https://example.com",
		});
		const { user } = renderUI(<SourceEditor mode="edit" initial={initial} />);
		await user.click(screen.getByRole("button", { name: /^yaml$/i }));
		const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
		expect(textarea.value).toContain("pre-filled");
	});

	it("calls updateSourceAction with the source name", async () => {
		const initial = makeSourceDetail({ name: "pre-filled" });
		updateSourceAction.mockResolvedValueOnce({ ok: true, data: initial });
		const { user } = renderUI(<SourceEditor mode="edit" initial={initial} />);
		await user.click(screen.getByRole("button", { name: /save changes/i }));
		await waitFor(() => expect(updateSourceAction).toHaveBeenCalledTimes(1));
		const [name] = updateSourceAction.mock.calls[0];
		expect(name).toBe("pre-filled");
	});
});
