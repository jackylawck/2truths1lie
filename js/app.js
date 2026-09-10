/* =========================================================================
 * 🎮 app.js - 培訓實戰完整對齊版
 * 串聯：投影模式切換、三段式變色計時器、即時未投名單比對、活動名堂
 * ========================================================================= */

// 模組級核心狀態
let clientName = '';
let submissions = {};       // { peerId: { name, statements, lieIndex, story } }
let currentRound = null;    // 當前主角數據
let localVotes = { 0: 0, 1: 0, 2: 0 };
let voteRecords = [];
let votedPeers = new Set(); // 記錄本輪已投過票的 peerId
let timerInterval = null;
let isPresentationMode = false;

// 活動元數據（標題、主持人）
window._activityMeta = {
  activityTitle: '團隊破冰對話',
  hostName: '主持人'
};

// 容錯防護
if (typeof t !== 'function') {
  window.t = function(key) { return key; };
}

// 視圖路由切換
function switchView(id) {
  document.querySelectorAll('.view-section, #view-landing').forEach((el) => {
    el.style.display = 'none';
  });
  const target = document.getElementById(id);
  if (target) {
    target.style.display = 'block';
  } else {
    console.error('[Router] 找不到目標視圖 ID:', id);
  }
}

// 🖥️ 投影模式切換（與 CSS body.presentation-mode 連動）
function togglePresentationMode() {
  isPresentationMode = !isPresentationMode;
  document.body.classList.toggle('presentation-mode', isPresentationMode);

  const btn = document.getElementById('btn-presentation');
  if (btn) {
    btn.classList.toggle('active', isPresentationMode);
    btn.innerText = isPresentationMode ? t('btn_presentation_off') : t('btn_presentation_on');
  }
}

// =========================================================================
// 🏠 Host 主持人流程
// =========================================================================

function uiSetupHost() {
  try {
    // 讀取活動名稱與主持人暱稱
    const titleInp = document.getElementById('setup-activity-title')?.value.trim();
    const hostInp = document.getElementById('setup-host-name')?.value.trim();

    window._activityMeta.activityTitle = titleInp || t('default_activity_title');
    window._activityMeta.hostName = hostInp || t('txt_host_prefix').replace('：', '').replace(':', '');

    // 更新大廳與遊戲畫面的主持標籤
    const bannerTitle = document.getElementById('host-banner-title');
    const bannerHost = document.getElementById('host-banner-host');
    const gameHostTag = document.getElementById('game-host-name');

    if (bannerTitle) bannerTitle.innerText = window._activityMeta.activityTitle;
    if (bannerHost) bannerHost.innerText = `${t('txt_host_prefix')}${window._activityMeta.hostName}`;
    if (gameHostTag) gameHostTag.innerText = window._activityMeta.hostName;

    switchView('view-host-lobby');

    const roomId = Math.floor(10000000 + Math.random() * 90000000).toString();
    const roomIdEl = document.getElementById('host-room-id');
    if (roomIdEl) roomIdEl.innerText = roomId;

    const qrContainer = document.getElementById('host-qr');
    if (qrContainer) {
      qrContainer.innerHTML = '';
      const qrUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
      if (typeof QRCode !== 'undefined') {
        new QRCode(qrContainer, { text: qrUrl, width: 130, height: 130 });
      } else {
        qrContainer.innerHTML = `<p class="text-sm text-danger">${t('txt_room_id')}: ${roomId}</p>`;
      }
    }

    if (typeof initHostPeer === 'function') {
      initHostPeer(
        roomId,
        (data, conn) => handleHostReceiveData(data, conn),
        (count) => {
          const cntEl = document.getElementById('host-count');
          if (cntEl) cntEl.innerText = count;
        }
      );
    } else {
      alert('p2p.js 載入異常，請確認檔案路徑。');
    }
  } catch (err) {
    console.error('進入主持人模式失敗:', err);
    alert('建立房間出錯: ' + err.message);
  }
}

// 主持人接收手機端通訊
function handleHostReceiveData(data, conn) {
  if (data.type === 'SUBMIT') {
    submissions[conn.peer] = {
      name: data.name,
      statements: data.statements,
      lieIndex: data.lieIndex,
      story: data.story
    };
    renderLobbyRoster();
  } else if (data.type === 'VOTE') {
    // 透過 votedPeers 去重防止重複刷票
    if (!votedPeers.has(conn.peer)) {
      votedPeers.add(conn.peer);
      localVotes[data.choice] = (localVotes[data.choice] || 0) + 1;
      renderHostVoteDisplay();
      updateVoteProgressUI();
    }
  }
}

