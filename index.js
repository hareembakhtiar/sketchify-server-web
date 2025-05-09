const express = require('express')
const http = require('http')
const app = express()
const server = http.createServer(app)
const dotenv = require('dotenv');
dotenv.config();

const {Server} = require('socket.io')
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true,
    },
})

// Store countdown states per room
const roomStates = {};

io.on("connection", (socket)=> {
    console.log("connection")
    
    // When a client joins a room
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        
        // Initialize room state if it doesn't exist
        if (!roomStates[roomId]) {
            roomStates[roomId] = {
                time: 0,
                phase: "",
                interval: null,
                canvasState: null
            };
        }
        
        // Send current state to the joining client
        socket.emit('countdown-state', {
            time: roomStates[roomId].time,
            phase: roomStates[roomId].phase
        });
        
        if (roomStates[roomId].canvasState) {
            socket.emit('canvas-state-from-server', roomStates[roomId].canvasState);
        }
    });

    socket.on('client-ready', (roomId) => {
        socket.to(roomId).emit('get-canvas-state');
    });
    
    socket.on('canvas-state', (state, roomId) => {
        roomStates[roomId].canvasState = state;
        socket.to(roomId).emit('canvas-state-from-server', state);
    });
    
    socket.on("draw-line", ({prevPoint, currentPoint, color, lineWidth}, roomId) => {
        socket.to(roomId).emit('draw-line', {prevPoint, currentPoint, color, lineWidth});
    });
    
    socket.on("fill-canvas", (x, y, color, roomId) => {
        socket.to(roomId).emit('fill-canvas', x, y, color);
    });

    socket.on("clear-canvas", (roomId) => {
        socket.to(roomId).emit('clear-canvas');
        roomStates[roomId].canvasState = null;
    });

    
    // Countdown handlers
   // ... (previous server code)


    // When a client joins a room
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        
        // Initialize room state if it doesn't exist
        if (!roomStates[roomId]) {
            roomStates[roomId] = {
                countdown: 0,
                phase: "",
                interval: null,
                phaseEndTime: null
            };
        }
        
        // Send current state to the joining client
        socket.emit('countdown-state', {
            countdown: roomStates[roomId].countdown,
            phase: roomStates[roomId].phase,
            phaseEndTime: roomStates[roomId].phaseEndTime
        });
    });

    // Handle countdown updates from host
    socket.on('update-countdown', ({ countdown, phase, phaseEndTime }, roomId) => {
        roomStates[roomId] = {
            countdown,
            phase,
            phaseEndTime,
            interval: roomStates[roomId]?.interval || null
        };
        
        // Broadcast to all clients in the room except sender
        socket.to(roomId).emit('countdown-state', {
            countdown,
            phase,
            phaseEndTime
        });
    });

    // Handle countdown start
    socket.on('start-countdown', ({ duration, phase }, roomId) => {
        const phaseEndTime = Date.now() + duration * 1000;
        
        // Clear any existing interval
        if (roomStates[roomId]?.interval) {
            clearInterval(roomStates[roomId].interval);
        }
        
        roomStates[roomId] = {
            countdown: duration,
            phase,
            phaseEndTime,
            interval: setInterval(() => {
                roomStates[roomId].countdown -= 1;
                io.to(roomId).emit('countdown-state', {
                    countdown: roomStates[roomId].countdown,
                    phase: roomStates[roomId].phase,
                    phaseEndTime: roomStates[roomId].phaseEndTime
                });
                
                if (roomStates[roomId].countdown <= 0) {
                    clearInterval(roomStates[roomId].interval);
                    roomStates[roomId].interval = null;
                }
            }, 1000)
        };
        
        io.to(roomId).emit('countdown-state', {
            countdown: duration,
            phase,
            phaseEndTime
        });
    });

    // Handle countdown reset
    socket.on('reset-countdown', (roomId) => {
        if (roomStates[roomId]?.interval) {
            clearInterval(roomStates[roomId].interval);
        }
        roomStates[roomId] = {
            countdown: 0,
            phase: "",
            phaseEndTime: null,
            interval: null
        };
        io.to(roomId).emit('countdown-state', roomStates[roomId]);
    });

    // ... (rest of your socket handlers)
   

});

    
server.listen(3001, ()=>{
    console.log("✔️ Server listening on port 3000")
});


