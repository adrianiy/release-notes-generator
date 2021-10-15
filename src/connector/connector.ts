import { Octokit } from 'octokit';
import { Configuration } from '../configuration/configuration';
import { PullRequest } from './models/pullRequest';
import { Release } from './models/release';

export abstract class Connector {
    protected _owner!: string;
    protected _repo!: string;
    protected _token!: string;
    protected _connection!: Octokit;
    protected _configuration!: Configuration;

    constructor(configuration: Configuration) {
        this._configuration = configuration;
        this._setRepositoryProperties();
    }

    abstract getLatestRelease(): Promise<Release>;
    abstract getPullRequests(since?: string): Promise<PullRequest[]>;
    abstract publishChanges(): Promise<void>;

    protected abstract _setRepositoryProperties(): void;
}