// 渲染大廳人員卡片
function renderLobbyRoster() {
  const grid = document.getElementById('host-player-grid');
  const tip = document.getElementById('host-empty-tip');
  if (!grid) return;

  grid.innerHTML = '';
  const list = Object.entries(submissions);
  if (list.length > 0 && tip) tip.style.display = 'none';

  list.forEach(([peerId, sub]) => {
    const chip = document.createElement('div');
    chip.className = 'player-chip ready';
    chip.innerHTML = `<b>${sub.name}</b><br><small class="text-muted text-sm">${t('txt_chip_ready')}</small>`;
    chip.onclick = () => hostStartRound(peerId, sub);
    grid.appendChild(chip);
  });
}

// 主持人點擊開題
function hostStartRound(peerId, sub) {
  currentRound = { peerId, ...sub };
  localVotes = { 0: 0, 1: 0, 2: 0 };
  votedPeers.clear();

  switchView('view-host-game');

  const presenterEl = document.getElementById('host-current-name');
  if (presenterEl) presenterEl.innerText = sub.name;

  const btnReveal = document.getElementById('btn-host-reveal');
  const btnBack = document.getElementById('btn-host-back');
  const storyBox = document.getElementById('host-story-box');

  if (btnReveal) btnReveal.style.display = 'block';
  if (btnBack) btnBack.classList.add('is-hidden');
  if (storyBox) storyBox.classList.add('is-hidden');

  // 渲染選項卡片（使用 CSS class，零內聯樣式）
  const box = document.getElementById('host-statements-display');
  if (box) {
    box.innerHTML = '';
    sub.statements.forEach((stmt, idx) => {
      const card = document.createElement('div');
      card.className = 'choice-card';
      card.id = `host-card-${idx}`;
      card.innerHTML = `
        <b>#${idx + 1}. ${stmt}</b>
        <div id="h-cnt-${idx}" class="vote-count text-muted text-sm">0 ${t('lbl_votes_suffix')}</div>
      `;
      box.appendChild(card);
    });
  }

  // 初始化進度條與未投名單
  updateVoteProgressUI();

  // 啟動 90 秒三段式計時器 (30s黃 / 0s紅)
  startSoftTimer(90);

  // 廣播給手機開猜
  broadcastToAll({
    type: 'START_ROUND',
    name: sub.name,
    statements: sub.statements
  });
}

// 🎯 即時計算投票進度與未投同仁名單（連動 CSS .vote-progress-bar）
function updateVoteProgressUI() {
  const eligiblePeers = (typeof clients !== 'undefined') 
    ? Object.keys(clients).filter(p => p !== currentRound?.peerId)
    : [];

  const total = eligiblePeers.length;
  const count = votedPeers.size;

  const totalEl = document.getElementById('host-total-voters');
  const votedEl = document.getElementById('host-voted-count');
  const pendingEl = document.getElementById('host-pending-list');

  if (totalEl) totalEl.innerText = total;
  if (votedEl) votedEl.innerText = count;

  if (pendingEl) {
    if (count >= total && total > 0) {
      pendingEl.innerText = t('txt_all_voted');
      pendingEl.style.color = 'var(--tick-green)';
    } else {
      const pendingNames = eligiblePeers
        .filter(p => !votedPeers.has(p))
        .map(p => submissions[p]?.name || '神秘同仁');

      if (pendingNames.length > 0) {
        pendingEl.innerText = `（${pendingNames.join('、')} ${t('txt_pending_suffix')}）`;
        pendingEl.style.color = 'var(--text-muted)';
      } else {
        pendingEl.innerText = '';
      }
    }
  }
}

function renderHostVoteDisplay() {
  [0, 1, 2].forEach((idx) => {
    const el = document.getElementById(`h-cnt-${idx}`);
    if (el) el.innerText = `${localVotes[idx] || 0} ${t('lbl_votes_suffix')}`;
  });
}

