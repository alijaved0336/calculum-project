import { execFileSync } from "node:child_process";

const FEED_URL =
  "https://pkgs.dev.azure.com/calculum/AI Negotiation/_packaging/calculum-packages/npm/registry/";
const PACKAGE_NAME = "calculum-ui";

const pat = process.env.CALCULUM_FEED_PAT;
if (!pat) {
  console.error(
    "CALCULUM_FEED_PAT is not set. Export the Azure Artifacts feed PAT (same one used in .npmrc) before running this script."
  );
  process.exit(1);
}

// Matches .npmrc's `_authToken=${CALCULUM_FEED_PAT}` — pnpm sends that as a raw
// Bearer token, not Basic-encoded, and that's the scheme already confirmed working
// against this feed.
const res = await fetch(`${FEED_URL}${PACKAGE_NAME}`, {
  headers: { Authorization: `Bearer ${pat}` },
});

if (!res.ok) {
  console.error(
    `Failed to fetch "${PACKAGE_NAME}" metadata from the feed: ${res.status} ${res.statusText}`
  );
  process.exit(1);
}

const metadata = await res.json();

// Optional: `pnpm run update:calculum-ui -- 1.0.97300` pins that exact version
// instead of resolving "latest".
const requestedVersion = process.argv[2];
let version;
if (requestedVersion) {
  if (!metadata.versions?.[requestedVersion]) {
    console.error(
      `Version "${requestedVersion}" was not found on the feed. Run "pnpm run calculum-ui:versions" to see what's published.`
    );
    process.exit(1);
  }
  version = requestedVersion;
} else {
  version = metadata["dist-tags"]?.latest ?? highestVersion(metadata.versions);
  if (!version) {
    console.error("Could not determine the latest version from the feed's package metadata.");
    process.exit(1);
  }
}

const tarballUrl = `${FEED_URL}${PACKAGE_NAME}/-/${PACKAGE_NAME}-${version}.tgz`;

console.log(
  requestedVersion
    ? `Pinning apps/ap to requested version: ${version}`
    : `Latest ${PACKAGE_NAME} version on the feed: ${version}`
);
console.log(`Pinning apps/ap to: ${tarballUrl}`);

const isWindows = process.platform === "win32";
const packageSpec = `${PACKAGE_NAME}@${tarballUrl}`;
execFileSync(
  "pnpm",
  ["add", isWindows ? `"${packageSpec}"` : packageSpec, "--filter", "@ada/ap"],
  { stdio: "inherit", shell: isWindows }
);

function highestVersion(versions) {
  // Prereleases (e.g. 1.0.97300-beta.1) are skipped so the fallback never pins one.
  const keys = Object.keys(versions ?? {}).filter((v) => /^\d+(\.\d+)*$/.test(v));
  if (keys.length === 0) return undefined;
  return keys.sort(compareSemver).pop();
}

// Only called with purely numeric versions (see highestVersion), so Number() never yields NaN.
function compareSemver(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
