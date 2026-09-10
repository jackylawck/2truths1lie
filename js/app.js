/* =========================================================================
 * 🎮 app.js - 業務邏輯與狀態機嚴格閉環版
 * 包含：currentRound 生命週期管理、重連者豁免通行、雙語主題回顧
 * ========================================================================= */

let clientName = '';
let currentRoomId = '';
let mySubmittedData = null;

// 使用 sessionStorage 保持單一活動會話身份
let myClientToken = sessionStorage.getItem('ice_client_token');
if (!myClientToken) {
  myClientToken = 'u_' + Math.random().toString(36).substring(2, 10);
  sessionStorage.setItem('ice_client_token', myClientToken);
}

// Host 端狀態
let sessionMap = {};        // { [clientToken]: peerId }
let submissions = {};       // { [clientToken]: { name, statements, lieIndex, story } }
let currentRound = null;    // { token, name, statements, lieIndex, story } (嚴格生命週期控制)
let localVotes = { 0: 0, 1: 0, 2: 0 };
let voteRecords = [];
let votedTokens = new Set();
let timerInterval = null;
let isPresentationMode = false;

window._activityMeta = {
  activityTitle: '團隊破冰對話',
  hostName: '主持人'
};

if (typeof t !== 'function') {
  window.t = function(key) { return key; };
}

function switchView(id) {
  document.querySelectorAll('.view-section, #view-landing').forEach((el) => {
    el.style.display = 'none';
  });
  const target = document.getElementById(id);
  if (target) target.style.display = 'block';
}

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
// 🏠 Host 端處理流程
// =========================================================================

function uiSetupHost() {
  try {
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
      }
    }

    initHostPeer(
      roomId,
      (data, conn) => handleHostReceiveData(data, conn),
      (count) => {
        const cntEl = document.getElementById('host-count');
        if (cntEl) cntEl.innerText = count;
      },
      (disconnectedPeerId) => {
        // 連線關閉時同步清理 sessionMap 條目
        for (const [token, pid] of Object.entries(sessionMap)) {
          if (pid === disconnectedPeerId) {
            delete sessionMap[token];
            break;
          }
        }
      }
    );
  } catch (err) {
    console.error('進入主持人模式失敗:', err);
    alert('建立房間出錯: ' + err.message);
  }
}

function handleHostReceiveData(data, conn) {
  // 1. 握手識別 (IDENTIFY)
  if (data.type === 'IDENTIFY') {
    const isKnownSession = sessionMap[data.clientToken] !== undefined;
    const currentActiveSessions = Object.keys(sessionMap).length;
    const limit = window.MAX_PARTICIPANTS || 15;

    // 🎯 重連者優先：新訪客超額才拒絕，舊人歸隊直接換線放行
    if (!isKnownSession && currentActiveSessions >= limit) {
      try { conn.send({ type: 'ROOM_FULL' }); } catch (e) {}
      setTimeout(() => {
        dropOldClientConn(conn.peer);
      }, 300);
      return;
    }

    const oldPeerId = sessionMap[data.clientToken];
    if (oldPeerId && oldPeerId !== conn.peer) {
      dropOldClientConn(oldPeerId);
    }
    sessionMap[data.clientToken] = conn.peer;

    // 🎯 嚴格狀態管理：只有在 currentRound 確實「活著」時才回送，大廳中絕不誤送舊題
    if (currentRound && conn.open) {
      try {
        conn.send({
          type: 'START_ROUND',
          name: currentRound.name,
          statements: currentRound.statements
        });
      } catch (e) {
        console.warn('[IDENTIFY] 回送 START_ROUND 失敗:', e);
      }
    }
    return;
  }

  // 2. 題目提交
  if (data.type === 'SUBMIT') {
    sessionMap[data.clientToken] = conn.peer;
    submissions[data.clientToken] = {
      name: data.name,
      statements: data.statements,
      lieIndex: data.lieIndex,
      story: data.story
    };
    renderLobbyRoster();
    return;
  }

  // 3. 投票接收
  if (data.type === 'VOTE') {
    if (!votedTokens.has(data.clientToken)) {
      votedTokens.add(data.clientToken);
      localVotes[data.choice] = (localVotes[data.choice] || 0) + 1;
      renderHostVoteDisplay();
      updateVoteProgressUI();
    }
  }
}

function renderLobbyRoster() {
  const grid = document.getElementById('host-player-grid');
  const tip = document.getElementById('host-empty-tip');
  if (!grid) return;

  grid.innerHTML = '';
  const list = Object.entries(submissions);
  if (list.length > 0 && tip) tip.style.display = 'none';

  list.forEach(([token, sub]) => {
    const chip = document.createElement('div');
    chip.className = 'player-chip ready';
    chip.innerHTML = `<b>${sub.name}</b><br><small class="text-muted text-sm">${t('txt_chip_ready')}</small>`;
    chip.onclick = () => hostStartRound(token, sub);
    grid.appendChild(chip);
  });
}

