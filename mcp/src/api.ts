import { execSync } from "child_process";

const JULES_API_BASE = "https://jules.googleapis.com/v1alpha";

export function getApiKey(): string {
  const key = process.env.GOOGLE_JULES_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_JULES_API_KEY environment variable is not set");
  }
  return key;
}

export function getRepoInfo(): { source: string; branch: string } {
  const remoteUrl = execSync("git remote get-url origin", {
    encoding: "utf-8",
  }).trim();
  const match = remoteUrl.match(/github\.com[:/]([^/]+\/[^/.]+)/);
  if (!match) {
    throw new Error("Could not parse GitHub repo from remote URL");
  }
  const repoPath = match[1].replace(/\.git$/, "");
  const branch = execSync("git branch --show-current", {
    encoding: "utf-8",
  }).trim();
  return {
    source: `sources/github/${repoPath}`,
    branch: branch || "main",
  };
}

export async function julesRequest(
  endpoint: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: object
): Promise<unknown> {
  const apiKey = getApiKey();
  const url = `${JULES_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Jules API error: ${response.status} - ${error}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : {};
}
