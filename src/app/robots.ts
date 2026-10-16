import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site/config";
import { robotsFile } from "@/lib/site/metadata";

export default function robots(): MetadataRoute.Robots {
	return robotsFile(SITE);
}
