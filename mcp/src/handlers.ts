import { julesRequest, getRepoInfo } from "./api.js";

export async function handleSendMessage(args: {
  sessionId: string;
  message: string;
}) {
  const { sessionId, message } = args;
  await julesRequest(`/sessions/${sessionId}:sendMessage`, "POST", {
    prompt: message,
  });
  return { success: true, message: "Message sent successfully" };
}

export async function handleApprovePlan(args: { sessionId: string }) {
  const { sessionId } = args;
  await julesRequest(`/sessions/${sessionId}:approvePlan`, "POST", {});
  return { success: true, message: "Plan approved successfully" };
}

export async function handleCreateSession(args: {
  prompt: string;
  title: string;
  source?: string;
  branch?: string;
}) {
  const { prompt, title, source, branch } = args;

  let repoSource = source;
  let repoBranch = branch;

  if (!repoSource || !repoBranch) {
    const repoInfo = getRepoInfo();
    repoSource = repoSource || repoInfo.source;
    repoBranch = repoBranch || repoInfo.branch;
  }

  const result = await julesRequest("/sessions", "POST", {
    prompt,
    title,
    sourceContext: {
      source: repoSource,
      githubRepoContext: {
        startingBranch: repoBranch,
      },
    },
    automationMode: "AUTO_CREATE_PR",
  });

  const session = result as { id: string; name: string; url: string };
  return {
    sessionId: session.id,
    name: session.name,
    url: session.url,
    message: "Session created successfully",
  };
}

export async function handleListSessions(args: { pageSize?: number }) {
  const { pageSize = 10 } = args;
  const result = await julesRequest(`/sessions?pageSize=${pageSize}`);
  const data = result as {
    sessions?: Array<{
      id: string;
      title: string;
      state: string;
      url: string;
    }>;
  };

  return (data.sessions || []).map((s) => ({
    id: s.id,
    title: s.title,
    state: s.state,
    url: s.url,
  }));
}

export async function handleGetSession(args: { sessionId: string }) {
  const { sessionId } = args;
  const result = await julesRequest(`/sessions/${sessionId}`);
  const session = result as {
    id: string;
    title: string;
    state: string;
    url: string;
    outputs?: Array<{
      pullRequest?: {
        url: string;
        title: string;
      };
    }>;
  };

  const prUrl = session.outputs?.[0]?.pullRequest?.url;

  return {
    id: session.id,
    title: session.title,
    state: session.state,
    url: session.url,
    prUrl: prUrl || null,
  };
}
