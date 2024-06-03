---
title: Saving hundreds of hours with codegen, OpenAPI and Zod
description:
  How we saved hours at Fuse by generating validation schemas and types from
  OpenAPI specs.
---

# Saving hundreds of hours with codegen, OpenAPI and Zod

At [Fuse](https://fuse.me), we're enabling payments over API across the Middle
East. I joined the team in 2023 to help build out the "Fuse Portal", a web app
to allow our customers to manage their accounts and transactions — a layer over
the public facing API.

## The problem: API contracts constantly shifting

The frontend and backend were built in tandem, meaning that the API was being
shaped and re-shaped frequently, and contracts could be broken on each new
release. We needed a way to ensure correctness on the frontend, and to be agile
about it, without blocking the backend team on every release.

## The solution: `openapi-zod-client`

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

It expects an OpenAPI spec in JSON or YAML format. This can be referenced from any location, e.g. a local file, or a remote URL. For our use case, we fetched it each time from a private
Github repo using Githubs [`octokit`](https://github.com/octokit) Typescript
SDK.

```ts
import { Octokit } from "octokit";

// Contributors authenticate with a personal access token
// with very granular read-only permissions to the repo.
const octokit = new Octokit({
  auth: {TOKEN},
});

const { data } = await octokit.request(
  "GET /repos/{owner}/{repo}/contents/{path}",
  {
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
    owner: {ORG}, // e.g. acme-corp
    path: {PATH}, // e.g. openapi.yaml
    repo: {REPO}, // e.g. docs
  },
);
```

Once we've fetched the OpenAPI spec as `data`, we can parse it with `SwaggerParser` and generate the `zod` schemas and types.

`openapi-zod-client` uses Handlebars templates when writing the output, with some examples provided in the repo. We used the [default template](https://github.com/astahmer/openapi-zod-client/blob/main/lib/src/templates/default.hbs) with some light modifications to override some parameters.

Then we can generate the client from our build script like this:

```ts
import SwaggerParser from "@apidevtools/swagger-parser";
import { generateZodClientFromOpenAPI } from "openapi-zod-client";

// Note: `data` is the response from the octokit request, which 
// contains a `download_url` pointing to the raw OpenAPI spec.
const openApiDoc = (await SwaggerParser.parse(data.download_url));

await generateZodClientFromOpenAPI({
  distPath: "lib/api/client.ts",
  openApiDoc,
  options: {
    apiClientName: "apiClient",
    baseUrl: "https://api.acme-corp.com", 
  },
  templatePath: "lib/api/template.hbs", // The previously mentioned template
})
```

The output of this process is a set of `zod` schemas, types, and a `zodios` client, which can be imported into your codebase.

> [!NOTE]
> For confidentiality reasons, the following code snippets are illustrative and do not represent any actual API or schema.

```ts
import { z } from 'zod'
import { Zodios, makeApi } from '@zodios/core'

// Each component schema is converted into a Zod schema
const initiatePaymentRequest = z.object({
  amount: z.number().int().gte(0),
  reference: z.string().max(36),
  from_account: z.string().uuid(),
  beneficiary: z.object({
    name: z.string().max(255),
    iban: z.string(),
    bic_code: z.string(),
  }),
})
const initiatePaymentResponse = z.object({
  payment_id: z.string().uuid(),
})

// And then we can infer Typescript types from the schema
type InitiatePaymentRequest = z.infer<typeof initiatePaymentRequest>
type InitiatePaymentResponse = z.infer<typeof initiatePaymentResponse>

// An API definition is automatically generated as well
const endpoints = makeApi([
  {
    alias: 'initiatePayment',
    description: 'Initiate a payment',
    errors: [
      {
        description: 'Unable to complete request with data provided',
        schema: z.void(),
        status: 400,
      },
    ],
    method: 'post',
    parameters: [
      {
        name: 'body',
        schema: initiatePaymentRequest,
        type: 'Body',
      },
    ],
    path: '/v1/initiate-payment',
    requestFormat: 'json',
    response: initiatePaymentResponse,
  },
])

// And finally, we can export a Zodios instance, that allows us to make
// requests with type safety and validation both on the request and response
export const apiClient = new Zodios('https://api.acme-corp.com', endpoints)
```

With all of that setup, calling your API from your application becomes very simple.

Here's an example of how you might wire up a form submission:

```ts /body/1 /response/1 /error/1 
const onSubmit = async (data: InitiatePaymentRequest) => {
  apiClient
    .initiatePayment({
      body: data,
      headers: {
        Authorization: token,
      },
    })
    .then((response) => {
      redirect(`/payment/${response.payment_id}`)
    })
    .catch((error) => {
      Sentry.captureException(error)
      toast.error(error.message)
    })
}
```

Some things to note here are: 

- `body`, `response`, and `error` are all typed, so you get intellisense for free.
- The request is validated at runtime, so you can be sure that the data you're sending is correct.
- The response is validated at runtime, so you can be sure that the data you're receiving is correct.
- The error is of type `AxiosError`, so you can handle it in a type-safe way.
- Extra methods are available to narrow down the error type to the errors defined in the API spec.

---

And that's basically it! 

Each time there's a change on the backend, we re-run the build script, followed by a `tsc` to catch any breaking changes. Those can usually be mopped up in a few minutes, or help guide us on what needs to be updated in the frontend, and then the backend team can go to prod and we all live happily ever after. 

We've been running with this setup for over a year now, and I reckon we've probably saved a hundred hours or more (~2 hours per week) versus managing all of this by hand.