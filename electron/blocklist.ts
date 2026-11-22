// Sites blocked during a focus session. They are hard-coded into the root helper, so after
// changing this list run `npm run helper:generate` and reinstall the helper
// (`sudo sh electron/helper/install-helper.sh`).
export const BLOCKED_DOMAINS: readonly string[] = [
  "insideevs.com", "www.insideevs.com",
  "electrek.co", "www.electrek.co",
  "macrumors.com", "www.macrumors.com", "forums.macrumors.com",
  "reddit.com", "www.reddit.com", "old.reddit.com", "new.reddit.com",
  "np.reddit.com", "i.reddit.com", "m.reddit.com",
  "news.ycombinator.com",
];
