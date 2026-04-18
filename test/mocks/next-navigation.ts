import { vi } from "vitest";

// Shared spies so tests can assert calls without fetching the module twice.
export const routerSpies = {
	push: vi.fn(),
	replace: vi.fn(),
	back: vi.fn(),
	forward: vi.fn(),
	refresh: vi.fn(),
	prefetch: vi.fn(),
};

export function resetRouterSpies() {
	for (const spy of Object.values(routerSpies)) spy.mockClear();
}

vi.mock("next/navigation", () => ({
	useRouter: () => routerSpies,
	usePathname: () => "/",
	useSearchParams: () => new URLSearchParams(""),
	useParams: () => ({}),
	redirect: vi.fn(),
	notFound: vi.fn(),
}));