function hostStartRound(token, sub) {
  // 🎯 狀態誕生
  currentRound = { token, ...sub };
  localVotes = { 0: 0, 1: 0, 2: 0 };
  votedTokens.clear();

  switchView('view-host-game');

  const presenterEl = document.getElementById('host-current-name');
  if (presenterEl) presenterEl.innerText = sub.name;

  const btnReveal = document.getElementById('btn-host-reveal');
  const btnBack = document.getElementById('btn-host-back');
  const storyBox = document.getElementById('host-story-box');

  if (btnReveal) btnReveal.style.display = 'block';
  if (btnBack) btnBack.classList.add('is-hidden');
  if (storyBox) storyBox.classList.add('is-hidden');

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

  updateVoteProgressUI();
  startSoftTimer(90);

  broadcastToAll({
    type: 'START_ROUND',
    name: sub.name,
    statements: sub.statements
  });
}

function updateVoteProgressUI() {
  const eligibleTokens = Object.keys(submissions).filter(t => t !== currentRound?.token);
  const total = eligibleTokens.length;
  const count = votedTokens.size;

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
      const pendingNames = eligibleTokens
        .filter(t => !votedTokens.has(t))
        .map(t => submissions[t]?.name || '同仁');

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

  voteRecords.push({
    name: currentRound.name,
    statements: currentRound.statements,
    lieIndex: currentRound.lieIndex,
    story: currentRound.story,
    votes: { ...localVotes },
    fooled: localVotes[currentRound.lieIndex] || 0
  });

  broadcastToAll({
    type: 'REVEAL',
    lieIndex: currentRound.lieIndex
  });
}

function uiBackToLobby() {
  switchView('view-host-lobby');
  if (currentRound?.token) {
    delete submissions[currentRound.token];
  }
  // 🎯 狀態死亡：返回大廳，徹底宣告本輪已死
  currentRound = null;
  renderLobbyRoster();
}

function uiHostEndActivity() {
  const confirmed = confirm(t('confirm_end_activity'));
  if (!confirmed) return;

  if (typeof releaseUnloadWarning === 'function') {
    releaseUnloadWarning();
  }

  // 🎯 狀態死亡：結束活動，清除輪次狀態
  currentRound = null;
  broadcastToAll({ type: 'ENDED' });
  renderLocalSummary();
}

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
// 📱 Client 端處理流程
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

  currentRoomId = document.getElementById('join-room-id')?.value.trim();
  clientName = document.getElementById('join-player-name')?.value.trim();
  const btn = document.querySelector('#view-player-join .btn');

  if (!currentRoomId || !clientName) {
    alert(t('err_room_id'));
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerText = t('btn_joining');
  }

  startClientConnection(btn, false);
}

function startClientConnection(btn, isReconnect = false) {
  initClientPeer(
    currentRoomId,
    () => {
      if (btn) {
        btn.disabled = false;
        btn.innerText = t('btn_join');
      }

      // 握手 IDENTIFY
      sendToHost({
        type: 'IDENTIFY',
        clientToken: myClientToken,
        name: clientName
      });

      // 鎖屏重連：若已出過題，直接回送題目備份並切到投票等待
      if (isReconnect && mySubmittedData) {
        sendToHost({
          type: 'SUBMIT',
          clientToken: myClientToken,
          name: clientName,
          ...mySubmittedData
        });
        switchView('view-player-vote');
      } else {
        switchView('view-player-write');
      }
    },
    (data) => handleClientReceiveData(data),
    () => {
      if (btn) {
        btn.disabled = false;
        btn.innerText = t('btn_join');
      }
      const wantReconnect = confirm(t('confirm_reconnect'));
      if (wantReconnect) {
        startClientConnection(btn, true);
      }
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

  mySubmittedData = {
    statements: [s0, s1, s2],
    lieIndex: lieIndex,
    story: story
  };

  const ok = sendToHost({
    type: 'SUBMIT',
    clientToken: myClientToken,
    name: clientName,
    ...mySubmittedData
  });

  if (!ok) {
    alert('題目傳送失敗，請確認與主持人連線是否正常。');
    return;
  }

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
          const sent = sendToHost({
            type: 'VOTE',
            clientToken: myClientToken,
            choice: idx
          });

          if (!sent) {
            alert('投票傳送失敗，請嘗試點擊重試。');
            return;
          }

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

window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.has('room') && params.get('room').trim() !== '') {
    uiSetupPlayer();
  }
});
