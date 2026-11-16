// Protects the free model quota: a per-visitor limit per minute and a global
// daily cap. In memory, so it resets when the service restarts.
const PER_MINUTE = parseInt(process.env.AGENT_PER_MINUTE || '6', 10);
const PER_DAY = parseInt(process.env.AGENT_DAILY_LIMIT || '40', 10);

const visitors = new Map(); // ip -> [timestamps]
let day = new Date().toISOString().slice(0, 10);
let usedToday = 0;

function check(ip) {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; usedToday = 0; }
  if (usedToday >= PER_DAY) return { ok: false, reason: 'The demo assistant has reached its daily limit. Please try again tomorrow.' };

  const now = Date.now();
  const recent = (visitors.get(ip) || []).filter((t) => now - t < 60000);
  if (recent.length >= PER_MINUTE) return { ok: false, reason: 'Too many questions in a minute. Please wait a moment.' };

  recent.push(now);
  visitors.set(ip, recent);
  usedToday += 1;
  return { ok: true, remainingToday: PER_DAY - usedToday };
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of visitors) if (times.every((t) => now - t >= 60000)) visitors.delete(ip);
}, 60000).unref();

module.exports = { check };
