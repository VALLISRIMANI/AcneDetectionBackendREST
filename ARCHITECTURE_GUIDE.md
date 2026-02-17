# Multi-Area Prediction Session Architecture Guide

## System Architecture Before & After

### BEFORE: Independent Predictions
```
┌─────────────────────────────────────────────────────────┐
│                     Frontend                             │
│  [Upload Image] → [Upload Image] → [Upload Image]...    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
        POST /api/prediction/upload
                       │
     ┌─────────────────┼─────────────────┐
     │                 │                 │
     ▼                 ▼                 ▼
ImagePrediction   ImagePrediction   ImagePrediction
(Forehead)        (Cheeks)          (Chin)
- userId          - userId          - userId
- faceArea        - faceArea        - faceArea
- mlPrediction    - mlPrediction    - mlPrediction
- severityScore   - severityScore   - severityScore

❌ Problem: No logical grouping
❌ Treatment plan can't correlate uploads
❌ No session lifecycle management
```

### AFTER: Session-Based Grouping
```
┌──────────────────────────────────────────────────────────────┐
│                       Frontend                                │
│  [Start Session] → [Upload Image] → [Upload Image] → [Done]   │
└────────────────┬────────────────────────────────┬─────────────┘
                 │                                │
    POST /start-session                 POST /upload
                 │                                │
                 ▼                                ▼
         PredictionSession ◄──────────────────────
         ┌─────────────────┐
         │ userId          │
         │ status: progress│
         │ predictions:[]  ◄──────┐
         └─────────────────┘      │
              │                   │
    ┌─────────┼─────────┬─────────┤
    │         │         │         │
    ▼         ▼         ▼         ▼
ImagePred ImagePred ImagePred ImagePred
(Forehead)(Cheeks) (Chin)   (Full)
sessionId sessionId sessionId sessionId
- userId  - userId  - userId  - userId
- faceArea- faceArea- faceArea- faceArea
- score   - score   - score   - score

✅ All predictions logically grouped
✅ Treatment plan can use all data
✅ Session lifecycle tracked (in_progress → completed)
✅ Scalable for future enhancements
```

## Data Flow Diagram

```
FRONTEND                          BACKEND
═════════════════════════════════════════════════════════════════

1. User Starts Prediction
   POST /start-session ────────────────→ Create PredictionSession
   (JWT Token)                           with status: "in_progress"
                                         ↓
                                         Return { _id, status }
                       ◄──────────────── 
                       { sessionId }


2. User Uploads Forehead Image
   POST /upload ──────────────────→ Validate sessionId
   (file, faceArea, sessionId)      ↓
   (JWT Token)                      Check session exists
                                    ↓
                                    Check session status
                                    ↓
                                    Send to ML API
                                    ↓
                                    Calculate Severity
                                    ↓
                                    Create ImagePrediction
                                    ↓
                                    Update Session.predictions.push()
                       ◄──────────── 
                    { prediction }


3. User Uploads Cheeks Image
   POST /upload ──────────────────→ (Repeat upload process)
   (file, faceArea, sessionId)
   (JWT Token)
                       ◄──────────── 
                    { prediction }


4. User Uploads Chin Image
   POST /upload ──────────────────→ (Repeat upload process)
   (file, faceArea, sessionId)
   (JWT Token)
                       ◄──────────── 
                    { prediction }


5. User Completes Session
   PATCH /sessions/:sessionId/complete
   (JWT Token)         ────────────→ Update session.status
                                    = "completed"
                       ◄──────────── 
                    { session }


6. Frontend Displays Results
   GET /history ─────────────────→ Return all predictions with
   (JWT Token)                     populated sessionId ↓
                       ◄──────────── 
                    { predictions with session info }

   OR

   GET /sessions ────────────────→ Return all sessions with
   (JWT Token)                    nested predictions array ↓
                       ◄──────────── 
                    { sessions with predictions }
```

## Database Schema Relationships

```
┌──────────────────────┐
│       User           │
│                      │
│  _id                 │
│  email               │
│  username            │
│  password            │
│  isVerified          │
└──────────────────────┘
         ▲              ▲
         │              │
         │ refs         │ refs
         │              │
    ┌────┴──────────────┴──────────────┐
    │                                   │
    ▼                                   ▼
┌──────────────────────────┐   ┌─────────────────────────┐
│  PredictionSession       │   │   ImagePrediction       │
│                          │   │                         │
│  _id                     │   │  _id                    │
│  userId ─────────────────┼───┼──→ userId              │
│  status (in_progress|    │   │  predictionSessionId ──→
│           completed)     │   │  imageUrl               │
│  predictions[] ─────────→┼───┼──→ _id (ref back)      │
│  createdAt               │   │  faceArea               │
│  updatedAt               │   │  mlPrediction           │
└──────────────────────────┘   │  confidence             │
                                │  severityScore          │
                                │  createdAt              │
                                │  updatedAt              │
                                └─────────────────────────┘

Relationships:
- 1 User → N PredictionSessions (1-to-Many)
- 1 User → N ImagePredictions (1-to-Many)
- 1 PredictionSession → N ImagePredictions (1-to-Many)
```

