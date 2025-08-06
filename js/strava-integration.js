// Strava Integration Manager
// Professional Strava API integration for cycling training app

class StravaManager {
    constructor(firebaseManager) {
        this.firebaseManager = firebaseManager;
        this.clientId = 'your-strava-client-id'; // Replace with your Strava app client ID
        this.clientSecret = 'your-strava-client-secret'; // Replace with your client secret
        this.redirectUri = window.location.origin + '/strava-callback';
        this.baseUrl = 'https://www.strava.com/api/v3';
        this.authUrl = 'https://www.strava.com/oauth/authorize';
        this.tokenUrl = 'https://www.strava.com/oauth/token';
        
        this.isConnected = false;
        this.athleteData = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.expiresAt = null;
    }

    // OAuth Authentication Flow
    async connect() {
        try {
            // Check if already connected
            const tokens = await this.firebaseManager.getStravaTokens();
            if (tokens && tokens.connected) {
                await this.loadTokens(tokens);
                if (await this.validateToken()) {
                    console.log('✅ Strava already connected');
                    return true;
                }
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
                window.addEventListener('message', async (event) => {
                    if (event.origin !== window.location.origin) return;
                    
                    if (event.data.type === 'strava-callback') {
                        clearInterval(checkClosed);
                        popup.close();
                        
                        try {
                            await this.handleCallback(event.data);
                            resolve(true);
                        } catch (error) {
                            reject(error);
                        }
                    }
                });
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
        await this.firebaseManager.saveStravaTokens(tokens);
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
            await this.firebaseManager.removeStravaTokens();
            
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

    // Activity Upload
    async uploadActivity(sessionData) {
        try {
            if (!this.isConnected || !await this.validateToken()) {
                throw new Error('Not connected to Strava');
            }

            // Check if already uploaded
            if (sessionData.stravaId) {
                console.log('Session already uploaded to Strava:', sessionData.stravaId);
                return sessionData.stravaId;
            }

            // Convert session to Strava activity format
            const activityData = this.convertToStravaActivity(sessionData);
            
            // Upload activity
            const response = await fetch(`${this.baseUrl}/activities`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(activityData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Activity upload failed: ${errorData.message || response.statusText}`);
            }

            const uploadedActivity = await response.json();
            
            // Update session with Strava ID
            await this.firebaseManager.updateSessionWithStravaId(sessionData.id, uploadedActivity.id);
            
            console.log('✅ Activity uploaded to Strava:', uploadedActivity.id);
            return uploadedActivity.id;
            
        } catch (error) {
            console.error('❌ Strava activity upload failed:', error);
            throw error;
        }
    }

    convertToStravaActivity(sessionData) {
        const metrics = sessionData.metrics || {};
        const startTime = new Date(sessionData.startTime);
        
        // Map session types to Strava activity types
        const activityTypeMap = {
            'endurance': 'Ride',
            'intervals': 'Workout',
            'recovery': 'Ride',
            'custom': 'VirtualRide'
        };

        const activityData = {
            name: this.generateActivityName(sessionData),
            type: activityTypeMap[sessionData.type] || 'VirtualRide',
            start_date_local: startTime.toISOString(),
            elapsed_time: Math.round(metrics.duration || 0),
            distance: Math.round((metrics.distance || 0) * 1000), // Convert km to meters
            description: this.generateActivityDescription(sessionData),
            trainer: true,
            commute: false
        };

        // Add optional fields if available
        if (metrics.totalEnergy > 0) {
            activityData.calories = Math.round(metrics.totalEnergy * 4.184); // Convert kJ to calories
        }

        if (metrics.avgPower > 0) {
            activityData.average_watts = metrics.avgPower;
        }

        if (metrics.maxPower > 0) {
            activityData.max_watts = metrics.maxPower;
        }

        if (metrics.avgHeartRate > 0) {
            activityData.average_heartrate = metrics.avgHeartRate;
        }

        if (metrics.maxHeartRate > 0) {
            activityData.max_heartrate = metrics.maxHeartRate;
        }

        if (metrics.avgCadence > 0) {
            activityData.average_cadence = metrics.avgCadence;
        }

        return activityData;
    }

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

    generateActivityDescription(sessionData) {
        const metrics = sessionData.metrics || {};
        const duration = Math.round((metrics.duration || 0) / 60);
        
        let description = `Indoor cycling session via CycleTracker Pro\n\n`;
        
        if (duration > 0) description += `Duration: ${duration} min\n`;
        if (metrics.distance > 0) description += `Distance: ${metrics.distance.toFixed(1)} km\n`;
        if (metrics.avgPower > 0) description += `Avg Power: ${metrics.avgPower}W\n`;
        if (metrics.maxPower > 0) description += `Max Power: ${metrics.maxPower}W\n`;
        if (metrics.normalizedPower > 0) description += `Normalized Power: ${metrics.normalizedPower}W\n`;
        if (metrics.intensityFactor > 0) description += `Intensity Factor: ${metrics.intensityFactor}\n`;
        if (metrics.trainingStressScore > 0) description += `Training Stress Score: ${metrics.trainingStressScore}\n`;
        if (metrics.avgHeartRate > 0) description += `Avg Heart Rate: ${metrics.avgHeartRate} bpm\n`;
        if (metrics.totalEnergy > 0) description += `Total Energy: ${metrics.totalEnergy} kJ\n`;

        // Add power zones if available
        if (sessionData.powerZones) {
            description += `\nPower Zones:\n`;
            const zones = sessionData.powerZones;
            Object.keys(zones).forEach((zone, index) => {
                const time = Math.round(zones[zone] / 60);
                if (time > 0) {
                    description += `Zone ${index + 1}: ${time} min\n`;
                }
            });
        }

        return description.trim();
    }

    // Utility Methods
    generateState() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }

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

    async getRecentActivities(limit = 10) {
        try {
            if (!this.isConnected || !await this.validateToken()) {
                throw new Error('Not connected to Strava');
            }

            const response = await fetch(`${this.baseUrl}/athlete/activities?per_page=${limit}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get activities: ${response.statusText}`);
            }

            return await response.json();
            
        } catch (error) {
            console.error('❌ Failed to get recent activities:', error);
            throw error;
        }
    }

    isConnected() {
        return this.isConnected;
    }

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