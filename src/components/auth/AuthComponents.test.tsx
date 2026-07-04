import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routerSpies } from "../../../test/mocks/next-navigation";
import { renderUI } from "../../../test/utils/render";

vi.mock("@/lib/auth-actions", () => ({
	loginAction: vi.fn(),
	logoutAction: vi.fn(),
	getAuthState: vi.fn(),
}));

const authActions = await import("@/lib/auth-actions");
const loginAction = vi.mocked(authActions.loginAction);
const logoutAction = vi.mocked(authActions.logoutAction);
const getAuthState = vi.mocked(authActions.getAuthState);

const { LoginForm } = await import("./LoginForm");
const { AuthNavControl } = await import("./AuthNavControl");

afterEach(() => {
	loginAction.mockReset();
	logoutAction.mockReset();
	getAuthState.mockReset();
});

describe("LoginForm", () => {
	it("signs in and redirects to the `next` target on success", async () => {
		loginAction.mockResolvedValueOnce({ ok: true });
		const { user } = renderUI(<LoginForm next="/sources/new" />);
		await user.type(screen.getByLabelText(/admin password/i), "hunter2");
		await user.click(screen.getByRole("button", { name: /sign in/i }));
		await waitFor(() => expect(routerSpies.push).toHaveBeenCalledWith("/sources/new"));
		expect(loginAction).toHaveBeenCalledWith("hunter2");
	});

	it("shows the error and does not redirect on invalid password", async () => {
		loginAction.mockResolvedValueOnce({ ok: false, message: "Invalid password." });
		const { user } = renderUI(<LoginForm next="/" />);
		await user.type(screen.getByLabelText(/admin password/i), "wrong");
		await user.click(screen.getByRole("button", { name: /sign in/i }));
		expect(await screen.findByText(/invalid password/i)).toBeInTheDocument();
		expect(routerSpies.push).not.toHaveBeenCalled();
	});
});

describe("AuthNavControl", () => {
	it("shows a login link when unauthenticated", async () => {
		getAuthState.mockResolvedValueOnce(false);
		renderUI(<AuthNavControl />);
		await waitFor(() => expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument());
	});

	it("shows a logout control when authenticated and clears the session", async () => {
		getAuthState.mockResolvedValueOnce(true);
		logoutAction.mockResolvedValueOnce(undefined);
		const { user } = renderUI(<AuthNavControl />);
		const logout = await screen.findByRole("button", { name: /logout/i });
		await user.click(logout);
		await waitFor(() => expect(logoutAction).toHaveBeenCalled());
		expect(routerSpies.push).toHaveBeenCalledWith("/");
	});

	it("defaults to logged-out when the auth probe fails", async () => {
		getAuthState.mockRejectedValueOnce(new Error("no request scope"));
		renderUI(<AuthNavControl />);
		await waitFor(() => expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument());
	});
});