## API Endpoint Tree

```
/api/prediction
│
├── POST   /start-session
│          Create new PredictionSession
│          ├─ Auth: Required ✅
│          ├─ Body: {} (empty)
│          └─ Returns: { _id, userId, status, predictions }
│
├── POST   /upload
│          Add image to existing session
│          ├─ Auth: Required ✅
│          ├─ Body: multipart
│          │   ├─ image (file)
│          │   ├─ faceArea (string)
│          │   └─ predictionSessionId (string) [REQUIRED]
│          └─ Returns: ImagePrediction with sessionId
│
├── GET    /history
│          Get all predictions (with populated session info)
│          ├─ Auth: Required ✅
│          ├─ Body: None
│          └─ Returns: [ImagePrediction] (sorted newest first)
│
├── GET    /sessions
│          Get all sessions with nested predictions
│          ├─ Auth: Required ✅
│          ├─ Body: None
│          └─ Returns: [PredictionSession] with .predictions []
│
└── PATCH  /sessions/:sessionId/complete
           Mark session as completed
           ├─ Auth: Required ✅
           ├─ Body: {} (empty)
           └─ Returns: PredictionSession with status: completed
```

## State Machine Diagram

```
                    ┌─────────────────────────┐
                    │  start-session endpoint │
                    │   (creates session)     │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  PredictionSession       │
        ┌──────────→│  status: "in_progress"  │◄────────────┐
        │           │  predictions: []        │             │
        │           └──────────────────────────┘             │
        │                    ▲    │                         │
        │                    │    │                         │
        │      MAX 5 per day │    └─ Can accept uploads    │
        │      in calendar   │                              │
        │      day (rate     │                              │
        │      limit check)  │                              │
        │                    │                              │
        │ ┌──────────────────┴─────────────────────┐        │
        │ │  POST /upload                          │        │
        │ │  - Validate sessionId                  │        │
        │ │  - Check session status is in_progress │        │
        │ │  - Check rate limit (5 per day)        │────────┤
        │ │  - Upload to ML API                    │        │
        │ │  - Create ImagePrediction              │        │
        │ │  - Push to session.predictions         │        │
        │ └──────────────────┬─────────────────────┘        │
        │                    │                              │
        │                    ▼                              │
        └─ Error: Session   More uploads?                   │
           completed        │                              │
           or not owned      ├─ Yes ──────────────────────┘
           by user           │
                             └─ No↓
                        ┌─────────────────────────┐
                        │  complete endpoint      │
                        │  (marks as completed)   │
                        └────────────┬────────────┘
                                     │
                                     ▼
                        ┌──────────────────────────┐
                        │  PredictionSession       │
                        │  status: "completed"    │
                        │  predictions: [...]     │──→ Ready for
                        │                         │   treatment plan
                        └──────────────────────────┘   generation
```

## Request/Response Flow Example

