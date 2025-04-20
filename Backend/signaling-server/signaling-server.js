const WebSocket = require('ws');
const peers = {};
const rooms = {};
const wss = new WebSocket.Server({ 
  port: process.env.PORT || 3000,
  verifyClient: (info, callback) => {
    // Allow connections from your Netlify domain and local development
    const allowedOrigins = [
      'https://audio-analyser.netlify.app',
      'http://localhost' // For local testing
    ];
    
    if (allowedOrigins.includes(info.origin)) {
        callback(true);
      } else {
        console.log('⚠️ Rejected connection from origin:', info.origin);
        callback(false, 401, 'Unauthorized');
      }
      
  }
});
wss.on('connection', (ws) => {
    console.log('🔌 New client connected');

    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (err) {
            console.error('❌ Invalid JSON:', message);
            return;
        }

        const { type, from, to, payload, room } = data;

        switch (type) {
            case 'register':
                peers[from] = ws;
                console.log(`✅ Registered peer: ${from}`);
                break;

                case 'join-room':
                    if (!from) {
                        console.warn('❗ Cannot join room without ID (from).');
                        return;
                    }
                
                    peers[from] = ws;
                    ws.id = from;
                    ws.room = room;
                
                    if (!rooms[room]) rooms[room] = [];
                    rooms[room].push(from);
                
                    console.log(`👥 ${from} joined room: ${room}`);
                    
                    // Send the list of users already in the room to the new user
                    const otherUsers = rooms[room].filter(peerId => peerId !== from);
                    ws.send(JSON.stringify({
                        type: 'room-joined',
                        room,
                        users: otherUsers
                    }));
                
                    // Notify existing peers in the room about the new user
                    otherUsers.forEach(peerId => {
                        if (peers[peerId]) {
                            peers[peerId].send(JSON.stringify({
                                type: 'user-joined',
                                userId: from
                            }));
                        }
                    });
                
                    break;
            case 'offer':
            case 'answer':
            case 'ice-candidate':
                if (peers[to]) {
                    peers[to].send(JSON.stringify({ type, from, payload }));
                }
                break;
        }
    });

    ws.on('close', () => {
        for (let id in peers) {
            if (peers[id] === ws) {
                console.log(`❌ Disconnected: ${id}`);

                // Remove from room if in one
                const room = ws.room;
                if (room && rooms[room]) {
                    rooms[room] = rooms[room].filter(pid => pid !== id);
                    if (rooms[room].length === 0) delete rooms[room];
                }

                delete peers[id];
                break;
            }
        }
    });
    ws.on('error', (err) => {
        console.error('❗ WebSocket error:', err);
      });
});

console.log('🚀 WebSocket signaling server running on ws://localhost:3000');
