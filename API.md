# AcneAI Backend API Documentation

## Table of Contents
1. [Authentication Endpoints](#authentication-endpoints)
2. [User Information Endpoints](#user-information-endpoints)
3. [Acne Analysis Endpoints](#acne-analysis-endpoints)
4. [Treatment Plan Endpoints](#treatment-plan-endpoints)
5. [System Endpoints](#system-endpoints)
6. [Error Response Codes](#error-response-codes)
7. [Project Flow Diagram](#project-flow-diagram)

---

## Authentication Endpoints

### 1. User Registration
**Endpoint:** `POST /api/auth/register`

**Description:** Register a new user account with validity checks. An OTP will be sent to the provided email.

**Rate Limit:** 50 requests per 15 minutes

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "retype_password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "message": "OTP sent to email"
}
```

**Error Responses:**
- **400 Bad Request:** Missing required fields
  ```json
  {
    "message": "All fields are required"
  }
  ```
- **400 Bad Request:** Passwords don't match
  ```json
  {
    "message": "Passwords do not match"
  }
  ```
- **400 Bad Request:** Password too short (minimum 8 characters)
  ```json
  {
    "message": "Password too short"
  }
  ```
- **409 Conflict:** Email or username already registered
  ```json
  {
    "message": "Email or username already registered"
  }
  ```
- **409 Conflict:** Account exists but not verified
  ```json
  {
    "message": "Account exists but not verified. Use resend OTP to verify."
  }
  ```
- **500 Internal Server Error:**
  ```json
  {
    "message": "Registration failed"
  }
  ```

---

### 2. Verify OTP
**Endpoint:** `POST /api/auth/verify-otp`

**Description:** Verify the OTP sent to user's email during registration.

**Rate Limit:** 50 requests per 15 minutes

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "message": "Account verified"
}
```

**Error Responses:**
- **400 Bad Request:** Missing email or OTP
  ```json
  {
    "message": "Email and OTP required"
  }
  ```
- **400 Bad Request:** Invalid or expired OTP
  ```json
  {
    "message": "Invalid OTP"
  }
  ```
- **400 Bad Request:** OTP expired
  ```json
  {
    "message": "OTP expired"
  }
  ```
- **500 Internal Server Error:**
  ```json
  {
    "message": "Verification failed"
  }
  ```

---

### 3. Resend OTP
**Endpoint:** `POST /api/auth/resend-otp`

**Description:** Resend OTP to the user's email if the previous one expired.

**Rate Limit:** 50 requests per 15 minutes

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "OTP resent"
}
```

**Error Responses:**
- **400 Bad Request:** Missing email
  ```json
  {
    "message": "Email required"
  }
  ```
- **400 Bad Request:** OTP still valid
  ```json
  {
    "message": "OTP still valid"
  }
  ```
- **409 Conflict:** Account already verified
  ```json
  {
    "message": "Account already verified"
  }
  ```
- **500 Internal Server Error:**
  ```json
  {
    "message": "Resend failed"
  }
  ```

---

### 4. Login
**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user and receive JWT token valid for 24 hours.

**Rate Limit:** 50 requests per 15 minutes

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- **400 Bad Request:** Missing credentials
  ```json
  {
    "message": "Email and password required"
  }
  ```
- **400 Bad Request:** Invalid credentials
  ```json
  {
    "message": "Invalid credentials"
  }
  ```
- **403 Forbidden:** Account not verified
  ```json
  {
    "message": "Verify account first"
  }
  ```
- **500 Internal Server Error:**
  ```json
  {
    "message": "Login failed"
  }
  ```

---

### 5. Forgot Password
**Endpoint:** `POST /api/auth/forgot-password`

**Description:** Request password reset by sending OTP to registered email.

**Rate Limit:** 50 requests per 15 minutes

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "If account exists, OTP sent"
}
```

**Error Responses:**
- **400 Bad Request:** Missing email
  ```json
  {
    "message": "Email required"
  }
  ```
- **500 Internal Server Error:**
  ```json
  {
    "message": "Failed to send reset OTP"
  }
  ```

---

### 6. Reset Password
**Endpoint:** `POST /api/auth/reset-password`

**Description:** Reset password using the OTP received in forgot password flow.

**Rate Limit:** 50 requests per 15 minutes

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456",
  "newPassword": "NewSecurePass123!",
  "retype_password": "NewSecurePass123!"
}
```

**Success Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

**Error Responses:**
- **400 Bad Request:** Missing required fields
  ```json
  {
    "message": "All fields are required"
  }
  ```
- **400 Bad Request:** Passwords don't match
  ```json
  {
    "message": "Passwords do not match"
  }
  ```
- **400 Bad Request:** Password too short
  ```json
  {
    "message": "Password too short"
  }
  ```
- **400 Bad Request:** Invalid or expired OTP
  ```json
  {
    "message": "Invalid OTP"
  }
  ```
- **500 Internal Server Error:**
  ```json
  {
    "message": "Reset failed"
  }
  ```

---

### 7. Get User Count
**Endpoint:** `GET /api/auth/users/count`

**Description:** Get total number of registered users (public endpoint).

**Rate Limit:** 100 requests per 15 minutes

**Success Response (200):**
```json
{
  "totalUsers": 150
}
```

**Error Responses:**
- **500 Internal Server Error:**
  ```json
  {
    "message": "Failed to fetch user count"
  }
  ```

---

## User Information Endpoints

### 1. Save User Questionnaire
**Endpoint:** `POST /api/auth/userinfo`

**Description:** Save user's health questionnaire responses. User must be authenticated. Can only be submitted once per user.

**Authentication:** Required (JWT Token in Authorization header)

**Rate Limit:** 100 requests per 15 minutes

**Request Body:**
```json
{
  "ageGroup": "18-25",
  "sex": "Male",
  "skinType": "Oily",
  "acneDuration": "2-3 months",
  "acneLocation": ["forehead", "chin"],
  "sensitiveSkin": "No",
  "medicationAllergy": "No",
  "allergyReactionTypes": [],
  "acneMedicationReaction": [],
  "usingAcneProducts": "Yes",
  "currentProducts": ["Salicylic acid face wash", "Benzoyl peroxide cream"],
  "stressLevel": "High",
  "sleepHours": "7",
  "dairyConsumption": "Moderate"
}
```

**Success Response (201):**
```json
{
  "message": "Questionnaire saved successfully",
  "questionnaire_id": "507f1f77bcf86cd799439011"
}
```

**Error Responses:**
- **401 Unauthorized:** Missing or invalid token
  ```json
  {
    "message": "Unauthorized: Invalid user context"
  }
  ```
- **409 Conflict:** Questionnaire already submitted
  ```json
  {
    "message": "Questionnaire already submitted"
  }
  ```
- **500 Internal Server Error:**
  ```json
  {
    "message": "Failed to save questionnaire"
  }
  ```

---

### 2. Get User Status
**Endpoint:** `GET /api/auth/user-status`

**Description:** Get user's completion status for questionnaire and acne analysis.

**Authentication:** Required (JWT Token in Authorization header)

**Rate Limit:** 100 requests per 15 minutes

**Success Response (200):**
```json
{
  "questionnaire_completed": true,
  "acne_analysis_completed": false,
  "both_completed": false,
  "next_step": "Upload acne images for analysis"
}
```

**Possible States:**
- Questionnaire not completed:
  ```json
  {
    "questionnaire_completed": false,
    "acne_analysis_completed": false,
    "both_completed": false,
    "next_step": "Complete the health questionnaire"
  }
  ```
- Both completed:
  ```json
  {
    "questionnaire_completed": true,
    "acne_analysis_completed": true,
    "both_completed": true,
    "next_step": "All steps completed - proceed to dashboard"
  }
  ```

**Error Responses:**
- **401 Unauthorized:** Missing or invalid token
  ```json
  {
    "message": "Unauthorized: Invalid user context"
  }
  ```
- **500 Internal Server Error:**
  ```json
  {
    "message": "Failed to fetch user status"
  }
  ```

---

## Acne Analysis Endpoints

### 1. Upload Acne Images
**Endpoint:** `POST /api/auth/upload-acne`

**Description:** Upload acne images from different face areas for ML analysis. Questionnaire must be completed first. Supports multiple body areas.

**Authentication:** Required (JWT Token in Authorization header)

**Rate Limit:** 100 requests per 15 minutes

**Request Format:** Multipart Form Data

**Supported Fields (Optional, at least 1 required):**
- `forehead` (1 image max)
- `leftCheek` (1 image max)
- `rightCheek` (1 image max)
- `chin` (1 image max)
- `neck` (1 image max)
- `back` (1 image max)
- `fullFace` (1 image max)

**File Requirements:**
- Format: JPG/JPEG only
- Size: Up to 10MB per file

**Example cURL Request:**
```bash
curl -X POST http://localhost:5000/api/auth/upload-acne \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "forehead=@forehead.jpg" \
  -F "chin=@chin.jpg"
```

**Success Response (201):**
```json
{
  "message": "Acne analysis completed successfully",
  "acne_level_id": "507f1f77bcf86cd799439012",
  "overall_severity": "moderate",
  "analysis_results": {
    "forehead": {
      "area": "forehead",
      "prediction": "acne",
      "confidence": 92.5
    },
    "chin": {
      "area": "chin",
      "prediction": "acne",
      "confidence": 88.3
    }
  }
}
```

**Error Responses:**
- **400 Bad Request:** Questionnaire not completed
  ```json
  {
    "message": "Complete questionnaire before uploading acne images"
  }
  ```
- **400 Bad Request:** No images provided
  ```json
  {
    "message": "At least one image required"
  }
  ```
- **400 Bad Request:** Invalid file format
  ```json
  {
    "message": "Only JPG/JPEG images are allowed"
  }
  ```
- **400 Bad Request:** Multiple images in one field
  ```json
  {
    "message": "Only one image allowed per body area"
  }
  ```
- **401 Unauthorized:** Missing or invalid token
  ```json
  {
    "message": "Unauthorized: Invalid user context"
  }
  ```
- **409 Conflict:** Acne analysis already completed
  ```json
  {
    "message": "Acne analysis already completed for this user"
  }
  ```
- **500 Internal Server Error:**
  ```json
  {
    "message": "Failed to process acne images"
  }
  ```

---

## Treatment Plan Endpoints

### 1. Generate Day 1 Treatment Plan
**Endpoint:** `POST /api/treatment/start`

**Description:** Generate AI-powered Day 1 personalized acne treatment plan based on user profile and acne analysis. Uses Groq AI for dermatology-backed recommendations.

**Authentication:** Required (JWT Token in Authorization header)

**Rate Limit:** 100 requests per 15 minutes

**Request Body:**
```json
{
  "userInfo": "auto-fetched from database"
}
```

**Success Response (201):**
```json
{
  "message": "Day 1 treatment plan generated successfully",
  "treatment_plan_id": "507f1f77bcf86cd799439013",
  "day": 1,
  "severity": "moderate",
  "morning": {
    "treatment": "Gentle face wash with salicylic acid 0.5-2%, oil-free paraben-free moisturizer, SPF 30+ sunscreen",
    "duration": "10 minutes"
  },
  "afternoon": {
    "treatment": "Blot face with oil-free blotting paper if needed, avoid touching face, hydrating mist",
    "duration": "2 minutes"
  },
  "evening": {
    "treatment": "Gentle cleanser, Azelaic acid 10-15% alternative treatments, light moisturizer",
    "duration": "10 minutes"
  },
  "motivation": "Your skin is resilient and your consistent care will show results within 2-3 weeks. Stay hydrated!",
  "adjustment_reason": "Initial plan based on assessment"
}
```

**Error Responses:**
- **401 Unauthorized:** Missing or invalid token
  ```json
  {
    "message": "Unauthorized: Invalid user context"
  }
  ```
- **400 Bad Request:** Prerequisites not met
  ```json
  {
    "message": "User questionnaire and acne analysis required"
  }
  ```
- **409 Conflict:** Treatment plan already generated
  ```json
  {
    "message": "Treatment plan already exists"
  }
  ```
- **500 Internal Server Error:**
  ```json
  {
    "message": "Failed to generate treatment plan"
  }
  ```

---

### 2. Submit Day Review
**Endpoint:** `POST /api/treatment/review`

**Description:** Submit feedback for the current day's treatment plan and generate the next day's customized plan. Feedback is used to adjust recommendations.

**Authentication:** Required (JWT Token in Authorization header)

**Rate Limit:** 100 requests per 15 minutes

**Request Body:**
```json
{
  "feedback": "positive",
  "notes": "Skin feels less oily, some mild irritation on chin"
}
```

**Feedback Options:**
- `"positive"` - Treatment working well, continue similar plan
- `"negative"` - Treatment causing issues, adjust recommendations

**Success Response (200):**
```json
{
  "message": "Review submitted and next day plan generated",
  "current_day": 1,
  "next_day_plan": {
    "day": 2,
    "severity": "moderate",
    "morning": {
      "treatment": "Same as Day 1 with slight concentration increase",
      "duration": "10 minutes"
    },
    "afternoon": {
      "treatment": "Hydrating mist, avoid sun exposure",
      "duration": "2 minutes"
    },
    "evening": {
      "treatment": "Reduced strength Azelaic acid to minimize irritation on chin area",
      "duration": "10 minutes"
    },
    "motivation": "Great progress! Your skin is responding positively to the treatment.",
    "adjustment_reason": "Concentration reduced by 25% due to mild chin irritation reported"
  }
}
```

**Error Responses:**
- **400 Bad Request:** Missing feedback field
  ```json
  {
    "message": "Feedback required"
  }
  ```
- **400 Bad Request:** Invalid feedback value
  ```json
  {
    "message": "Feedback must be 'positive' or 'negative'"
  }
  ```
- **401 Unauthorized:** Missing or invalid token
  ```json
  {
    "message": "Unauthorized: Invalid user context"
  }
  ```
- **404 Not Found:** No active treatment plan
  ```json
  {
    "message": "No active treatment plan found"
  }
  ```
- **500 Internal Server Error:**
  ```json
  {
    "message": "Failed to process review and generate next plan"
  }
  ```

---

### 3. Get Treatment Status
**Endpoint:** `GET /api/treatment/status`

**Description:** Get the current treatment plan status and progress tracking.

**Authentication:** Required (JWT Token in Authorization header)

**Rate Limit:** 100 requests per 15 minutes

**Success Response (200):**
```json
{
  "message": "Treatment status retrieved",
  "current_day": 2,
  "treatment_started": "2026-02-20T10:30:00Z",
  "last_review_submitted": "2026-02-21T14:45:00Z",
  "severity": "moderate",
  "total_days_completed": 1,
  "days_data": [
    {
      "day": 1,
      "review_submitted": true,
      "feedback": "positive",
      "submitted_at": "2026-02-21T14:45:00Z"
    },
    {
      "day": 2,
      "review_submitted": false,
      "feedback": null,
      "submitted_at": null
    }
  ]
}
```

**If No Treatment Plan Active:**
```json
{
  "message": "No active treatment plan",
  "treatment_started": null,
  "current_day": null
}
```

**Error Responses:**
- **401 Unauthorized:** Missing or invalid token
  ```json
  {
    "message": "Unauthorized: Invalid user context"
  }
  ```
- **500 Internal Server Error:**
  ```json
  {
    "message": "Failed to fetch treatment status"
  }
  ```

---

## System Endpoints

### 1. Health Check
**Endpoint:** `GET /health`

**Description:** System health check endpoint showing server and database status.

**Rate Limit:** 100 requests per 15 minutes

**Success Response (200):**
```json
{
  "status": "OK",
  "timestamp": "2026-02-22T10:30:00.000Z",
  "database": "connected",
  "environment": "production"
}
```

**Database Status Values:**
- `"connected"` - MongoDB is connected (mongoose.connection.readyState === 1)
- `"disconnected"` - MongoDB is not connected

---

## Error Response Codes

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| **200** | OK | Request successful, data returned |
| **201** | Created | Resource created successfully |
| **400** | Bad Request | Invalid input, missing fields, validation failed |
| **401** | Unauthorized | Missing or invalid authentication token |
| **403** | Forbidden | Authenticated but not allowed (e.g., unverified account) |
| **404** | Not Found | Resource does not exist |
| **409** | Conflict | Resource already exists or duplicate submission |
| **500** | Internal Server Error | Server error, check logs for details |

---

## Authentication

All protected endpoints require JWT token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Validity:** 24 hours from issuance

**How to Get Token:** 
1. Register → Verify OTP 
2. Login with verified credentials

---

## Rate Limiting

Different rate limits apply to different endpoints:

- **Auth Endpoints (login, register, OTP, password reset):** 50 requests per 15 minutes
- **General API Endpoints:** 100 requests per 15 minutes

When rate limit exceeded, response:
```json
{
  "statusCode": 429,
  "message": "Too many requests, please try again later",
  "retryAfter": 120
}
```

---

## Project Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT APPLICATION                              │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
   ┌──────────┐  ┌──────────────┐  ┌─────────┐
   │ Register │  │ Login/Auth   │  │ Health  │
   │  & OTP   │  │              │  │ Check   │
   └──────────┘  └──────────────┘  └─────────┘
         │               │
         └───────────────┼───────────────┐
                         │               │
                         ▼               ▼
                    ┌─────────────────────────────────────┐
                    │   AUTHENTICATED USER FLOW START     │
                    └─────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────────┐
                    │ Save User Questionnaire │
                    │   (Health Profile,      │
                    │    Lifestyle, Medical)  │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  Upload Acne Images     │
                    │  (7 body areas)         │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │   ML Model Processing   │
                    │   (External ML API)     │
                    │   Returns Severity      │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  Both Conditions Met?   │
                    │ (Questionnaire + Acne)  │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼ YES                     ▼ NO
         ┌─────────────────────┐   ┌──────────────────┐
         │  Generate Day 1     │   │  Wait for User   │
         │  Treatment Plan     │   │  to Complete     │
         │  via Groq AI        │   │  Setup           │
         └────────────┬────────┘   └──────────────────┘
                      │
                      ▼
         ┌─────────────────────────────────────┐
         │     DAILY TREATMENT LOOP START       │
         │   (Continues for N Days)             │
         └──────────────┬──────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
  ┌──────────┐   ┌──────────┐   ┌──────────┐
  │ Morning  │   │Afternoon │   │ Evening  │
  │Treatment │   │Treatment │   │Treatment │
  └──────┬───┘   └──────┬───┘   └──────┬───┘
         │               │               │
         └───────────────┼───────────────┘
                         │
                         ▼
           ┌──────────────────────────┐
           │  Submit Daily Review &   │
           │  Feedback to System      │
           │  (positive/negative)     │
           └────────────┬─────────────┘
                        │
         ┌──────────────┴──────────────┐
         │                             │
         ▼ positive                    ▼ negative
  ┌─────────────────┐        ┌──────────────────────┐
  │ Continue Similar│        │ Adjust in Similar Way│
  │ Plan, Increase  │        │ Reduce Concentration │
  │ Intensity       │        │ Use Gentler Products │
  └────────┬────────┘        └──────────┬───────────┘
           │                            │
           └────────────┬───────────────┘
                        │
                        ▼
           ┌──────────────────────────┐
           │ Generate Next Day (N+1)  │
           │  Treatment via Groq AI   │
           │  Personalized Feedback   │
           └────────────┬─────────────┘
                        │
        ┌───────────────┼────────────┐
        │               │            │
        ▼               ▼            ▼
    ┌─────────┐   ┌──────────┐  ┌────────┐
    │ Next Day│   │Check Day │  │ Get    │
    │ Starts  │   │ Status   │  │Status  │
    │    │    │   │          │  │        │
    │    │    │   └──────────┘  └────────┘
    │    │    │
    │    └────┴──────────> [Loop Continues Daily]
    │
    ▼
┌──────────────────────────────────────┐
│  Database (MongoDB)                  │
│                                      │
│  Collections:                        │
│  ├── users                           │
│  ├── userinfos (questionnaires)      │
│  ├── useracnelevels (analysis)       │
│  └── treatmentplans (daily plans)    │
│                                      │
└──────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICE INTEGRATIONS                │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────┐      ┌──────────────────────────┐  │
│  │  ML/Image Analysis  │      │  Groq AI API             │  │
│  │  (ML_API_URL)       │      │  (GROQ_API_KEY)          │  │
│  │                     │      │                          │  │
│  │ - Detects acne      │      │ - Generates treatment    │  │
│  │ - Severity scoring  │      │ - Personalization       │  │
│  │ - Area mapping      │      │ - Dermatology rules      │  │
│  │ - Confidence %      │      │ - Daily adjustments      │  │
│  └─────────────────────┘      └──────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Email Service (SMTP)                               │    │
│  │  - OTP Verification                                 │    │
│  │  - Password Reset                                   │    │
│  │  - Welcome Messages                                 │    │
│  │  - Treatment Updates (future)                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Environment Variables Required

```
# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/acneai

# JWT
JWT_SECRET=your_secret_key_here

# External APIs
ML_API_URL=http://ml-service:5001
GROQ_API_KEY=your_groq_api_key

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@acneai.com

# Server
PORT=5000
NODE_ENV=production
CORS_ORIGIN=http://localhost:3000
```

---

## Project Structure

```
AcneDetectionBackendREST/
├── server.js                 (Main entry point)
├── package.json
├── .env                      (Environment variables)
├── src/
│   ├── db/
│   │   └── connection.js     (MongoDB connection)
│   ├── controllers/
│   │   ├── auth.controller.js        (Auth logic)
│   │   ├── userinfo.controller.js    (Questionnaire)
│   │   ├── acne.controller.js        (Image upload)
│   │   └── treatment.controller.js   (Treatment plans)
│   ├── middleware/
│   │   ├── auth.middleware.js        (JWT verification)
│   │   └── upload.middleware.js      (File upload handling)
│   ├── models/
│   │   ├── user.model.js             (User schema)
│   │   ├── userinfo.model.js         (Questionnaire schema)
│   │   ├── useracnelevel.model.js    (Acne analysis schema)
│   │   └── treatmentplan.model.js    (Treatment plan schema)
│   ├── routes/
│   │   ├── auth.routes.js            (Auth & user endpoints)
│   │   └── treatment.routes.js       (Treatment endpoints)
│   └── utils/
│       ├── groq.utils.js             (Groq AI integration)
│       └── severity.util.js          (Severity calculation)
└── API.md                    (This file)
```

---

## Example Complete User Journey

### Step 1: Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "retype_password": "SecurePass123!"
  }'
```

### Step 2: Verify OTP
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "otp": "123456"
  }'
```

### Step 3: Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### Step 4: Submit Questionnaire
```bash
curl -X POST http://localhost:5000/api/auth/userinfo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ageGroup": "18-25",
    "sex": "Male",
    "skinType": "Oily",
    "acneDuration": "2-3 months",
    "acneLocation": ["forehead", "chin"],
    "sensitiveSkin": "No",
    "medicationAllergy": "No",
    "allergyReactionTypes": [],
    "acneMedicationReaction": [],
    "usingAcneProducts": "Yes",
    "currentProducts": ["Salicylic acid face wash"],
    "stressLevel": "High",
    "sleepHours": "7",
    "dairyConsumption": "Moderate"
  }'
```

### Step 5: Upload Acne Images
```bash
curl -X POST http://localhost:5000/api/auth/upload-acne \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "forehead=@forehead.jpg" \
  -F "chin=@chin.jpg"
```

### Step 6: Generate Treatment Plan
```bash
curl -X POST http://localhost:5000/api/treatment/start \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 7: Submit Daily Review
```bash
curl -X POST http://localhost:5000/api/treatment/review \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feedback": "positive",
    "notes": "Skin feels better"
  }'
```

---

**Last Updated:** February 22, 2026  
**API Version:** 1.0.0  
**Status:** Production Ready
