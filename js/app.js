/* =========================================================================
 * 🎮 app.js - 狀態閉環與工程極致版
 * 徹底縫合 HTML 斷點：動態元數據、投影切換、投票名單即時比對、零內聯樣式
 * ========================================================================= */

// 模組級核心狀態
let clientName = '';
let submissions = {};       // { peerId: { name, statements, lieIndex, story } }
let currentRound = null;    // { peerId, name, statements, lieIndex, story }
let localVotes = { 0: 0, 1: 0, 2: 0 };
let voteRecords = [];
let votedPeers = new Set(); // 🎯 斷點 2 修復：追蹤本輪已投票的 peerId
let timerInterval = null;
let isPresentationMode = false;

// 🎯 斷點 1 & 4 修復：活動全域元數據（名稱、主持人）
window._activityMeta = {
  activityTitle: '團隊破冰對話',
  hostName: '主持人'
};

// 容錯防護：i18n 未就緒時的安全 Fallback
if (typeof t !== 'function') {
  window.t = function(key) { return key; };
}

// 通用視圖切換
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

// 🎯 斷點 3 修復：實作投影模式切換函式
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
// 🏠 Host 主持人業務流
// =========================================================================

function uiSetupHost() {
  try {
    // 🎯 斷點 1 修復：主動讀取活動名稱與主持人稱呼，同步至大廳橫額
    const titleInp = document.getElementById('setup-activity-title')?.value.trim();
    const hostInp = document.getElementById('setup-host-name')?.value.trim();

    window._activityMeta.activityTitle = titleInp || t('default_activity_title');
    window._activityMeta.hostName = hostInp || t('txt_host_prefix').replace('：', '').replace(':', '');

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

// 主持人接收手機端數據（題目提交 / 投票紀錄）
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
    // 🎯 斷點 2 修復：透過 votedPeers 去重，避免一人多投
    if (!votedPeers.has(conn.peer)) {
      votedPeers.add(conn.peer);
      localVotes[data.choice] = (localVotes[data.choice] || 0) + 1;
      renderHostVoteDisplay();
      updateVoteProgressUI();
    }
  }
}

// 渲染大廳就緒人員卡片
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
    chip.innerHTML = `<b>${sub.name}</b><br><small class="text-muted text-sm">${t('txt_submit_success')}</small>`;
    chip.onclick = () => hostStartRound(peerId, sub);
    grid.appendChild(chip);
  });
}

// 主持人點擊人員開題
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

  // 🎯 關注點分離優化：拔除 innerHTML 內的 style="..."
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

  // 🎯 斷點 2 修復：初始化投票進度條與未投名單
  updateVoteProgressUI();

  // 啟動 90 秒三段式計時器
  startSoftTimer(90);

  // 廣播給所有手機開猜
  broadcastToAll({
    type: 'START_ROUND',
    name: sub.name,
    statements: sub.statements
  });
}

// 🎯 斷點 2 修復：即時更新投票進度條與未投人員名單
function updateVoteProgressUI() {
  // 排除主角本人後的應投票清單
  const eligiblePeers = Object.keys(clients).filter(p => p !== currentRound?.peerId);
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
      // 比對找出尚未投票的暱稱
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

// 更新大螢幕票數文字
function renderHostVoteDisplay() {
  [0, 1, 2].forEach((idx) => {
    const el = document.getElementById(`h-cnt-${idx}`);
    if (el) el.innerText = `${localVotes[idx] || 0} ${t('lbl_votes_suffix')}`;
  });
}

// 90 秒軟計時器 (30s 轉黃, 0s 轉紅)
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

// 主持人揭曉本輪真假
function hostRevealCurrent() {
  if (!currentRound) return;
  if (timerInterval) clearInterval(timerInterval);

  const btnReveal = document.getElementById('btn-host-reveal');
  const btnBack = document.getElementById('btn-host-back');
  const storyBox = document.getElementById('host-story-box');
  const storyContent = document.getElementById('host-story-content');

  if (btnReveal) btnReveal.style.display = 'none';
  if (btnBack) btnBack.classList.remove('is-hidden');
  if (storyBox) storyBox.classList.remove('is-hidden');
  if (storyContent) storyContent.innerText = currentRound.story || t('lbl_no_records');

  // 卡片著色
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

  // 封存至回顧紀錄
  voteRecords.push({
    name: currentRound.name,
    statements: currentRound.statements,
    lieIndex: currentRound.lieIndex,
    story: currentRound.story,
    votes: { ...localVotes },
    fooled: localVotes[currentRound.lieIndex] || 0
  });

  // 廣播給手機揭曉
  broadcastToAll({
    type: 'REVEAL',
    lieIndex: currentRound.lieIndex
  });
}

// 返回大廳（清算已開題者）
function uiBackToLobby() {
  switchView('view-host-lobby');
  if (currentRound?.peerId) {
    delete submissions[currentRound.peerId];
  }
  renderLobbyRoster();
}

// 主持人結束活動
function uiHostEndActivity() {
  broadcastToAll({ type: 'ENDED' });
  renderLocalSummary();
}

// 🎯 斷點 4 修復：回顧標題串聯活動名堂，動態調適收尾文案，拔除內聯樣式
function renderLocalSummary() {
  switchView('view-summary');

  // 串聯專屬活動名堂
  const heading = document.getElementById('summary-activity-heading');
  if (heading && window._activityMeta) {
    heading.innerText = `🎉 ${window._activityMeta.activityTitle} ${t('txt_summary_suffix')}`;
  }

  // 智慧調適收尾語
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

  // 🎯 拔除 JS 內聯樣式，全數採用 CSS Utility Classes
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
// 📱 Client 參與者業務流
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

// 頁面初始化：僅在有房號參數時自動導向參賽端
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.has('room') && params.get('room').trim() !== '') {
    uiSetupPlayer();
  }
});
