import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	cacheComponents: true,
	// Next 16.4 warns until this is set. `false` keeps the prefetch behaviour the app shipped with;
	// adopting Partial Prefetching changes what every <Link> prefetches, so it is a separate change
	// (node_modules/next/dist/docs/01-app/02-guides/adopting-partial-prefetching.md).
	partialPrefetching: false,
};

export default nextConfig;
