/* Visual enhancement layer for the embedded component.
   Keeps the search logic in common-point.js independent from the presentation. */

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function setRouteState(root) {
  window.requestAnimationFrame(() => {
    const hasActive = Boolean(root.querySelector('.cp-guide-player__choice.is-open'));
    root.classList.toggle('has-active-route', hasActive);
  });
}

function enhanceResults(root) {
  const results = root.querySelector('[data-cp-results]');
  const shell = results?.querySelector('.cp-guide-player__result-shell');
  if (!shell || shell.dataset.cpV2Ready === 'true') return;
  shell.dataset.cpV2Ready = 'true';

  const cards = [...shell.querySelectorAll('.cp-guide-player__player-card')];
  if (!cards.length) return;

  cards.forEach((card, index) => {
    card.classList.toggle('is-featured', index === 0);
    card.classList.toggle('is-secondary', index > 0);
  });

  const reason = cards[0].querySelector('.cp-guide-player__player-reason')?.textContent?.trim() || '共通点';
  const hasMascot = cards.some((card) => card.classList.contains('is-mascot'));
  const path = document.createElement('div');
  path.className = 'cp-guide-player__result-path';
  path.innerHTML = `<span>YOU</span><i aria-hidden="true"></i><strong>${reason}</strong><i aria-hidden="true"></i><b>${hasMascot ? 'REDS FAMILY' : 'REDS PLAYER'}</b>`;
  const emotion = shell.querySelector('.cp-guide-player__result-emotion');
  if (emotion) emotion.insertAdjacentElement('afterend', path);
  else shell.insertBefore(path, shell.firstElementChild);

  if (!reduceMotion()) {
    cards.forEach((card, index) => {
      card.style.animationDelay = `${index * 90}ms`;
    });
  }
}

function initializeRoot(root) {
  root.querySelectorAll('[data-cp-mode]').forEach((choice) => {
    choice.addEventListener('click', () => setRouteState(root));
  });

  const results = root.querySelector('[data-cp-results]');
  if (results) {
    const observer = new MutationObserver(() => enhanceResults(root));
    observer.observe(results, { childList: true, subtree: false });
  }

  setRouteState(root);
  enhanceResults(root);
}

document.querySelectorAll('.js-common-point').forEach(initializeRoot);