// 🎯 三段式節奏軟計時器（連動 CSS .soft-timer-fill.warning / .critical）
function startSoftTimer(duration) {
  if (timerInterval) clearInterval(timerInterval);
  let remain = duration;

  const fill = document.getElementById('host-timer-fill');
  const txt = document.getElementById('host-timer-text');

  if (fill) {
    fill.className = 'soft-timer-fill';
    fill.style.width = '100%';
  }

  timerInterval = setInterval(() => {
    remain--;
    const m = Math.floor(remain / 60).toString().padStart(2, '0');
    const s = (remain % 60).toString().padStart(2, '0');
    if (txt) txt.innerText = `${m}:${s}`;

    if (fill) {
      fill.style.width = `${Math.max(0, (remain / duration) * 100)}%`;
      if (remain <= 30 && remain > 0) {
        fill.classList.add('warning');
      } else if (remain <= 0) {
        fill.classList.remove('warning');
        fill.classList.add('critical');
      }
    }

    if (remain <= 0) {
      clearInterval(timerInterval);
    }
  }, 1000);
}

// 揭曉答案
function hostRevealCurrent() {
  if (!currentRound) return;
  if (timerInterval) clearInterval(timerInterval); // 揭曉時停錶

  const btnReveal = document.getElementById('btn-host-reveal');
  const btnBack = document.getElementById('btn-host-back');
  const storyBox = document.getElementById('host-story-box');
  const storyContent = document.getElementById('host-story-content');

  if (btnReveal) btnReveal.style.display = 'none';
  if (btnBack) btnBack.classList.remove('is-hidden');
  if (storyBox) storyBox.classList.remove('is-hidden');
  if (storyContent) storyContent.innerText = currentRound.story || t('lbl_no_records');

  // 選項紅綠著色
  [0, 1, 2].forEach((idx) => {
    const card = document.getElementById(`host-card-${idx}`);
    if (card) {
      if (idx === currentRound.lieIndex) {
        card.classList.add('is-lie');
      } else {
        card.classList.add('is-truth');
      }
    }
  });

  // 寫入本場回顧紀錄
  voteRecords.push({
    name: currentRound.name,
    statements: currentRound.statements,
    lieIndex: currentRound.lieIndex,
    story: currentRound.story,
    votes: { ...localVotes },
    fooled: localVotes[currentRound.lieIndex] || 0
  });

  // 廣播給手機端揭曉
  broadcastToAll({
    type: 'REVEAL',
    lieIndex: currentRound.lieIndex
  });
}

function uiBackToLobby() {
  switchView('view-host-lobby');
  if (currentRound?.peerId) {
    delete submissions[currentRound.peerId];
  }
  renderLobbyRoster();
}

function uiHostEndActivity() {
  const confirmed = confirm(t('confirm_end_activity'));
  if (!confirmed) return;

  broadcastToAll({ type: 'ENDED' });
  renderLocalSummary();
}

// 🎯 活動回顧渲染：串聯活動名堂與動態收尾語
function renderLocalSummary() {
  switchView('view-summary');

  const heading = document.getElementById('summary-activity-heading');
  if (heading && window._activityMeta) {
    heading.innerText = `🎉 ${window._activityMeta.activityTitle} ${t('txt_summary_suffix')}`;
  }

  const closingTextEl = document.querySelector('.closing-text');
  if (closingTextEl && window._activityMeta) {
    const isWelcome = /迎新|新同事|onboarding|new joiner/i.test(window._activityMeta.activityTitle);
    closingTextEl.innerHTML = isWelcome ? t('closing_welcome') : t('closing_general');
  }

  const container = document.getElementById('summary-list');
  if (!container) return;
  container.innerHTML = '';

  if (voteRecords.length === 0) {
    container.innerHTML = `<p class="empty-tip">${t('lbl_no_records')}</p>`;
    return;
  }

  voteRecords.forEach((r) => {
    const card = document.createElement('div');
    card.className = 'summary-card';
    card.innerHTML = `
      <div class="summary-card-header">
        <h3 class="summary-card-name">👤 ${r.name}</h3>
        <span class="badge badge-fooled">${t('lbl_fooled_prefix')} ${r.fooled} ${t('lbl_unit_people')}</span>
      </div>
      <p class="summary-stmt-line">1. ${r.statements[0]} <b>(${r.votes[0]} ${t('lbl_votes_suffix')})</b></p>
      <p class="summary-stmt-line">2. ${r.statements[1]} <b>(${r.votes[1]} ${t('lbl_votes_suffix')})</b></p>
      <p class="summary-stmt-line">3. ${r.statements[2]} <b>(${r.votes[2]} ${t('lbl_votes_suffix')})</b></p>
      <p class="summary-lie-tag">${t('lbl_the_lie_is')}${r.lieIndex + 1}${t('lbl_item_suffix')}</p>
      <div class="story-box">
        <h4 class="story-title">${t('lbl_story_title')}</h4>
        <p class="story-content">${r.story || t('lbl_no_records')}</p>
      </div>
    `;
    container.appendChild(card);
  });
}

