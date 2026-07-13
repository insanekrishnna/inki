const grid = document.getElementById('grid');
const cancelBtn = document.getElementById('cancel');
const message = document.getElementById('message');

function renderEmptyMessage(text) {
  message.textContent = text || '';
  message.hidden = !text;
}

window.projectApi.onWindowSources((payload) => {
  const sources = Array.isArray(payload) ? payload : (payload?.sources || []);
  grid.innerHTML = '';
  renderEmptyMessage(payload?.fallbackReason || (sources.length === 0 ? 'No capturable windows were found. Try opening the window you want to record, then reopen this picker.' : ''));

  sources.forEach((source) => {
    const card = document.createElement('button');
    card.className = 'card';
    card.innerHTML = `<div class="meta"><div class="title"></div><span class="badge"></span></div><img alt="thumbnail">`;
    card.querySelector('.title').textContent = source.name || (source.type === 'screen' ? 'Screen' : 'Untitled Window');
    card.querySelector('.badge').textContent = source.type === 'screen' ? 'Screen' : 'Window';
    const image = card.querySelector('img');
    if (source.thumbnail) {
      image.src = source.thumbnail;
    } else {
      image.removeAttribute('src');
      image.alt = 'No preview available';
    }
    card.addEventListener('click', () => window.projectApi.selectWindowSource(source.id));
    grid.appendChild(card);
  });
});

cancelBtn.addEventListener('click', () => window.projectApi.cancelWindowSource());
