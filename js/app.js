/* =========================================================================
 * 🎮 app.js - 升級引導交付版
 * ========================================================================= */
let submittedPlayers = {}; // peerId -> { name, mode, statements, lieIndex, story, done }
let currentActivePeerId = null;
let currentVotes = { 0: 0, 1: 0, 2: 0 };
let votersRecord = {};
let timerInterval = null;
let userParticipationMode = 'full';

function switchView(viewId) {
  ['view-landing', 'view-host-lobby', 'view-host-game', 'view-player-join', 'view-player-write', 'view-player-vote'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = (id === viewId) ? 'block' : 'none';
  });
}

// ---------------- 主持人端 ----------------
function setupHost() {
  switchView('view-host-lobby');
  const rand = Math.floor(10000000 + Math.random() * 90000000).toString();
  document.getElementById('host-room-id').innerText = rand;

  const qrUrl = `${window.location.origin}${window.location.pathname}?room=${rand}`;
  new QRCode(document.getElementById("host-qr"), { text: qrUrl, width: 130, height: 130 });

  initHostPeer(rand, handleHostReceivedData, (count) => {
    document.getElementById('host-count').innerText = count;
  });
}

function handleHostReceivedData(data, conn) {
  if (data.type === 'REGISTER_USER') {
    // 支援梯度：純投票或聽眾，亦會在大廳顯示存在
    submittedPlayers[conn.peer] = {
      name: data.name,
      mode: data.mode, // 'full', 'vote_only', 'spectator'
      statements: data.statements || [],
      lieIndex: data.lieIndex || 0,
      story: data.story || '',
      done: data.mode !== 'full' // 非出題者預設為已完成狀態
    };
    renderHostLobbyGrid();
  } else if (data.type === 'CAST_VOTE') {
    if (votersRecord[conn.peer] === undefined) {
      votersRecord[conn.peer] = data.choice;
      currentVotes[data.choice] = (currentVotes[data.choice] || 0) + 1;
      updateVoteCountsDisplay();
    }
  }
}

function renderHostLobbyGrid() {
  const grid = document.getElementById('host-player-grid');
  const emptyTip = document.getElementById('host-empty-tip');
  const keys = Object.keys(submittedPlayers);

  if (keys.length > 0) emptyTip.style.display = 'none';
  grid.innerHTML = '';

  keys.forEach(pId => {
    const p = submittedPlayers[pId];
    const chip = document.createElement('div');
    chip.className = `player-chip ${p.done ? 'done' : ''}`;
    
    let roleBadge = p.mode === 'vote_only' ? ' (投票員)' : (p.mode === 'spectator' ? ' (聽眾)' : '');
    chip.innerHTML = `<b>${p.name}${roleBadge}</b><br><small>${p.done ? t('txt_chip_done') : t('txt_chip_start')}</small>`;
    
    // 只有完整出題者且未完成的才可被點擊開猜
    if (p.mode === 'full' && !p.done) {
      chip.onclick = () => startPersonRound(pId);
    }
    grid.appendChild(chip);
  });
}

// 開始個人猜謎輪次（啟動溫和計時器）
function startPersonRound(pId) {
  currentActivePeerId = pId;
  const p = submittedPlayers[pId];
  currentVotes = { 0: 0, 1: 0, 2: 0 };
  votersRecord = {};

  switchView('view-host-game');
  document.getElementById('host-current-name').innerText = p.name;
  document.getElementById('btn-host-reveal').style.display = 'block';
  document.getElementById('btn-host-back').style.display = 'none';
  document.getElementById('host-story-box').style.display = 'none';
  document.getElementById('host-debrief-box').style.display = 'none';

  const box = document.getElementById('host-statements-display');
  box.innerHTML = '';

  p.statements.forEach((stmt, idx) => {
    const card = document.createElement('div');
    card.className = 'choice-card';
    card.id = `host-card-${idx}`;
    card.innerHTML = `
      <b>#${idx + 1}. ${stmt}</b>
      <span class="result-badge" id="host-badge-${idx}"></span>
      <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;" id="host-vote-count-${idx}">0 票</div>
    `;
    box.appendChild(card);
  });

  startSoftTimer(90); // 啟動 90 秒交流計時

  broadcastToClients({
    type: 'START_GUESS',
    name: p.name,
    statements: p.statements
  });
}

function startSoftTimer(durationSeconds) {
  if (timerInterval) clearInterval(timerInterval);
  let remain = durationSeconds;
  const fill = document.getElementById('host-timer-fill');
  const txt = document.getElementById('host-timer-text');
  
  fill.style.width = '100%';
  timerInterval = setInterval(() => {
    remain--;
    if (remain <= 0) {
      clearInterval(timerInterval);
      remain = 0;
    }
    let m = Math.floor(remain / 60).toString().padStart(2, '0');
    let s = (remain % 60).toString().padStart(2, '0');
    txt.innerText = `${m}:${s}`;
    fill.style.width = `${(remain / durationSeconds) * 100}%`;
  }, 1000);
}

function updateVoteCountsDisplay() {
  [0, 1, 2].forEach(idx => {
    const el = document.getElementById(`host-vote-count-${idx}`);
    if (el) el.innerText = `${currentVotes[idx] || 0} 票`;
  });
}

