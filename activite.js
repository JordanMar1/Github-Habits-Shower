const TYPES = {
  pr: "pullRequestContributions",
  review: "pullRequestReviewContributions",
  issue: "issueContributions",
};
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
export async function fetchDates(login, token, type, from, to) {
  if (type === "discussion") {
    console.warn(
      "Les discussions ne sont pas disponibles dans ContributionsCollection de GitHub."
    );
    return [];
  }
  const field = TYPES[type];
  if (type !== "commit" && !field) {
    console.warn(`Type d'activité inconnu : ${type}`);
    return [];
  }

  const dates = [];
  let after = null;
  const query =
    type === "commit"
      ? `
        query($login: String!, $from: DateTime!, $to: DateTime!) {
          user(login: $login) {
            contributionsCollection(from: $from, to: $to) {
              commitContributionsByRepository(maxRepositories: 100) {
                repository {
                  name
                }
                contributions(first: 100) {
                  nodes {
                    occurredAt
                  }
                }
              }
            }
          }
        }
      `
      : `
        query(
          $login: String!,
          $from: DateTime!,
          $to: DateTime!,
          $after: String
        ) {
          user(login: $login) {
            contributionsCollection(from: $from, to: $to) {
              ${field}(first: 100, after: $after) {
                nodes {
                  occurredAt
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        }
      `;

  while (true) {
    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          login,
          from: from.toISOString(),
          to: to.toISOString(),
          after,
        },
      }),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(
        json.message || `Erreur HTTP GitHub : ${response.status}`
      );
    }
    if (json.errors?.length) {
      throw new Error(json.errors.map((error) => error.message).join(" | "));
    }
    const user = json.data?.user;
    if (!user) {
      throw new Error("Utilisateur GitHub introuvable.");
    }
    const collection = user.contributionsCollection;
    if (!collection) {
      throw new Error("GitHub n'a pas retourné ContributionsCollection.");
    }
    if (type === "commit") {
      const repositories = collection.commitContributionsByRepository || [];
      for (const repository of repositories) {
        const nodes = repository.contributions?.nodes || [];
        dates.push(
          ...nodes
            .filter((node) => node?.occurredAt)
            .map((node) => node.occurredAt)
        );
      }
      break;
    }
    const page = collection[field];
    if (!page) {
      throw new Error(`GitHub n'a pas retourné le champ ${field}.`);
    }
    dates.push(
      ...(page.nodes || [])
        .filter((node) => node?.occurredAt)
        .map((node) => node.occurredAt)
    );
    if (!page.pageInfo?.hasNextPage) {
      break;
    }

    after = page.pageInfo.endCursor;
    if (!after) {
      throw new Error(`Pagination impossible pour ${type} : curseur absent.`);
    }
  }
  return dates;
}

export function toDays(dates, from, to) {
  const counts = {};
  for (const iso of dates) {
    const date = iso.slice(0, 10);
    counts[date] = (counts[date] || 0) + 1;
  }
  const days = [];

  for (
    const date = new Date(from);
    date <= to;
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    const day = date.toISOString().slice(0, 10);
    days.push({ date: day, count: counts[day] || 0 });
  }
  return days;
}
