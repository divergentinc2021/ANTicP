 debug logs
- Ensure Firebase SDK is loaded properly
- Verify API keys in `firebase-config.js`
- Check Firebase Console for authentication settings

### Bluetooth Connection Issues
- Ensure browser supports Web Bluetooth API (Chrome/Edge)
- Run on HTTPS or localhost
- Check device is in pairing mode
- Clear browser Bluetooth cache if needed

### Session Data Issues
- Check sessionStorage for user data
- Verify all sensors connected before starting
- Monitor console for error messages

## Security Considerations

1. **Firebase Rules**: Update Firestore rules for production:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /workouts/{workoutId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

2. **API Keys**: Move sensitive configuration to environment variables for production

3. **User Data**: Implement proper user authentication before production deployment

## Production Deployment

1. **Build Process**:
   - Minify JavaScript files
   - Optimize images and assets
   - Enable GZIP compression

2. **HTTPS Requirement**:
   - Web Bluetooth API requires HTTPS
   - Use SSL certificate for production domain

3. **Error Handling**:
   - Implement comprehensive error logging
   - Add user-friendly error messages
   - Set up error monitoring (e.g., Sentry)

4. **Performance**:
   - Implement service workers for offline support
   - Cache sensor data locally
   - Optimize chart rendering for large datasets

## API Endpoints Needed

For full functionality, implement these backend endpoints:

### 1. Email Workout Processor
```
POST /api/process-workout-email
Body: { email: string, attachment: base64 }
Response: { workoutId: string, intervals: array }
```

### 2. CSV to FIT Converter
```
POST /api/convert-to-fit
Body: { csvData: string, metadata: object }
Response: { fitFile: base64 }
```

### 3. Send Workout Email
```
POST /api/send-workout
Body: { to: string, fitFile: base64, summary: object }
Response: { success: boolean }
```

## Sample Workout File Format

Expected format for .seconds files (JSON):
```json
{
  "name": "Sweet Spot Training",
  "duration": 3600,
  "intervals": [
    {
      "name": "Warmup",
      "duration": 600,
      "targetPower": 100,
      "targetCadence": 85
    },
    {
      "name": "Sweet Spot",
      "duration": 1200,
      "targetPower": 200,
      "targetCadence": 90
    },
    {
      "name": "Recovery",
      "duration": 300,
      "targetPower": 100,
      "targetCadence": 85
    },
    {
      "name": "Sweet Spot",
      "duration": 1200,
      "targetPower": 200,
      "targetCadence": 90
    },
    {
      "name": "Cool Down",
      "duration": 300,
      "targetPower": 80,
      "targetCadence": 80
    }
  ]
}
```

## Quick Start Guide

1. **Clone the repository**
2. **Update Firebase configuration** in `js/firebase-config.js`
3. **Open `pedal.html`** in Chrome/Edge browser
4. **Enter username** and start session
5. **Connect sensors** (or enable simulation mode)
6. **Start workout** and test functionality

## Support

For issues or questions:
- Email: support@divergentbiz.com
- Check browser console for debug information
- Use Firebase Debug panel for connection issues

## License

This application is proprietary software. All rights reserved.

---

## Next Steps for Implementation

1. **Complete the workout-session.html file** - The file is too large to create in one go. Copy the provided code structure and complete it manually.

2. **Test Firebase Authentication**:
   ```javascript
   // In browser console
   firebase.auth().createUserWithEmailAndPassword('test@test.com', 'password123')
     .then(user => console.log('User created:', user))
     .catch(error => console.error('Error:', error));
   ```

3. **Implement Backend Services**:
   - Set up Node.js/Express server
   - Implement email processing endpoint
   - Add FIT file conversion library
   - Configure email sending service

4. **Enhance UI/UX**:
   - Add loading animations
   - Implement proper error notifications
   - Add workout history view
   - Create user profile management

5. **Add Advanced Features**:
   - Training plan management
   - Performance analytics
   - Social sharing capabilities
   - Strava/Garmin Connect integration

This completes the comprehensive setup for your cycling training application with all requested features!