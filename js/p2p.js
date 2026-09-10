/* =========================================================================
 * 📡 p2p.js - WebRTC PeerJS 底層連線封裝
 * ========================================================================= */
const PEER_CONFIG = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ]
  }
};

let peerInstance = null;
let hostConnection = null;
let clientConnections = {};

function initHostPeer(roomId, onDataCallback, onCountChange) {
  peerInstance = new Peer(`bx-ice-${roomId}`, PEER_CONFIG);

  peerInstance.on('connection', (conn) => {
    conn.on('open', () => {
      clientConnections[conn.peer] = conn;
      if (onCountChange) onCountChange(Object.keys(clientConnections).length);
    });

    conn.on('data', (data) => {
      if (onDataCallback) onDataCallback(data, conn);
    });

    conn.on('close', () => {
      delete clientConnections[conn.peer];
      if (onCountChange) onCountChange(Object.keys(clientConnections).length);
    });
  });

  return peerInstance;
}

function initClientPeer(roomId, onDataCallback, onConnectSuccess) {
  peerInstance = new Peer(PEER_CONFIG);

  peerInstance.on('open', () => {
    hostConnection = peerInstance.connect(`bx-ice-${roomId}`);
    hostConnection.on('open', () => {
      if (onConnectSuccess) onConnectSuccess();
    });
    hostConnection.on('data', (data) => {
      if (onDataCallback) onDataCallback(data);
    });
  });

  return peerInstance;
}

function broadcastToClients(payload) {
  Object.values(clientConnections).forEach(conn => {
    if (conn && conn.open) {
      try { conn.send(payload); } catch (e) { console.error(e); }
    }
  });
}

function sendToHost(payload) {
  if (hostConnection && hostConnection.open) {
    hostConnection.send(payload);
  }
}