// =========================================================================
// 📱 Client 參與者端流程
// =========================================================================

function uiSetupPlayer() {
  switchView('view-player-join');
  const params = new URLSearchParams(window.location.search);
  if (params.get('room')) {
    const inp = document.getElementById('join-room-id');
    if (inp) inp.value = params.get('room');
  }
}

function uiConnectAsClient(e) {
  if (e && e.preventDefault) e.preventDefault();

  const roomId = document.getElementById('join-room-id')?.value.trim();
  clientName = document.getElementById('join-player-name')?.value.trim();
  const btn = document.querySelector('#view-player-join .btn');

  if (!roomId || !clientName) {
    alert(t('err_room_id'));
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerText = t('btn_joining');
  }

  initClientPeer(
    roomId,
    () => {
      if (btn) {
        btn.disabled = false;
        btn.innerText = t('btn_join');
      }
      switchView('view-player-write');
    },
    (data) => handleClientReceiveData(data),
    () => {
      if (btn) {
        btn.disabled = false;
        btn.innerText = t('btn_join');
      }
      alert(t('alert_disconnected'));
    },
    () => {
      if (btn) {
        btn.disabled = false;
        btn.innerText = t('btn_join');
      }
      alert(t('alert_not_found'));
    }
  );
}

function uiClientSubmit() {
  const s0 = document.getElementById('p-stmt-0')?.value.trim();
  const s1 = document.getElementById('p-stmt-1')?.value.trim();
  const s2 = document.getElementById('p-stmt-2')?.value.trim();
  const lieValue = document.getElementById('p-lie-index')?.value;
  const story = document.getElementById('p-story')?.value.trim();

  if (!s0 || !s1 || !s2) {
    alert(t('err_fill_all'));
    return;
  }

  if (lieValue === '' || lieValue === null) {
    alert(t('err_select_lie'));
    return;
  }

  const lieIndex = parseInt(lieValue, 10);

  sendToHost({
    type: 'SUBMIT',
    name: clientName,
    statements: [s0, s1, s2],
    lieIndex: lieIndex,
    story: story
  });

  switchView('view-player-vote');
}

function handleClientReceiveData(data) {
  if (data.type === 'START_ROUND') {
    const waitMsg = document.getElementById('player-waiting-msg');
    const votePanel = document.getElementById('player-active-voting');
    const alertMsg = document.getElementById('player-voted-alert');
    const targetName = document.getElementById('vote-target-name');

    if (waitMsg) waitMsg.style.display = 'none';
    if (votePanel) votePanel.classList.remove('is-hidden');
    if (alertMsg) alertMsg.classList.add('is-hidden');
    if (targetName) targetName.innerText = data.name;

    // 渲染手機端選項（高度受 CSS #player-choices-box 限制，絕不滑出螢幕）
    const box = document.getElementById('player-choices-box');
    if (box) {
      box.innerHTML = '';
      data.statements.forEach((stmt, idx) => {
        const card = document.createElement('div');
        card.className = 'choice-card';
        card.id = `p-card-${idx}`;
        card.innerText = `#${idx + 1}. ${stmt}`;
        card.onclick = () => {
          sendToHost({ type: 'VOTE', choice: idx });
          document.querySelectorAll('#player-choices-box .choice-card').forEach((c, i) => {
            c.onclick = null;
            if (i === idx) c.classList.add('selected');
          });
          if (alertMsg) alertMsg.classList.remove('is-hidden');
        };
        box.appendChild(card);
      });
    }
  } else if (data.type === 'REVEAL') {
    [0, 1, 2].forEach((idx) => {
      const card = document.getElementById(`p-card-${idx}`);
      if (card) {
        if (idx === data.lieIndex) {
          card.classList.add('is-lie');
        } else {
          card.classList.add('is-truth');
        }
      }
    });
  } else if (data.type === 'ENDED') {
    alert(t('alert_ended'));
  }
}

// 僅在網址帶有 ?room= 時才跳轉參與端
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.has('room') && params.get('room').trim() !== '') {
    uiSetupPlayer();
  }
});
