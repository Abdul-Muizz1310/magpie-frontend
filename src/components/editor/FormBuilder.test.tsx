import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderUI } from "../../../test/utils/render";
import { DEFAULT_CONFIG, FormBuilder } from "./FormBuilder";

describe("FormBuilder", () => {
	it("renders all SourceConfig sections", () => {
		const onChange = vi.fn();
		renderUI(<FormBuilder value={DEFAULT_CONFIG} onChange={onChange} />);
		expect(screen.getByText(/metadata/i)).toBeInTheDocument();
		expect(screen.getByText(/execution/i)).toBeInTheDocument();
		expect(screen.getByText(/^item$/i)).toBeInTheDocument();
		expect(screen.getByText(/pagination/i)).toBeInTheDocument();
		expect(screen.getByText(/^health$/i)).toBeInTheDocument();
	});

	it("hides wait_for + actions when render=false", () => {
		const onChange = vi.fn();
		renderUI(<FormBuilder value={DEFAULT_CONFIG} onChange={onChange} />);
		expect(screen.queryByPlaceholderText(/homepage-section/i)).toBeNull();
	});

	it("reveals wait_for + actions when render=true", () => {
		const onChange = vi.fn();
		renderUI(<FormBuilder value={{ ...DEFAULT_CONFIG, render: true }} onChange={onChange} />);
		expect(screen.getByPlaceholderText(/homepage-section/i)).toBeInTheDocument();
	});

	it("toggling render mode calls onChange with render flipped", async () => {
		const onChange = vi.fn();
		const { user } = renderUI(<FormBuilder value={DEFAULT_CONFIG} onChange={onChange} />);
		await user.click(screen.getByRole("button", { name: "js (playwright)" }));
		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ render: true }));
	});

	it("adding a field produces a new field entry", async () => {
		const onChange = vi.fn();
		const { user } = renderUI(<FormBuilder value={DEFAULT_CONFIG} onChange={onChange} />);
		await user.click(screen.getByRole("button", { name: "field" }));
		const updated = onChange.mock.calls[0][0];
		expect(updated.item.fields).toHaveLength(DEFAULT_CONFIG.item.fields.length + 1);
	});

	it("disables name input when disableNameEdit=true", () => {
		const onChange = vi.fn();
		renderUI(<FormBuilder value={DEFAULT_CONFIG} onChange={onChange} disableNameEdit />);
		const nameInput = screen.getByTestId("name-input");
		expect(nameInput).toBeDisabled();
	});

	it("renders field-level error messages from fieldErrors map", () => {
		const onChange = vi.fn();
		renderUI(
			<FormBuilder
				value={DEFAULT_CONFIG}
				onChange={onChange}
				fieldErrors={{ name: "already exists" }}
			/>,
		);
		expect(screen.getByText(/already exists/)).toBeInTheDocument();
	});
});
