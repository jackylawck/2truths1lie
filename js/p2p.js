/* =========================================================================
 * 📡 p2p.js - PeerJS 網絡通訊底層（上限 15 人、多 STUN 池、防呆警告）
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

let peer = null;
let hostConn = null;
let clients = {};

// 初始化 Host Peer
function initHostPeer(roomId, onDataReceived, onCountChanged) {
  window.addEventListener('beforeunload', (e) => {
    e.preventDefault();
    e.returnValue = '活動進行中，關閉分頁將導致所有參與者斷線！';
  });

  peer = new Peer(`ice-${roomId}`, PEER_CONFIG);

  peer.on('connection', (conn) => {
    // 15 人硬上限攔截
    if (Object.keys(clients).length >= MAX_PARTICIPANTS) {
      setTimeout(() => {
        try { conn.send({ type: 'ROOM_FULL' }); } catch (e) {}
        conn.close();
      }, 500);
      return;
    }

    conn.on('open', () => {
      clients[conn.peer] = conn;
      if (onCountChanged) onCountChanged(Object.keys(clients).length);
    });

    conn.on('data', (data) => {
      if (onDataReceived) onDataReceived(data, conn);
    });

    conn.on('close', () => {
      delete clients[conn.peer];
      if (onCountChanged) onCountChanged(Object.keys(clients).length);
    });
  });

  peer.on('error', (err) => console.error('[Host Peer Error]', err));
}

// 初始化 Client Peer
function initClientPeer(roomId, onConnected, onDataReceived, onDisconnect, onError) {
  peer = new Peer(PEER_CONFIG);

  peer.on('open', () => {
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
    if (onError) onError();
  });
}

// Host 廣播至所有手機
function broadcastToAll(payload) {
  Object.values(clients).forEach((conn) => {
    if (conn && conn.open) {
      try { conn.send(payload); } catch (e) {}
    }
  });
}

// Client 發送至 Host
function sendToHost(payload) {
  if (hostConn && hostConn.open) {
    hostConn.send(payload);
  }
}
