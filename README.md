# Zero-dependency blog

A no-framework blog project using Typescript, markdown and vanilla HTML & CSS.
Built in a day with ❤️ by Alex McGovern.

## Features

-   Minimal foot print — only HTML & CSS shipped to the client
-   Dev server with hot reload
-   Content in markdown, transformed into html with Remark/Rehype
-   Build time generated blog index

## Run Locally

Clone the project

```zsh
  git clone git@github.com:alex-mcgovern/zero-dependency-blog.git
```

Go to the project directory

```zsh
  cd zero-dependency-blog
```

Install dependencies

```zsh
  npm install
```

Start the dev server

```zsh
  npm run dev
```

## Deployment

To build this project for deployment

```zsh
  npm run build
```

Then copy the contents of the `dist` folder to your web server.
