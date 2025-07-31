/**
 * ANT+ Middleware Bridge Server
 * Bridges between browser and ANT+ device via WebSocket
 * Solves libusbK driver WebUSB limitations
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ANTBridgeServer {
    constructor(port = 8888) {
        this.port = port;
        this.wss = null;
        this.clients = new Set();
        this.antProcess = null;
        this.antData = [];
    }

    start() {
        console.log('🌉 Starting ANT+ Middleware Bridge...');
        
        // Create WebSocket server
        this.wss = new WebSocket.Server({ 
            port: this.port,
            cors: true 
        });
        
        this.wss.on('connection', (ws) => {
            console.log('🔌 Browser connected to bridge');
            this.clients.add(ws);
            
            // Send initial status
            this.sendToClient(ws, {
                type: 'status',
                message: 'ANT+ Bridge connected',
                connected: false
            });
            
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleBrowserMessage(ws, message);
                } catch (error) {
                    console.error('❌ Invalid message from browser:', error);
                }
            });
            
            ws.on('close', () => {
                console.log('🔌 Browser disconnected from bridge');
                this.clients.delete(ws);
            });
            
            ws.on('error', (error) => {
                console.error('❌ WebSocket error:', error);
                this.clients.delete(ws);
            });
        });
        
        console.log(`✅ ANT+ Bridge server running on ws://localhost:${this.port}`);
        console.log('💡 Open your browser application to connect');
    }

    handleBrowserMessage(ws, message) {
        console.log('📨 Browser message:', message.type);
        
        switch (message.type) {
            case 'connect':
                this.connectANT(ws, message.rate || 57600);
                break;
                
            case 'disconnect':
                this.disconnectANT(ws);
                break;
                
            case 'send':
                this.sendANTMessage(ws, message.data);
                break;
                
            case 'ping':
                this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
                break;
                
            default:
                this.sendToClient(ws, { 
                    type: 'error', 
                    message: `Unknown message type: ${message.type}` 
                });
        }
    }

    async connectANT(ws, rate) {
        try {
            console.log(`🔌 Connecting to ANT+ device at ${rate} Hz...`);
            
            this.sendToClient(ws, {
                type: 'connecting',
                message: `Connecting to ANT+ at ${rate} Hz...`
            });
            
            // Create Python ANT+ handler
            const pythonScript = this.createPythonANTHandler(rate);
            
            // Start Python process
            this.antProcess = spawn('python', ['-c', pythonScript], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            
            // Handle ANT+ data from Python
            this.antProcess.stdout.on('data', (data) => {
                const lines = data.toString().split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        try {
                            const antData = JSON.parse(line);
                            this.broadcastToClients({
                                type: 'data',
                                ...antData
                            });
                        } catch (e) {
                            console.log('📡 ANT+:', line.trim());
                        }
                    }
                });
            });
            
            this.antProcess.stderr.on('data', (data) => {
                console.error('❌ ANT+ Error:', data.toString());
                this.sendToClient(ws, {
                    type: 'error',
                    message: data.toString()
                });
            });
            
            this.antProcess.on('close', (code) => {
                console.log(`🔌 ANT+ process closed with code ${code}`);
                this.broadcastToClients({
                    type: 'disconnected',
                    message: 'ANT+ connection closed'
                });
                this.antProcess = null;
            });
            
            // Give process time to start
            setTimeout(() => {
                this.sendToClient(ws, {
                    type: 'connected',
                    message: `ANT+ connected at ${rate} Hz`,
                    rate: rate
                });
            }, 2000);
            
        } catch (error) {
            console.error('❌ ANT+ connection failed:', error);
            this.sendToClient(ws, {
                type: 'error',
                message: `Connection failed: ${error.message}`
            });
        }
    }

    disconnectANT(ws) {
        if (this.antProcess) {
            console.log('🔌 Disconnecting ANT+ device...');
            this.antProcess.kill();
            this.antProcess = null;
            
            this.sendToClient(ws, {
                type: 'disconnected',
                message: 'ANT+ disconnected'
            });
        }
    }

    sendANTMessage(ws, messageData) {
        if (this.antProcess && this.antProcess.stdin) {
            try {
                const command = JSON.stringify({ type: 'send', data: messageData }) + '\n';
                this.antProcess.stdin.write(command);
                
                this.sendToClient(ws, {
                    type: 'sent',
                    message: 'Message sent to ANT+ device',
                    data: messageData
                });
            } catch (error) {
                this.sendToClient(ws, {
                    type: 'error',
                    message: `Failed to send message: ${error.message}`
                });
            }
        } else {
            this.sendToClient(ws, {
                type: 'error',
                message: 'ANT+ device not connected'
            });
        }
    }

    sendToClient(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    broadcastToClients(message) {
        this.clients.forEach(client => {
            this.sendToClient(client, message);
        });
    }

    createPythonANTHandler(rate) {
        return `
import sys
import json
import time
import threading
try:
    import serial
    import serial.tools.list_ports
except ImportError:
    print(json.dumps({"error": "pyserial not installed. Run: pip install pyserial"}))
    sys.exit(1)

class ANTHandler:
    def __init__(self, rate=${rate}):
        self.rate = rate
        self.connection = None
        self.running = False
        self.connect()
    
    def find_ant_device(self):
        """Find ANT+ USB device"""
        ports = serial.tools.list_ports.comports()
        for port in ports:
            if port.vid == 0x0FCF:  # Garmin/Dynastream VID
                return port.device
        return None
    
    def connect(self):
        """Connect to ANT+ device via serial"""
        try:
            # First try to find COM port (if driver was changed)
            ant_port = self.find_ant_device()
            if ant_port:
                print(json.dumps({"status": "found_com_port", "port": ant_port}))
                self.connection = serial.Serial(ant_port, ${rate}, timeout=1)
            else:
                # Try common COM ports
                for port_num in range(3, 20):
                    try:
                        port_name = f"COM{port_num}"
                        test_conn = serial.Serial(port_name, ${rate}, timeout=0.1)
                        # Send ANT+ ping
                        test_conn.write(b'\\xA4\\x01\\x4A\\x00\\xEF')
                        time.sleep(0.1)
                        if test_conn.in_waiting > 0:
                            print(json.dumps({"status": "found_ant_port", "port": port_name}))
                            self.connection = test_conn
                            break
                        test_conn.close()
                    except:
                        continue
            
            if not self.connection:
                print(json.dumps({"error": "No ANT+ device found on any COM port"}))
                return False
            
            print(json.dumps({"status": "connected", "rate": ${rate}}))
            self.initialize_ant()
            self.start_listening()
            return True
            
        except Exception as e:
            print(json.dumps({"error": f"Connection failed: {str(e)}"}))
            return False
    
    def initialize_ant(self):
        """Initialize ANT+ device"""
        try:
            # Reset
            self.send_message([0x4A, 0x00])
            time.sleep(1)
            
            # Set network key
            network_key = [0xB9, 0xA5, 0x21, 0xFB, 0xBD, 0x72, 0xC3, 0x45]
            self.send_message([0x46, 0x00] + network_key)
            time.sleep(0.1)
            
            # Configure channels based on rate
            if ${rate} >= 2000000:
                # High speed configuration
                channels = [
                    ([0x42, 0x00, 0x10, 0x00], [0x51, 0x00, 0x11, 0x05, 0x01], [0x43, 0x00, 0x08, 0x02], [0x45, 0x00, 78]),
                    ([0x42, 0x01, 0x10, 0x00], [0x51, 0x01, 0x78, 0x05, 0x01], [0x43, 0x01, 0x08, 0x02], [0x45, 0x01, 78]),
                    ([0x42, 0x02, 0x10, 0x00], [0x51, 0x02, 0x0B, 0x05, 0x01], [0x43, 0x02, 0x08, 0x02], [0x45, 0x02, 78])
                ]
            elif ${rate} >= 115200:
                # Medium speed configuration  
                channels = [
                    ([0x42, 0x00, 0x10, 0x00], [0x51, 0x00, 0x11, 0x05, 0x01], [0x43, 0x00, 0x43, 0x0F], [0x45, 0x00, 66]),
                    ([0x42, 0x01, 0x10, 0x00], [0x51, 0x01, 0x78, 0x05, 0x01], [0x43, 0x01, 0x43, 0x0F], [0x45, 0x01, 66])
                ]
            else:
                # Standard configuration
                channels = [
                    ([0x42, 0x00, 0x10, 0x00], [0x51, 0x00, 0x11, 0x05, 0x01], [0x43, 0x00, 0x86, 0x1F], [0x45, 0x00, 57]),
                    ([0x42, 0x01, 0x10, 0x00], [0x51, 0x01, 0x78, 0x05, 0x01], [0x43, 0x01, 0x86, 0x1F], [0x45, 0x01, 57])
                ]
            
            for channel_cmds in channels:
                for cmd in channel_cmds:
                    self.send_message(cmd)
                    time.sleep(0.05)
            
            # Open channels
            for i in range(len(channels)):
                self.send_message([0x4B, i])
            
            print(json.dumps({"status": "initialized", "channels": len(channels)}))
            
        except Exception as e:
            print(json.dumps({"error": f"Initialization failed: {str(e)}"}))
    
    def send_message(self, payload):
        """Send ANT+ message"""
        if not self.connection:
            return
        
        message = [0xA4, len(payload)] + payload
        checksum = 0
        for byte in message:
            checksum ^= byte
        message.append(checksum)
        
        self.connection.write(bytes(message))
    
    def start_listening(self):
        """Start listening for ANT+ data"""
        self.running = True
        
        def listen():
            buffer = bytearray()
            while self.running and self.connection:
                try:
                    if self.connection.in_waiting > 0:
                        data = self.connection.read(self.connection.in_waiting)
                        buffer.extend(data)
                        
                        # Process complete messages
                        while len(buffer) >= 4:
                            if buffer[0] == 0xA4:  # ANT+ sync
                                length = buffer[1]
                                if len(buffer) >= length + 4:
                                    message = buffer[:length + 4]
                                    buffer = buffer[length + 4:]
                                    self.process_message(message)
                                else:
                                    break
                            else:
                                buffer.pop(0)
                    
                    time.sleep(0.001)  # Small delay based on rate
                    
                except Exception as e:
                    print(json.dumps({"error": f"Listen error: {str(e)}"}))
                    break
        
        thread = threading.Thread(target=listen)
        thread.daemon = True
        thread.start()
    
    def process_message(self, message):
        """Process received ANT+ message"""
        if len(message) < 4:
            return
        
        msg_id = message[2]
        data = message[3:-1]  # Exclude checksum
        
        if msg_id == 0x4E and len(data) >= 9:  # Broadcast data
            channel = data[0]
            device_type = data[8]
            device_id = (data[7] << 8) | data[6]
            payload = data[1:9]
            
            result = {
                "type": "broadcast",
                "channel": channel,
                "device_type": f"0x{device_type:02x}",
                "device_id": device_id,
                "payload": [f"0x{b:02x}" for b in payload],
                "rate": ${rate}
            }
            
            # Parse specific device types
            if device_type == 0x11:  # FE-C Trainer
                if len(payload) >= 8:
                    power = (payload[6] << 8) | payload[5]
                    speed = ((payload[4] << 8) | payload[3]) * 0.001
                    result["trainer"] = {"power": power, "speed_kmh": speed * 3.6}
            
            elif device_type == 0x78:  # Heart Rate
                if len(payload) >= 8:
                    hr = payload[7]
                    result["heart_rate"] = {"bpm": hr}
            
            elif device_type == 0x0B:  # Power Meter
                if len(payload) >= 8:
                    power = (payload[6] << 8) | payload[5]
                    cadence = payload[3]
                    result["power"] = {"watts": power, "cadence": cadence}
            
            print(json.dumps(result))
        
        elif msg_id == 0x40:  # Channel event
            if len(data) >= 3:
                channel = data[0]
                event_code = data[2]
                print(json.dumps({
                    "type": "event",
                    "channel": channel,
                    "event_code": f"0x{event_code:02x}",
                    "rate": ${rate}
                }))

# Start ANT+ handler
try:
    handler = ANTHandler()
    
    # Keep alive and handle stdin commands
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            
            command = json.loads(line.strip())
            if command.get("type") == "send":
                handler.send_message(command.get("data", []))
                
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(json.dumps({"error": f"Command error: {str(e)}"}))
            
except Exception as e:
    print(json.dumps({"error": f"Handler error: {str(e)}"}))

handler.running = False
if handler.connection:
    handler.connection.close()
`;
    }

    stop() {
        console.log('🛑 Stopping ANT+ Bridge server...');
        
        if (this.antProcess) {
            this.antProcess.kill();
            this.antProcess = null;
        }
        
        if (this.wss) {
            this.wss.close();
        }
        
        console.log('✅ ANT+ Bridge stopped');
    }
}

// Start server if run directly
if (require.main === module) {
    const server = new ANTBridgeServer();
    server.start();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        server.stop();
        process.exit(0);
    });
}

module.exports = ANTBridgeServer;
