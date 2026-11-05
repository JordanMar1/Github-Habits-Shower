export function computeStreaks(days) {
  const today = new Date().toISOString().slice(0, 10);
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i];
    if (d.count > 0) current++;
    else if (d.date === today) continue;
    else break;
  }
  let longest = 0, run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return { current, longest };
}
