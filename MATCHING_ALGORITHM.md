# SkillSwap Matching Algorithm

## Overview

The SkillSwap platform now includes a sophisticated matching algorithm that scores users based on skill compatibility and other factors. This algorithm powers the home page listing, showing users sorted by their compatibility score with the current user.

## 🎯 **New API Endpoints**

### 1. Get Matched Users (Home Page)
```
GET /api/users/matches
```

**Purpose**: Returns users sorted by compatibility score for the home page

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10)
- `location` (optional): Filter by location
- `availability` (optional): Filter by availability

**Response**: Users with compatibility scores and breakdown

### 2. Get Detailed Match Information
```
GET /api/users/:id/match-details
```

**Purpose**: Get detailed compatibility information for a specific user

**Response**: Detailed breakdown of why users are compatible

## 🧮 **Scoring Algorithm**

The compatibility score is calculated using 5 weighted factors:

### 1. Skill Match Score (40% weight)
- **What it measures**: How well the other user's offered skills match what you want to learn
- **Scoring**:
  - Base score: 5 points per skill match
  - Priority bonus: High (+3), Medium (+2), Low (+1)
  - Level compatibility bonus: Based on skill level vs priority
- **Maximum**: 20 points

### 2. Mutual Benefit Score (30% weight)
- **What it measures**: How well you can help each other (mutual skill exchange)
- **Scoring**:
  - Base score: 8 points per mutual match
  - Priority bonus: High (+4), Medium (+2), Low (+1)
  - Multiple matches bonus: +5 points per additional match
- **Maximum**: 25 points

### 3. Rating Bonus (15% weight)
- **What it measures**: User's reputation and reliability
- **Scoring**: `averageRating * 2` (capped at 10 points)
- **Maximum**: 10 points

### 4. Activity Bonus (10% weight)
- **What it measures**: How recently the user was active
- **Scoring**: `10 - daysSinceLastActive` (higher for recent activity)
- **Maximum**: 10 points

### 5. Location Bonus (5% weight)
- **What it measures**: Geographic proximity
- **Scoring**:
  - Exact location match: 10 points
  - Same city: 8 points
  - Same state/region: 5 points
- **Maximum**: 10 points

## 📊 **Score Breakdown Example**

```json
{
  "compatibilityScore": 18.44,
  "scoreBreakdown": {
    "skillMatch": 20.0,      // 40% weight
    "mutualBenefit": 25.0,   // 30% weight
    "ratingBonus": 9.6,      // 15% weight
    "activityBonus": 10.0,   // 10% weight
    "locationBonus": 10.0    // 5% weight
  }
}
```

## 🔍 **Skill Matching Logic**

### Skill Match Score Calculation
1. **Find matches**: Compare your wanted skills with their offered skills
2. **Calculate base score**: 5 points per match
3. **Add priority bonus**: Based on how important the skill is to you
4. **Add level compatibility**: Higher level teachers get more points for high-priority skills

### Mutual Benefit Score Calculation
1. **Find mutual matches**: Skills you can teach that they want
2. **Calculate base score**: 8 points per mutual match
3. **Add priority bonus**: Based on their priority level
4. **Add multiple match bonus**: +5 points for each additional mutual match

### Level Compatibility
- **Beginner**: 1 point
- **Intermediate**: 2 points
- **Advanced**: 3 points
- **Expert**: 4 points

Multiplied by priority multiplier:
- **Low priority**: 0.5x
- **Medium priority**: 1x
- **High priority**: 1.5x

## 🎨 **Frontend Integration**

### Home Page Implementation
```javascript
// Fetch matched users for home page
const response = await fetch('/api/users/matches?page=1&limit=10', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
// data.data contains users sorted by compatibility score
// Each user has compatibilityScore and scoreBreakdown
```

### User Detail Page
```javascript
// Get detailed match information
const response = await fetch(`/api/users/${userId}/match-details`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();
// data.data contains detailed skill matches and breakdown
```

## 📈 **Expected Results**

### High Compatibility (Score: 15-20)
- Multiple skill matches
- Mutual benefit potential
- High ratings
- Recent activity
- Same location

### Medium Compatibility (Score: 10-15)
- Some skill matches
- Good ratings
- Active user
- Nearby location

### Low Compatibility (Score: 0-10)
- Few or no skill matches
- Lower ratings
- Inactive user
- Different location

## 🔧 **Algorithm Benefits**

1. **Personalized Experience**: Each user sees different results based on their skills
2. **Quality Matches**: Prioritizes users who can actually help each other
3. **Mutual Benefit**: Favors users who can exchange skills
4. **Reputation Based**: Considers user ratings and activity
5. **Location Aware**: Considers geographic proximity
6. **Transparent**: Provides detailed breakdown of why users are matched

## 🚀 **Usage in Frontend**

The algorithm is designed to power:
- **Home page listings** with sorted users
- **Match explanations** showing why users are compatible
- **Skill exchange suggestions** based on mutual needs
- **Filtered results** by location and availability

This creates a highly personalized experience where users see the most relevant potential skill exchange partners first. 