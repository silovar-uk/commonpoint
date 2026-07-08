import { players } from '../data/players.js';
import { matches } from '../data/matches.js';

const PREFECTURES = [
  ['01','北海道','北海道・東北'], ['02','青森県','北海道・東北'], ['03','岩手県','北海道・東北'], ['04','宮城県','北海道・東北'], ['05','秋田県','北海道・東北'], ['06','山形県','北海道・東北'], ['07','福島県','北海道・東北'],
  ['08','茨城県','関東'], ['09','栃木県','関東'], ['10','群馬県','関東'], ['11','埼玉県','関東'], ['12','千葉県','関東'], ['13','東京都','関東'], ['14','神奈川県','関東'],
  ['15','新潟県','中部'], ['16','富山県','中部'], ['17','石川県','中部'], ['18','福井県','中部'], ['19','山梨県','中部'], ['20','長野県','中部'], ['21','岐阜県','中部'], ['22','静岡県','中部'], ['23','愛知県','中部'],
  ['24','三重県','近畿'], ['25','滋賀県','近畿'], ['26','京都府','近畿'], ['27','大阪府','近畿'], ['28','兵庫県','近畿'], ['29','奈良県','近畿'], ['30','和歌山県','近畿'],
  ['31','鳥取県','中国'], ['32','島根県','中国'], ['33','岡山県','中国'], ['34','広島県','中国'], ['35','山口県','中国'], ['36','徳島県','四国'], ['37','香川県','四国'], ['38','愛媛県','四国'], ['39','高知県','四国'],
  ['40','福岡県','九州・沖縄'], ['41','佐賀県','九州・沖縄'], ['42','長崎県','九州・沖縄'], ['43','熊本県','九州・沖縄'], ['44','大分県','九州・沖縄'], ['45','宮崎県','九州・沖縄'], ['46','鹿児島県','九州・沖縄'], ['47','沖縄県','九州・沖縄']
].map(([code, name, region]) => ({ code, name, region }));

const MAP_POINTS = {
  '福岡県': [13, 70], '佐賀県': [9, 75], '大分県': [21, 77], '埼玉県': [69, 44], '東京都': [72, 53],
  '千葉県': [79, 55], '神奈川県': [69, 60], '和歌山県': [48, 70], '兵庫県': [40, 62], '大阪府': [49, 64],
  '愛知県': [59, 66]
};

