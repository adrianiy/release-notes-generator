import { CliParams } from 'commander/options';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

const FILE_EXT = ['.yml', '.json'];

export interface Webhook {
    url?: string;
    activityTitle?: string;
    activitySubtitle?: string;
    activityImage?: string;
    actions?: unknown[];
}

export interface Customization {
    [key: string]: Record<string, string>;
}

export interface Notification {
    style: Customization;
}

export interface Preview {
    issue?: number;
    header?: string;
    footer?: string;
}

export interface Labels {
    // Only PRs with this labels will be included in MD
    include?: string[];
    // PRs with these labels will be ignored
    ignore?: string[];
    // Once RELEASE NOTES are generated PRs will be tagged with this labels
    end?: string[];
}

export interface Configuration {
    // GITHUB authorization token
    token?: string;
    // GITHUB REPO in user/repo format
    repo?: string;
    // Output path
    out?: string;
    // Output fileName
    name?: string;
    // File sufix for splitted content
    suffix?: string;
    // File format
    format?: string;
    // Only PRs with this labels will be included in MD
    labels?: Labels;
    // PR query filter
    filter?: string;
    // Start date in pull request filter query
    since?: string;
    // Ignore text inside this tag
    ignoreTag?: string;
    // Generates snapshot release notes (from latest release)
    snapshot?: boolean;
    // Split Release-Notes on file per Relase
    // This option will create a folder in `out` dir.
    split?: boolean;
    // Should comment on especified Issue
    preview?: Preview;
    // Should we publish changes?
    publish?: boolean;
    // Commit message
    message?: string;
    // This assets will be updloaded too in publish process
    assets?: string[];
    // Branch where output will be uploaded
    branch?: string;
    // Markdown header
    header?: string;
    // Markdown title
    title?: string;
    // Notes decoration according to type
    decoration?: Record<string, string>;
    // Order of issue types in release notes 
    order?: string[];
    // Webhooks lis
    webhooks?: Record<string, Webhook>;
    // Notification configuration
    notification?: Notification;
}

const defaultConfiguration: Configuration = {
    token: 'GITHUB_TOKEN',
    out: '.',
    name: 'RELEASE-NOTES',
    format: '.md',
    labels: {
        include: ['release-note'],
        ignore: ['in-release-note'],
        end: ['in-release-note'],
    },
    preview: {
        header: '### :book::rocket: RELEASE NOTES Preview',
        footer: 'Generated with [RNG](https://github.com/adrianiy/release-notes-generator) :robot:',
    },
    publish: false,
    snapshot: false,
    message: 'chore: update RELEASE-NOTES',
    branch: 'main',
    filter: 'is:closed',
    ignoreTag: '<!--release-notes-ignore-->',
    assets: [],
    webhooks: {},
    title: 'RELEASE NOTES',
    decoration: {
        enhancement: '## :zap: ',
        bug: '## :bug: ',
        refactor: '## :abacus: ',
        release: '# :rocket: ',
        style: '## :nailcare: ',
        documentation: '## :book: ',
    },
    order: [
        'release',
        'refactor',
        'enhancement',
        'bug',
        'style',
        'documentation'
    ],
    notification: {
        style: {
            h1: { 'font-size': '3rem', 'margin-top': '2rem' },
            h2: { 'font-size': '2rem', 'margin-top': '3rem' },
            h3: { 'font-size': '1.8rem', 'margin': '2rem 0' },
            h6: { 'font-size': '.9em', 'opacity': '.7' },
            p: { 'font-size': '1.4rem' },
            li: { 'margin-bottom': '8px' },
            pre: { 'margin-bottom': '.7rem' },
        },
    },
};

const searchExistentFileExt = (fileName: string): string | undefined => {
    return FILE_EXT.find((ext: string) => fs.existsSync(path.join(`${fileName}${ext}`)));
};

const loadFile = (fileName: string, ext: string): Configuration => {
    const filePath = path.join(`${fileName}${ext}`);
    const file = fs.readFileSync(filePath, 'utf8');

    switch (ext) {
        case '.yml':
            return yaml.parse(file);
        case '.json':
            return JSON.parse(file);
        default:
            return {} as Configuration;
    }
};

const loadCustomConfig = (configuration: string): Configuration => {
    const extIndex = configuration.lastIndexOf('.');
    const fileName = configuration.substr(0, extIndex);
    const ext = configuration.substr(extIndex);

    return loadFile(fileName, ext!);
};

const loadDefaultConfig = (): Configuration => {
    const fileName = '.releasenotesrc';
    const ext = searchExistentFileExt(fileName);

    return loadFile(fileName, ext!);
};

export const getConfiguration = (cliConfig: CliParams = {}): Configuration => {
    const { configuration, issue } = cliConfig;

    const config = configuration ? loadCustomConfig(configuration) : loadDefaultConfig();
    const decoration = { ...defaultConfiguration.decoration, ...config?.decoration };
    const preview = { ...defaultConfiguration.preview, ...config?.preview, issue };

    return { ...defaultConfiguration, ...config, ...cliConfig, decoration, preview };
};
