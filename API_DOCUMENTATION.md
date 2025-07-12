# Skill Swap Platform API Documentation

## Overview

The Skill Swap Platform API is a RESTful service that enables users to list their skills and request others in return. The platform includes user authentication, skill management, swap requests, ratings, and administrative features.

## Base URL
```
http://localhost:3000/api
```

## Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

- General endpoints: 100 requests per 15 minutes per IP
- Authentication endpoints: 5 requests per 15 minutes per IP

---

## 🔐 Authentication Endpoints

### Register User
```http
POST /api/auth/register
```

**Body (multipart/form-data):**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "location": "New York, NY",
  "profileType": "public",
  "profilePhoto": "file"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "location": "New York, NY",
    "profilePhoto": "/uploads/profiles/photo.jpg",
    "profileType": "public",
    "role": "user"
  }
}
```

### Login User
```http
POST /api/auth/login
```

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "averageRating": 4.5,
    "totalRatings": 12
  }
}
```

### Get Current User
```http
GET /api/auth/me
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "john@example.com",
    "skillsOffered": [...],
    "skillsWanted": [...],
    "availability": {...}
  }
}
```

### Update Profile
```http
PUT /api/auth/profile
```

**Headers:** `Authorization: Bearer <token>`

**Body (multipart/form-data):**
```json
{
  "name": "John Updated",
  "location": "San Francisco, CA",
  "profileType": "private",
  "profilePhoto": "file"
}
```

### Update Skills
```http
PUT /api/auth/skills
```

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "skillsOffered": [
    {
      "name": "JavaScript",
      "level": "advanced",
      "description": "5+ years of experience"
    }
  ],
  "skillsWanted": [
    {
      "name": "Python",
      "priority": "high",
      "description": "Looking to learn web development"
    }
  ]
}
```

### Update Availability
```http
PUT /api/auth/availability
```

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "availability": {
    "weekdays": false,
    "weekends": true,
    "evenings": true,
    "mornings": false,
    "notes": "Available on weekends and evenings"
  }
}
```

---

## 👥 User Endpoints

### Browse Users
```http
GET /api/users?page=1&limit=10&skill=JavaScript&location=NY&availability=weekends&sortBy=averageRating
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10)
- `skill` (optional): Filter by skill name
- `location` (optional): Filter by location
- `availability` (optional): Filter by availability (weekdays, weekends, evenings, mornings)
- `sortBy` (optional): Sort by averageRating, newest, lastActive (default: averageRating)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user-id",
      "name": "Jane Smith",
      "location": "New York, NY",
      "profilePhoto": "/uploads/profiles/photo.jpg",
      "skillsOffered": [...],
      "averageRating": 4.8,
      "totalRatings": 15
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalUsers": 50,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Search Users by Skill
```http
GET /api/users/search?skill=JavaScript&page=1&limit=10
```

**Headers:** `Authorization: Bearer <token>`

### Get User Profile
```http
GET /api/users/:id
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "location": "New York, NY",
    "skillsOffered": [...],
    "skillsWanted": [...],
    "availability": {...},
    "averageRating": 4.8,
    "totalRatings": 15
  }
}
```

### Get All Skills Offered
```http
GET /api/users/skills/offered
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": ["JavaScript", "Python", "React", "Node.js", "Photoshop"]
}
```

---

## 🔄 Swap Request Endpoints

### Create Swap Request
```http
POST /api/swaps/request
```

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "providerId": "provider-user-id",
  "skillOffered": {
    "name": "JavaScript",
    "level": "advanced"
  },
  "skillWanted": {
    "name": "Python",
    "level": "intermediate"
  },
  "message": "I'd like to learn Python in exchange for JavaScript help",
  "scheduledDate": "2024-01-15T10:00:00Z",
  "duration": "2hours",
  "meetingType": "online",
  "meetingDetails": "Zoom meeting"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Swap request created successfully",
  "data": {
    "id": "swap-id",
    "requester": {...},
    "provider": {...},
    "skillOffered": {...},
    "skillWanted": {...},
    "status": "pending"
  }
}
```

### Get Received Swap Requests
```http
GET /api/swaps/received?status=pending&page=1&limit=10
```

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional): Filter by status (pending, accepted, rejected, completed, cancelled)
- `page`, `limit`: Pagination

