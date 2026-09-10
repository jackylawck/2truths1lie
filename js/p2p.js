/* =========================================================================
 * 📡 p2p.js - 冪等安全通訊層 (Idempotent Launch & Session-based)
 * ========================================================================= */
const PEER_CONFIG = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ],
    iceCandidatePoolSize: 4
  }
};

const MAX_PARTICIPANTS = 15;
// 🎯 明確掛載到 window，消滅跨腳本變數不可見問題
window.MAX_PARTICIPANTS = MAX_PARTICIPANTS;

let peer = null;
let hostConn = null;
let clients = {}; // { [peerId]: conn }
let unloadHandler = null;

// 分離 Host 與 Client 的重連計數器
let hostReconnectAttempts = 0;
let clientReconnectAttempts = 0;

// =========================================================================
// 🏠 Host 端通訊
// =========================================================================

function initHostPeer(roomId, onDataReceived, onCountChanged, onClientDisconnected) {
  unloadHandler = (e) => {
    e.preventDefault();
    e.returnValue = '活動進行中，關閉分頁將導致所有參與者斷線！';
  };
  window.addEventListener('beforeunload', unloadHandler);

  peer = new Peer(`ice-${roomId}`, PEER_CONFIG);

  peer.on('open', () => {
    hostReconnectAttempts = 0;
  });

  // 信令伺服器中斷：指數退避重連，上限 5 次
  peer.on('disconnected', () => {
    if (peer.destroyed) return;
    if (hostReconnectAttempts < 5) {
      hostReconnectAttempts++;
      const delay = Math.pow(2, hostReconnectAttempts) * 1000;
      console.warn(`[Host Peer] 信令中斷，將於 ${delay / 1000}s 後嘗試第 ${hostReconnectAttempts} 次重連...`);
      setTimeout(() => {
        if (!peer.destroyed) peer.reconnect();
      }, delay);
    } else {
      console.error('[Host Peer] 信令重連超過 5 次，請確認網路環境。');
    }
  });

  peer.on('connection', (conn) => {
    conn.on('open', () => {
      // 容許握手緩衝：加入 clients 等候 IDENTIFY 裁決
      clients[conn.peer] = conn;
      if (onCountChanged) onCountChanged(Object.keys(clients).length);
    });

    conn.on('data', (data) => {
      if (onDataReceived) onDataReceived(data, conn);
    });

    conn.on('close', () => {
      if (clients[conn.peer] === conn) {
        delete clients[conn.peer];
        if (onClientDisconnected) onClientDisconnected(conn.peer);
        if (onCountChanged) onCountChanged(Object.keys(clients).length);
      }
    });
  });

  peer.on('error', (err) => {
    console.error('[Host Peer Error]', err);
    if (err.type === 'unavailable-id') {
      alert('房號已被佔用，請重新整理頁面生成新房號。');
    }
  });
}

function releaseUnloadWarning() {
  if (unloadHandler) {
    window.removeEventListener('beforeunload', unloadHandler);
    unloadHandler = null;
  }
}

// 主動關閉被取代的舊連線
function dropOldClientConn(oldPeerId) {
  if (clients[oldPeerId]) {
    try {
      clients[oldPeerId].close();
    } catch (e) {}
    delete clients[oldPeerId];
  }
}

// =========================================================================
// 📱 Client 端通訊（具備 launchOnce 冪等鎖，杜絕雙重實例）
// =========================================================================

function initClientPeer(roomId, onConnected, onDataReceived, onDisconnect, onError) {
  let isLaunched = false;

  const launchNewPeer = () => {
    // 冪等防護：只要執行過一次就阻斷後續調用
    if (isLaunched) return;
    isLaunched = true;

    // 清理殘留舊連線，防止事件重複觸發
    if (hostConn) {
      try { hostConn.close(); } catch (e) {}
      hostConn = null;
    }

    peer = new Peer(PEER_CONFIG);

    peer.on('open', () => {
      clientReconnectAttempts = 0;
      hostConn = peer.connect(`ice-${roomId}`, { reliable: true });

      hostConn.on('open', () => {
        if (onConnected) onConnected();
      });

      hostConn.on('data', (data) => {
        if (data.type === 'ROOM_FULL') {
          alert('⚠️ 房間已達 15 人上限！請直接在大螢幕共同觀戰。');
          return;
        }
        if (onDataReceived) onDataReceived(data);
      });

      hostConn.on('close', () => {
        if (onDisconnect) onDisconnect();
      });
    });

    peer.on('error', (err) => {
      console.error('[Client Peer Error]', err);
      if (onError) onError(err);
    });
  };

  // 銷毀與啟動流程（加上安全超時兜底）
  if (peer && !peer.destroyed) {
    peer.on('close', launchNewPeer);
    try {
      peer.destroy();
    } catch (e) {
      launchNewPeer();
    }
    // 保險保底：500ms 內若 close 未正常回調，強制執行單次啟動
    setTimeout(launchNewPeer, 500);
  } else {
    launchNewPeer();
  }
}

function broadcastToAll(payload) {
  Object.values(clients).forEach((conn) => {
    if (conn && conn.open) {
      try {
        conn.send(payload);
      } catch (err) {
        console.warn(`[Broadcast] 傳送至 peer=${conn.peer} 失敗:`, err);
      }
    }
  });
}

function sendToHost(payload) {
  if (!hostConn || !hostConn.open) {
    console.warn('[Send] 與主持人連線未就緒，無法發送:', payload.type);
    return false;
  }
  try {
    hostConn.send(payload);
    return true;
  } catch (err) {
    console.error('[Send] 傳送至主持人失敗:', err);
    return false;
  }
}
