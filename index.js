const core = require('@actions/core');
const simpleOctokit = require('simple-octokit');
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
author: "${issue.user.login}"
draft: false
tags: ${JSON.stringify(issue.tags)}
---\n\n`

  let body = issue.comments.map(it => it.body);
  body = useSeperator ? body.join('\n\n---\n\n') : body.join('\n\n');
  body = useSeperator ? `${issue.body}\n\n---\n\n${body}` : `${issue.body}\n\n${body}`;

  return {
    folder: issue.folder,
    filename: issue.filename,
    content: head + body
  };
};

(async () => {
  try {
    const myToken = core.getInput('github-token');
    const octokit = simpleOctokit(myToken);

    const repo = core.getInput('repo');
    const owner = core.getInput('owner');
    const skipAuthor = core.getInput('skip-author');
    const state = core.getInput('issue-state');
    const useSeperator = core.getBooleanInput('use-issue-seperator');
    const skipPullRequests = core.getBooleanInput('skip-pull-requests');
    const output = core.getInput('output');

    const iterable = octokit.issues.listForRepo.all({
      owner,
      repo,
      state,
      per_page: 100
    });
    
    let issues = [];
    for await (const response of iterable) {      
      for (let issue of response.data) {
        if (skipAuthor && issue.user.login === skipAuthor) {
          continue;
        }

        if (skipPullRequests && "pull_request" in issue) {
          continue;
        }

        if (issue.title.trim().startsWith('restore branch') && issue.body.trim().startsWith('restore branch')) {
          continue;
        }

        // FILENAME
        issue.filename = `${owner}-${repo}-${issue.id}-post-${issue.number}.md`;

        // GET TAGS
        let tags = _.map(issue.labels, (it) => { return `${it.name.trim()}`});

        // SKIP ISSUE LABELED ::DRAFT or ::DONE
        const skipIssue = _.filter(tags, (it) => it.startsWith('::DRAFT') || it.startsWith('::DONE'));
        if (skipIssue.length > 0) {
          continue;
        }
        
        // FOLDER
        const folders = _.filter(tags, it => it.startsWith("::./"));
        issue.folder = folders.length > 0 ? folders[0].replace('::./', '') : output;

        // make issue folder if necessary
        mkdir(issue.folder);

        // GET TAGS
        issue.tags = _.filter(tags, it => !it.startsWith("::"));
      
        // GET COMMENTS
        let comments = await get_issue_comments(octokit, owner, repo, issue);
        comments = _.filter(comments.data, (it) => { return it.user.login == owner });
        comments = _.orderBy(comments, ['created_at'], ['asc']);
        
        issue.comments = comments;
        issues.push(issue);
      }

      // Export issue to markdown
      const markdowns = _.map(issues, it => convert_issue_to_markdown(it, useSeperator));
      markdowns.forEach(it => {
        fs.writeFile(`${it.folder}/${it.filename}`, it.content, error => {
          if (error) {
            core.setFailed(error.message);
          }
        });
      });
    }
  } catch (error) {
    core.setFailed(error.message);
  }
})();
