---
title: File naming conventions for modern JS/TS projects
description: My thoughts and recommendations on how to name your files in a JS/TS project. A topic often deemed non-important, but one that has real-world implications.
---

## TL;DR: Use kebab-case or snake_case. 
- It's a consistent approach that works for any module
- You don't have to think about it
- Filesystem case-sensitivity is a thing

## Are file naming conventions actually important?

Debates over how to name files in a project are often considered
"bike-shedding". Bike shedding is a term derived from C. Northcote Parkinson's
[law of triviality](https://en.wikipedia.org/wiki/Law_of_triviality):

> people within an organization commonly give disproportionate weight to trivial issues

When I'm at work, I really don't like to spend time debating trivial issues
within a team when it distracts from shipping quality software and hitting our
goals, so often the best course of action is to just **_go with the flow_**. ✌️

File naming convention can have _actual, real world_ consequences on a
project's maintainability and technical reliability though, so I think this is worth
writing about.

## File naming conventions overview

In JS/TS projects, I've observed all of these approaches being used:

| Style      | Example        |
|------------|----------------|
| PascalCase | `MyModule.ts`  |
| camelCase  | `myModule.ts`  |
| kebab-case | `my-module.ts` |
| snake_case | `my_module.ts` |

kebab-case and snake_case are equally valid choices for filenames, as
long as they are used consistently. Choosing between these is largely
a matter of personal taste. I like snake_case because it is easiest to read, and
I can select an entire word with a double-click.

The __*wrong*__ approach, which I've seen used in many companies, is a mix of PascalCase and
camelCase, which I'll call **"Pascal+Camel"**, where modules that export React components are named in PascalCase,
and other modules are named in camelCase.

### "Pascal+Camel" is inherently inconsistent

The intention of the **"Pascal+Camel"** approach is that a filename should
indicate what a module contains. For example, PascalCase might be chosen to imply a single, default export like a
class or component. Similarly, camelCase might be used to imply a module that exports one or more
javascript functions.

In practice, reality rarely align with this
intention. Modules often contain multiple exports — a mix of functions, classes,
and constants — making the casing convention irrelevant, or misleading. As the
project grows, the content of a module can change, and the casing convention can
become outdated, losing all of it's intended meaning.

### "Pascal+Camel" adds cognitive overhead

When naming a new file, developers must decide whether to use PascalCase or
camelCase. This decision is often arbitrary. It is an easy decision when the
module contains a single function, or a single React component, but consider the
following examples:

- A module intended to be run as a script, containing only top-level
  function calls
- A module that exports a React Context, a hook to access it, and a Provider
- A module that exports only constants
- A module that exports only types
  
Time & energy spent thinking about what the correct casing should be (and then just
making an arbitrary decision anyway) is time that could be spent on the task at
hand instead.

Similarly, when navigating a project, developers also have to parse the casing
and make note of what it means (if it means anything at all).

### "Pascal+Camel" and filesystem case sensitivity

Perhaps the strongest case against "Pascal+Camel" is that different filesystems
have different case sensitivity, for example:

* The Linux filesystem [ext4](https://en.wikipedia.org/wiki/Ext4) is
case-sensitive, by default. It interprets `myModule.ts` and `MyModule.ts` as two
separate files.
* MacOS' default [APFS](https://en.wikipedia.org/wiki/Apple_File_System) is
case-insensitive, by default. It interprets the filenames `myModule.ts` and
`MyModule.ts` as the same file.

Depending on your machine's configuration, bugs may arise when a filename is changed only in case—for example, renaming
`myModule.ts` to `MyModule.ts`

On a case-insensitive filesystem, git won't recognize that a file has been
  renamed if the only change is in the casing. This is controlled by the
  internal
  [`core.ignorecase`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-coreignoreCase)
  setting which is set for the repo when you `git clone` or `git init`. The
  setting isn't intended to be user-configurable. This can result in changes
  being excluded when staging or committing changes.

There is also a fairly large change that the filesystem differs between your
local environment and your CI/CD environment. For example, a
module import may resolve locally but break in CI due to mismatched casing.

## Conclusion

While the topic of file naming conventions may seem trivial, the choice you make
has real world implications beyond aesthetics and developer experience.
"Pascal+Camel" is a footgun that wastes precious time and energy, and can cause
unpredictable behavior in your system.