### Get Sent Swap Requests
```http
GET /api/swaps/sent?status=pending&page=1&limit=10
```

**Headers:** `Authorization: Bearer <token>`

### Accept Swap Request
```http
PUT /api/swaps/:id/accept
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Swap request accepted successfully",
  "data": {
    "id": "swap-id",
    "status": "accepted",
    "responseDate": "2024-01-10T12:00:00Z"
  }
}
```

### Reject Swap Request
```http
PUT /api/swaps/:id/reject
```

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "reason": "Schedule conflict"
}
```

### Mark Swap as Completed
```http
PUT /api/swaps/:id/complete
```

**Headers:** `Authorization: Bearer <token>`

### Delete Swap Request
```http
DELETE /api/swaps/:id
```

**Headers:** `Authorization: Bearer <token>`

**Note:** Only pending requests can be deleted, and only by the requester.

### Get Swap History
```http
GET /api/swaps/history?page=1&limit=10
```

**Headers:** `Authorization: Bearer <token>`

---

## ⭐ Rating Endpoints

### Create Rating
```http
POST /api/ratings
```

**Headers:** `Authorization: Bearer <token>`

**Body:**
```json
{
  "swapRequestId": "swap-id",
  "ratedUserId": "user-id",
  "rating": 5,
  "feedback": "Excellent teacher, very patient and knowledgeable",
  "skillAccuracy": 5,
  "communication": 5,
  "punctuality": 5,
  "wouldRecommend": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rating created successfully",
  "data": {
    "id": "rating-id",
    "rating": 5,
    "feedback": "Excellent teacher...",
    "rater": {...},
    "rated": {...}
  }
}
```

### Get User Ratings
```http
GET /api/ratings/user/:id?page=1&limit=10
```

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "rating-id",
      "rating": 5,
      "feedback": "Great experience...",
      "rater": {
        "name": "John Doe",
        "profilePhoto": "/uploads/photo.jpg"
      },
      "createdAt": "2024-01-10T12:00:00Z"
    }
  ],
  "statistics": {
    "averageRating": 4.8,
    "totalRatings": 15,
    "fiveStars": 10,
    "fourStars": 3,
    "threeStars": 2,
    "twoStars": 0,
    "oneStar": 0
  },
  "pagination": {...}
}
```

### Get My Ratings
```http
GET /api/ratings/my-ratings?page=1&limit=10
```

**Headers:** `Authorization: Bearer <token>`

---

## 👨‍💼 Admin Endpoints

**Note:** All admin endpoints require admin role authorization.

### Get All Users
```http
GET /api/admin/users?page=1&limit=20&search=john&status=active&role=user&sortBy=joinedAt
```

**Headers:** `Authorization: Bearer <admin-token>`

**Query Parameters:**
- `search` (optional): Search by name or email
- `status` (optional): Filter by banned, active, inactive
- `role` (optional): Filter by user, admin
- `sortBy` (optional): Sort by joinedAt, lastActive, rating

### Ban/Unban User
```http
PUT /api/admin/users/:id/ban
```

**Headers:** `Authorization: Bearer <admin-token>`

**Body:**
```json
{
  "ban": true,
  "reason": "Violation of platform policies"
}
```

### Get All Swaps
```http
GET /api/admin/swaps?page=1&limit=20&status=pending&sortBy=createdAt
```

**Headers:** `Authorization: Bearer <admin-token>`

### Moderate Swap Request
```http
PUT /api/admin/swaps/:id/moderate
```

**Headers:** `Authorization: Bearer <admin-token>`

**Body:**
```json
{
  "action": "cancel",
  "reason": "Inappropriate content"
}
```

### Send Platform Message
```http
POST /api/admin/messages
```

**Headers:** `Authorization: Bearer <admin-token>`

**Body:**
```json
{
  "title": "Platform Maintenance",
  "message": "We will be performing maintenance on...",
  "type": "maintenance",
  "expiryDate": "2024-01-20T00:00:00Z"
}
```

### Get Platform Messages
```http
GET /api/admin/messages
```

**Headers:** `Authorization: Bearer <admin-token>`

### Get Admin Statistics
```http
GET /api/admin/stats
```

