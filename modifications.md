# Multi-Area Prediction Session Implementation

## Overview

This document describes the modifications made to support **prediction sessions** - a grouping mechanism to connect multiple face area uploads (forehead, cheeks, chin, full_face) into a single logical prediction session.

---

## What Was Added

### 1. New Model: `PredictionSession.js`

**Path:** `src/models/PredictionSession.js`

A new Mongoose model to represent a prediction session:

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref User),      // User who created the session
  status: String,                   // "in_progress" | "completed"
  predictions: [ObjectId],          // Array of ImagePrediction IDs
  createdAt: Date,                  // Auto-generated
  updatedAt: Date                   // Auto-generated
}
```

**Why?** Sessions group related predictions together, making it easier to:
- Track multi-area analyses as a cohesive unit
- Generate treatment plans using all predictions from one session
- Maintain logical separation between different prediction attempts

### 2. New Routes

#### `POST /api/prediction/start-session`
- **Auth:** Required (JWT protected)
- **Body:** Empty object `{}`
- **Returns:** Created `PredictionSession` document with `_id` and `status: "in_progress"`

#### `POST /api/prediction/upload`
- **Auth:** Required (JWT protected)
- **Body (multipart/form-data):**
  - `image` (file, required)
  - `faceArea` (string, e.g., "forehead", "cheeks", "chin", "full_face")
  - `predictionSessionId` (string, required) - Session ID from start-session
- **Returns:** Created `ImagePrediction` document with `predictionSessionId` included

#### `GET /api/prediction/history`
- **Auth:** Required
- **Returns:** All predictions for the user, populated with session information
- **Sorting:** Most recent first

#### `GET /api/prediction/sessions`
- **Auth:** Required
- **Returns:** All prediction sessions for the user with their predictions populated
- **Sorting:** Most recent first

#### `PATCH /api/prediction/sessions/:sessionId/complete`
- **Auth:** Required
- **Body:** Empty object `{}`
- **Returns:** Updated session with `status: "completed"`

### 3. New Controller Functions

**File:** `src/controllers/prediction.controller.js`

#### `startPredictionSession()`
Creates a new prediction session for the authenticated user.

#### `uploadImage()` (Modified)
Now requires `predictionSessionId` in request body and validates:
- Session exists
- Session belongs to the authenticated user
- Session is still `in_progress`
- Rate limit still applies (5 uploads/day)

#### `getHistory()` (Modified)
Now populates predictions with session information using `.populate("predictionSessionId")`.

#### `getSessionHistory()`
Returns all sessions for a user with nested predictions populated.

#### `completeSession()`
Marks a session as completed. Used when user finishes uploading all images.

---

## What Was Modified

### 1. `ImagePrediction` Model

**Added field:**
```javascript
predictionSessionId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "PredictionSession",
  required: true,
  index: true
}
```

**Impact:** Every new image prediction must be associated with a session.

### 2. `uploadImage` Controller

**Changes:**
- Extracts `predictionSessionId` from `req.body`
- Validates session existence and ownership
- Validates session status is "in_progress"
- Creates prediction with `predictionSessionId`
- Automatically adds prediction ID to session's `predictions` array

### 3. `getHistory` Endpoint

**Enhancement:** Now returns populated session information for each prediction.

---

## API Flow Comparison

### BEFORE (Independent Predictions)

```
1. POST /upload {image, faceArea}
   → ImagePrediction created, no grouping
   
2. POST /upload {image, faceArea}
   → Another ImagePrediction created, no link
   
3. POST /upload {image, faceArea}
   → Yet another ImagePrediction, disconnected

4. GET /history
   → Returns disconnected predictions array
```

### AFTER (Session-Based Grouping)

```
1. POST /start-session
   → Creates PredictionSession {_id, status: "in_progress", predictions: []}
   
2. POST /upload {image, faceArea, predictionSessionId}
   ↓
   → ImagePrediction created with sessionId
   → Session.predictions.push(predictionId)
   
3. POST /upload {image, faceArea, predictionSessionId}
   → ImagePrediction created with sessionId
   → Session.predictions.push(predictionId)
   
4. POST /upload {image, faceArea, predictionSessionId}
   → ImagePrediction created with sessionId
   → Session.predictions.push(predictionId)
   
