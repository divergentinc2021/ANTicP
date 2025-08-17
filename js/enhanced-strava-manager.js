/**
 * Enhanced Strava Manager with FIT File Support
 * Handles OAuth, activity uploads, and FIT file generation
 */

import { FitFileConverter } from './utils/fit-file-converter.js';

export class EnhancedStravaManager {
    constructor(firebaseManager) {
        this.firebaseManager = firebaseManager;
        this.fitConverter = new FitFileConverter();
        
        // Strava API configuration
        this.clientId = 'your-strava-client-id'; // Replace with your Strava app client ID
        this.clientSecret = 'your-strava-client-secret'; // Replace with your client secret
        this.redirectUri = window.location.origin + '/strava-callback';
        this.baseUrl = 'https://www.strava.com/api/v3';
        this.authUrl = 'https://www.strava.com/oauth/authorize';
        this.tokenUrl = 'https://www.strava.com/oauth/token';
        this.uploadUrl = 'https://www.strava.com/api/v3/uploads';
        
        this.isConnected = false;
        this.athleteData = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.expiresAt = null;
    }

    /**
     * Initialize the manager
     */
    async initialize() {
        try {
            // Check for existing tokens
            const tokens = await this.firebaseManager?.getStravaTokens();
            if (tokens && tokens.connected) {
                await this.loadTokens(tokens);
                if (await this.validateToken()) {
                    console.log('✅ Strava already connected');
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('❌ Strava initialization failed:', error);
            return false;
        }
    }

    /**
     * OAuth Authentication Flow
     */
    async connect() {
        try {
            // Check if already connected
            if (this.isConnected && await this.validateToken()) {
                console.log('✅ Already connected to Strava');
                return true;
            }

            // Start OAuth flow
            const scope = 'read,activity:read,activity:write';
            const state = this.generateState();
            
            // Store state for validation
            sessionStorage.setItem('strava_oauth_state', state);
            
            const authUrl = `${this.authUrl}?` +
                `client_id=${this.clientId}&` +
                `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
                `response_type=code&` +
                `approval_prompt=force&` +
                `scope=${scope}&` +
                `state=${state}`;
            
            // Open OAuth popup
            const popup = window.open(authUrl, 'strava-auth', 'width=600,height=600');
            
            // Wait for callback
            return new Promise((resolve, reject) => {
                const checkClosed = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkClosed);
                        reject(new Error('Authorization cancelled'));
                    }
                }, 1000);

                // Listen for callback
                const messageHandler = async (event) => {
                    if (event.origin !== window.location.origin) return;
                    
                    if (event.data.type === 'strava-callback') {
                        clearInterval(checkClosed);
                        popup.close();
                        window.removeEventListener('message', messageHandler);
                        
                        try {
                            await this.handleCallback(event.data);
                            resolve(true);
                        } catch (error) {
                            reject(error);
                        }
                    }
                };
                
                window.addEventListener('message', messageHandler);
            });
            
        } catch (error) {
            console.error('❌ Strava connection failed:', error);
            throw error;
        }
    }

    async handleCallback(data) {
        try {
            if (data.error) {
                throw new Error(`Strava authorization failed: ${data.error}`);
            }

            // Validate state
            const storedState = sessionStorage.getItem('strava_oauth_state');
            if (data.state !== storedState) {
                throw new Error('Invalid OAuth state');
            }
            
            sessionStorage.removeItem('strava_oauth_state');

            // Exchange code for tokens
            const tokenResponse = await fetch(this.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    code: data.code,
                    grant_type: 'authorization_code'
                })
            });

            if (!tokenResponse.ok) {
                throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
            }

            const tokenData = await tokenResponse.json();
            
            // Store tokens
            await this.saveTokens({
                athleteId: tokenData.athlete.id,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresAt: tokenData.expires_at * 1000 // Convert to milliseconds
            });

            this.athleteData = tokenData.athlete;
            console.log('✅ Strava connected successfully:', tokenData.athlete.username);
            
        } catch (error) {
            console.error('❌ Strava callback handling failed:', error);
            throw error;
        }
    }

    async loadTokens(tokens) {
        this.accessToken = tokens.accessToken;
        this.refreshToken = tokens.refreshToken;
        this.expiresAt = tokens.expiresAt;
        this.isConnected = tokens.connected;
    }

    async saveTokens(tokens) {
        if (this.firebaseManager) {
            await this.firebaseManager.saveStravaTokens(tokens);
        }
        await this.loadTokens({ ...tokens, connected: true });
    }

    async disconnect() {
        try {
            // Revoke token on Strava
            if (this.accessToken) {
                await fetch(`${this.tokenUrl}/deauthorize`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            }

            // Remove tokens from Firebase
            if (this.firebaseManager) {
                await this.firebaseManager.removeStravaTokens();
            }
            
            // Clear local state
            this.isConnected = false;
            this.athleteData = null;
            this.accessToken = null;
            this.refreshToken = null;
            this.expiresAt = null;
            
            console.log('✅ Strava disconnected successfully');
            
        } catch (error) {
            console.error('❌ Strava disconnect failed:', error);
            throw error;
        }
    }

    // Token Management
    async validateToken() {
        if (!this.accessToken) return false;
        
        if (this.expiresAt && Date.now() >= this.expiresAt) {
            return await this.refreshAccessToken();
        }
        
        return true;
    }

    async refreshAccessToken() {
        try {
            if (!this.refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await fetch(this.tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken
                })
            });

            if (!response.ok) {
                throw new Error(`Token refresh failed: ${response.statusText}`);
            }

            const tokenData = await response.json();
            
            // Update tokens
            await this.saveTokens({
                athleteId: this.athleteData?.id,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresAt: tokenData.expires_at * 1000
            });

            console.log('✅ Strava token refreshed');
            return true;
            
        } catch (error) {
            console.error('❌ Token refresh failed:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Upload activity as FIT file to Strava
     */
    async uploadActivityAsFIT(sessionData) {
        try {
            if (!this.isConnected || !await this.validateToken()) {
                throw new Error('Not connected to Strava');
            }

            // Check if already uploaded
            if (sessionData.stravaId) {
                console.log('Session already uploaded to Strava:', sessionData.stravaId);
                return sessionData.stravaId;
            }

            // Convert session to FIT format
            console.log('Converting session to FIT format...');
            const fitBuffer = this.fitConverter.convertToFIT(sessionData);
            
            // Create form data for upload
            const formData = new FormData();
            const fitBlob = new Blob([fitBuffer], { type: 'application/octet-stream' });
            formData.append('file', fitBlob, `workout_${Date.now()}.fit`);
            formData.append('data_type', 'fit');
            formData.append('activity_type', 'ride');
            formData.append('name', this.generateActivityName(sessionData));
            formData.append('description', this.generateActivityDescription(sessionData));
            formData.append('trainer', '1');
            formData.append('commute', '0');
            formData.append('private', '0');
            
            // Upload to Strava
            console.log('Uploading FIT file to Strava...');
            const response = await fetch(this.uploadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Upload failed: ${errorData.error || response.statusText}`);
            }

            const uploadStatus = await response.json();
            console.log('Upload initiated:', uploadStatus);
            
            // Check upload status
            const activityId = await this.checkUploadStatus(uploadStatus.id);
            
            // Update session with Strava ID
            if (this.firebaseManager) {
                await this.firebaseManager.updateSessionWithStravaId(sessionData.id, activityId);
            }
            
            console.log('✅ Activity uploaded to Strava:', activityId);
            return activityId;
            
        } catch (error) {
            console.error('❌ Strava FIT upload failed:', error);
            throw error;
        }
    }