const dateParts = (value) => {
  const [year, month, day] = String(value).split('-').map(Number);
  return { year, month, day, md: `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character]));
const heatClass = (count) => (count >= 3 ? 'is-three' : count === 2 ? 'is-two' : count === 1 ? 'is-one' : '');
const isMascot = (entry) => entry.type === 'mascot';

class CommonPointFinder {
  constructor(root, index) {
    this.root = root;
    this.id = root.id || `cp-guide-player-${index + 1}`;
    this.root.id = this.id;
    this.maxResults = Number(root.dataset.cpMaxResults || 3);
    this.topTeamUrl = root.dataset.cpTopteamUrl || 'https://www.urawa-reds.co.jp/topteam/';
    this.matchEnabled = root.dataset.cpMatchEnabled === 'true';
    this.activePlayers = players.filter((player) => player.isActive !== false && player.birthDate && player.name && player.profile);
    this.state = { activeMode: null, selectedPrefecture: '', hasRenderedResults: false };
    this.cache = {};
    this.autoSearchTimer = null;
    this.initialize();
  }

  initialize() {
    this.cache.choices = [...this.root.querySelectorAll('[data-cp-mode]')];
    this.cache.panels = [...this.root.querySelectorAll('[data-cp-panel]')];
    this.cache.results = this.root.querySelector('[data-cp-results]');
    this.cache.month = this.root.querySelector('[data-cp-month]');
    this.cache.year = this.root.querySelector('[data-cp-year]');
    this.cache.prefecture = this.root.querySelector('[data-cp-prefecture]');
    this.cache.map = this.root.querySelector('[data-cp-map]');
    this.cache.regionButtons = this.root.querySelector('[data-cp-regions]');
    this.fillSelects();
    this.renderHeatMap();
    this.renderPrefectureButtons();
    this.bind();
    this.setupEntranceMotion();
  }

  fillSelects() {
    this.cache.month.innerHTML = '<option value="">誕生月を選ぶ</option>' + Array.from({ length: 12 }, (_, index) => `<option value="${index + 1}">${index + 1}月</option>`).join('');
    const years = [...new Set(this.activePlayers.map((player) => dateParts(player.birthDate).year))].sort((a, b) => b - a);
    this.cache.year.innerHTML = '<option value="">生まれ年を選ぶ</option>' + years.map((year) => `<option value="${year}">${year}年</option>`).join('');

    const domesticOptions = PREFECTURES.map(({ code, name }) => `<option value="${code}">${name}</option>`).join('');
    const countryOptions = this.foreignCountries().map((country) => `<option value="country:${escapeHtml(country)}">${escapeHtml(country)}</option>`).join('');
    this.cache.prefecture.innerHTML = '<option value="">出身地を選ぶ</option>' + `<optgroup label="日本">${domesticOptions}</optgroup>` + (countryOptions ? `<optgroup label="海外">${countryOptions}</optgroup>` : '');
  }

  bind() {
    this.cache.choices.forEach((choice) => choice.addEventListener('click', () => this.toggleMode(choice.dataset.cpMode)));
    this.root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.state.activeMode) this.closeMode();
    });
    this.cache.month.addEventListener('change', () => {
      if (this.cache.month.value) this.queueAutoSearch('birthday');
    });
    this.cache.prefecture.addEventListener('change', () => {
      this.state.selectedPrefecture = this.cache.prefecture.value;
      this.highlightMap();
      if (this.cache.prefecture.value) this.queueAutoSearch('birthplace');
    });
    this.cache.year.addEventListener('change', () => {
      if (this.cache.year.value) this.queueAutoSearch('generation');
    });
    this.root.querySelector('[data-cp-action="birthplace-search"]')?.addEventListener('click', () => this.searchBirthplace());
    this.root.querySelector('[data-cp-action="generation-search"]')?.addEventListener('click', () => this.searchGeneration());
    this.root.querySelector('[data-cp-action="overseas"]')?.addEventListener('click', () => this.showOverseas());
    this.root.addEventListener('click', (event) => {
      const modeButton = event.target.closest('[data-cp-suggest-mode]');
      if (modeButton) this.toggleMode(modeButton.dataset.cpSuggestMode);
    });
  }

  queueAutoSearch(mode) {
    window.clearTimeout(this.autoSearchTimer);
    this.autoSearchTimer = window.setTimeout(() => {
      if (mode === 'birthday') this.searchBirthday();
      if (mode === 'birthplace') this.searchBirthplace();
      if (mode === 'generation') this.searchGeneration();
    }, 80);
  }

  setupEntranceMotion() {
    if (!('IntersectionObserver' in window)) {
      this.root.classList.add('is-visible');
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.root.classList.add('is-visible');
          observer.disconnect();
        }
      });
    }, { threshold: 0.4 });
    observer.observe(this.root);
  }

  toggleMode(mode) {
    if (this.state.activeMode === mode) {
      this.closeMode();
      return;
    }
    this.state.activeMode = mode;
    this.cache.choices.forEach((choice) => {
      const open = choice.dataset.cpMode === mode;
      choice.classList.toggle('is-open', open);
      choice.setAttribute('aria-expanded', String(open));
    });
    this.cache.panels.forEach((panel) => {
      const open = panel.dataset.cpPanel === mode;
      panel.classList.toggle('is-open', open);
      panel.setAttribute('aria-hidden', String(!open));
      this.setPanelFocusable(panel, open);
    });
    this.emit('cp_mode_open', { mode });
  }

  closeMode() {
    this.state.activeMode = null;
    this.cache.choices.forEach((choice) => {
      choice.classList.remove('is-open');
      choice.setAttribute('aria-expanded', 'false');
    });
    this.cache.panels.forEach((panel) => {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      this.setPanelFocusable(panel, false);
    });
  }

  setPanelFocusable(panel, enabled) {
    const controls = panel.querySelectorAll('button, select, a, input, textarea');
    controls.forEach((control) => {
      if (enabled) {
        if (control.dataset.cpTabindex) {
          control.setAttribute('tabindex', control.dataset.cpTabindex);
          delete control.dataset.cpTabindex;
        } else {
          control.removeAttribute('tabindex');
        }
      } else {
        if (!control.dataset.cpTabindex && control.hasAttribute('tabindex')) control.dataset.cpTabindex = control.getAttribute('tabindex');
        control.setAttribute('tabindex', '-1');
      }
    });
  }

  getActivePlayers() {
    return [...this.activePlayers].sort((a, b) => (a.displayRank ?? 999) - (b.displayRank ?? 999) || Number(a.number) - Number(b.number) || a.name.localeCompare(b.name, 'ja'));
  }

  trimEntries(entries) {
    return this.getActivePlayers().filter((player) => entries.some((entry) => entry.id === player.id)).slice(0, this.maxResults);
  }

  searchBirthday() {
    const month = Number(this.cache.month.value);
    if (!month) {
      this.renderEmpty('誕生月を選んでください。', '月を選ぶと、同じ誕生月の選手・マスコットを表示します。', 'birthday');
      return;
    }
    const sameMonth = this.activePlayers.filter((player) => dateParts(player.birthDate).month === month);
    if (!sameMonth.length) {
      this.renderEmpty(`${month}月生まれの選手・マスコットは見つかりませんでした。`, '出身地や世代からも、あなたとつながる存在を探せます。', 'birthplace');
      this.emit('cp_search_execute', { mode: 'birthmonth' });
      this.emit('cp_result_view', { mode: 'birthmonth', result_type: 'empty', result_count_bucket: '0' });
      return;
    }
    const entries = this.trimEntries(sameMonth);
    this.renderResults({
      kicker: 'BIRTH MONTH MATCH',
      title: `あなたと同じ${month}月生まれの選手・マスコット`,
      description: '同じ誕生月から、気になる選手やクラブマスコットを見つけられます。',
      entries,
      reason: `あなたと同じ${month}月生まれ`,
      match: null
    });
    this.emit('cp_search_execute', { mode: 'birthmonth' });
    this.emit('cp_result_view', { mode: 'birthmonth', result_type: 'exact', result_count_bucket: this.countBucket(entries.length) });
  }

  searchBirthplace() {
    const value = this.cache.prefecture.value;
    if (!value) {
      this.renderEmpty('出身地を選んでください。', '日本の都道府県、または海外の出身国を選ぶと、自動で選手を表示します。', 'birthplace');
      return;
    }

    if (value.startsWith('country:')) {
      const country = value.replace('country:', '');
      const entries = this.activePlayers.filter((player) => !isMascot(player) && !player.prefecture && player.country === country);
      this.state.selectedPrefecture = value;
      this.highlightMap();
      if (!entries.length) {
        this.renderEmpty(`${country}出身の選手は見つかりませんでした。`, '別の出身地や、誕生月・世代から探してみよう。', 'birthplace');
        this.emit('cp_search_execute', { mode: 'birthplace' });
        this.emit('cp_result_view', { mode: 'birthplace', result_type: 'empty', result_count_bucket: '0' });
        return;
      }
      const shown = this.trimEntries(entries);
      this.renderResults({
        kicker: 'BIRTHPLACE MATCH',
        title: `${country}出身のレッズ選手`,
        description: '海外出身の選手も、出身地の入口からそのまま探せます。',
        entries: shown,
        reason: `${country}出身`
      });
      this.emit('cp_search_execute', { mode: 'birthplace' });
      this.emit('cp_result_view', { mode: 'birthplace', result_type: 'exact', result_count_bucket: this.countBucket(shown.length) });
      return;
    }

    const prefecture = PREFECTURES.find((item) => item.code === value);
    if (!prefecture) return;
    const entries = this.activePlayers.filter((player) => player.prefecture === prefecture.name);
    this.state.selectedPrefecture = value;
    this.highlightMap();
    if (!entries.length) {
      this.renderEmpty(`${prefecture.name}出身の選手は見つかりませんでした。`, 'ほかの都道府県や、海外出身の選手も見てみよう。', 'birthplace');
      this.emit('cp_search_execute', { mode: 'birthplace' });
      this.emit('cp_result_view', { mode: 'birthplace', result_type: 'empty', result_count_bucket: '0' });
      return;
    }
    const shown = this.trimEntries(entries);
    this.renderResults({
      kicker: 'BIRTHPLACE MATCH',
      title: `あなたと同じ${prefecture.name}出身の選手`,
      description: `今季は${entries.length}人。地元のつながりから、応援したい選手を見つけよう。`,
      entries: shown,
      reason: `あなたと同じ${prefecture.name}出身`
    });
    this.emit('cp_search_execute', { mode: 'birthplace' });
    this.emit('cp_result_view', { mode: 'birthplace', result_type: 'exact', result_count_bucket: this.countBucket(shown.length) });
  }

  searchGeneration() {
    const year = Number(this.cache.year.value);
    if (!year) {
      this.renderEmpty('生まれ年を選んでください。', '同じ生まれ年、近い世代の選手・マスコットを探せます。', 'generation');
      return;
    }
    const exact = this.activePlayers.filter((player) => dateParts(player.birthDate).year === year);
    const near = this.activePlayers.filter((player) => Math.abs(dateParts(player.birthDate).year - year) === 1);
    const decade = Math.floor(year / 10) * 10;
    const sameDecade = this.activePlayers.filter((player) => Math.floor(dateParts(player.birthDate).year / 10) * 10 === decade);
    const selected = exact.length ? exact : near.length ? near : sameDecade;
    if (!selected.length) {
      this.renderEmpty('近い世代の選手・マスコットは見つかりませんでした。', '誕生月や出身地からも探せます。', 'birthday');
      this.emit('cp_search_execute', { mode: 'generation' });
      this.emit('cp_result_view', { mode: 'generation', result_type: 'empty', result_count_bucket: '0' });
      return;
    }
    const resultType = exact.length ? 'exact' : 'broadened';
    const title = exact.length ? `あなたと同じ${year}年生まれの選手・マスコット` : near.length ? 'あなたと近い世代の選手・マスコット' : `あなたと同じ${decade}年代生まれの選手・マスコット`;
    const entries = this.trimEntries(selected);
    this.renderResults({
      kicker: 'GENERATION MATCH',
      title,
      description: `${year}年を起点に、今季の選手・クラブマスコットを表示しています。`,
      entries,
      reason: (player) => dateParts(player.birthDate).year === year ? `あなたと同じ${year}年生まれ` : 'あなたと近い世代'
    });
    this.emit('cp_search_execute', { mode: 'generation' });
    this.emit('cp_result_view', { mode: 'generation', result_type: resultType, result_count_bucket: this.countBucket(entries.length) });
  }

  showOverseas() {
    const entries = this.activePlayers.filter((player) => !isMascot(player) && !player.prefecture);
    if (!entries.length) {
      this.renderEmpty('海外出身の選手は見つかりませんでした。', '別の共通点から、気になる選手やマスコットを探してみよう。', 'birthplace');
      return;
    }
    this.renderResults({
      kicker: 'FROM OVERSEAS',
      title: '海外出身のレッズ選手',
      description: '世界のさまざまな場所から、レッズに集まる選手たち。出身地の選択欄から国別にも探せます。',
      entries: this.trimEntries(entries),
      reason: (player) => `${player.country}出身`
    });
    this.emit('cp_result_view', { mode: 'birthplace', result_type: 'broadened', result_count_bucket: this.countBucket(entries.length) });
  }

  renderHeatMap() {
    const counts = this.prefectureCounts();
    this.cache.map.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="cp-guide-player__heatmap-silhouette" d="M74 4l12 4 4 9-8 8-9-2-5-7zM69 27l4 5-4 9-5 7-2 10-6 8-7 6-6 8-9 4-8 8-8 4-7 1-9 2-5-4 10-6 8-9 10-5 7-11 7-7 4-12 3-8 6-9zM33 73l8 3 5 6-7 4-8-2-5-5zM15 80l8 3 4 8-5 7-9 3-6-5 2-9zM81 92l4 2 3 4-4 2-4-2z"></path></svg>`;
    Object.entries(MAP_POINTS).forEach(([prefecture, [left, top]]) => {
      const count = counts[prefecture] || 0;
      const item = PREFECTURES.find((entry) => entry.name === prefecture);
      if (!item) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `cp-guide-player__map-dot ${heatClass(count)}`;
      button.dataset.cpCode = item.code;
      button.dataset.cpTooltip = `${prefecture}：${count}人`;
      button.style.left = `${left}%`;
      button.style.top = `${top}%`;
      button.setAttribute('aria-label', `${prefecture}、出身選手${count}人`);
      button.addEventListener('click', () => {
        this.cache.prefecture.value = item.code;
        this.state.selectedPrefecture = item.code;
        this.highlightMap();
        this.searchBirthplace();
      });
      this.cache.map.append(button);
    });
  }

  renderPrefectureButtons() {
    const counts = this.prefectureCounts();
    const countryCounts = this.countryCounts();
    const populated = PREFECTURES.filter((prefecture) => counts[prefecture.name]);
    const domesticButtons = populated.map((prefecture) => `<button type="button" data-cp-prefecture-button="${prefecture.code}">${escapeHtml(prefecture.name)} <span>${counts[prefecture.name]}</span></button>`).join('');
    const countryButtons = Object.entries(countryCounts).map(([country, count]) => `<button type="button" class="is-country" data-cp-prefecture-button="country:${escapeHtml(country)}">${escapeHtml(country)} <span>${count}</span></button>`).join('');
    this.cache.regionButtons.innerHTML = domesticButtons + countryButtons;
    this.cache.regionButtons.querySelectorAll('[data-cp-prefecture-button]').forEach((button) => {
      button.addEventListener('click', () => {
        const value = button.dataset.cpPrefectureButton;
        this.cache.prefecture.value = value;
        this.state.selectedPrefecture = value;
        this.highlightMap();
        this.searchBirthplace();
      });
    });
  }

  highlightMap() {
    this.cache.map.querySelectorAll('[data-cp-code]').forEach((button) => button.classList.toggle('is-selected', button.dataset.cpCode === this.state.selectedPrefecture));
  }

  prefectureCounts() {
    return this.activePlayers.reduce((all, player) => {
      if (!isMascot(player) && player.prefecture) all[player.prefecture] = (all[player.prefecture] || 0) + 1;
      return all;
    }, {});
  }

  countryCounts() {
    return this.activePlayers.reduce((all, player) => {
      if (!isMascot(player) && !player.prefecture && player.country) all[player.country] = (all[player.country] || 0) + 1;
      return all;
    }, {});
  }

  foreignCountries() {
    return Object.keys(this.countryCounts()).sort((a, b) => a.localeCompare(b, 'ja'));
  }

  renderResults({ kicker, title, description, entries, reason, match = null }) {
    const cards = entries.map((player) => this.playerCard(player, typeof reason === 'function' ? reason(player) : reason)).join('');
    const moreText = entries.some(isMascot) ? 'ほかの選手はトップチーム一覧で見る' : 'ほかの選手はトップチーム一覧で見る';
    this.cache.results.innerHTML = `<div class="cp-guide-player__result-shell"><div class="cp-guide-player__result-head" tabindex="-1"><div><p class="cp-guide-player__result-kicker">${escapeHtml(kicker)}</p><h4>${escapeHtml(title)}</h4></div><p>${escapeHtml(description)}</p></div><div class="cp-guide-player__cards ${this.state.hasRenderedResults ? '' : 'is-animated'}">${cards}</div>${entries.length >= this.maxResults ? `<a class="cp-guide-player__more-link" href="${escapeHtml(this.topTeamUrl)}" data-cp-topteam-link>${moreText}</a>` : ''}${match ? this.matchCard(match) : ''}</div>`;
    this.state.hasRenderedResults = true;
    const head = this.cache.results.querySelector('.cp-guide-player__result-head');
    head.focus({ preventScroll: true });
    this.cache.results.scrollIntoView({ behavior: this.reduceMotion() ? 'auto' : 'smooth', block: 'nearest' });
    this.cache.results.querySelectorAll('[data-cp-player-link]').forEach((link) => link.addEventListener('click', () => this.emit('cp_player_profile_click')));
    this.cache.results.querySelector('[data-cp-topteam-link]')?.addEventListener('click', () => this.emit('cp_topteam_click'));
    this.cache.results.querySelector('[data-cp-match-link]')?.addEventListener('click', () => this.emit('cp_match_info_click'));
    this.cache.results.querySelector('[data-cp-ticket-link]')?.addEventListener('click', () => this.emit('cp_ticket_click'));
  }

  playerCard(player, reason) {
    const birth = dateParts(player.birthDate);
    const mascot = isMascot(player);
    const numberLabel = mascot ? 'MASCOT' : String(player.number).padStart(2, '0');
    const roleLabel = mascot ? 'クラブマスコット' : player.position;
    const meta = mascot ? `${roleLabel} / ${birth.year}年${birth.month}月${birth.day}日誕生` : `${escapeHtml(player.position)} / ${birth.year}年${birth.month}月${birth.day}日生まれ`;
    const ariaLabel = mascot ? `${player.name}を見る` : `${player.name}選手の公式プロフィールを見る`;
    return `<a class="cp-guide-player__player-card${mascot ? ' is-mascot' : ''}" href="${escapeHtml(player.profile)}" data-cp-player-link aria-label="${escapeHtml(ariaLabel)}"><span class="cp-guide-player__player-number">${escapeHtml(numberLabel)}<small>${escapeHtml(roleLabel)}</small></span><span><span class="cp-guide-player__player-reason">${escapeHtml(reason)}</span><strong class="cp-guide-player__player-name">${escapeHtml(player.name)}</strong><small class="cp-guide-player__player-meta">${meta}</small></span><span class="cp-guide-player__player-arrow" aria-hidden="true">→</span></a>`;
  }

  renderEmpty(title, description, suggestMode) {
    this.cache.results.innerHTML = `<div class="cp-guide-player__result-shell"><div class="cp-guide-player__empty"><span class="cp-guide-player__empty-art" aria-hidden="true"></span><div><h4>${escapeHtml(title)}</h4><p>${escapeHtml(description)}</p><button type="button" data-cp-suggest-mode="${escapeHtml(suggestMode)}">${suggestMode === 'birthplace' ? '出身地から探す' : suggestMode === 'generation' ? '世代から探す' : '誕生月から探す'}</button></div></div></div>`;
    this.cache.results.scrollIntoView({ behavior: this.reduceMotion() ? 'auto' : 'smooth', block: 'nearest' });
  }

  findBirthdayMatch(month, day) {
    const freshMatches = matches.filter((match) => match.isActive !== false && match.matchInfoUrl && match.date && !match.isDemo);
    if (!freshMatches.length) return null;
    const target = new Date(2026, month - 1, day, 12).getTime();
    const eligible = freshMatches.map((match) => {
      const kickoff = new Date(`${match.date}T12:00:00+09:00`).getTime();
      const distance = Math.abs(kickoff - target) / 86400000;
      return { ...match, distance, after: kickoff >= target };
    }).filter((match) => match.distance === 0 || match.distance <= 3 || new Date(`${match.date}T12:00:00+09:00`).getMonth() === month - 1);
    if (!eligible.length) return null;
    eligible.sort((a, b) => a.distance - b.distance || Number(b.after) - Number(a.after) || a.date.localeCompare(b.date));
    return eligible[0];
  }

  matchCard(match) {
    const date = new Date(`${match.date}T12:00:00+09:00`);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const dateLabel = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日(${weekdays[date.getDay()]}) ${escapeHtml(match.kickoff || '')}キックオフ`;
    const ticket = match.salesState === 'on_sale' && match.ticketUrl ? `<a href="${escapeHtml(match.ticketUrl)}" data-cp-ticket-link>チケットを見る</a>` : '';
    return `<article class="cp-guide-player__match-card"><p class="cp-guide-player__match-kicker">YOUR BIRTHDAY & HOME GAME</p><h5>あなたの誕生日の近くに、ホームゲームがあります。</h5><p class="cp-guide-player__match-copy">${dateLabel}<br>浦和レッズ vs ${escapeHtml(match.opponent)} / ${escapeHtml(match.stadium)}</p><div class="cp-guide-player__match-actions"><a href="${escapeHtml(match.matchInfoUrl)}" data-cp-match-link>試合情報を見る</a>${ticket}</div></article>`;
  }

  countBucket(count) { return count === 0 ? '0' : count >= 3 ? '3plus' : String(count); }
  reduceMotion() { return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; }
  emit(event, data = {}) { window.dataLayer?.push({ event, ...data }); }
}

document.querySelectorAll('.js-common-point').forEach((root, index) => new CommonPointFinder(root, index));
