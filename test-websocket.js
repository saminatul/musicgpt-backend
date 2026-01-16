#!/usr/bin/env node

/**
 * WebSocket Load Testing Script
 * Tests WebSocket connections and notifications for audio completion
 * 
 * Usage: node test-websocket.js [numUsers] [apiUrl]
 * Example: node test-websocket.js 25 http://localhost:3000
 */

const io = require('socket.io-client');

const NUM_USERS = parseInt(process.argv[2]) || 25;
const API_URL = process.argv[3] || 'http://localhost:3000';
const WS_URL = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');

console.log('🔌 WebSocket Load Testing');
console.log('==========================');
console.log(`Users: ${NUM_USERS}`);
console.log(`WebSocket URL: ${WS_URL}/notifications`);
console.log('');

// User tokens and IDs (should be provided or fetched)
const USER_TOKENS = process.env.USER_TOKENS ? process.env.USER_TOKENS.split(',') : [];
const USER_IDS = process.env.USER_IDS ? process.env.USER_IDS.split(',') : [];

if (USER_TOKENS.length === 0 || USER_IDS.length === 0) {
    console.error('❌ USER_TOKENS and USER_IDS environment variables required');
    console.error('   Set them from load-test-comprehensive.sh output');
    process.exit(1);
}

let connected = 0;
let notifications = 0;
let errors = 0;
let disconnected = 0;

const sockets = [];
const promises = [];

console.log('Connecting WebSocket clients...');

USER_IDS.slice(0, NUM_USERS).forEach((userId, index) => {
    const promise = new Promise((resolve) => {
        const socket = io(`${WS_URL}/notifications`, {
            transports: ['websocket'],
            reconnection: false,
            timeout: 5000,
        });
        
        sockets.push(socket);
        
        socket.on('connect', () => {
            connected++;
            console.log(`  ✅ User ${index + 1} connected (${userId})`);
            
            // Join user's room
            socket.emit('join', { userId });
        });
        
        socket.on('prompt:completed', (data) => {
            notifications++;
            console.log(`  📢 Notification received for user ${index + 1}:`, data);
        });
        
        socket.on('error', (error) => {
            errors++;
            console.error(`  ❌ Error for user ${index + 1}:`, error.message);
        });
        
        socket.on('disconnect', (reason) => {
            disconnected++;
            console.log(`  🔌 User ${index + 1} disconnected: ${reason}`);
            resolve();
        });
        
        socket.on('connect_error', (error) => {
            errors++;
            console.error(`  ❌ Connection error for user ${index + 1}:`, error.message);
            resolve();
        });
    });
    
    promises.push(promise);
});

// Wait for all connections
setTimeout(() => {
    console.log('');
    console.log('📊 WebSocket Test Results');
    console.log('==========================');
    console.log(`  ✅ Connected: ${connected}/${NUM_USERS}`);
    console.log(`  📢 Notifications received: ${notifications}`);
    console.log(`  ❌ Errors: ${errors}`);
    console.log(`  🔌 Disconnected: ${disconnected}`);
    console.log('');
    
    // Disconnect all sockets
    sockets.forEach(socket => {
        if (socket.connected) {
            socket.disconnect();
        }
    });
    
    // Wait a bit for cleanup
    setTimeout(() => {
        process.exit(0);
    }, 1000);
}, 30000); // Run for 30 seconds

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    sockets.forEach(socket => {
        if (socket.connected) {
            socket.disconnect();
        }
    });
    process.exit(0);
});
