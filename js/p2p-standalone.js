/* =========================================================================
 * 📡 p2p-standalone.js - 15人無痕極限防禦版 (純前端 P2P)
 * ========================================================================= */
const PEER_CONFIG = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }
};

const MAX_PARTICIPANTS = 15; // 硬性 15 人上限，保護 Host 效能

let peer = null;
let hostConn = null;
let clients = {};       // Host 維護的所有連線
let submissions = {};   // Host 題目庫
let currentRound = null;
let voteRecords = [];
let localVotes = { 0: 0, 1: 0, 2: 0 };

function switchView(id) {
  document.querySelectorAll('.view-section, #view-landing').forEach(el => el.style.display = 'none');
  const target = document.getElementById(id);
  if (target) target.style.display = 'block';
}

// ----------------- Host 主持人端 -----------------
function uiSetupHost() {
  switchView('view-host-lobby');
  const roomId = Math.floor(10000000 + Math.random() * 90000000).toString();
  document.getElementById('host-room-id').innerText = roomId;

  const qrUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
  new QRCode(document.getElementById("host-qr"), { text: qrUrl, width: 130, height: 130 });

  // 🛡️ 防呆：防止主持人手誤關閉或重新整理 Tab
  window.addEventListener('beforeunload', (e) => {
    e.preventDefault();
    e.returnValue = '活動進行中，關閉分頁將導致所有參與者斷線！';
  });

  peer = new Peer(`ice-${roomId}`, PEER_CONFIG);

  peer.on('connection', (conn) => {
    // 🛡️ 15 人上限攔截
    if (Object.keys(clients).length >= MAX_PARTICIPANTS) {
      setTimeout(() => {
        try { conn.send({ type: 'ROOM_FULL' }); } catch (e) {}
        conn.close();
      }, 500);
      return;
    }

    conn.on('open', () => {
      clients[conn.peer] = conn;
      updateHostCount();
    });

    conn.on('data', (data) => {
      handleHostReceiveData(data, conn);
    });

    conn.on('close', () => {
      delete clients[conn.peer];
      updateHostCount();
    });
  });
}

function updateHostCount() {
  const count = Object.keys(clients).length;
  document.getElementById('host-count').innerText = count;
}

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
    // Host 本地累加，不在投票期間廣播，徹底減低上行開銷
    localVotes[data.choice] = (localVotes[data.choice] || 0) + 1;
    renderHostVoteDisplay();
  }
}

function renderLobbyRoster() {
  const grid = document.getElementById('host-player-grid');
  const tip = document.getElementById('host-empty-tip');
  grid.innerHTML = '';
  const list = Object.entries(submissions);
  if (list.length > 0 && tip) tip.style.display = 'none';

  list.forEach(([peerId, sub]) => {
    const chip = document.createElement('div');
    chip.className = 'player-chip ready';
    chip.innerHTML = `<b>${sub.name}</b><br><small>已就緒 💬</small>`;
    chip.onclick = () => hostStartRound(peerId, sub);
    grid.appendChild(chip);
  });
}

function hostStartRound(peerId, sub) {
  currentRound = { peerId, ...sub };
  localVotes = { 0: 0, 1: 0, 2: 0 };
  switchView('view-host-game');

  document.getElementById('host-current-name').innerText = sub.name;
  document.getElementById('btn-host-reveal').style.display = 'block';
  document.getElementById('btn-host-back').style.display = 'none';
  document.getElementById('host-story-box').style.display = 'none';

  const box = document.getElementById('host-statements-display');
  box.innerHTML = '';
  sub.statements.forEach((stmt, idx) => {
    const card = document.createElement('div');
    card.className = 'choice-card';
    card.id = `host-card-${idx}`;
    card.innerHTML = `<b>#${idx + 1}. ${stmt}</b><div id="h-cnt-${idx}" style="color:#64748b; font-size:0.85rem; margin-top:4px;">0 票</div>`;
    box.appendChild(card);
  });

  // 廣播給所有手機開始猜謎
  broadcastToAll({
    type: 'START_ROUND',
    name: sub.name,
    statements: sub.statements
  });
}

function renderHostVoteDisplay() {
  [0, 1, 2].forEach(idx => {
    const el = document.getElementById(`h-cnt-${idx}`);
    if (el) el.innerText = `${localVotes[idx] || 0} 票`;
  });
}

