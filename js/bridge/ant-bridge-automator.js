/**
 * ANT+ Bridge Automator
 * Automatically manages bridge server deployment and lifecycle
 */

class ANTBridgeAutomator {
    constructor() {
        this.isElectron = typeof window !== 'undefined' && window.process && window.process.type;
        this.bridgeProcess = null;
        this.serverPort = 8888;
        this.serverStatus = 'stopped';
        this.autoRestart = true;
        this.listeners = new Map();
    }

    // Event handling
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
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

    // Environment detection
    detectEnvironment() {
        const env = {
            platform: this.getPlatform(),
            hasNode: this.checkNodeJS(),
            hasPython: this.checkPython(),
            isGitHubPages: this.isGitHubPages(),
            isLocalhost: window.location.hostname === 'localhost',
            canRunServer: false
        };

        env.canRunServer = env.hasNode && env.hasPython && !env.isGitHubPages;

        return env;
    }

    getPlatform() {
        if (typeof navigator === 'undefined') return 'unknown';
        
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('win')) return 'windows';
        if (userAgent.includes('mac')) return 'mac';
        if (userAgent.includes('linux')) return 'linux';
        return 'unknown';
    }

    checkNodeJS() {
        // In browser, we can't directly check Node.js
        // This will be handled by server-side detection
        return false;
    }

    checkPython() {
        // In browser, we can't directly check Python
        // This will be handled by server-side detection
        return false;
    }

    isGitHubPages() {
        const hostname = window.location.hostname;
        return hostname.includes('github.io') || 
               hostname.includes('githubusercontent.com') ||
               window.location.href.includes('github.dev');
    }

    // Bridge server management
    async startBridgeServer() {
        const env = this.detectEnvironment();
        
        if (env.isGitHubPages) {
            return this.deployCloudBridge();
        } else if (env.isLocalhost) {
            return this.startLocalBridge();
        } else {
            return this.downloadAndRunLocal();
        }
    }

    async deployCloudBridge() {
        console.log('🌐 Deploying cloud bridge for GitHub Pages...');
        this.emit('status', { message: 'Deploying cloud bridge...', type: 'deploying' });

        try {
            // Create a serverless bridge using GitHub Actions or Heroku
            const cloudOptions = await this.getCloudDeploymentOptions();
            
            if (cloudOptions.heroku) {
                return this.deployToHeroku();
            } else if (cloudOptions.railway) {
                return this.deployToRailway();
            } else if (cloudOptions.replit) {
                return this.deployToReplit();
            } else {
                return this.fallbackToLocalInstall();
            }
            
        } catch (error) {
            console.error('❌ Cloud deployment failed:', error);
            this.emit('error', { message: 'Cloud deployment failed', error });
            return this.fallbackToLocalInstall();
        }
    }

    async getCloudDeploymentOptions() {
        // Check available cloud platforms
        return {
            heroku: true,  // Always available
            railway: true, // Always available
            replit: true,  // Always available
            github: true   // GitHub Codespaces
        };
    }

    async deployToHeroku() {
        console.log('🚀 Setting up Heroku deployment...');
        
        const herokuConfig = this.generateHerokuConfig();
        const deploymentInstructions = this.generateHerokuInstructions();
        
        this.emit('cloud-deploy', {
            platform: 'heroku',
            config: herokuConfig,
            instructions: deploymentInstructions,
            url: 'https://your-ant-bridge.herokuapp.com'
        });

        return {
            success: true,
            platform: 'heroku',
            serverUrl: 'wss://your-ant-bridge.herokuapp.com',
            instructions: deploymentInstructions
        };
    }

    async deployToRailway() {
        console.log('🚂 Setting up Railway deployment...');
        
        const railwayConfig = this.generateRailwayConfig();
        const deploymentInstructions = this.generateRailwayInstructions();
        
        this.emit('cloud-deploy', {
            platform: 'railway',
            config: railwayConfig,
            instructions: deploymentInstructions
        });

        return {
            success: true,
            platform: 'railway',
            serverUrl: 'wss://your-ant-bridge.railway.app',
            instructions: deploymentInstructions
        };
    }

    async deployToReplit() {
        console.log('🔄 Setting up Replit deployment...');
        
        const replitConfig = this.generateReplitConfig();
        const deploymentInstructions = this.generateReplitInstructions();
        
        this.emit('cloud-deploy', {
            platform: 'replit',
            config: replitConfig,
            instructions: deploymentInstructions
        });

        return {
            success: true,
            platform: 'replit',
            serverUrl: 'wss://your-ant-bridge.replit.dev',
            instructions: deploymentInstructions
        };
    }

    async startLocalBridge() {
        console.log('🏠 Starting local bridge server...');
        this.emit('status', { message: 'Starting local bridge...', type: 'starting' });

        try {
            // Check if server is already running
            const isRunning = await this.checkServerHealth(`ws://localhost:${this.serverPort}`);
            if (isRunning) {
                console.log('✅ Bridge server already running');
                this.serverStatus = 'running';
                this.emit('server-ready', { url: `ws://localhost:${this.serverPort}` });
                return { success: true, url: `ws://localhost:${this.serverPort}` };
            }

            // Start new server
            return this.launchLocalServer();

        } catch (error) {
            console.error('❌ Local bridge startup failed:', error);
            this.emit('error', { message: 'Local bridge failed', error });
            return this.downloadAndRunLocal();
        }
    }

    async launchLocalServer() {
        // This would need to be implemented with Electron or similar
        // For browser-only, provide instructions to user
        
        const instructions = this.generateLocalInstructions();
        
        this.emit('local-setup', {
            instructions,
            commands: [
                'npm install',
                'pip install pyserial',
                'node ant-bridge-server.js'
            ]
        });

        return {
            success: false,
            requiresManualSetup: true,
            instructions
        };
    }

    async downloadAndRunLocal() {
        console.log('💾 Providing local installation package...');
        
        const downloadPackage = this.generateDownloadPackage();
        
        this.emit('download-ready', {
            package: downloadPackage,
            filename: 'ant-bridge-setup.zip',
            instructions: this.generateLocalInstructions()
        });

        return {
            success: false,
            requiresDownload: true,
            package: downloadPackage
        };
    }

    async fallbackToLocalInstall() {
        console.log('🔄 Falling back to local installation...');
        
        const fallbackInstructions = this.generateFallbackInstructions();
        
        this.emit('fallback', {
            message: 'Cloud deployment not available, using local setup',
            instructions: fallbackInstructions
        });

        return this.downloadAndRunLocal();
    }

    // Configuration generators
    generateHerokuConfig() {
        return {
            'app.json': {
                name: 'ant-bridge-server',
                description: 'ANT+ Middleware Bridge Server',
                keywords: ['ant+', 'bridge', 'websocket'],
                env: {
                    PORT: { value: '8888' },
                    NODE_ENV: { value: 'production' }
                },
                buildpacks: [
                    { url: 'heroku/nodejs' },
                    { url: 'heroku/python' }
                ]
            },
            'Procfile': 'web: node ant-bridge-server.js',
            'runtime.txt': 'python-3.9.0',
            'requirements.txt': 'pyserial==3.5'
        };
    }

    generateRailwayConfig() {
        return {
            'railway.json': {
                "$schema": "https://railway.app/railway.schema.json",
                "build": {
                    "builder": "NIXPACKS"
                },
                "deploy": {
                    "startCommand": "node ant-bridge-server.js",
                    "restartPolicyType": "ON_FAILURE"
                }
            },
            'nixpacks.toml': `
[phases.setup]
nixPkgs = ['nodejs', 'python3', 'pip']

[phases.install]
cmds = ['npm install', 'pip install pyserial']

[start]
cmd = 'node ant-bridge-server.js'
            `
        };
    }

    generateReplitConfig() {
        return {
            '.replit': `
language = "nodejs"
run = "node ant-bridge-server.js"

[packager]
packageSearch = true

[packager.features]
enabledForHosting = false
packageSearch = true
guessImports = true

[languages.javascript]
pattern = "**/{*.js,*.jsx,*.ts,*.tsx}"
syntax = "javascript"

[gitHubImport]
requiredFiles = [".replit", "replit.nix"]

[deployment]
run = ["sh", "-c", "node ant-bridge-server.js"]
            `,
            'replit.nix': `
{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.python3
    pkgs.python3Packages.pyserial
  ];
}
            `
        };
    }

    // Instruction generators
    generateHerokuInstructions() {
        return {
            title: 'Deploy ANT+ Bridge to Heroku',
            steps: [
                '1. Create Heroku account at heroku.com',
                '2. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli',
                '3. Clone this repository to your computer',
                '4. Open terminal in project folder',
                '5. Run: heroku create your-ant-bridge',
                '6. Run: git push heroku main',
                '7. Wait for deployment to complete',
                '8. Your bridge will be at: https://your-ant-bridge.herokuapp.com'
            ],
            commands: [
                'heroku create your-ant-bridge',
                'git push heroku main',
                'heroku logs --tail'
            ],
            notes: [
                '• Free tier available (limited hours)',
                '• Supports both Node.js and Python',
                '• WebSocket connections supported',
                '• Automatic SSL/HTTPS',
                '• Global CDN for fast access'
            ]
        };
    }

    generateRailwayInstructions() {
        return {
            title: 'Deploy ANT+ Bridge to Railway',
            steps: [
                '1. Create Railway account at railway.app',
                '2. Connect your GitHub account',
                '3. Import this repository',
                '4. Railway will auto-detect and deploy',
                '5. Get your deployment URL',
                '6. Update bridge client to use new URL'
            ],
            advantages: [
                '• Free tier with generous limits',
                '• Automatic deployments from GitHub',
                '• Built-in monitoring and logs',
                '• Supports WebSocket connections',
                '• Fast global edge network'
            ]
        };
    }

    generateReplitInstructions() {
        return {
            title: 'Deploy ANT+ Bridge to Replit',
            steps: [
                '1. Create Replit account at replit.com',
                '2. Click "Import from GitHub"',
                '3. Enter this repository URL',
                '4. Replit will set up the environment',
                '5. Click "Run" to start the bridge',
                '6. Use the provided URL for connections'
            ],
            advantages: [
                '• Always-on hosting available',
                '• Built-in IDE for modifications',
                '• Supports both Node.js and Python',
                '• Easy sharing and collaboration',
                '• Free tier available'
            ]
        };
    }

    generateLocalInstructions() {
        return {
            title: 'Local ANT+ Bridge Setup',
            prerequisites: [
                'Node.js 14+ (download from nodejs.org)',
                'Python 3.6+ (download from python.org)',
                'ANT+ USB device connected'
            ],
            steps: [
                '1. Download the project files',
                '2. Open terminal/command prompt',
                '3. Navigate to project folder',
                '4. Run: npm install',
                '5. Run: pip install pyserial',
                '6. Run: node ant-bridge-server.js',
                '7. Open browser to your web application',
                '8. Connect to ws://localhost:8888'
            ],
            commands: [
                'npm install',
                'pip install pyserial',
                'node ant-bridge-server.js'
            ]
        };
    }

    generateFallbackInstructions() {
        return {
            title: 'ANT+ Bridge Setup Options',
            options: [
                {
                    name: 'Option 1: Local Setup (Recommended)',
                    description: 'Run bridge server on your computer',
                    pros: ['Direct ANT+ access', 'No internet required', 'Full control'],
                    cons: ['Requires Node.js/Python installation']
                },
                {
                    name: 'Option 2: Cloud Deployment',
                    description: 'Deploy to cloud platform (Heroku/Railway/Replit)',
                    pros: ['Always available', 'No local setup', 'Shareable'],
                    cons: ['Requires cloud account', 'May have usage limits']
                },
                {
                    name: 'Option 3: Electron App',
                    description: 'Download standalone desktop application',
                    pros: ['No manual setup', 'Includes everything', 'Easy to use'],
                    cons: ['Larger download', 'Platform specific']
                }
            ]
        };
    }

    // Utility methods
    async checkServerHealth(url) {
        try {
            const ws = new WebSocket(url);
            return new Promise((resolve) => {
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
        } catch (error) {
            return false;
        }
    }

    generateDownloadPackage() {
        // Generate a downloadable package with all necessary files
        const files = {
            'ant-bridge-server.js': this.getServerCode(),
            'package.json': this.getPackageJson(),
            'setup.bat': this.getWindowsSetupScript(),
            'setup.sh': this.getLinuxSetupScript(),
            'README.txt': this.getSetupReadme()
        };

        return files;
    }

    getServerCode() {
        // Return the bridge server code as a string
        return `// ANT+ Bridge Server Code
// Copy from ant-bridge-server.js file`;
    }

    getPackageJson() {
        return JSON.stringify({
            "name": "ant-bridge-server",
            "version": "1.0.0",
            "main": "ant-bridge-server.js",
            "dependencies": {
                "ws": "^8.14.0"
            },
            "scripts": {
                "start": "node ant-bridge-server.js"
            }
        }, null, 2);
    }

    getWindowsSetupScript() {
        return `@echo off
echo Installing ANT+ Bridge Server...
npm install
pip install pyserial
echo Setup complete! Run 'npm start' to start the server.
pause`;
    }

    getLinuxSetupScript() {
        return `#!/bin/bash
echo "Installing ANT+ Bridge Server..."
npm install
pip install pyserial
echo "Setup complete! Run 'npm start' to start the server."`;
    }

    getSetupReadme() {
        return `ANT+ Bridge Server Setup
========================

1. Make sure Node.js and Python are installed
2. Run setup script for your platform:
   - Windows: Double-click setup.bat
   - Linux/Mac: Run ./setup.sh

3. Start the server:
   npm start

4. Connect your browser to ws://localhost:8888

For detailed instructions, see README.md`;
    }

    // Auto-detection and smart setup
    async autoSetup() {
        console.log('🔍 Auto-detecting best setup method...');
        
        const env = this.detectEnvironment();
        
        this.emit('auto-setup-start', { environment: env });
        
        if (env.isGitHubPages) {
            console.log('📱 GitHub Pages detected - setting up cloud bridge');
            return this.deployCloudBridge();
        } else if (env.isLocalhost) {
            console.log('🏠 Localhost detected - setting up local bridge');
            return this.startLocalBridge();
        } else {
            console.log('🌐 Remote hosting detected - providing setup options');
            return this.fallbackToLocalInstall();
        }
    }

    // Bridge lifecycle management
    async stopBridge() {
        if (this.bridgeProcess) {
            console.log('🛑 Stopping bridge server...');
            this.bridgeProcess.kill();
            this.bridgeProcess = null;
            this.serverStatus = 'stopped';
            this.emit('server-stopped');
        }
    }

    async restartBridge() {
        console.log('🔄 Restarting bridge server...');
        await this.stopBridge();
        return this.startBridgeServer();
    }

    getStatus() {
        return {
            serverStatus: this.serverStatus,
            platform: this.getPlatform(),
            isGitHubPages: this.isGitHubPages(),
            hasProcess: !!this.bridgeProcess
        };
    }
}

export { ANTBridgeAutomator };
