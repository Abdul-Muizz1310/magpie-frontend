import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site/config";
import { webManifest } from "@/lib/site/metadata";

export default function manifest(): MetadataRoute.Manifest {
	return webManifest(SITE);
}
