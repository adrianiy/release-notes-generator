import { Connector } from "./connector";
import { Octokit } from "octokit";
import { GraphQlQueryResponseData } from "@octokit/graphql/dist-types/types";
import { PullRequest } from "./models/pullRequest";
import { Release } from "./models/release";
import { gitHubConnection } from "./../connections/github";
import prQuery from "./queries/pull_requests.graphql";
import releaseQuery from "./queries/latest_release.graphql";
import { promises as fs } from "fs";
import path from "path";

interface Edge<T> {
  cursor: string;
  node: T;
}

interface ShaResponse {
  data: {
    [key: string]: unknown;
    sha: string;
  };
}

export class GitHubConnector extends Connector {
  protected _connection!: Octokit;

  constructor() {
    super();
    this._connection = gitHubConnection(this._token);
  }

  async getLatestRelease(): Promise<Release> {
    const query = releaseQuery.loc!.source.body;

    const data = (await this._connection.graphql(query, {
      owner: this._owner,
      name: this._repo,
    })) as GraphQlQueryResponseData;

    return data.repository?.latestRelease;
  }

  async getPullRequests(since?: string): Promise<PullRequest[]> {
    const query = prQuery.loc!.source.body;
    const created = since ? `created:>${since}` : "";
    const queryString = `repo:${this._owner}/${this._repo} is:open is:pr ${created}`;
    const response: PullRequest[] = await this._paginatedResponse<PullRequest>(
      query,
      { queryString }
    );

    return response;
  }

  async publishChanges(): Promise<void> {
    const filePath = "RELEASE-NOTES.md";
    const sha = await this._getSha(filePath);
    const result = await this._publishCommit(filePath, sha);
    console.log(result);
  }

  protected _setRepositoryProperties(): void {
    const token = process.env.TOKEN!;
    const repository = process.env.GITHUB_REPOSITORY;
    const [owner, repo] = repository?.split("/") || [];

    this._token = token;
    this._owner = owner;
    this._repo = repo;
  }

  private async _paginatedResponse<T>(
    query: string,
    params: Record<string, unknown>,
    response: T[] = []
  ): Promise<T[]> {
    const data = (await this._connection.graphql(
      query,
      params
    )) as GraphQlQueryResponseData;
    const edges = data.search?.edges;

    edges?.forEach((edge: Edge<T>) => {
      params.cursor = edge.cursor;
      response.push(edge.node);
    });

    if (!edges?.length) {
      return response;
    }

    return this._paginatedResponse<T>(query, params, response);
  }

  private async _getSha(path: string): Promise<string | undefined> {
    try {
      const result = (await this._connection.rest.repos.getContent({
        owner: this._owner,
        repo: this._repo,
        path,
      })) as ShaResponse;

      const sha = result.data?.sha;

      return sha;
    } catch (_) {
      return undefined;
    }
  }

  private async _publishCommit(
    filePath: string,
    sha?: string
  ): Promise<number> {
    const content = await fs.readFile(path.join(filePath), {
      encoding: "base64",
    });
    const result = await this._connection.rest.repos.createOrUpdateFileContents(
      {
        owner: this._owner,
        repo: this._repo,
        path: filePath,
        message: `Chore: update RELEASE-NOTES`,
        content,
        sha,
      }
    );

    return result.status;
  }
}
