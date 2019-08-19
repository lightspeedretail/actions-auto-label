"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPullRequestAndLabels = (tools, { owner, repo, number, }) => {
    const query = `{
    repository(owner: "${owner}", name: "${repo}") {
      pullRequest(number: ${number}) {
        id
        baseRefOid
        headRefOid
        baseRefName
        headRefName
        labels(first: 100) {
          edges {
            node {
              id
              name
            }
          }
        }
      }
      labels(first: 100) {
        edges {
          node {
            id
            name
          }
        }
      }
    }
    rateLimit {
      limit
      cost
      remaining
      resetAt
    }
  }`;
    return tools.github.graphql(query, {
        headers: { Accept: 'application/vnd.github.ocelot-preview+json' },
    });
};
exports.addLabelsToLabelable = (tools, { labelIds, labelableId, }) => {
    const query = `
    mutation {
      addLabelsToLabelable(input: {labelIds: ${labelIds}, labelableId: "${labelableId}"}) {
        clientMutationId
      }
    }`;
    return tools.github.graphql(query, {
        headers: { Accept: 'application/vnd.github.starfire-preview+json' },
    });
};
exports.removeLabelsFromLabelable = (tools, { labelIds, labelableId, }) => {
    const query = `
    mutation {
      removeLabelsFromLabelable(input: {labelIds: ${labelIds}, labelableId: "${labelableId}"}) {
        clientMutationId
      }
    }`;
    return tools.github.graphql(query, {
        headers: { Accept: 'application/vnd.github.starfire-preview+json' },
    });
};
