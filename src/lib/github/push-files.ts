import { Octokit } from "@octokit/rest";

export class GitHubPushError extends Error {
  constructor(
    message: string,
    readonly code: "AUTH" | "REPO" | "EMPTY" | "UNKNOWN",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "GitHubPushError";
  }
}

/**
 * Creates a single commit that adds/updates all paths (blob tree + commit).
 * Expects the branch to already exist (e.g. default branch with initial commit).
 */
export async function pushFilesToGitHubBranch(params: {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  files: Record<string, string>;
  commitMessage: string;
}): Promise<{ commitHtmlUrl: string }> {
  const octokit = new Octokit({ auth: params.token });
  const { owner, repo, branch } = params;
  const ref = `heads/${branch}`;

  let tipSha: string;
  try {
    const { data: refData } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref,
    });
    tipSha = refData.object.sha;
  } catch (cause: unknown) {
    const status = (cause as { status?: number })?.status;
    if (status === 401 || status === 403) {
      throw new GitHubPushError(
        "GitHub rejected this token (check Fine-grained or classic PAT scopes: Contents read/write, Metadata read).",
        "AUTH",
        { cause },
      );
    }
    throw new GitHubPushError(
      `Branch "${branch}" not found. Create the GitHub repo with an initial commit on this branch, then try again.`,
      "EMPTY",
      { cause },
    );
  }

  const { data: tipCommit } = await octokit.rest.git.getCommit({
    owner,
    repo,
    commit_sha: tipSha,
  });
  const baseTreeSha = tipCommit.tree.sha;

  const treeItems = await Promise.all(
    Object.entries(params.files).map(async ([rawPath, content]) => {
      const path = rawPath.replace(/^\/+/, "");
      if (!path || path.includes("..")) {
        throw new GitHubPushError(`Unsafe file path: ${rawPath}`, "UNKNOWN");
      }

      const { data: blob } = await octokit.rest.git.createBlob({
        owner,
        repo,
        content: Buffer.from(content, "utf8").toString("base64"),
        encoding: "base64",
      });

      return {
        path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blob.sha,
      };
    }),
  );

  const { data: newTree } = await octokit.rest.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: treeItems,
  });

  const { data: newCommit } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: params.commitMessage,
    tree: newTree.sha,
    parents: [tipSha],
  });

  await octokit.rest.git.updateRef({
    owner,
    repo,
    ref,
    sha: newCommit.sha,
  });

  const { data: repoView } = await octokit.rest.repos.get({ owner, repo });
  return {
    commitHtmlUrl: `${repoView.html_url}/commit/${newCommit.sha}`,
  };
}
