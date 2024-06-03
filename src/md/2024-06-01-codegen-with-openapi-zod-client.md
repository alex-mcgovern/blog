---
title: Codegen with `openapi-zod-client`
description:
  How we saved hours at Fuse by generating validation schemas and types from
  OpenAPI specs.
---

## How we saved hours at Fuse by generating validation schemas and types from OpenAPI specs

At [Fuse](https://fuse.me), we're enabling payments over API across the Middle
East. I joined the team in 2023 to help build out the "Fuse Portal", a web app
to allow our customers to manage their accounts and transactions — a layer over
the public facing API.

The frontend and backend were built in tandem, meaning that the API was being
shaped and re-shaped frequently, and contracts could be broken on each new
release. We needed a way to ensure correctness on the frontend, and to be agile
about it, without blocking the backend team on every release.

### Enter `openapi-zod-client`

[`openapi-zod-client`](https://github.com/astahmer/openapi-zod-client) is a
nifty little library from [Alexandre Stahmer](https://github.com/astahmer) that
consumes an OpenAPI spec and generates
[`zod`](https://github.com/colinhacks/zod) schemas, type definitions and a
[`zodios`](https://github.com/ecyrbe/zodios) (`zod` + `axios`) client for you.

By using these types throughout our entire codebase, we could re-generate them
on every API change, and use `tsc` to quickly catch any breaking changes.

### Whoah, that's a lot of jargon, what are all these things?

So I've just mentioned a bunch of packages, and how `openapi-zod-client` brings
them together to create a lot of value. Let's break it down:

| Package  | Description                                                                                                                                                                                                                                                    |
| :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `zod`    | [Zod](https://github.com/colinhacks/zod) is the most ubiquitous runtime validation library in the JS ecosystem. For anything serious or mission critical, you really can't afford not to use something like this.                                              |
| `axios`  | [Axios](https://github.com/axios/axios) is another ubiquitous package, used for making HTTP requests in the browser and in Node.js. You've probably used this, thought it's star seems to be waning with the rise of the browser fetch API and `node-fetch`.   |
| `zodios` | [Zodios](https://github.com/ecyrbe/zodios) combines `zod` and `axios` to create a type-safe http client for your API. You get runtime schema validation on requests and responses, and intellisense for your API parameters — pretty damn nifty if you ask me. |

### Okay, but how do you use it?

`openapi-zod-client` can be called from the command line, or used
programmatically in your build process.

It expects an OpenAPI spec in JSON or YAML format, which we fetch from a private
Github repo using Githubs [`octokit`](https://github.com/octokit) Typescript
SDK.

```ts
import { Octokit } from "octokit";

// For simplicity, contributors authenticated with a personal access token
// with very org-level granular read-only permissions to a specific repo.
const octokit = new Octokit({
  auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
});

const { data } = await octokit.request(
  "GET /repos/{owner}/{repo}/contents/{path}",
  {
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
    owner: process.env.GITHUB_REPO_OWNER as string,
    path: path,
    repo: process.env.GITHUB_REPO_DEVELOPER_DOCS as string,
  },
);
```
