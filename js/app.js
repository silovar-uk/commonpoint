import { players } from '../data/players.js';
import { matches } from '../data/matches.js';

const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => [...root.querySelectorAll(q)];
const dateParts = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day, md: `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
};

const icons = {
  birthday: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  rings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>'
};

const regions = {
  '北海道・東北': ['北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県'],
  '関東': ['茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県'],
  '中部': ['新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県'],
  '近畿': ['三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県']
};

const state = { tab: 'birthday', prefecture: null, position: 'ALL' };

function fillControls() {
  $$('[data-icon]').forEach((node) => { node.innerHTML = icons[node.dataset.icon] || ''; });
  const month = $('#birthday-month');
  const day = $('#birthday-day');
  const year = $('#generation-year');
  month.innerHTML = '<option value="">月を選ぶ</option>' + Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}月</option>`).join('');
  day.innerHTML = '<option value="">日を選ぶ</option>' + Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}">${i + 1}日</option>`).join('');
  const years = Array.from(new Set(players.map((player) => dateParts(player.birthDate).year))).sort((a, b) => b - a);
  year.innerHTML = '<option value="">生まれ年を選ぶ</option>' + years.map((value) => `<option value="${value}">${value}年</option>`).join('');
}

function setTab(tab) {
  state.tab = tab;
  $$('.cp-tab').forEach((button) => {
    const active = button.dataset.tab === tab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  $$('.cp-panel').forEach((panel) => {
    const active = panel.dataset.panel === tab;
    panel.hidden = !active;
    panel.classList.toggle('is-active', active);
  });
}

function card(player, reason = '') {
  const fragment = $('#player-card-template').content.cloneNode(true);
  const root = $('.cp-player-card', fragment);
  $('.cp-player-card__number', root).textContent = String(player.number).padStart(2, '0');
  $('.cp-player-card__pos', root).textContent = player.position;
  $('.cp-player-card__reason', root).textContent = reason;
  $('h3', root).textContent = player.name;
  const birth = dateParts(player.birthDate);
  $('.cp-player-card__meta', root).textContent = `${player.position} / ${birth.year}年${birth.month}月${birth.day}日生まれ / ${player.birthplace}`;
  const link = $('.cp-player-card__link', root);
  link.href = player.profile;
  link.setAttribute('aria-label', `${player.name}選手の公式プロフィールを見る`);
  return fragment;
}

function formatDate(dateText) {
  const date = new Date(`${dateText}T12:00:00+09:00`);
  const weekdays = ['日','月','火','水','木','金','土'];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日(${weekdays[date.getDay()]})`;
}

function gameRecommendation(month, day) {
  const base = new Date(2026, month - 1, day, 12).getTime();
  const found = matches.map((match) => {
    const distance = Math.abs(new Date(`${match.date}T12:00:00+09:00`).getTime() - base) / 86400000;
    return { ...match, distance };
  }).sort((a, b) => a.distance - b.distance)[0];
  if (!found) return '';
  const label = found.distance === 0 ? 'あなたの誕生日は、ホームゲームです。' : found.distance <= 3 ? 'あなたの誕生日の近くに、ホームゲームがあります。' : '次のホームゲームも、観戦のきっかけに。';
  return `<article class="cp-game-card"><p class="cp-game-card__kicker">HOME GAME RECOMMENDATION <span class="cp-demo-label">DEMO DATA</span></p><h3>${label}</h3><p>${formatDate(found.date)} ${found.kickoff}キックオフ<br />浦和レッズ vs ${found.opponent} / ${found.stadium}</p><p class="cp-game-card__note">※プロトタイプ用の試合データです。公開前に公式日程へ更新してください。</p><div class="cp-game-card__actions"><a class="cp-button cp-button--light" href="${found.matchInfoUrl}" target="_blank" rel="noopener noreferrer">試合情報を見る</a><a class="cp-button cp-button--outline-light" href="https://www.urawa-reds.co.jp/ticket/guide/" target="_blank" rel="noopener noreferrer">初めての観戦ガイドを見る</a></div></article>`;
}

function renderResult({ kicker, title, description, entries, reason, game = '', empty = false }) {
  const host = $('#results');
  if (empty) {
    host.innerHTML = `<div class="cp-empty-result"><img src="assets/illustrations/common-player-empty-state.svg" alt="" /><div><p class="cp-kicker cp-kicker--dark">ANOTHER WAY</p><h2>${title}</h2><p>${description}</p><button class="cp-button cp-button--primary" id="result-birthplace" type="button">出身地から探す</button></div></div>`;
    $('#result-birthplace', host).addEventListener('click', () => { setTab('birthplace'); $('#finder').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    return;
  }
  host.innerHTML = `<div class="cp-result-head" tabindex="-1"><div><p class="cp-kicker cp-kicker--dark">${kicker}</p><h2>${title}</h2></div><p>${description}</p></div><div class="cp-player-grid" id="result-grid"></div>${game}`;
  const grid = $('#result-grid', host);
  entries.forEach((player) => grid.append(card(player, typeof reason === 'function' ? reason(player) : reason)));
  $('.cp-result-head', host).focus({ preventScroll: true });
  host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function birthdaySearch() {
  const month = Number($('#birthday-month').value);
  const day = Number($('#birthday-day').value);
  if (!month || !day) {
    renderResult({ empty: true, title: '月と日を選んでください。', description: '誕生日の月と日を選ぶと、同じ誕生日や同じ月の選手を探せます。' });
    return;
  }
  const md = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const exact = players.filter((player) => dateParts(player.birthDate).md === md);
  const sameMonth = players.filter((player) => dateParts(player.birthDate).month === month);
  const entries = exact.length ? exact : sameMonth;
  if (!entries.length) {
    renderResult({ empty: true, title: '同じ月の選手は見つかりませんでした。', description: '出身地や世代からも、あなたとつながる選手を探せます。' });
    return;
  }
  renderResult({
    kicker: 'BIRTHDAY MATCH',
    title: exact.length ? `あなたと同じ${month}月${day}日生まれの選手` : `あなたと同じ${month}月生まれの選手`,
    description: exact.length ? '同じ日が、応援を始める小さなきっかけに。' : '完全一致がなくても、同じ誕生月から探せます。',
    entries,
    reason: exact.length ? `あなたと同じ${month}月${day}日生まれ` : `あなたと同じ${month}月生まれ`,
    game: gameRecommendation(month, day)
  });
}

function generationSearch() {
  const year = Number($('#generation-year').value);
  if (!year) {
    renderResult({ empty: true, title: '生まれ年を選んでください。', description: '同じ生まれ年、近い世代の選手を探せます。' });
    return;
  }
  const exact = players.filter((player) => dateParts(player.birthDate).year === year);
  const near = players.filter((player) => Math.abs(dateParts(player.birthDate).year - year) === 1);
  const decade = Math.floor(year / 10) * 10;
  const sameDecade = players.filter((player) => Math.floor(dateParts(player.birthDate).year / 10) * 10 === decade);
  const entries = exact.length ? exact : near.length ? near : sameDecade;
  const label = exact.length ? `同じ${year}年生まれ` : near.length ? '近い世代' : `同じ${decade}年代`;
  if (!entries.length) {
    renderResult({ empty: true, title: '近い世代の選手は見つかりませんでした。', description: '誕生日や出身地からも、選手を探せます。' });
    return;
  }
  renderResult({
    kicker: 'GENERATION MATCH',
    title: `あなたと${label}の選手`,
    description: `${year}年を起点に、今季の選手を表示しています。`,
    entries,
    reason: (player) => dateParts(player.birthDate).year === year ? `あなたと同じ${year}年生まれ` : 'あなたと近い世代'
  });
}

const dotCoordinates = {
  '大分県':[13,87], '神奈川県':[55,65], '埼玉県':[57,56], '東京都':[59,61], '千葉県':[65,60],
  '和歌山県':[31,74], '佐賀県':[4,85], '福岡県':[7,82], '兵庫県':[24,63], '大阪府':[29,67],
  '岡山県':[18,66], '広島県':[12,67], '愛知県':[43,68]
};

function prefectureCounts() {
  return players.reduce((all, player) => {
    if (player.prefecture) all[player.prefecture] = (all[player.prefecture] || 0) + 1;
    return all;
  }, {});
}

function heat(count) {
  return count >= 3 ? 'is-three' : count === 2 ? 'is-two' : count === 1 ? 'is-one' : 'is-zero';
}

function renderMap() {
  const host = $('#japan-map');
  const counts = prefectureCounts();
  host.innerHTML = `<svg class="cp-japan-map__silhouette" viewBox="0 0 100 110" aria-hidden="true" preserveAspectRatio="none"><path class="land" d="M72 7l10 3 4 8-6 6-8-1-6-7z"/><path class="land land--soft" d="M66 25l5 4-1 8-5 8-3 10-6 7-5 8-8 4-9 8-9 6-7 2-8 4-7 1-2-5 7-5 7-7 10-5 6-10 7-8 5-11 3-7 3-8 7-7 7-2z"/><path class="land" d="M28 72l8 2 4 4-5 4-9-1-4-4z"/><path class="land land--soft" d="M10 79l8 3 3 8-4 8-7 5-7-4 2-10z"/><path class="land" d="M78 96l3 1 3 3-2 2-4-1z"/></svg>`;
  Object.entries(dotCoordinates).forEach(([prefecture, [x, y]]) => {
    const count = counts[prefecture] || 0;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `cp-pref-dot ${heat(count)}${state.prefecture === prefecture ? ' is-selected' : ''}`;
    button.style.left = `${x}%`;
    button.style.top = `${y}%`;
    button.dataset.count = `${prefecture}：${count}人`;
    button.setAttribute('aria-label', `${prefecture}、出身選手${count}人`);
    button.addEventListener('click', () => selectPrefecture(prefecture));
    host.append(button);
  });
}

function renderMapSelection(prefecture) {
  const host = $('#map-selection');
  const entries = players.filter((player) => player.prefecture === prefecture);
  if (!entries.length) {
    host.innerHTML = `<div class="cp-map-result"><p class="cp-map-result__eyebrow">BIRTHPLACE</p><h3>${prefecture}</h3><p class="cp-map-result__count">今季、${prefecture}出身の登録選手はいません。</p><div class="cp-selection-placeholder" style="flex:1"><span class="cp-selection-placeholder__ring"></span><p style="font-size:14px">ほかの都道府県や<br />海外出身の選手も見てみよう。</p></div></div>`;
    return;
  }
  host.innerHTML = `<div class="cp-map-result"><p class="cp-map-result__eyebrow">BIRTHPLACE</p><h3>${prefecture}出身の<br />レッズ選手</h3><p class="cp-map-result__count">今季の登録選手：${entries.length}人</p><div class="cp-player-list-mini">${entries.map((player) => `<div class="cp-player-list-mini__item"><span class="cp-player-list-mini__number">${String(player.number).padStart(2, '0')}</span><span><strong class="cp-player-list-mini__name">${player.name}</strong><small class="cp-player-list-mini__meta">${player.position} / ${player.birthplace}</small></span><a class="cp-player-list-mini__link" href="${player.profile}" target="_blank" rel="noopener noreferrer">詳細↗</a></div>`).join('')}</div><button class="cp-button cp-button--light" style="margin-top:auto" type="button" id="prefecture-result-button">この都道府県の選手を大きく見る</button></div>`;
  $('#prefecture-result-button', host).addEventListener('click', () => {
    renderResult({ kicker: 'BIRTHPLACE MATCH', title: `あなたと同じ${prefecture}出身の選手`, description: `今季は${entries.length}人。地元のつながりから、応援したい選手を見つけよう。`, entries, reason: `あなたと同じ${prefecture}出身` });
  });
}

function selectPrefecture(prefecture) {
  state.prefecture = prefecture;
  renderMap();
  renderRegionControls();
  renderMapSelection(prefecture);
}

function renderRegionControls() {
  const host = $('#region-selector');
  const counts = prefectureCounts();
  const known = Object.values(regions).flat();
  const extras = Object.keys(counts).filter((prefecture) => !known.includes(prefecture));
  const displayRegions = { ...regions, '中国・四国・九州': extras };
  host.innerHTML = '';
  Object.entries(displayRegions).forEach(([region, prefectures]) => {
    if (!prefectures.length) return;
    const group = document.createElement('div');
    group.className = 'cp-region-group';
    group.innerHTML = `<div class="cp-region-label">${region}</div><div class="cp-region-prefectures"></div>`;
    const buttons = $('.cp-region-prefectures', group);
    prefectures.forEach((prefecture) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `cp-pref-button${state.prefecture === prefecture ? ' is-selected' : ''}`;
      button.textContent = `${prefecture} (${counts[prefecture] || 0})`;
      button.addEventListener('click', () => selectPrefecture(prefecture));
      buttons.append(button);
    });
    host.append(group);
  });
}

function showOverseas() {
  const entries = players.filter((player) => !player.prefecture);
  renderResult({ kicker: 'FROM OVERSEAS', title: '海外出身のレッズ選手', description: '世界のさまざまな場所から、レッズに集まる選手たち。', entries, reason: (player) => `${player.country}出身` });
}

function renderAllPlayers() {
  const filter = $('#position-filter');
  const grid = $('#all-players-grid');
  const positions = ['ALL', 'GK', 'DF', 'MF', 'FW'];
  filter.innerHTML = positions.map((position) => `<button type="button" class="${state.position === position ? 'is-active' : ''}" data-position="${position}">${position === 'ALL' ? '全選手' : position}</button>`).join('');
  $$('[data-position]', filter).forEach((button) => button.addEventListener('click', () => {
    state.position = button.dataset.position;
    renderAllPlayers();
  }));
  const shown = state.position === 'ALL' ? players : players.filter((player) => player.position === state.position);
  grid.innerHTML = '';
  shown.forEach((player) => grid.append(card(player)));
}

function bindEvents() {
  $$('.cp-tab').forEach((button) => button.addEventListener('click', () => setTab(button.dataset.tab)));
  $$('[data-jump-tab]').forEach((link) => link.addEventListener('click', () => setTab(link.dataset.jumpTab)));
  $('#birthday-search').addEventListener('click', birthdaySearch);
  $('#generation-search').addEventListener('click', generationSearch);
  $('#show-overseas').addEventListener('click', showOverseas);
  $('#birthday-month').addEventListener('change', () => {
    const month = Number($('#birthday-month').value);
    const days = month === 2 ? 29 : [4, 6, 9, 11].includes(month) ? 30 : 31;
    $$('option', $('#birthday-day')).forEach((option) => { if (option.value) option.hidden = Number(option.value) > days; });
    if (Number($('#birthday-day').value) > days) $('#birthday-day').value = '';
  });
}

function init() {
  fillControls();
  bindEvents();
  renderMap();
  renderRegionControls();
  renderAllPlayers();
}

init();
