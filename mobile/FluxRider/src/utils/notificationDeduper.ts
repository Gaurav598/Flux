const DEFAULT_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 256;

export class NotificationDeduper {
  private readonly seen = new Map<string, number>();

  constructor(
    private readonly ttlMs = DEFAULT_TTL_MS,
    private readonly maxEntries = DEFAULT_MAX_ENTRIES,
  ) {}

  accept(id: string, now = Date.now()): boolean {
    this.prune(now);
    const seenAt = this.seen.get(id);
    if (seenAt !== undefined && now - seenAt < this.ttlMs) {
      return false;
    }
    this.seen.set(id, now);
    while (this.seen.size > this.maxEntries) {
      const oldest = this.seen.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.seen.delete(oldest);
    }
    return true;
  }

  private prune(now: number) {
    for (const [id, seenAt] of this.seen) {
      if (now - seenAt >= this.ttlMs) {
        this.seen.delete(id);
      }
    }
  }
}