// 揭曉答案與展開 Debrief
function revealHostAnswer() {
  if (timerInterval) clearInterval(timerInterval);
  const p = submittedPlayers[currentActivePeerId];
  p.done = true;

  [0, 1, 2].forEach(idx => {
    const card = document.getElementById(`host-card-${idx}`);
    const badge = document.getElementById(`host-badge-${idx}`);
    if (idx === p.lieIndex) {
      card.classList.add('is-lie');
      badge.innerText = t('txt_lie_badge');
      badge.style.color = 'var(--cross-red)';
    } else {
      card.classList.add('is-truth');
      badge.innerText = t('txt_truth_badge');
      badge.style.color = 'var(--tick-green)';
    }
  });

  document.getElementById('btn-host-reveal').style.display = 'none';
  document.getElementById('btn-host-back').style.display = 'block';
  document.getElementById('host-story-box').style.display = 'block';
  document.getElementById('host-story-content').innerText = p.story || '無額外補充';

  // 渲染 Debrief 小提示
  const debriefBox = document.getElementById('host-debrief-box');
  const debriefList = document.getElementById('debrief-questions-list');
  debriefList.innerHTML = `
    <li>${t('debrief_q1')}</li>
    <li>${t('debrief_q2')}</li>
  `;
  debriefBox.style.display = 'block';

  broadcastToClients({
    type: 'REVEAL_RESULT',
    lieIndex: p.lieIndex,
    story: p.story
  });
}

function backToHostLobby() {
  switchView('view-host-lobby');
  renderHostLobbyGrid();
}

// 派發結尾連結卡
function triggerWrapUp() {
  broadcastToClients({ type: 'SHOW_WRAP_UP' });
  alert("已將「會後連結卡」推送至所有參與者手機！");
}

// ---------------- 參與者端 ----------------
function setupPlayer() {
  switchView('view-player-join');
  const params = new URLSearchParams(window.location.search);
  if (params.get('room')) {
    document.getElementById('join-room-id').value = params.get('room');
  }
}

function connectToHost() {
  const roomId = document.getElementById('join-room-id').value.trim();
  const name = document.getElementById('join-player-name').value.trim();
  userParticipationMode = document.getElementById('join-mode-select').value;

  if (!roomId || !name) {
    alert(t('err_room_id'));
    return;
  }

  initClientPeer(roomId, handleClientReceivedData, () => {
    // 依據參與梯度進行分流
    if (userParticipationMode === 'full') {
      switchView('view-player-write');
    } else {
      // 純投票者或純旁聽者，直接註冊並跳至等候區
      sendToHost({
        type: 'REGISTER_USER',
        name: name,
        mode: userParticipationMode
      });
      switchView('view-player-vote');
    }
  });
}

function submitToRoom() {
  const s0 = document.getElementById('p-stmt-0').value.trim();
  const s1 = document.getElementById('p-stmt-1').value.trim();
  const s2 = document.getElementById('p-stmt-2').value.trim();
  const lie = parseInt(document.getElementById('p-lie-index').value);
  const story = document.getElementById('p-story').value.trim();
  const name = document.getElementById('join-player-name').value.trim();

  if (!s0 || !s1 || !s2) {
    alert(t('err_fill_all'));
    return;
  }

  sendToHost({
    type: 'REGISTER_USER',
    name: name,
    mode: 'full',
    statements: [s0, s1, s2],
    lieIndex: lie,
    story: story
  });

  switchView('view-player-vote');
}

function handleClientReceivedData(data) {
  if (data.type === 'START_GUESS') {
    document.getElementById('player-waiting-msg').style.display = 'none';
    document.getElementById('player-active-voting').style.display = 'block';
    document.getElementById('player-voted-alert').style.display = 'none';
    document.getElementById('vote-target-name').innerText = data.name;

    const box = document.getElementById('player-choices-box');
    box.innerHTML = '';

    // 純旁聽模式禁止點擊投票
    const isSpectator = (userParticipationMode === 'spectator');

    data.statements.forEach((stmt, idx) => {
      const card = document.createElement('div');
      card.className = 'choice-card';
      card.id = `player-card-${idx}`;
      card.innerText = `#${idx + 1}. ${stmt}`;
      if (!isSpectator) {
        card.onclick = () => voteChoice(idx);
      } else {
        card.style.cursor = 'default';
      }
      box.appendChild(card);
    });

    if (isSpectator) {
      document.getElementById('player-voted-alert').innerText = "（旁聽模式：聆聽分享中）";
      document.getElementById('player-voted-alert').style.display = 'block';
    }
  } else if (data.type === 'REVEAL_RESULT') {
    [0, 1, 2].forEach(idx => {
      const card = document.getElementById(`player-card-${idx}`);
      if (card) {
        card.onclick = null;
        if (idx === data.lieIndex) {
          card.classList.add('is-lie');
          card.innerText += ` ${t('txt_lie_badge')}`;
        } else {
          card.classList.add('is-truth');
          card.innerText += ` ${t('txt_truth_badge')}`;
        }
      }
    });
  } else if (data.type === 'SHOW_WRAP_UP') {
    document.getElementById('player-wrap-up-card').style.display = 'block';
    const txtArea = document.getElementById('wrap-up-text');
    txtArea.value = `Hi [同事姓名]！剛才在迎新破冰聽到你分享的故事很有趣，下週有空一起喝杯咖啡聊聊嗎？☕`;
  }
}

function voteChoice(idx) {
  sendToHost({ type: 'CAST_VOTE', choice: idx });
  document.querySelectorAll('#player-choices-box .choice-card').forEach((c, i) => {
    c.classList.toggle('selected', i === idx);
    c.onclick = null;
  });
  document.getElementById('player-voted-alert').style.display = 'block';
}

function copySlackText() {
  const txt = document.getElementById('wrap-up-text');
  txt.select();
  document.execCommand('copy');
  alert("已複製草稿！可直接貼至 Slack 或 Teams 發送給同事。");
}

window.addEventListener('DOMContentLoaded', () => {
  setLanguage('zh');
  const params = new URLSearchParams(window.location.search);
  if (params.get('room')) setupPlayer();
});
