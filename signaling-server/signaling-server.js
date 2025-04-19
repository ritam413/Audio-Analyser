const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });

let peers = {};      // { id: ws }
let rooms = {};      // { roomId: [id1, id2] }

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
                if (!rooms[room]) rooms[room] = [];
                rooms[room].push(from);
                ws.room = room;

                console.log(`🚪 ${from} joined room: ${room}`);

                // Notify other peers in the same room
                rooms[room].forEach(peerId => {
                    if (peerId !== from && peers[peerId]) {
                        peers[peerId].send(JSON.stringify({
                            type: 'user-joined',
                            userId: from
                        }));
                    }
                });

                // Optional: confirm back to user
                ws.send(JSON.stringify({
                    type: 'room-joined',
                    room
                }));
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
});

console.log('🚀 WebSocket signaling server running on ws://localhost:3000');