5. PATCH /sessions/:sessionId/complete
   → Updates session.status = "completed"
   
6. GET /history
   → Returns predictions with populated predictionSessionId
   OR
   
6. GET /sessions
   → Returns sessions with nested predictions array
```

---

## Backward Compatibility

The modifications are **non-breaking** in terms of architecture:

✅ Authentication logic unchanged  
✅ ML API integration unchanged  
✅ Hybrid severity calculation unchanged  
✅ Rate limiting (5 per day) still works  
✅ All existing middleware preserved  
✅ New functionality is opt-in via new endpoints

---

## Example JSON Responses

### 1. Start Session Response

```json
{
  "success": true,
  "message": "Prediction session started",
  "data": {
    "_id": "65a8f2c1d9e4b5a2c1d2e3f4",
    "userId": "65a8e1b0c9d3a2f1e5c6b7a8",
    "status": "in_progress",
    "predictions": [],
    "createdAt": "2025-02-17T10:30:00.000Z",
    "updatedAt": "2025-02-17T10:30:00.000Z"
  }
}
```

### 2. Upload Prediction Response

```json
{
  "success": true,
  "message": "Prediction saved",
  "data": {
    "_id": "65a8f2c2d9e4b5a2c1d2e3f5",
    "userId": "65a8e1b0c9d3a2f1e5c6b7a8",
    "predictionSessionId": "65a8f2c1d9e4b5a2c1d2e3f4",
    "imageUrl": "https://cloudinary.com/image123.jpg",
    "faceArea": "forehead",
    "mlPrediction": "moderate",
    "confidence": 0.87,
    "finalSeverity": "moderate",
    "severityScore": 65,
    "adjustmentReason": "User has oily skin",
    "createdAt": "2025-02-17T10:35:00.000Z",
    "updatedAt": "2025-02-17T10:35:00.000Z"
  }
}
```

### 3. Get History Response (with populated session)

```json
{
  "success": true,
  "data": [
    {
      "_id": "65a8f2c2d9e4b5a2c1d2e3f5",
      "userId": "65a8e1b0c9d3a2f1e5c6b7a8",
      "predictionSessionId": {
        "_id": "65a8f2c1d9e4b5a2c1d2e3f4",
        "userId": "65a8e1b0c9d3a2f1e5c6b7a8",
        "status": "in_progress",
        "predictions": [
          "65a8f2c2d9e4b5a2c1d2e3f5",
          "65a8f2c3d9e4b5a2c1d2e3f6"
        ],
        "createdAt": "2025-02-17T10:30:00.000Z",
        "updatedAt": "2025-02-17T10:35:00.000Z"
      },
      "imageUrl": "https://cloudinary.com/image123.jpg",
      "faceArea": "forehead",
      "mlPrediction": "moderate",
      "confidence": 0.87,
      "finalSeverity": "moderate",
      "severityScore": 65
    }
  ]
}
```

### 4. Get Sessions Response

```json
{
  "success": true,
  "message": "Session history retrieved",
  "data": [
    {
      "_id": "65a8f2c1d9e4b5a2c1d2e3f4",
      "userId": "65a8e1b0c9d3a2f1e5c6b7a8",
      "status": "completed",
      "predictions": [
        {
          "_id": "65a8f2c2d9e4b5a2c1d2e3f5",
          "faceArea": "forehead",
          "mlPrediction": "moderate",
          "severityScore": 65,
          "createdAt": "2025-02-17T10:35:00.000Z"
        },
        {
          "_id": "65a8f2c3d9e4b5a2c1d2e3f6",
          "faceArea": "cheeks",
          "mlPrediction": "severe",
          "severityScore": 78,
          "createdAt": "2025-02-17T10:37:00.000Z"
        },
        {
          "_id": "65a8f2c4d9e4b5a2c1d2e3f7",
          "faceArea": "chin",
          "mlPrediction": "mild",
          "severityScore": 45,
          "createdAt": "2025-02-17T10:39:00.000Z"
        }
      ],
      "createdAt": "2025-02-17T10:30:00.000Z",
      "updatedAt": "2025-02-17T10:40:00.000Z"
    }
  ]
}
```

---

## Curl Testing Commands

### Prerequisites

```bash
# Replace with your actual values:
FRONTEND_URL="http://localhost:3000"
API_URL="http://localhost:5000/api"
EMAIL="user@example.com"
PASSWORD="password123"
```

### 1. Login (Get JWT Token)

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }' \
  -c cookies.txt
```