```
USER UPLOADS 4 FACE AREAS IN ONE SESSION
══════════════════════════════════════════

REQUEST 1: POST /start-session
────────────────────────────────
Headers:
  Authorization: Bearer eyJhbGc...
  Content-Type: application/json

Body:
  {}

RESPONSE 1: 201 Created
────────────────────────
{
  "success": true,
  "message": "Prediction session started",
  "data": {
    "_id": "65a8f2c1d9e4b5a2c1d2e3f4",    ◄─── SAVE THIS
    "userId": "65a8e1b0c9d3a2f1e5c6b7a8",
    "status": "in_progress",
    "predictions": [],
    "createdAt": "2025-02-17T10:30:00Z",
    "updatedAt": "2025-02-17T10:30:00Z"
  }
}


REQUEST 2: POST /upload (Forehead)
───────────────────────────────────
Headers:
  Authorization: Bearer eyJhbGc...
  Content-Type: multipart/form-data

Body (Form Data):
  image: [FILE: forehead.jpg]
  faceArea: "forehead"
  predictionSessionId: "65a8f2c1d9e4b5a2c1d2e3f4"

RESPONSE 2: 200 OK
──────────────────
{
  "success": true,
  "message": "Prediction saved",
  "data": {
    "_id": "65a8f2c2d9e4b5a2c1d2e3f5",
    "userId": "65a8e1b0c9d3a2f1e5c6b7a8",
    "predictionSessionId": "65a8f2c1d9e4b5a2c1d2e3f4",
    "imageUrl": "https://cloudinary.com/...",
    "faceArea": "forehead",
    "mlPrediction": "moderate",
    "confidence": 0.87,
    "severityScore": 65,
    "finalSeverity": "moderate",
    "createdAt": "2025-02-17T10:35:00Z"
  }
}
  ▼ [Session auto-updated in background]
  Session.predictions now = ["65a8f2c2..."]


REQUEST 3: POST /upload (Cheeks)
─────────────────────────────────
[Same structure, different image and faceArea]
predictionSessionId: "65a8f2c1d9e4b5a2c1d2e3f4"  ◄─── SAME SESSION
faceArea: "cheeks"

RESPONSE 3: 200 OK
──────────────────
[Returns new ImagePrediction with same sessionId]
  ▼ [Session.predictions now has 2 items]


REQUEST 4: POST /upload (Chin)
───────────────────────────────
predictionSessionId: "65a8f2c1d9e4b5a2c1d2e3f4"  ◄─── SAME SESSION
faceArea: "chin"

RESPONSE 4: 200 OK
──────────────────
[Returns new ImagePrediction]
  ▼ [Session.predictions now has 3 items]


REQUEST 5: POST /upload (Full Face)
────────────────────────────────────
predictionSessionId: "65a8f2c1d9e4b5a2c1d2e3f4"  ◄─── SAME SESSION
faceArea: "full_face"

RESPONSE 5: 200 OK
──────────────────
[Returns new ImagePrediction]
  ▼ [Session.predictions now has 4 items]


REQUEST 6: PATCH /sessions/65a8f2c1d9e4b5a2c1d2e3f4/complete
──────────────────────────────────────────────────────────────
Headers:
  Authorization: Bearer eyJhbGc...
  Content-Type: application/json

Body:
  {}

RESPONSE 6: 200 OK
──────────────────
{
  "success": true,
  "message": "Prediction session completed",
  "data": {
    "_id": "65a8f2c1d9e4b5a2c1d2e3f4",
    "userId": "65a8e1b0c9d3a2f1e5c6b7a8",
    "status": "completed",    ◄─── CHANGED FROM in_progress
    "predictions": [
      "65a8f2c2d9e4b5a2c1d2e3f5",
      "65a8f2c3d9e4b5a2c1d2e3f6",
      "65a8f2c4d9e4b5a2c1d2e3f7",
      "65a8f2c5d9e4b5a2c1d2e3f8"
    ],
    "createdAt": "2025-02-17T10:30:00Z",
    "updatedAt": "2025-02-17T10:50:00Z"
  }
}


REQUEST 7: GET /sessions
────────────────────────
Headers:
  Authorization: Bearer eyJhbGc...

RESPONSE 7: 200 OK
──────────────────
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
          "severityScore": 65
        },
        {
          "_id": "65a8f2c3d9e4b5a2c1d2e3f6",
          "faceArea": "cheeks",
          "mlPrediction": "severe",
          "severityScore": 78         ◄─── HIGHEST
        },
        {
          "_id": "65a8f2c4d9e4b5a2c1d2e3f7",
          "faceArea": "chin",
          "mlPrediction": "mild",
          "severityScore": 45
        },
        {
          "_id": "65a8f2c5d9e4b5a2c1d2e3f8",
          "faceArea": "full_face",
          "mlPrediction": "moderate",
          "severityScore": 72
        }
      ],
      "createdAt": "2025-02-17T10:30:00Z",
      "updatedAt": "2025-02-17T10:50:00Z"
    }
  ]
}

═════════════════════════════════════════════════════════════════

TREATMENT PLAN GENERATION (Future Endpoint)
────────────────────────────────────────────

POST /treatment/generate
Headers:
  Authorization: Bearer eyJhbGc...

Body:
  {
    "predictionSessionId": "65a8f2c1d9e4b5a2c1d2e3f4"
  }

LOGIC:
  1. Fetch session with .populate('predictions')
  2. Get all 4 predictions from session.predictions
  3. Calculate combined severity:
     - Highest: 78 (cheeks)
     - Average: (65 + 78 + 45 + 72) / 4 = 65
     - Weighted: Consider multiple affected areas
  4. Fetch user's AcneProfile
  5. Generate treatment plan using:
     ├─ Highest severity (78)
     ├─ All predictions (not just one)
     ├─ Affected areas (forehead, cheeks, chin)
     └─ User profile (allergies, preferences, etc.)
  6. Return comprehensive treatment plan
```

## Advantages of Session-Based Approach

| Aspect | Before | After |
|--------|--------|-------|
| **Data Grouping** | ❌ Disconnected | ✅ Logical sessions |
| **Treatment Planning** | ❌ Can only use 1 image | ✅ Uses all 4 areas |
| **Severity Calculation** | ❌ Per-image only | ✅ Can use combined |
| **User Experience** | ❌ No upload grouping | ✅ Clear session flow |
| **Analytics** | ❌ Hard to track cohort | ✅ Easy session grouping |
| **Scalability** | ❌ Difficult to extend | ✅ Ready for future features |
| **Audit Trail** | ❌ Disconnected records | ✅ Complete session history |

## Performance Considerations

```
Database Indexes:
─────────────────
PredictionSession:
  └─ userId (lookup sessions by user: O(log n))

ImagePrediction:
  ├─ userId (filter predictions by user: O(log n))
  └─ predictionSessionId (link to session: O(log n))

Query Performance:
──────────────────
GET /sessions ─→ 1 query (PredictionSession)
                → N queries (populate predictions)  [Mitigated by populate()]
                → Total: 1-2 DB round trips

GET /history ──→ 1 query (ImagePrediction)
                → 1 query (populate sessionId)      [Automatic by populate()]
                → Total: 1 DB round trip
```

---

This architecture provides a clean, scalable foundation for multi-area acne analysis.
