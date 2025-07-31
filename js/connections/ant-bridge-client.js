/**
 * ANT+ Bridge Client - Browser Side
 * Connects to middleware bridge server via WebSocket
 */

export class ANTBridgeClient {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.antConnected = false;
        this.listeners = new Map();
        this.serverUrl = 'ws://localhost:8888';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    // Event handling
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} callback:`, error);
                }
            });
        }
    }

    // Connection management
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                console.log('🌉 Connecting to ANT+ Bridge server...');
                this.emit('connecting', { message: 'Connecting to bridge server...' });

                this.ws = new WebSocket(this.serverUrl);

                this.ws.onopen = () => {
                    console.log('✅ Connected to ANT+ Bridge server');
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    this.emit('bridge-connected', { message: 'Bridge server connected' });
                    resolve();
                };

                this.ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.handleServerMessage(message);
                    } catch (error) {
                        console.error('❌ Invalid message from bridge server:', error);
                    }
                };

                this.ws.onclose = () => {
                    console.log('🔌 Disconnected from ANT+ Bridge server');
                    this.connected = false;
                    this.antConnected = false;
                    this.emit('bridge-disconnected', { message: 'Bridge server disconnected' });
                    
                    // Attempt reconnection
                    if (this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                        setTimeout(() => this.connect(), 2000);
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('❌ Bridge server connection error:', error);
                    this.emit('bridge-error', { error: error.message || 'Connection failed' });
                    reject(error);
                };

            } catch (error) {
                console.error('❌ Failed to create WebSocket connection:', error);
                reject(error);
            }
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this.antConnected = false;
    }

    // ANT+ device management
    async connectANT(rate = 57600) {
        if (!this.connected) {
            throw new Error('Bridge server not connected');
        }

        console.log(`🔌 Requesting ANT+ connection at ${rate} Hz...`);
        this.sendToServer({
            type: 'connect',
            rate: rate
        });
    }

    async disconnectANT() {
        if (!this.connected) {
            throw new Error('Bridge server not connected');
        }

        console.log('🔌 Requesting ANT+ disconnection...');
        this.sendToServer({
            type: 'disconnect'
        });
    }

    async sendANTMessage(data) {
        if (!this.antConnected) {
            throw new Error('ANT+ device not connected');
        }

        this.sendToServer({
            type: 'send',
            data: data
        });
    }

    // Server communication
    sendToServer(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('❌ Bridge server not connected');
            this.emit('error', { message: 'Bridge server not connected' });
        }
    }

    handleServerMessage(message) {
        console.log('📨 Bridge message:', message.type);

        switch (message.type) {
            case 'status':
                this.emit('status', message);
                break;

            case 'connecting':
                this.emit('ant-connecting', message);
                break;

            case 'connected':
                this.antConnected = true;
                this.emit('ant-connected', message);
                break;

            case 'disconnected':
                this.antConnected = false;
                this.emit('ant-disconnected', message);
                break;

            case 'data':
                this.emit('ant-data', message);
                this.processANTData(message);
                break;

            case 'broadcast':
                this.emit('ant-broadcast', message);
                this.processANTData(message);
                break;

            case 'event':
                this.emit('ant-event', message);
                break;

            case 'sent':
                this.emit('ant-sent', message);
                break;

            case 'error':
                console.error('❌ Bridge error:', message.message);
                this.emit('error', message);
                break;

            case 'pong':
                this.emit('pong', message);
                break;

            default:
                console.warn('⚠️ Unknown message type:', message.type);
        }
    }

    processANTData(data) {
        // Process specific device types
        if (data.trainer) {
            this.emit('trainer-data', {
                power: data.trainer.power,
                speed: data.trainer.speed_kmh,
                deviceId: data.device_id,
                channel: data.channel,
                rate: data.rate
            });
        }

        if (data.heart_rate) {
            this.emit('heart-rate-data', {
                heartRate: data.heart_rate.bpm,
                deviceId: data.device_id,
                channel: data.channel,
                rate: data.rate
            });
        }

        if (data.power) {
            this.emit('power-data', {
                power: data.power.watts,
                cadence: data.power.cadence,
                deviceId: data.device_id,
                channel: data.channel,
                rate: data.rate
            });
        }

        // Generic device data
        this.emit('device-data', {
            deviceType: data.device_type,
            deviceId: data.device_id,
            channel: data.channel,
            payload: data.payload,
            rate: data.rate,
            raw: data
        });
    }

    // Utility methods
    ping() {
        this.sendToServer({ type: 'ping' });
    }

    getStatus() {
        return {
            bridgeConnected: this.connected,
            antConnected: this.antConnected,
            serverUrl: this.serverUrl
        };
    }

    // Helper method to check if bridge server is running
    static async checkBridgeServer(url = 'ws://localhost:8888') {
        return new Promise((resolve) => {
            const ws = new WebSocket(url);
            
            const timeout = setTimeout(() => {
                ws.close();
                resolve(false);
            }, 2000);

            ws.onopen = () => {
                clearTimeout(timeout);
                ws.close();
                resolve(true);
            };

            ws.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };
        });
    }
}

// Usage example:
/*
const bridge = new ANTBridgeClient();

// Set up event listeners
bridge.on('bridge-connected', () => console.log('Bridge connected'));
bridge.on('ant-connected', (data) => console.log('ANT+ connected:', data));
bridge.on('trainer-data', (data) => console.log('Trainer:', data));
bridge.on('heart-rate-data', (data) => console.log('HR:', data));
bridge.on('error', (error) => console.error('Error:', error));

// Connect to bridge server
await bridge.connect();

// Connect to ANT+ device
await bridge.connectANT(57600);
*/
