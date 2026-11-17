pyenv: cannot rehash: /Users/gregkerr/.pyenv/shims isn't writable
const briefForm = document.getElementById('brief');
const result = document.getElementById('result');
if (briefForm && result) {
  const save = document.createElement('button');
  save.type = 'button'; save.textContent = 'Continue in your persistent workspace →';
  save.addEventListener('click', () => {
    const idea = document.getElementById('idea').value.trim();
    try { sessionStorage.setItem('wao.projectDraft', JSON.stringify({ title: idea.slice(0, 100), idea, audience: document.getElementById('audience').value.trim(), outcome: document.getElementById('outcome').value.trim(), useCase: 'telcoin' })); } catch { /* The original brief remains available for copying. */ }
    location.href = '/workspace#new';
  });
  result.append(save);
}
