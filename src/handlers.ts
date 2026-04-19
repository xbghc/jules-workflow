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
  autoCreatePr?: boolean;
}) {
  const { prompt, title, source, branch, autoCreatePr } = args;

  let repoSource = source;
  let repoBranch = branch;

  if (!repoSource || !repoBranch) {
    const repoInfo = getRepoInfo();
    repoSource = repoSource || repoInfo.source;
    repoBranch = repoBranch || repoInfo.branch;
  }

  const body: Record<string, unknown> = {
    prompt,
    title,
    sourceContext: {
      source: repoSource,
      githubRepoContext: {
        startingBranch: repoBranch,
      },
    },
  };
  if (autoCreatePr) {
    body.automationMode = "AUTO_CREATE_PR";
  }

  const result = await julesRequest("/sessions", "POST", body);

  const session = result as { id: string; name: string; url: string };
  return {
    sessionId: session.id,
    name: session.name,
    url: session.url,
    message: "Session created successfully",
  };
}

export async function handleListActivities(args: {
  sessionId: string;
  pageSize?: number;
  pageToken?: string;
}) {
  const { sessionId, pageSize, pageToken } = args;
  const params = new URLSearchParams();
  if (pageSize !== undefined) params.set("pageSize", String(pageSize));
  if (pageToken) params.set("pageToken", pageToken);
  const qs = params.toString();
  return julesRequest(
    `/sessions/${sessionId}/activities${qs ? `?${qs}` : ""}`,
  );
}

export async function handleListSources(args: {
  pageSize?: number;
  pageToken?: string;
  filter?: string;
}) {
  const { pageSize, pageToken, filter } = args;
  const params = new URLSearchParams();
  if (pageSize !== undefined) params.set("pageSize", String(pageSize));
  if (pageToken) params.set("pageToken", pageToken);
  if (filter) params.set("filter", filter);
  const qs = params.toString();
  return julesRequest(`/sources${qs ? `?${qs}` : ""}`);
}

export async function handleGetSource(args: { sourceId: string }) {
  const { sourceId } = args;
  const id = sourceId.startsWith("sources/")
    ? sourceId.slice("sources/".length)
    : sourceId;
  return julesRequest(`/sources/${id}`);
}

export async function handleGetPatch(args: { sessionId: string }) {
  const { sessionId } = args;
  const result = await julesRequest(
    `/sessions/${sessionId}/activities?pageSize=100`,
  );
  const data = result as {
    activities?: Array<{
      id: string;
      createTime?: string;
      artifacts?: Array<{
        changeSet?: {
          source?: string;
          gitPatch?: {
            baseCommitId?: string;
            unidiffPatch?: string;
            suggestedCommitMessage?: string;
          };
        };
      }>;
    }>;
  };

  const patches: Array<{
    activityId: string;
    createTime: string | null;
    source: string | null;
    baseCommitId: string | null;
    unidiffPatch: string;
    suggestedCommitMessage: string | null;
  }> = [];

  for (const activity of data.activities || []) {
    for (const artifact of activity.artifacts || []) {
      const patch = artifact.changeSet?.gitPatch;
      if (patch?.unidiffPatch) {
        patches.push({
          activityId: activity.id,
          createTime: activity.createTime ?? null,
          source: artifact.changeSet?.source ?? null,
          baseCommitId: patch.baseCommitId ?? null,
          unidiffPatch: patch.unidiffPatch,
          suggestedCommitMessage: patch.suggestedCommitMessage ?? null,
        });
      }
    }
  }

  return { sessionId, patches };
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

export async function handleDeleteSession(args: { sessionId: string }) {
  const { sessionId } = args;
  await julesRequest(`/sessions/${sessionId}`, "DELETE");
  return { success: true, message: "Session deleted successfully" };
}

export async function handleWaitSession(args: {
  sessionId: string;
  timeoutMinutes?: number;
  onPoll?: (snapshot: {
    id: string;
    title: string;
    state: string;
    url: string;
  }) => void;
}) {
  const { sessionId, timeoutMinutes, onPoll } = args;
  const timeoutMs = timeoutMinutes ? timeoutMinutes * 60 * 1000 : Infinity;
  const startTime = Date.now();
  const pollIntervalMs = 5 * 60 * 1000; // 5 minutes

  while (true) {
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

    onPoll?.({
      id: session.id,
      title: session.title,
      state: session.state,
      url: session.url,
    });

    const terminalStates = [
      "COMPLETED",
      "FAILED",
      "AWAITING_PLAN_APPROVAL",
      "AWAITING_USER_FEEDBACK",
    ];

    if (terminalStates.includes(session.state)) {
      return {
        id: session.id,
        title: session.title,
        state: session.state,
        url: session.url,
        prUrl: session.outputs?.[0]?.pullRequest?.url || null,
        message: `Session reached state: ${session.state}`,
      };
    }

    if (Date.now() - startTime + pollIntervalMs > timeoutMs) {
      const remainingMs = timeoutMs - (Date.now() - startTime);
      if (remainingMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingMs));
        const finalResult = await julesRequest(`/sessions/${sessionId}`);
        const finalSession = finalResult as typeof session;
        onPoll?.({
          id: finalSession.id,
          title: finalSession.title,
          state: finalSession.state,
          url: finalSession.url,
        });
        return {
          id: finalSession.id,
          title: finalSession.title,
          state: finalSession.state,
          url: finalSession.url,
          prUrl: finalSession.outputs?.[0]?.pullRequest?.url || null,
          message: `Wait timeout exceeded (${timeoutMinutes} minutes). Current state: ${finalSession.state}`,
        };
      }
      return {
        id: session.id,
        title: session.title,
        state: session.state,
        url: session.url,
        prUrl: session.outputs?.[0]?.pullRequest?.url || null,
        message: `Wait timeout exceeded (${timeoutMinutes} minutes). Current state: ${session.state}`,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}