**Headers:** `Authorization: Bearer <admin-token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 1250,
      "active": 1180,
      "banned": 15
    },
    "swaps": {
      "total": 3500,
      "pending": 120,
      "completed": 2800
    },
    "ratings": {
      "total": 2100,
      "average": 4.6
    },
    "monthlyGrowth": [...]
  }
}
```

### Download User Report
```http
GET /api/admin/reports/users
```

**Headers:** `Authorization: Bearer <admin-token>`

---

## 📋 Data Models

### User Model
```json
{
  "name": "string (required, max 50 chars)",
  "email": "string (required, unique, valid email)",
  "password": "string (required, min 6 chars)",
  "location": "string (optional, max 100 chars)",
  "profilePhoto": "string (file path)",
  "profileType": "enum ['public', 'private'] (default: public)",
  "skillsOffered": [
    {
      "name": "string (required)",
      "level": "enum ['beginner', 'intermediate', 'advanced', 'expert']",
      "description": "string (max 200 chars)"
    }
  ],
  "skillsWanted": [
    {
      "name": "string (required)",
      "priority": "enum ['low', 'medium', 'high']",
      "description": "string (max 200 chars)"
    }
  ],
  "availability": {
    "weekdays": "boolean",
    "weekends": "boolean",
    "evenings": "boolean",
    "mornings": "boolean",
    "notes": "string (max 200 chars)"
  },
  "role": "enum ['user', 'admin'] (default: user)",
  "isActive": "boolean (default: true)",
  "isBanned": "boolean (default: false)",
  "banReason": "string",
  "averageRating": "number (0-5, default: 0)",
  "totalRatings": "number (default: 0)",
  "joinedAt": "date",
  "lastActive": "date"
}
```

### Swap Request Model
```json
{
  "requester": "ObjectId (ref: User)",
  "provider": "ObjectId (ref: User)",
  "skillOffered": {
    "name": "string",
    "level": "enum ['beginner', 'intermediate', 'advanced', 'expert']"
  },
  "skillWanted": {
    "name": "string",
    "level": "enum ['beginner', 'intermediate', 'advanced', 'expert']"
  },
  "message": "string (max 500 chars)",
  "status": "enum ['pending', 'accepted', 'rejected', 'completed', 'cancelled']",
  "scheduledDate": "date",
  "duration": "enum ['30min', '1hour', '2hours', '3hours', 'half-day', 'full-day']",
  "meetingType": "enum ['online', 'in-person', 'flexible']",
  "meetingDetails": "string (max 300 chars)",
  "responseDate": "date",
  "completionDate": "date",
  "isRated": "boolean (default: false)"
}
```

### Rating Model
```json
{
  "swapRequest": "ObjectId (ref: SwapRequest)",
  "rater": "ObjectId (ref: User)",
  "rated": "ObjectId (ref: User)",
  "rating": "number (1-5, required)",
  "feedback": "string (max 500 chars)",
  "skillAccuracy": "number (1-5)",
  "communication": "number (1-5)",
  "punctuality": "number (1-5)",
  "wouldRecommend": "boolean (default: true)"
}
```

---

## 🔧 Error Handling

The API uses standard HTTP status codes and returns errors in the following format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"] // Optional for validation errors
}
```

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

---

## 🚀 Setup Instructions

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Setup:**
   Create a `.env` file with:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/skillswap
   JWT_SECRET=your_super_secret_jwt_key_here
   JWT_EXPIRE=7d
   NODE_ENV=development
   ```

3. **Start the Server:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

4. **Database Setup:**
   - Ensure MongoDB is running
   - The app will automatically connect and create collections

5. **File Uploads:**
   - Profile photos are stored in `/uploads/profiles/`
   - Maximum file size: 5MB
   - Allowed formats: JPEG, JPG, PNG, GIF

---

## 📝 Notes

- All timestamps are in ISO 8601 format
- File uploads use multipart/form-data
- All other requests use application/json
- Passwords are hashed using bcrypt
- JWT tokens expire based on JWT_EXPIRE environment variable
- Rate limiting is applied per IP address
- Profile photos are served as static files from `/uploads` endpoint

For additional support or questions, please refer to the API health check endpoint: `GET /api/health`