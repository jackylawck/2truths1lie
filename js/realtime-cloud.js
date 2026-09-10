/* =========================================================================
 * 🚀 realtime-cloud.js - Industrial Closure Edition
 * 完整包含：Auth、Presence、狀態同步、Host 遷移、歸檔、日誌與自癒
 * ========================================================================= */

const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 模組級狀態
let currentUserId = null;
let currentRoomId = null;
let currentDisplayName = null;
let isHost = false;
let localRoomSnapshot = { round_counter: -1, status: 'idle' };
let roomChannel = null;
let heartbeatTimer = null;
let offlineRecoverTimeoutId = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 5;

// =========================================================================
// 📊 SystemLogger（localStorage 持久化黑盒子）
// =========================================================================
const SystemLogger = {
  storageKey: 'icebreaker_persistent_logs',
  logs: [],
  maxLogs: 200,

  init() {
    try {
      const persisted = localStorage.getItem(this.storageKey);
      if (persisted) this.logs = JSON.parse(persisted);
    } catch (e) {
      this.logs = [];
    }
  },

  log(level, event, meta = {}) {
    const entry = {
      ts: new Date().toISOString(),
      level,
      event,
      meta,
      userId: currentUserId,
      roomId: currentRoomId
    };
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) this.logs.shift();

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
    } catch (e) {
      this.logs.splice(0, 50);
    }

    const fn = level === 'error' ? console.error : (level === 'warn' ? console.warn : console.log);
    fn(`[${event}]`, meta);
  },

  exportLogs() {
    const blob = new Blob([JSON.stringify(this.logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `icebreaker_logs_${currentRoomId || 'session'}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  clear() {
    this.logs = [];
    localStorage.removeItem(this.storageKey);
  }
};

SystemLogger.init();

// =========================================================================
// 🔐 認證初始化
// =========================================================================
async function setupAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    currentUserId = session.user.id;
    SystemLogger.log('info', 'AUTH_RESTORED', { userId: currentUserId });
    return currentUserId;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    SystemLogger.log('error', 'AUTH_ERROR', { msg: error.message });
    throw error;
  }
  currentUserId = data.user.id;
  SystemLogger.log('info', 'AUTH_SUCCESS', { userId: currentUserId });
  return currentUserId;
}

// =========================================================================
// 🛡️ safeDatabaseWrite (拋出異常，阻斷靜默失敗)
// =========================================================================
async function safeDatabaseWrite(table, action, payload, match = null, retries = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    let res;
    try {
      if (action === 'upsert') res = await supabase.from(table).upsert(payload);
      else if (action === 'update') res = await supabase.from(table).update(payload).match(match);
      else if (action === 'delete') res = await supabase.from(table).delete().match(match);
      else if (action === 'insert') res = await supabase.from(table).insert(payload);
    } catch (err) {
      lastError = err;
      SystemLogger.log('error', 'DB_EXCEPTION', { table, action, err: err.message, attempt });
    }

    if (res && !res.error) return true;

    if (res?.error) {
      lastError = res.error;
      SystemLogger.log('warn', 'DB_RETRY', { table, action, err: res.error.message, attempt });
    }

    if (attempt < retries) {
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 200));
    }
  }

  SystemLogger.log('error', 'DB_FATAL', { table, action, payload });
  throw new Error(`DB_WRITE_FAILED: ${table}.${action} - ${lastError?.message || 'unknown'}`);
}

// =========================================================================
// 🏠 Host：建立房間
// =========================================================================
async function hostCreateRoom(roomId, displayName = '主持人') {
  await setupAuth();

  currentRoomId = roomId;
  currentDisplayName = displayName;
  isHost = true;

  try {
    await safeDatabaseWrite('rooms', 'upsert', {
      id: roomId,
      host_id: currentUserId,
      status: 'idle',
      round_counter: 0,
      current_presenter: '',
      current_presenter_id: null,
      statements: [],
      lie_index: -1,
      story: '',
      vote_summary: { "0": 0, "1": 0, "2": 0 },
      host_last_seen: new Date().toISOString()
    });

    // Host 寫入 room_members 保持 Presence 統一
    await safeDatabaseWrite('room_members', 'upsert', {
      room_id: roomId,
      user_id: currentUserId,
      display_name: displayName,
      role: 'host',
      has_submitted: false,
      last_seen: new Date().toISOString()
    });

    await subscribeWithSnapshot(roomId);
    startPresenceHeartbeat();
    SystemLogger.log('info', 'ROOM_CREATED', { roomId, displayName });
  } catch (err) {
    SystemLogger.log('error', 'ROOM_CREATE_FAILED', { err: err.message });
    alert('房間建立失敗，請重試。');
    throw err;
  }
}

// =========================================================================
// 👤 Client：加入房間
// =========================================================================
async function clientJoinRoom(roomId, displayName, role = 'player') {
  await setupAuth();

  currentRoomId = roomId;
  currentDisplayName = displayName;
  isHost = false;

  try {
    await safeDatabaseWrite('room_members', 'upsert', {
      room_id: roomId,
      user_id: currentUserId,
      display_name: displayName,
      role: role,
      has_submitted: false,
      last_seen: new Date().toISOString()
    });

    await subscribeWithSnapshot(roomId);
    startPresenceHeartbeat();
    SystemLogger.log('info', 'MEMBER_JOINED', { roomId, displayName, role });
  } catch (err) {
    SystemLogger.log('error', 'JOIN_FAILED', { err: err.message });
    alert('加入房間失敗，請確認房號是否正確。');
    throw err;
  }
}

// =========================================================================
// 🔄 狀態自癒：先快照、後監聽
// =========================================================================
async function subscribeWithSnapshot(roomId) {
  SystemLogger.log('info', 'SNAPSHOT_PULL_START', { roomId });

  const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).single();
  if (error) {
    if (error.code === 'PGRST116') {
      alert('⚠️ 房間不存在或已被關閉，請核實房號。');
      SystemLogger.log('warn', 'ROOM_NOT_FOUND', { roomId });
      return;
    }
    SystemLogger.log('error', 'SNAPSHOT_ERROR', { err: error.message });
    return;
  }

  localRoomSnapshot = { round_counter: -1, status: 'idle' };
  applyRoomStateUpdate(data);
  subscribeRoomLifecycle(roomId);
}

// =========================================================================
// 📡 訂閱：rooms、submissions、room_members 多通道
// =========================================================================
function subscribeRoomLifecycle(roomId) {
  if (roomChannel) roomChannel.unsubscribe();

  roomChannel = supabase.channel(`room_sync_${roomId}`);

  roomChannel.on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'rooms',
    filter: `id=eq.${roomId}`
  }, (payload) => {
    applyRoomStateUpdate(payload.new);
  });

  roomChannel.on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'submissions',
    filter: `room_id=eq.${roomId}`
  }, (payload) => {
    SystemLogger.log('info', 'SUBMISSION_CHANGED', { eventType: payload.eventType });
    if (isHost && typeof refreshActiveMembersUI === 'function') {
      refreshActiveMembersUI();
    }
  });

  roomChannel.on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'room_members',
    filter: `room_id=eq.${roomId}`
  }, () => {
    if (isHost && typeof refreshActiveMembersUI === 'function') {
      refreshActiveMembersUI();
    }
  });

  roomChannel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      reconnectAttempts = 0;
      if (offlineRecoverTimeoutId) {
        clearTimeout(offlineRecoverTimeoutId);
        offlineRecoverTimeoutId = null;
      }
      if (typeof updateNetworkBadge === 'function') updateNetworkBadge('connected');
      SystemLogger.log('info', 'CHANNEL_SUBSCRIBED', { roomId });
    } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
      handleChannelFailure(roomId);
    }
  });
}

function handleChannelFailure(roomId) {
  if (reconnectAttempts < MAX_RECONNECT) {
    reconnectAttempts++;
    if (typeof updateNetworkBadge === 'function') updateNetworkBadge('reconnecting');
    const delay = Math.pow(2, reconnectAttempts) * 1000;
    SystemLogger.log('warn', 'RECONNECT_ATTEMPT', { attempt: reconnectAttempts, delay });
    setTimeout(() => subscribeWithSnapshot(roomId), delay);
  } else {
    if (typeof updateNetworkBadge === 'function') updateNetworkBadge('offline');
    SystemLogger.log('error', 'RECONNECT_EXHAUSTED', { attempts: reconnectAttempts });
    if (typeof triggerOfflineFallback === 'function') triggerOfflineFallback();
    startOfflineRecoveryLoop(roomId);
  }
}

// =========================================================================
// 🫀 心跳感知 (Presence)
// =========================================================================
function startPresenceHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);

  heartbeatTimer = setInterval(async () => {
    const nowIso = new Date().toISOString();
    try {
      if (isHost) {
        await supabase.from('rooms').update({ host_last_seen: nowIso }).eq('id', currentRoomId);
        if (typeof refreshActiveMembersUI === 'function') refreshActiveMembersUI();
      } else {
        await supabase.from('room_members').update({ last_seen: nowIso }).match({
          room_id: currentRoomId,
          user_id: currentUserId
        });
        checkHostHealth();
      }
    } catch (err) {
      SystemLogger.log('warn', 'HEARTBEAT_FAILED', { err: err.message });
    }
  }, 10000);
}

function checkHostHealth() {
  if (!localRoomSnapshot?.host_last_seen) return;
  const lastSeenMs = new Date(localRoomSnapshot.host_last_seen).getTime();
  const isHostDead = (Date.now() - lastSeenMs) > 45000;

  const btn = document.getElementById('btn-claim-host');
  if (btn) btn.style.display = isHostDead ? 'block' : 'none';
}

// =========================================================================
// 🛡️ 主持人原子接管 (CAS RPC)
// =========================================================================
async function claimHostOwnership() {
  SystemLogger.log('warn', 'CLAIM_HOST_ATTEMPT', { roomId: currentRoomId });

  const { data, error } = await supabase.rpc('claim_host_atomic', {
    p_room_id: currentRoomId,
    p_caller_id: currentUserId
  });

  if (error) {
    SystemLogger.log('error', 'CLAIM_RPC_ERROR', { err: error.message });
    alert('接管異常，請重試。');
    return;
  }

  if (data?.success) {
    isHost = true;
    startPresenceHeartbeat();
    alert('✅ 搶佔成功！您已成為本場主持人。');
    SystemLogger.log('info', 'CLAIM_SUCCESS');
    await subscribeWithSnapshot(currentRoomId);
  } else {
    alert('⚠️ 接管失敗：已被他人搶佔，或原主持人已恢復。');
    SystemLogger.log('warn', 'CLAIM_REJECTED', { currentHost: data?.current_host });
    await subscribeWithSnapshot(currentRoomId);
  }
}

// =========================================================================
// ✍️ Client：提交題目至保險箱
// =========================================================================
async function clientSubmitStatements(statements, lieIndex, story) {
  try {
    await safeDatabaseWrite('submissions', 'upsert', {
      room_id: currentRoomId,
      user_id: currentUserId,
      display_name: currentDisplayName || '同事',
      statements: statements,
      lie_index: lieIndex,
      story: story
    });
    SystemLogger.log('info', 'SUBMISSION_SECURED');
    alert('題目已安全提交！');
    return true;
  } catch (err) {
    SystemLogger.log('error', 'SUBMISSION_FAILED', { err: err.message });
    alert('提交失敗，請重試。');
    return false;
  }
}

// =========================================================================
// 🎬 Host：原子化開題 (解除 RLS 死鎖)
// =========================================================================
async function hostStartRound(submission) {
  if (!isHost) return;
  const nextRound = (localRoomSnapshot.round_counter || 0) + 1;

  try {
    const { data, error } = await supabase.rpc('host_start_round_atomic', {
      p_room_id: currentRoomId,
      p_presenter_id: submission.user_id,
      p_next_round: nextRound
    });

    if (error || !data?.success) {
      SystemLogger.log('error', 'START_ROUND_FAILED', { err: error?.message, data });
      alert(`開題失敗：${data?.message || error?.message || '未知錯誤'}`);
      return;
    }

    SystemLogger.log('info', 'ROUND_STARTED', { round: data.round });
  } catch (err) {
    SystemLogger.log('error', 'START_ROUND_EXCEPTION', { err: err.message });
    alert('開題異常，請重試。');
  }
}

// =========================================================================
// 🎭 Host：揭曉輪次 (無狀態查詢)
// =========================================================================
async function hostRevealRound() {
  if (!isHost) return;

  const presenterId = localRoomSnapshot.current_presenter_id;
  if (!presenterId) {
    SystemLogger.log('error', 'REVEAL_MISSING_PRESENTER_ID');
    alert('揭曉失敗：無當前主角 ID。');
    return;
  }

  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('lie_index, story')
      .eq('room_id', currentRoomId)
      .eq('user_id', presenterId)
      .single();

    if (error || !data) {
      SystemLogger.log('error', 'FETCH_SECRET_FAILED', { err: error?.message });
      alert('揭曉失敗：無法取得真實解答。');
      return;
    }

    await safeDatabaseWrite('rooms', 'update', {
      status: 'revealed',
      lie_index: data.lie_index,
      story: data.story
    }, { id: currentRoomId });

    SystemLogger.log('info', 'ROUND_REVEALED');
  } catch (err) {
    SystemLogger.log('error', 'REVEAL_FAILED', { err: err.message });
    alert('揭曉異常，請重試。');
  }
}

// =========================================================================
// 🗳️ Client：投票
// =========================================================================
async function castVote(choiceIndex) {
  if (localRoomSnapshot.status !== 'presenting') {
    alert('目前非投票時間！');
    return;
  }

  try {
    await safeDatabaseWrite('votes', 'insert', {
      room_id: currentRoomId,
      round_counter: localRoomSnapshot.round_counter,
      voter_id: currentUserId,
      choice: choiceIndex
    });

    if (typeof lockLocalVoteUI === 'function') lockLocalVoteUI(choiceIndex);
    SystemLogger.log('info', 'VOTE_CAST', { choice: choiceIndex });
  } catch (err) {
    if (err.message?.includes('23505') || err.message?.includes('RATE_LIMIT')) {
      alert('您已投過票，或操作過於頻繁。');
    } else {
      SystemLogger.log('error', 'VOTE_FAILED', { err: err.message });
      alert('投票失敗，請重試。');
    }
  }
}

// =========================================================================
// 🏁 Host：結束活動 (原子歸檔)
// =========================================================================
async function hostEndRoom() {
  if (!isHost) return;

  const confirmed = confirm('確認結束本次破冰嗎？系統將原子封存全場統計，並產生永久回顧連結。');
  if (!confirmed) return;

  const summaryToken = crypto.randomUUID();
  SystemLogger.log('info', 'ARCHIVE_ROOM_START', { summaryToken });

  try {
    const { data, error } = await supabase.rpc('archive_and_end_room', {
      p_room_id: currentRoomId,
      p_summary_token: summaryToken
    });

    if (error || !data?.success) {
      SystemLogger.log('error', 'ARCHIVE_FAILED', { err: error?.message, data });
      alert(`歸檔失敗：${data?.message || error?.message || '未知錯誤'}`);
      return;
    }

    SystemLogger.log('info', 'ARCHIVE_SUCCESS', { token: summaryToken });
    renderActivitySummaryView(summaryToken);
  } catch (err) {
    SystemLogger.log('error', 'ARCHIVE_EXCEPTION', { err: err.message });
    alert('歸檔異常，請重試。');
  }
}

// =========================================================================
// 🎨 狀態更新分配
// =========================================================================
function applyRoomStateUpdate(room) {
  if (!room) return;

  const isNewRound = room.round_counter !== localRoomSnapshot.round_counter;
  const isStatusChanged = room.status !== localRoomSnapshot.status;
  localRoomSnapshot = { ...room };

  if (room.status === 'ended') {
    if (typeof renderActivitySummaryView === 'function') {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('summary') || room.summary_token;
      if (token) renderActivitySummaryView(token);
    }
    return;
  }

  if (typeof renderVoteSummary === 'function') {
    renderVoteSummary(room.vote_summary || { "0": 0, "1": 0, "2": 0 });
  }

  if (isNewRound) {
    if (isHost && typeof renderHostNewRound === 'function') renderHostNewRound(room);
    else if (!isHost && typeof renderClientNewRound === 'function') renderClientNewRound(room);
  }

  if (isStatusChanged && room.status === 'revealed') {
    if (isHost && typeof renderHostReveal === 'function') renderHostReveal(room);
    else if (!isHost && typeof renderClientReveal === 'function') renderClientReveal(room);
  }
}

// =========================================================================
// 📊 活動回顧渲染 (Array.isArray 防禦)
// =========================================================================
async function renderActivitySummaryView(summaryToken) {
  const { data, error } = await supabase
    .from('summaries')
    .select('summary_data, created_at, expires_at')
    .eq('id', summaryToken)
    .single();

  document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
  const summaryView = document.getElementById('view-summary');
  if (!summaryView) return;
  summaryView.style.display = 'block';

  const listContainer = document.getElementById('summary-list');
  if (!listContainer) return;
  listContainer.innerHTML = '';

  if (error || !data) {
    listContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted);">無法載入活動回顧，可能連結已過期。</p>';
    return;
  }

  const summaryList = Array.isArray(data.summary_data) ? data.summary_data : [];
  if (summaryList.length === 0) {
    listContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted);">本次活動無已結算的題目紀錄。</p>';
    return;
  }

  summaryList.forEach(m => {
    const votes = m.vote_distribution || { "0": 0, "1": 0, "2": 0 };
    const card = document.createElement('div');
    card.className = 'summary-card';
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0;">👤 ${m.display_name || '匿名'}</h3>
        <span class="badge" style="background:#fee2e2; color:#991b1b;">
          🎭 成功騙過 ${m.fooled_count || 0} 人
        </span>
      </div>
      <div style="margin:10px 0; font-size:0.95rem;">
        <p>1. ${m.statements?.[0] || ''} <b>(${votes["0"] || 0} 票)</b></p>
        <p>2. ${m.statements?.[1] || ''} <b>(${votes["1"] || 0} 票)</b></p>
        <p>3. ${m.statements?.[2] || ''} <b>(${votes["2"] || 0} 票)</b></p>
      </div>
      <p style="color:var(--cross-red); font-weight:bold;">
        ❌ 假話是：第 #${(m.lie_index ?? 0) + 1} 項
      </p>
      <div class="story-box">📖 背後故事：${m.story || '無特別說明'}</div>
    `;
    listContainer.appendChild(card);
  });

  const permalink = `${window.location.origin}${window.location.pathname}?summary=${summaryToken}`;
  const permalinkInput = document.getElementById('summary-permalink');
  if (permalinkInput) permalinkInput.value = permalink;
}

// =========================================================================
// 🔄 離線探針自癒 (clearTimeout)
// =========================================================================
function stopOfflineRecoveryLoop() {
  if (offlineRecoverTimeoutId) {
    clearTimeout(offlineRecoverTimeoutId);
    offlineRecoverTimeoutId = null;
  }
}

function startOfflineRecoveryLoop(roomId) {
  stopOfflineRecoveryLoop();
  let probeDelay = 5000;

  const runProbe = async () => {
    SystemLogger.log('info', 'OFFLINE_PROBE_TICK', { probeDelay });

    if (currentRoomId !== roomId) {
      stopOfflineRecoveryLoop();
      return;
    }

    try {
      const { data, error } = await supabase.from('rooms').select('id').eq('id', roomId).single();
      if (!error && data) {
        SystemLogger.log('info', 'PROBE_HEALED_SUCCESS');
        stopOfflineRecoveryLoop();
        reconnectAttempts = 0;
        await subscribeWithSnapshot(roomId);
        if (typeof dismissOfflineFallback === 'function') dismissOfflineFallback();
        return;
      }
    } catch (err) {
      SystemLogger.log('warn', 'PROBE_ERROR', { err: err.message });
    }

    probeDelay = Math.min(probeDelay * 2, 30000);
    offlineRecoverTimeoutId = setTimeout(runProbe, probeDelay);
  };

  offlineRecoverTimeoutId = setTimeout(runProbe, probeDelay);
}

// =========================================================================
// 🧹 卸載清理
// =========================================================================
function leaveRoomSession() {
  stopOfflineRecoveryLoop();
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (roomChannel) {
    roomChannel.unsubscribe();
    roomChannel = null;
  }
  SystemLogger.log('info', 'SESSION_LEFT');
  window.location.reload();
}

// =========================================================================
// 🚀 初始化分流
// =========================================================================
window.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const summaryToken = params.get('summary');

  if (summaryToken) {
    await renderActivitySummaryView(summaryToken);
    return;
  }

  await setupAuth();

  const roomParam = params.get('room');
  if (roomParam && typeof uiSetupPlayer === 'function') {
    uiSetupPlayer();
  }
});