    /**
     * Check upload status and wait for completion
     */
    async checkUploadStatus(uploadId, maxAttempts = 30) {
        try {
            for (let i = 0; i < maxAttempts; i++) {
                const response = await fetch(`${this.uploadUrl}/${uploadId}`, {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Status check failed: ${response.statusText}`);
                }

                const status = await response.json();
                console.log(`Upload status: ${status.status}`);

                if (status.status === 'Your activity is ready.') {
                    return status.activity_id;
                } else if (status.error) {
                    throw new Error(`Upload error: ${status.error}`);
                }

                // Wait before checking again
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            throw new Error('Upload timeout - took too long to process');
            
        } catch (error) {
            console.error('❌ Upload status check failed:', error);
            throw error;
        }
    }

    /**
     * Upload CSV file as FIT to Strava
     */
    async uploadCSVAsFIT(csvData, sessionName = null) {
        try {
            if (!this.isConnected || !await this.validateToken()) {
                throw new Error('Not connected to Strava');
            }

            // Convert CSV to FIT
            console.log('Converting CSV to FIT format...');
            const fitBuffer = await this.fitConverter.convertCSVToFIT(csvData);
            
            // Create form data for upload
            const formData = new FormData();
            const fitBlob = new Blob([fitBuffer], { type: 'application/octet-stream' });
            const filename = sessionName || `workout_${Date.now()}.fit`;
            
            formData.append('file', fitBlob, filename);
            formData.append('data_type', 'fit');
            formData.append('activity_type', 'ride');
            formData.append('name', sessionName || 'Indoor Cycling');
            formData.append('description', 'Uploaded via Enhanced Cycling App');
            formData.append('trainer', '1');
            formData.append('commute', '0');
            formData.append('private', '0');
            
            // Upload to Strava
            console.log('Uploading FIT file to Strava...');
            const response = await fetch(this.uploadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Upload failed: ${errorData.error || response.statusText}`);
            }

            const uploadStatus = await response.json();
            console.log('Upload initiated:', uploadStatus);
            
            // Check upload status
            const activityId = await this.checkUploadStatus(uploadStatus.id);
            
            console.log('✅ CSV uploaded to Strava as FIT:', activityId);
            return activityId;
            
        } catch (error) {
            console.error('❌ CSV to FIT upload failed:', error);
            throw error;
        }
    }

    /**
     * Download FIT file locally
     */
    downloadFIT(sessionData, filename = null) {
        try {
            // Convert to FIT
            const fitBuffer = this.fitConverter.convertToFIT(sessionData);
            
            // Download file
            const name = filename || `workout_${Date.now()}.fit`;
            this.fitConverter.downloadFIT(fitBuffer, name);
            
            console.log('✅ FIT file downloaded:', name);
            return true;
            
        } catch (error) {
            console.error('❌ FIT download failed:', error);
            throw error;
        }
    }

    /**
     * Generate activity name
     */
    generateActivityName(sessionData) {
        const sessionNames = {
            'endurance': 'Endurance Training',
            'intervals': 'Interval Workout',
            'recovery': 'Recovery Ride',
            'custom': 'Indoor Training'
        };

        const baseName = sessionNames[sessionData.type] || 'Indoor Training';
        const date = new Date(sessionData.startTime);
        const dateStr = date.toLocaleDateString();
        
        return `${baseName} - ${dateStr}`;
    }

    /**
     * Generate activity description
     */
    generateActivityDescription(sessionData) {
        const metrics = sessionData.metrics || {};
        const duration = Math.round((metrics.duration || 0) / 60);
        
        let description = `Indoor cycling session via Enhanced Cycling App\n\n`;
        
        if (duration > 0) description += `Duration: ${duration} min\n`;
        if (metrics.distance > 0) description += `Distance: ${metrics.distance.toFixed(1)} km\n`;
        if (metrics.avgPower > 0) description += `Avg Power: ${metrics.avgPower}W\n`;
        if (metrics.maxPower > 0) description += `Max Power: ${metrics.maxPower}W\n`;
        if (metrics.normalizedPower > 0) description += `Normalized Power: ${metrics.normalizedPower}W\n`;
        if (metrics.intensityFactor > 0) description += `Intensity Factor: ${metrics.intensityFactor}\n`;
        if (metrics.trainingStressScore > 0) description += `TSS: ${metrics.trainingStressScore}\n`;
        if (metrics.avgHeartRate > 0) description += `Avg HR: ${metrics.avgHeartRate} bpm\n`;
        if (metrics.totalEnergy > 0) description += `Energy: ${metrics.totalEnergy} kJ\n`;

        return description.trim();
    }

    /**
     * Utility method to generate OAuth state
     */
    generateState() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }

    /**
     * Get athlete profile
     */
    async getAthleteProfile() {
        try {
            if (!this.isConnected || !await this.validateToken()) {
                throw new Error('Not connected to Strava');
            }

            const response = await fetch(`${this.baseUrl}/athlete`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get athlete profile: ${response.statusText}`);
            }

            const athlete = await response.json();
            this.athleteData = athlete;
            
            return athlete;
            
        } catch (error) {
            console.error('❌ Failed to get athlete profile:', error);
            throw error;
        }
    }

    /**
     * Check if connected to Strava
     */
    isConnectedToStrava() {
        return this.isConnected;
    }

    /**
     * Get athlete data
     */
    getAthleteData() {
        return this.athleteData;
    }
}

// Strava OAuth callback handler (for popup)
if (window.location.pathname === '/strava-callback') {
    // Extract parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    // Send data to parent window
    if (window.opener) {
        window.opener.postMessage({
            type: 'strava-callback',
            code: code,
            state: state,
            error: error
        }, window.location.origin);
        
        window.close();
    }
}
