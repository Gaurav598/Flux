import {NotificationDeduper} from '../notificationDeduper';

describe('NotificationDeduper', () => {
  it('suppresses repeated server event IDs until the retention window expires', () => {
    const deduper = new NotificationDeduper(1_000, 10);
    expect(deduper.accept('event-1', 100)).toBe(true);
    expect(deduper.accept('event-1', 500)).toBe(false);
    expect(deduper.accept('event-1', 1_100)).toBe(true);
  });

  it('evicts old entries when the bounded cache reaches capacity', () => {
    const deduper = new NotificationDeduper(10_000, 2);
    expect(deduper.accept('event-1', 1)).toBe(true);
    expect(deduper.accept('event-2', 2)).toBe(true);
    expect(deduper.accept('event-3', 3)).toBe(true);
    expect(deduper.accept('event-1', 4)).toBe(true);
  });
});
