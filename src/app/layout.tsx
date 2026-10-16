import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE } from "@/lib/site/config";
import { ROOT_VIEWPORT, rootMetadata } from "@/lib/site/metadata";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = rootMetadata(SITE);
export const viewport: Viewport = ROOT_VIEWPORT;

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
			<body className="relative min-h-full bg-background text-foreground bg-grid bg-scanlines">
				{children}
			</body>
		</html>
	);
}
