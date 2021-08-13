const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const _ = require('lodash');

const get_issue_comments = async (octokit, owner, repo, issue) => {
  return await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issue.number,
  });  
};

const mkdir = (dirPath) => {
  const isExists = fs.existsSync(dirPath);
  if( !isExists ) {
      fs.mkdirSync(dirPath, { recursive: true });
  }
}

const convert_issue_to_markdown = (issue, useSeperator) => {
  const head = 
  `---
title: "${issue.title}"
date: ${issue.created_at}
draft: false
tags: ${JSON.stringify(issue.tags)}
---\n\n`

  let body = issue.comments.map(it => it.body);
  body = useSeperator ? body.join('\n\n---\n\n') : body.join('\n\n');
  body = useSeperator ? `${issue.body}\n\n---\n\n${body}` : `${issue.body}\n\n${body}`;

  return {
    filename: issue.filename,
    content: head + body
  };
};

(async () => {
  try {
    const myToken = core.getInput('github-token');
    const octokit = github.getOctokit(myToken);

    const repo = core.getInput('repo');
    const owner = core.getInput('owner');
    const skipAuthor = core.getInput('skip-author');
    const state = core.getInput('issue-state');
    const useSeperator = core.getBooleanInput('use-issue-seperator');
    const output = core.getInput('output');

    let issues = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state
    });

    if (skipAuthor) {
      issues = _.filter(issues.data, (it) => { return it.user.login != skipAuthor });
    } else {
      issues = issues.data;
    }
    
    for (let issue of issues) {
      // FILENAME
      issue.filename = `${owner}-${repo}-${issue.id}-post-${issue.number}.md`;

      // GET TAGS
      let tags = _.map(issue.labels, (it) => { return `${it.name}`});
      issue.tags = tags;

      // GET COMMENTS
      let comments = await get_issue_comments(octokit, owner, repo, issue);
      comments = _.filter(comments.data, (it) => { return it.user.login == owner });
      comments = _.orderBy(comments, ['created_at'], ['asc']);
      
      issue.comments = comments;
    }

    // make output folder if necessary
    mkdir(output);

    // Export issue to markdown
    const markdowns = _.map(issues, it => convert_issue_to_markdown(it, useSeperator));
    markdowns.forEach(it => {
      fs.writeFile(`${output}/${it.filename}`, it.content, error => {
        if (error) {
          core.setFailed(error.message);
        }
      });
    });
  } catch (error) {
    core.setFailed(error.message);
  }
})();