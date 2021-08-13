# Convert Github issues to markdowns.

`hugo-with-github-issues` converts github issues to markdowns. Github issue has a title and comments. `hugo-with-github-issues` connects comments to the one body content. Github issue supports to upload images to the comments so markdown can contains images.

## Example Repo

- [https://github.com/skyfe79/testing-hugo-with-github-issues](https://github.com/skyfe79/testing-hugo-with-github-issues)

## Usage

This is workflow example:

```yml
name: "Convert issues to markdowns"
on:
  workflow_dispatch:
    
jobs:
  convert_issues_to_markdown_job:
    runs-on: ubuntu-latest
    name: Convert issues to markdowns.
    steps:
      - name: checkout
        uses: actions/checkout@v1
      - name: Fetch issues and generate markdowns
        uses: skyfe79/hugo-with-github-issues@v1.3
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          repo: 'testing-hugo-with-github-issues'
          owner: 'skyfe79'
          skip-author: 'utterances-bot'
          use-issue-seperator: 'false'
          output: 'content/posts'
      - name: Commit files
        run: |
          git config --local user.email "skyfe79@gmail.com"
          git config --local user.name "sungcheol kim"
          git add .
          git commit -m "Add Posts"
      - name: Push changes
        uses: ad-m/github-push-action@master
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          branch: ${{ github.ref }}
```

## Inputs

```
github-token:
  description: 'github token'
  required: true

repo:
  description: 'repo to export'
  required: true

owner:
  description: 'repo owner'
  required: true

skip-author:
  description: 'skip issue written by the skip-author'
  required: false

issue-state:
  description: 'export issues only in state(open or closed)'
  required: true
  default: 'all'

use-issue-seperator:
  description: 'use seperator among comments'
  required: true
  default: 'false'

output:
  description: 'destination folder to store markdown files'
  required: true
  default: 'content'
```