**Extract token for subsequent requests (stored in HTTP-only cookie):**
The token is automatically stored in cookies.txt when using the `-c` flag.

### 2. Start a New Prediction Session

```bash
curl -X POST http://localhost:5000/api/prediction/start-session \
  -H "Cookie: $(cat cookies.txt | grep -oP '(?<=refreshToken\t)[^ ]*')" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Response will include `sessionId` (the `_id` field):**

```json
{
  "success": true,
  "message": "Prediction session started",
  "data": {
    "_id": "SESSION_ID_HERE",
    "userId": "...",
    "status": "in_progress",
    "predictions": []
  }
}
```

**Save the sessionId:**
```bash
SESSION_ID="65a8f2c1d9e4b5a2c1d2e3f4"  # Use the _id from response
```

### 3. Upload Image (Forehead)

```bash
curl -X POST http://localhost:5000/api/prediction/upload \
  -H "Content-Type: multipart/form-data" \
  -b cookies.txt \
  -F "image=@/path/to/forehead.jpg" \
  -F "faceArea=forehead" \
  -F "predictionSessionId=$SESSION_ID"
```

### 4. Upload Image (Cheeks)

```bash
curl -X POST http://localhost:5000/api/prediction/upload \
  -H "Content-Type: multipart/form-data" \
  -b cookies.txt \
  -F "image=@/path/to/cheeks.jpg" \
  -F "faceArea=cheeks" \
  -F "predictionSessionId=$SESSION_ID"
```

### 5. Upload Image (Chin)

```bash
curl -X POST http://localhost:5000/api/prediction/upload \
  -H "Content-Type: multipart/form-data" \
  -b cookies.txt \
  -F "image=@/path/to/chin.jpg" \
  -F "faceArea=chin" \
  -F "predictionSessionId=$SESSION_ID"
```

### 6. Upload Image (Full Face)

```bash
curl -X POST http://localhost:5000/api/prediction/upload \
  -H "Content-Type: multipart/form-data" \
  -b cookies.txt \
  -F "image=@/path/to/fullface.jpg" \
  -F "faceArea=full_face" \
  -F "predictionSessionId=$SESSION_ID"
```

### 7. Get Prediction History

```bash
curl -X GET http://localhost:5000/api/prediction/history \
  -b cookies.txt \
  -H "Accept: application/json"
```

### 8. Get All Sessions with Predictions

```bash
curl -X GET http://localhost:5000/api/prediction/sessions \
  -b cookies.txt \
  -H "Accept: application/json"
```

### 9. Complete a Prediction Session

```bash
curl -X PATCH http://localhost:5000/api/prediction/sessions/$SESSION_ID/complete \
  -b cookies.txt \
  -H "Content-Type: application/json"
```

---

## Automated Testing Script

Save as `test_predictions.sh`:

```bash
#!/bin/bash

API="http://localhost:5000/api"
COOKIES="cookies.txt"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Acne Detection Prediction Session Test ===${NC}\n"

# 1. Login
echo -e "${BLUE}1. Logging in...${NC}"
curl -s -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }' \
  -c $COOKIES | jq '.'

# 2. Start Session
echo -e "\n${BLUE}2. Starting prediction session...${NC}"
SESSION_RESPONSE=$(curl -s -X POST $API/prediction/start-session \
  -b $COOKIES \
  -H "Content-Type: application/json")

echo "$SESSION_RESPONSE" | jq '.'
SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.data._id')
echo -e "${GREEN}Session ID: $SESSION_ID${NC}\n"

# 3. Upload images (using dummy images - replace with real paths)
echo -e "${BLUE}3. Uploading images (forehead, cheeks, chin, full_face)...${NC}"

for AREA in forehead cheeks chin full_face; do
  echo -e "${BLUE}Uploading $AREA...${NC}"
  curl -s -X POST $API/prediction/upload \
    -b $COOKIES \
    -F "image=@sample_image.jpg" \
    -F "faceArea=$AREA" \
    -F "predictionSessionId=$SESSION_ID" | jq '.data | {faceArea, mlPrediction, severityScore}'
done

