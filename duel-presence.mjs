export const PRESENCE_TIMEOUT = 25_000;
export const RECONNECT_WINDOW = 60_000;
export const IDLE_WINDOW = 5 * 60_000;

export function startPresence(now) {
  return { startedAt:now, lastActionAt:now, pausedAt:null, disconnectedAt:[null, null], disconnects:[0, 0] };
}

export function updatePresence(previous, now, seen, arrivingSeat) {
  const current = previous ?? startPresence(now);
  const disconnectedAt = current.disconnectedAt.slice();
  const disconnects = current.disconnects.slice();
  let lastActionAt = current.lastActionAt;
  let pausedAt = current.pausedAt ?? null;
  let changed = !previous;

  for (const seat of [0, 1]) {
    const detection = Math.max(current.startedAt, seen[seat] ?? current.startedAt) + PRESENCE_TIMEOUT;
    if (disconnectedAt[seat] === null && now >= detection) {
      disconnectedAt[seat] = detection;
      disconnects[seat]++;
      changed = true;
    }
  }
  const deadlines = disconnectedAt.map((since, seat) =>
    since === null ? null : since + (disconnects[seat] >= 3 ? 0 : RECONNECT_WINDOW));
  for (const since of disconnectedAt) {
    if (since !== null) pausedAt = pausedAt === null ? since : Math.min(pausedAt, since);
  }
  const idledAt = lastActionAt + IDLE_WINDOW;
  if (current.disconnectedAt.every(since => since === null) && now >= idledAt &&
      disconnectedAt.every(since => since === null || since > idledAt)) {
    return { changed, presence:current, result:{ winner:-1, reason:'Neither player acted for five minutes' } };
  }

  // A request at the deadline is too late. A later poll still counts a
  // forfeit that expired while the other player was present.
  for (const seat of [0, 1]) {
    const deadline = deadlines[seat];
    const opponent = 1 - seat;
    if (deadline !== null && now >= deadline &&
        (disconnectedAt[opponent] === null || disconnectedAt[opponent] > deadline)) {
      const reason = disconnects[seat] >= 3 ? 'Third disconnect forfeit' : 'Reconnect timeout forfeit';
      return { changed, presence:current, result:{ winner:opponent, reason } };
    }
  }
  if (deadlines.every(deadline => deadline !== null && now >= deadline)) {
    return { changed, presence:current, result:{ winner:-1, reason:'Both reconnect windows expired' } };
  }

  if (deadlines[arrivingSeat] !== null && now < deadlines[arrivingSeat]) {
    disconnectedAt[arrivingSeat] = null;
    changed = true;
    if (pausedAt !== null && disconnectedAt.every(since => since === null)) {
      lastActionAt += Math.max(0, now - pausedAt);
      pausedAt = null;
    }
    const opponent = 1 - arrivingSeat;
    if (deadlines[opponent] !== null && now >= deadlines[opponent]) {
      const reason = disconnects[opponent] >= 3 ? 'Third disconnect forfeit' : 'Reconnect timeout forfeit';
      return { changed, presence:current, result:{ winner:arrivingSeat, reason } };
    }
  }

  const presence = changed ? { ...current, lastActionAt, pausedAt, disconnectedAt, disconnects } : current;
  return { changed, presence, result:null };
}

export function presenceView(presence, now) {
  if (!presence) return null;
  return {
    now,
    disconnects:presence.disconnects,
    reconnectUntil:presence.disconnectedAt.map((since, seat) =>
      since === null ? null : since + (presence.disconnects[seat] >= 3 ? 0 : RECONNECT_WINDOW)),
    idleUntil:presence.disconnectedAt.every(since => since === null)
      ? presence.lastActionAt + IDLE_WINDOW : null
  };
}
