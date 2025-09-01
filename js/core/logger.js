/**
 * Logger - Centralized logging system with different levels
 */
export class Logger {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000;
        this.logElement = null;
    }

    init(logElementId = 'log-content') {
        this.logElement = document.getElementById(logElementId);
    }

    log(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            message,
            level,
            time: Date.now()
        };
        
        this.logs.push(logEntry);
        
        // Keep only recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // Display in UI
        this.displayLog(logEntry);
        
        // Console output with appropriate level
        const consoleMessage = `[${timestamp}] ${message}`;
        switch (level) {
            case 'error':
                console.error(consoleMessage);
                break;
            case 'warn':
                console.warn(consoleMessage);
                break;
            case 'debug':
                console.debug(consoleMessage);
                break;
            default:
                console.log(consoleMessage);
        }
    }

    displayLog(logEntry) {
        if (!this.logElement) return;
        
        const logLine = `[${logEntry.timestamp}] ${logEntry.message}\n`;
        this.logElement.textContent += logLine;
        this.logElement.scrollTop = this.logElement.scrollHeight;
    }

    clear() {
        this.logs = [];
        if (this.logElement) {
            this.logElement.textContent = '';
        }
    }

    getLogs(level = null) {
        if (!level) return this.logs;
        return this.logs.filter(log => log.level === level);
    }

    exportLogs() {
        const logText = this.logs.map(log => 
            `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
        ).join('\n');
        
        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ant-receiver-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Convenience methods
    info(message) { this.log(message, 'info'); }
    warn(message) { this.log(message, 'warn'); }
    error(message) { this.log(message, 'error'); }
    debug(message) { this.log(message, 'debug'); }
}

// Create global logger instance
export const logger = new Logger();
