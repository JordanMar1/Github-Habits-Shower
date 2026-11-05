const TYPES = {
  pr: "pullRequestContributions",
  review: "pullRequestReviewContributions",
  issue: "issueContributions",
  commit: "commitContributions",
  discussion: "repositoryDiscussionContributions",
};

export async function fetchDates(login, token, type, from, to) {
  const field = TYPES[type];
  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!, $after: String) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          ${field}(first: 100, after: $after) {
            nodes { occurredAt }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    }`;

  const dates = [];
  let after = null;
  while (true) {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: { login, from: from.toISOString(), to: to.toISOString(), after },
      }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0].message);
    if (!json.data.user) throw new Error("Utilisateur introuvable");

    const page = json.data.user.contributionsCollection[field];
    dates.push(...page.nodes.filter((el) => el !== null).map(n => n.occurredAt));
    if (!page.pageInfo.hasNextPage) break;
    after = page.pageInfo.endCursor;
  }
  return dates;
}

export function toDays(dates, from, to) {
  const counts = {};
  for (const iso of dates) {
    const d = iso.slice(0, 10);
    counts[d] = (counts[d] || 0) + 1;
  }
  const days = [];
  for (const t = new Date(from); t <= to; t.setUTCDate(t.getUTCDate() + 1)) {
    const date = t.toISOString().slice(0, 10);
    days.push({ date, count: counts[date] || 0 });
  }
  return days;
}
