// ======= signaling-server.js (Node.js WebSocket Server) =======

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3000 });

let peers = {};

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        const { type, to, from, payload } = data;

        switch (type) {
            case 'register':
                peers[from] = ws;
                console.log(`User registered: ${from}`);
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
                delete peers[id];
                console.log(`User disconnected: ${id}`);
                break;
            }
        }
    });
});

console.log('WebSocket signaling server running on ws://localhost:3000');
