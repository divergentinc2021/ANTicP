// ANT+ Bridge Server - Railway Compatible
const WebSocket = require('ws');
const http = require('http');
const { spawn } = require('child_process');

class ANTBridgeServer {
    constructor() {
        // ✅ Use Railway's assigned port
        this.port = process.env.PORT || 8888;
        this.httpServer = null;
        this.wss = null;
        this.clients = new Set();
        this.antProcess = null;
        this.demoInterval = null;
        
        console.log(`🚂 Railway Mode: Starting on port ${this.port}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    }

    start() {
        console.log('🌉 Starting ANT+ Bridge for Railway...');
        
        // ✅ Create HTTP server first (Railway needs this for health checks)
        this.httpServer = http.createServer((req, res) => {
            // Handle health check requests
            if (req.url === '/' || req.url === '/health') {
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                });
                res.end(JSON.stringify({
                    status: 'healthy',
                    service: 'ANT+ Bridge Server',
                    platform: 'railway',
                    port: this.port,
                    clients: this.clients.size,
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime()
                }));
                return;
            }
            
            // Handle static content requests
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(`ANT+ Bridge Server Running\\nPlatform: Railway\\nPort: ${this.port}\\nWebSocket: Available\\n`);
        });
        
        // ✅ Create WebSocket server on the same HTTP server
        this.wss = new WebSocket.Server({ 
            server: this.httpServer,
            cors: true,
            clientTracking: true
        });
        
        // Start HTTP server on Railway's assigned port
        this.httpServer.listen(this.port, '0.0.0.0', () => {
            console.log(`✅ Railway server running on port ${this.port}`);
            console.log(`🌐 HTTP: http://0.0.0.0:${this.port}`);
            console.log(`🔌 WebSocket: ws://0.0.0.0:${this.port}`);
            console.log(`🚂 Public URL: https://web-production-f8ebc.up.railway.app`);
        });
        
        this.setupWebSocketHandling();
        this.setupHealthCheck();
    }

    setupWebSocketHandling() {
        this.wss.on('connection', (ws, req) => {
            const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            console.log(`🔌 Client connected from ${clientIP}`);
            this.clients.add(ws);
            
            // Send Railway-specific welcome message
            this.sendToClient(ws, {
                type: 'status',
                message: 'Connected to Railway ANT+ Bridge',
                platform: 'railway',
                server_info: {
                    port: this.port,
                    environment: process.env.RAILWAY_ENVIRONMENT || 'production',
                    host: '0.0.0.0',
                    uptime: process.uptime()
                }
            });
            
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleBrowserMessage(ws, message);
                } catch (error) {
                    console.error('❌ Invalid message:', error);
                }
            });
            
            ws.on('close', () => {
                console.log('🔌 Client disconnected');
                this.clients.delete(ws);
            });
            
            ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error);
                this.clients.delete(ws);
            });
        });
        
        this.wss.on('error', (error) => {
            console.error('❌ WebSocket server error:', error);
        });
    }

    setupHealthCheck() {
        // Railway health monitoring
        setInterval(() => {
            const healthStatus = {
                clients: this.clients.size,
                memory: process.memoryUsage(),
                uptime: process.uptime()
            };
            console.log(`💓 Railway health: ${this.clients.size} clients, ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB RAM`);
        }, 30000);
    }

    handleBrowserMessage(ws, message) {
        console.log('📨 Message:', message.type);
        
        switch (message.type) {
            case 'connect':
                this.connectANT(ws, message.rate || 57600);
                break;
            case 'disconnect':
                this.disconnectANT(ws);
                break;
            case 'ping':
                this.sendToClient(ws, { 
                    type: 'pong', 
                    timestamp: Date.now(),
                    platform: 'railway',
                    server_uptime: process.uptime()
                });
                break;
            default:
                this.sendToClient(ws, { 
                    type: 'error', 
                    message: `Unknown message type: ${message.type}` 
                });
        }
    }

    sendToClient(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    connectANT(ws, rate) {
        // Railway note: ANT+ hardware not available in cloud
        // Provide demo data for testing the interface
        console.log(`🎭 Railway Demo Mode: Simulating ANT+ at ${rate} Hz`);
        
        this.sendToClient(ws, {
            type: 'connecting',
            message: `Railway Demo: Connecting at ${rate} Hz...`,
            platform: 'railway'
        });
        
        setTimeout(() => {
            this.sendToClient(ws, {
                type: 'connected',
                message: 'Railway Demo: ANT+ simulation active',
                rate: rate,
                platform: 'railway',
                demo: true
            });
            
            // Send demo data every 2 seconds
            this.demoInterval = setInterval(() => {
                this.sendToClient(ws, {
                    type: 'data',
                    device_type: '0x11',
                    device_id: 12345,
                    channel: 0,
                    payload: ['0x00', '0x01', '0x02', '0x03', '0x04', '0x05', '0x06', '0x07'],
                    rate: rate,
                    trainer: {
                        power: 200 + Math.floor(Math.random() * 100),
                        speed_kmh: 30 + Math.floor(Math.random() * 20)
                    },
                    platform: 'railway',
                    demo: true,
                    timestamp: Date.now()
                });
            }, 2000);
            
        }, 1000);
    }

    disconnectANT(ws) {
        if (this.demoInterval) {
            clearInterval(this.demoInterval);
            this.demoInterval = null;
        }
        
        this.sendToClient(ws, {
            type: 'disconnected',
            message: 'Railway Demo: ANT+ simulation stopped',
            platform: 'railway'
        });
    }

    stop() {
        console.log('🛑 Stopping Railway server...');
        
        if (this.demoInterval) {
            clearInterval(this.demoInterval);
        }
        
        if (this.wss) {
            this.wss.close();
        }
        
        if (this.httpServer) {
            this.httpServer.close();
        }
    }
}

// ✅ Railway startup
if (require.main === module) {
    const server = new ANTBridgeServer();
    server.start();
    
    // ✅ Railway process handlers
    process.on('SIGINT', () => {
        console.log('🛑 Railway SIGINT received');
        server.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('🚂 Railway SIGTERM received');
        server.stop();
        process.exit(0);
    });
    
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
        console.error('❌ Uncaught Exception:', error);
        server.stop();
        process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    });
}

module.exports = ANTBridgeServer;
