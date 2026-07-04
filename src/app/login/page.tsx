import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { PageFrame } from "@/components/terminal/PageFrame";
import { Prompt } from "@/components/terminal/Prompt";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import { isAdminConfigured } from "@/lib/auth";

export const metadata: Metadata = {
	title: "sign in — magpie",
	description: "Authenticate to create, edit, or delete scrapers.",
};

export default async function LoginPage(props: {
	searchParams: Promise<{ next?: string }>;
}): Promise<React.JSX.Element> {
	const { next } = await props.searchParams;
	// Only allow same-origin relative redirects to avoid open-redirect abuse.
	const safeNext =
		typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
	const configured = isAdminConfigured();

	return (
		<PageFrame statusLeft="magpie.dev ~/login" statusRight="auth">
			<div className="mx-auto flex w-full max-w-md flex-col gap-8">
				<section className="flex flex-col gap-3">
					<Prompt kind="comment">magpie auth login</Prompt>
					<h1 className="font-mono text-3xl font-bold tracking-tight text-foreground">
						sign <span className="text-accent-emerald">in</span>
					</h1>
					<p className="text-sm leading-relaxed text-fg-muted">
						Creating, editing, deleting sources and triggering scrapes are admin-only. Read-only
						browsing needs no sign-in.
					</p>
				</section>
				<TerminalWindow
					title="auth.login"
					statusDot={configured ? "emerald" : "yellow"}
					statusLabel={configured ? "ready" : "disabled"}
				>
					{configured ? (
						<LoginForm next={safeNext} />
					) : (
						<div className="flex items-center gap-2 font-mono text-sm text-warning">
							<Lock className="h-4 w-4" />
							Admin actions are disabled: the server has no MAGPIE_ADMIN_SECRET configured.
						</div>
					)}
				</TerminalWindow>
			</div>
		</PageFrame>
	);
}
