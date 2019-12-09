import * as core from '@actions/core';
import * as github from '@actions/github';
import fs from 'fs';
import ignore from 'ignore';

async function run() {
  try {
    core.info(`✏️ Auto labelling PR`);
    const token = process.env.GITHUB_TOKEN!;
    const octokit = new github.GitHub(token);

    // Load config
    const configContents = fs.readFileSync('./.github/auto-label.json', 'utf-8');
    const config = JSON.parse(configContents);
    core.info(`Found config: ${JSON.stringify(config, null, 2)}`);

    // Get manual labels
    const labelsRes = await octokit.issues.listLabelsOnIssue({
      ...github.context.repo,
      issue_number: github.context.payload!.pull_request!.number,
    });
    const allLabels = labelsRes.data.map(({ name }) => name);
    const autoLabels = Object.keys(config.rules);
    const manualLabels = allLabels.filter(label => !autoLabels.includes(label));
    core.info(`Manually set labels: [${manualLabels.join(',')}]`);

    // Get files changed on PR
    const filesRes = await octokit.pulls.listFiles({
      ...github.context.repo,
      pull_number: github.context.payload!.pull_request!.number,
    });
    const filenames = filesRes.data.map(file => file.filename);
    core.info(`Files changed: [${filenames.join(',')}]`);

    // Determine labels for PR
    const rules = Object.entries(config.rules);
    const appliedRules = rules.filter(([, pattern]) => {
      const rule = ignore().add(pattern as any);
      return filenames.some(fn => rule.ignores(fn));
    });
    const newAutoLabels = appliedRules.map(([label]) => label);
    const newLabels = [...manualLabels, ...newAutoLabels];
    core.info(`New labels: [${newLabels.join(',')}]`);

    // Replace labels on PR
    await octokit.issues.replaceLabels({
      ...github.context.repo,
      issue_number: github.context.payload!.pull_request!.number,
      labels: newLabels,
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