function hostRevealCurrent() {
  if (!currentRound) return;
  document.getElementById('btn-host-reveal').style.display = 'none';
  document.getElementById('btn-host-back').style.display = 'block';
  document.getElementById('host-story-box').style.display = 'block';
  document.getElementById('host-story-content').innerText = currentRound.story || '無特別說明';

  [0, 1, 2].forEach(idx => {
    const card = document.getElementById(`host-card-${idx}`);
    if (idx === currentRound.lieIndex) {
      card.classList.add('is-lie');
    } else {
      card.classList.add('is-truth');
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

  // 揭曉時才發送一次結果廣播
  broadcastToAll({
    type: 'REVEAL',
    lieIndex: currentRound.lieIndex
  });
}

function uiBackToLobby() {
  switchView('view-host-lobby');
  delete submissions[currentRound.peerId];
  renderLobbyRoster();
}

function broadcastToAll(payload) {
  Object.values(clients).forEach(conn => {
    if (conn && conn.open) {
      try { conn.send(payload); } catch (e) {}
    }
  });
}

function uiHostEndActivity() {
  broadcastToAll({ type: 'ENDED' });
  renderLocalSummary();
}

function renderLocalSummary() {
  switchView('view-summary');
  const container = document.getElementById('summary-list');
  container.innerHTML = '';

  if (voteRecords.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#64748b;">本次活動未有已結算題目。</p>';
    return;
  }

  voteRecords.forEach(r => {
    const card = document.createElement('div');
    card.className = 'summary-card';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between;">
        <h3>👤 ${r.name}</h3>
        <span class="badge" style="background:#fee2e2; color:#991b1b;">🎭 成功騙過 ${r.fooled} 人</span>
      </div>
      <p>1. ${r.statements[0]} <b>(${r.votes[0]} 票)</b></p>
      <p>2. ${r.statements[1]} <b>(${r.votes[1]} 票)</b></p>
      <p>3. ${r.statements[2]} <b>(${r.votes[2]} 票)</b></p>
      <p style="color:var(--cross-red); font-weight:bold;">❌ 假話是：第 #${r.lieIndex + 1} 項</p>
      <div class="story-box">📖 故事：${r.story || '無特別說明'}</div>
    `;
    container.appendChild(card);
  });
}

// ----------------- Client 參與者端 -----------------
let clientName = '';

function uiSetupPlayer() {
  switchView('view-player-join');
  const params = new URLSearchParams(window.location.search);
  if (params.get('room')) {
    document.getElementById('join-room-id').value = params.get('room');
  }
}

function uiConnectAsClient() {
  const roomId = document.getElementById('join-room-id').value.trim();
  clientName = document.getElementById('join-player-name').value.trim();
  if (!roomId || !clientName) {
    alert(t('err_room_id'));
    return;
  }

  peer = new Peer(PEER_CONFIG);
  peer.on('open', () => {
    hostConn = peer.connect(`ice-${roomId}`, { reliable: true });

    hostConn.on('open', () => {
      switchView('view-player-write');
    });

    hostConn.on('data', (data) => {
      if (data.type === 'ROOM_FULL') {
        alert("⚠️ 房間已達 15 人上限！請直接在大螢幕共同觀戰。");
        return;
      }
      handleClientReceiveData(data);
    });

    hostConn.on('close', () => {
      alert("⚠️ 與主持人連線已中斷（可能主持人關閉了分頁）。");
    });
  });

  peer.on('error', () => {
    alert("找不到房號，請確認主持人已在電腦大螢幕開房！");
  });
}

function uiClientSubmit() {
  const s0 = document.getElementById('p-stmt-0').value.trim();
  const s1 = document.getElementById('p-stmt-1').value.trim();
  const s2 = document.getElementById('p-stmt-2').value.trim();
  const lieIndex = parseInt(document.getElementById('p-lie-index').value);
  const story = document.getElementById('p-story').value.trim();

  if (!s0 || !s1 || !s2) {
    alert(t('err_fill_all'));
    return;
  }

  hostConn.send({
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
    document.getElementById('player-waiting-msg').style.display = 'none';
    document.getElementById('player-active-voting').style.display = 'block';
    document.getElementById('player-voted-alert').style.display = 'none';
    document.getElementById('vote-target-name').innerText = data.name;

    const box = document.getElementById('player-choices-box');
    box.innerHTML = '';
    data.statements.forEach((stmt, idx) => {
      const card = document.createElement('div');
      card.className = 'choice-card';
      card.id = `p-card-${idx}`;
      card.innerText = `#${idx + 1}. ${stmt}`;
      card.onclick = () => {
        hostConn.send({ type: 'VOTE', choice: idx });
        document.querySelectorAll('#player-choices-box .choice-card').forEach((c, i) => {
          c.onclick = null;
          if (i === idx) c.classList.add('selected');
        });
        document.getElementById('player-voted-alert').style.display = 'block';
      };
      box.appendChild(card);
    });
  } else if (data.type === 'REVEAL') {
    [0, 1, 2].forEach(idx => {
      const card = document.getElementById(`p-card-${idx}`);
      if (card) {
        if (idx === data.lieIndex) card.classList.add('is-lie');
        else card.classList.add('is-truth');
      }
    });
  } else if (data.type === 'ENDED') {
    alert("🎉 本場破冰已圓滿結束！請看大螢幕精彩回顧。");
  }
}

// 頁面初始化
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('room')) {
    uiSetupPlayer();
  }
});