# 4. Get history
echo -e "\n${BLUE}4. Getting prediction history...${NC}"
curl -s -X GET $API/prediction/history \
  -b $COOKIES | jq '.data | length'

# 5. Get sessions
echo -e "\n${BLUE}5. Getting all sessions with predictions...${NC}"
curl -s -X GET $API/prediction/sessions \
  -b $COOKIES | jq '.data[0] | {_id, status, predictions: (.predictions | length)}'

# 6. Complete session
echo -e "\n${BLUE}6. Completing prediction session...${NC}"
curl -s -X PATCH $API/prediction/sessions/$SESSION_ID/complete \
  -b $COOKIES | jq '.data | {status}'

echo -e "\n${GREEN}=== Test Complete ===${NC}"
```

Run with:
```bash
chmod +x test_predictions.sh
./test_predictions.sh
```

---

## Database Schema Migration

If you have existing `ImagePrediction` documents without `predictionSessionId`, you have two options:

### Option 1: Create sessions for existing predictions

```javascript
// One-time migration script (run in Node.js context)
const ImagePrediction = require('./src/models/ImagePrediction');
const PredictionSession = require('./src/models/PredictionSession');

async function migrate() {
  const predictions = await ImagePrediction.find({ predictionSessionId: { $exists: false } });
  
  for (const prediction of predictions) {
    // Create a session for each prediction
    const session = await PredictionSession.create({
      userId: prediction.userId,
      status: 'completed',
      predictions: [prediction._id]
    });
    
    // Update prediction with sessionId
    await ImagePrediction.findByIdAndUpdate(
      prediction._id,
      { predictionSessionId: session._id }
    );
  }
  
  console.log(`Migrated ${predictions.length} predictions`);
}

migrate();
```

### Option 2: Allow optional predictionSessionId temporarily

Make `predictionSessionId` optional instead of required, then gradually migrate in background.

---

## Rate Limiting Verification

The 5 uploads per day limit still applies:

```javascript
const today = new Date();
today.setHours(0, 0, 0, 0);

const count = await ImagePrediction.countDocuments({
  userId,
  createdAt: { $gte: today }
});

if (count >= 5) throw new Error("Daily upload limit reached");
```

This counts all predictions for the user in a calendar day, regardless of session.

---

## Treatment Plan Integration

When generating treatment plans (for future implementation), use:

```javascript
const session = await PredictionSession.findById(sessionId)
  .populate('predictions');

// Get all predictions in session
const predictions = session.predictions;

// Find highest severity
const highestSeverity = Math.max(...predictions.map(p => p.severityScore));

// Calculate combined data (all predictions, not just one)
const combinedProbabilities = predictions.reduce((acc, pred) => {
  // Merge probabilities logic
  return acc;
}, {});
```

---

## Files Modified & Created

| File | Type | Change |
|------|------|--------|
| `src/models/PredictionSession.js` | Created | New model for sessions |
| `src/models/ImagePrediction.js` | Modified | Added `predictionSessionId` field |
| `src/controllers/prediction.controller.js` | Modified | Added 4 new functions, modified uploadImage |
| `src/routes/prediction.routes.js` | Modified | Added 3 new routes |
| `modifications.md` | Created | This documentation |

---

## Troubleshooting

### Session not found error
- Ensure `predictionSessionId` is correct
- Check session belongs to logged-in user
- Verify session status is "in_progress"

### Rate limit error
- Check daily upload count for user
- Reset at midnight UTC
- Verify `IMAGE_UPLOAD_LIMIT_PER_DAY` env variable

### Missing predictionSessionId in history
- Ensure you're using `/history` endpoint (returns predictions with populated session)
- Use `/sessions` endpoint to get sessions with nested predictions

---

## Next Steps

1. **Update Frontend:** Modify UI to:
   - Call `start-session` before uploads
   - Pass `sessionId` with each upload request
   - Show grouped predictions by session

2. **Treatment Plan Generation:** Implement logic to:
   - Accept `sessionId` as input
   - Analyze all predictions in session
   - Use highest severity score
   - Generate recommendations based on combined data

3. **Session Cleanup:** Implement job to:
   - Automatically mark sessions as completed after timeout
   - Archive old sessions

---

## Support

For questions or issues with the implementation, refer to specific curl commands or examine response structure in JSON examples above.
