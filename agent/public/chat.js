// Chat page logic. The conversation lives only in this page (not stored on the
// server); the last few messages are sent with each question.
(function () {
  const log = document.getElementById('log');
  const form = document.getElementById('form');
  const input = document.getElementById('input');
  const send = document.getElementById('send');
  const history = [];

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Tiny, safe formatter: escape everything first, then allow **bold** and "- " bullets.
  function format(text) {
    const lines = escapeHtml(text).split('\n');
    let html = '';
    let inList = false;
    for (const raw of lines) {
      const line = raw.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      const bullet = line.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
      if (bullet) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += `<li>${bullet[1]}</li>`;
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        if (line.trim()) html += `<p>${line}</p>`;
      }
    }
    if (inList) html += '</ul>';
    return html;
  }

  function add(role, html) {
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.innerHTML = html;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  async function ask(question) {
    history.push({ role: 'user', content: question });
    add('user', format(question));
    const pending = add('assistant', '<p class="typing">Checking...</p>');
    send.disabled = true;
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-10) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      history.push({ role: 'assistant', content: data.answer });
      pending.innerHTML = format(data.answer);
    } catch (err) {
      history.pop();
      pending.className = 'msg error';
      pending.innerHTML = `<p>${escapeHtml(err.message)}</p>`;
    } finally {
      send.disabled = false;
      input.focus();
      log.scrollTop = log.scrollHeight;
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    ask(q);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });
  log.addEventListener('click', (e) => {
    if (e.target.classList.contains('chip')) ask(e.target.textContent);
  });
})();
