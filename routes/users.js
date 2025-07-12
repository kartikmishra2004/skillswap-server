import express from 'express';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all users (browse)
// @route   GET /api/users
// @access  Private
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      skill,
      location,
      availability,
      sortBy = 'averageRating'
    } = req.query;

    const query = {
      _id: { $ne: req.user._id }, // Exclude current user
      profileType: 'public',
      isActive: true,
      isBanned: false
    };

    // Filter by skill
    if (skill) {
      query.$or = [
        { 'skillsOffered.name': { $regex: skill, $options: 'i' } },
        { 'skillsWanted.name': { $regex: skill, $options: 'i' } }
      ];
    }

    // Filter by location
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    // Filter by availability
    if (availability) {
      query[`availability.${availability}`] = true;
    }

    const sortOptions = {};
    if (sortBy === 'averageRating') {
      sortOptions.averageRating = -1;
    } else if (sortBy === 'newest') {
      sortOptions.joinedAt = -1;
    } else if (sortBy === 'lastActive') {
      sortOptions.lastActive = -1;
    }

    const users = await User.find(query)
      .select('-password')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Search users by skill
// @route   GET /api/users/search
// @access  Private
router.get('/search', authenticate, async (req, res) => {
  try {
    const { skill, page = 1, limit = 10 } = req.query;

    if (!skill) {
      return res.status(400).json({
        success: false,
        message: 'Skill parameter is required'
      });
    }

    const query = {
      _id: { $ne: req.user._id },
      profileType: 'public',
      isActive: true,
      isBanned: false,
      'skillsOffered.name': { $regex: skill, $options: 'i' }
    };

    const users = await User.find(query)
      .select('-password')
      .sort({ averageRating: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        searchTerm: skill
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get user profile by ID
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate({
        path: 'ratings',
        populate: {
          path: 'rater',
          select: 'name profilePhoto'
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if profile is private and user is not the owner
    if (user.profileType === 'private' && user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'This profile is private'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get skills offered by all users
// @route   GET /api/users/skills/offered
// @access  Private
router.get('/skills/offered', authenticate, async (req, res) => {
  try {
    const users = await User.find({
      profileType: 'public',
      isActive: true,
      isBanned: false,
      'skillsOffered.0': { $exists: true }
    }).select('skillsOffered');

    const allSkills = users.reduce((acc, user) => {
      user.skillsOffered.forEach(skill => {
        if (!acc.includes(skill.name)) {
          acc.push(skill.name);
        }
      });
      return acc;
    }, []);

    res.json({
      success: true,
      data: allSkills.sort()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get matched users for home page (with compatibility scoring)
// @route   GET /api/users/matches
// @access  Private
router.get('/matches', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      location,
      availability
    } = req.query;

    // Get current user with full profile
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'Current user not found'
      });
    }

    // Base query to exclude current user and get only public, active, non-banned users
    const baseQuery = {
      _id: { $ne: req.user._id },
      profileType: 'public',
      isActive: true,
      isBanned: false
    };

    // Add location filter if provided
    if (location) {
      baseQuery.location = { $regex: location, $options: 'i' };
    }

    // Add availability filter if provided
    if (availability) {
      baseQuery[`availability.${availability}`] = true;
    }

    // Get all potential matches
    const potentialMatches = await User.find(baseQuery)
      .select('-password')
      .lean();

    // Calculate compatibility scores for each user
    const scoredUsers = potentialMatches.map(user => {
      const score = calculateCompatibilityScore(currentUser, user);
      return {
        ...user,
        compatibilityScore: score.totalScore,
        scoreBreakdown: score.breakdown
      };
    });

    // Sort by compatibility score (highest first)
    scoredUsers.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = scoredUsers.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(scoredUsers.length / limit),
        totalUsers: scoredUsers.length,
        hasNext: endIndex < scoredUsers.length,
        hasPrev: page > 1
      },
      currentUser: {
        id: currentUser._id,
        skillsOffered: currentUser.skillsOffered,
        skillsWanted: currentUser.skillsWanted
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get detailed match information for a specific user
// @route   GET /api/users/:id/match-details
// @access  Private
router.get('/:id/match-details', authenticate, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const otherUser = await User.findById(req.params.id).select('-password');

    if (!currentUser || !otherUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if profile is private and user is not the owner
    if (otherUser.profileType === 'private' && otherUser._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'This profile is private'
      });
    }

    // Calculate compatibility score
    const compatibilityScore = calculateCompatibilityScore(currentUser, otherUser);

    // Find specific skill matches
    const skillMatches = findSkillMatches(currentUser, otherUser);

    res.json({
      success: true,
      data: {
        user: otherUser,
        compatibilityScore: compatibilityScore.totalScore,
        scoreBreakdown: compatibilityScore.breakdown,
        skillMatches,
        currentUserSkills: {
          offered: currentUser.skillsOffered,
          wanted: currentUser.skillsWanted
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Helper function to calculate compatibility score
function calculateCompatibilityScore(currentUser, otherUser) {
  let totalScore = 0;
  const breakdown = {
    skillMatch: 0,
    mutualBenefit: 0,
    ratingBonus: 0,
    activityBonus: 0,
    locationBonus: 0
  };

  // 1. Skill Match Score (40% weight)
  const skillMatchScore = calculateSkillMatchScore(currentUser, otherUser);
  breakdown.skillMatch = skillMatchScore;
  totalScore += skillMatchScore * 0.4;

  // 2. Mutual Benefit Score (30% weight)
  const mutualBenefitScore = calculateMutualBenefitScore(currentUser, otherUser);
  breakdown.mutualBenefit = mutualBenefitScore;
  totalScore += mutualBenefitScore * 0.3;

  // 3. Rating Bonus (15% weight)
  const ratingScore = Math.min(otherUser.averageRating * 2, 10); // Max 10 points
  breakdown.ratingBonus = ratingScore;
  totalScore += ratingScore * 0.15;

  // 4. Activity Bonus (10% weight)
  const daysSinceLastActive = Math.floor((Date.now() - new Date(otherUser.lastActive)) / (1000 * 60 * 60 * 24));
  const activityScore = Math.max(0, 10 - daysSinceLastActive); // Higher score for recent activity
  breakdown.activityBonus = activityScore;
  totalScore += activityScore * 0.1;

  // 5. Location Bonus (5% weight)
  const locationScore = calculateLocationScore(currentUser.location, otherUser.location);
  breakdown.locationBonus = locationScore;
  totalScore += locationScore * 0.05;

  return {
    totalScore: Math.round(totalScore * 100) / 100, // Round to 2 decimal places
    breakdown
  };
}

// Calculate skill match score based on what current user wants vs what other user offers
function calculateSkillMatchScore(currentUser, otherUser) {
  let score = 0;
  const skillMatches = [];

  // Check each skill that current user wants against what other user offers
  currentUser.skillsWanted.forEach(wantedSkill => {
    const offeredMatch = otherUser.skillsOffered.find(offeredSkill => 
      offeredSkill.name.toLowerCase() === wantedSkill.name.toLowerCase()
    );

    if (offeredMatch) {
      let matchScore = 0;
      
      // Base score for skill match
      matchScore += 5;
      
      // Bonus for priority level
      if (wantedSkill.priority === 'high') matchScore += 3;
      else if (wantedSkill.priority === 'medium') matchScore += 2;
      else matchScore += 1;

      // Bonus for skill level compatibility
      const levelCompatibility = calculateLevelCompatibility(wantedSkill.priority, offeredMatch.level);
      matchScore += levelCompatibility;

      skillMatches.push({
        wantedSkill: wantedSkill.name,
        offeredSkill: offeredMatch.name,
        matchScore
      });

      score += matchScore;
    }
  });

  return Math.min(score, 20); // Cap at 20 points
}

// Calculate mutual benefit score (both users can benefit from each other)
function calculateMutualBenefitScore(currentUser, otherUser) {
  let score = 0;
  let mutualMatches = 0;

  // Check if current user offers what other user wants
  currentUser.skillsOffered.forEach(offeredSkill => {
    const wantedMatch = otherUser.skillsWanted.find(wantedSkill => 
      wantedSkill.name.toLowerCase() === offeredSkill.name.toLowerCase()
    );

    if (wantedMatch) {
      mutualMatches++;
      let matchScore = 0;
      
      // Base score for mutual match
      matchScore += 8;
      
      // Bonus for priority level
      if (wantedMatch.priority === 'high') matchScore += 4;
      else if (wantedMatch.priority === 'medium') matchScore += 2;
      else matchScore += 1;

      // Bonus for skill level compatibility
      const levelCompatibility = calculateLevelCompatibility(wantedMatch.priority, offeredSkill.level);
      matchScore += levelCompatibility;

      score += matchScore;
    }
  });

  // Bonus for having multiple mutual matches
  if (mutualMatches > 1) {
    score += (mutualMatches - 1) * 5; // 5 points per additional mutual match
  }

  return Math.min(score, 25); // Cap at 25 points
}

// Calculate level compatibility between wanted priority and offered level
function calculateLevelCompatibility(wantedPriority, offeredLevel) {
  const levelScores = {
    'beginner': 1,
    'intermediate': 2,
    'advanced': 3,
    'expert': 4
  };

  const priorityMultipliers = {
    'low': 0.5,
    'medium': 1,
    'high': 1.5
  };

  const levelScore = levelScores[offeredLevel] || 1;
  const priorityMultiplier = priorityMultipliers[wantedPriority] || 1;

  return levelScore * priorityMultiplier;
}

// Calculate location score (simple string matching for now)
function calculateLocationScore(currentLocation, otherLocation) {
  if (!currentLocation || !otherLocation) return 0;
  
  const current = currentLocation.toLowerCase();
  const other = otherLocation.toLowerCase();
  
  // Exact match
  if (current === other) return 10;
  
  // Same city
  if (current.includes(other.split(',')[0]) || other.includes(current.split(',')[0])) return 8;
  
  // Same state/region
  const currentParts = current.split(',');
  const otherParts = other.split(',');
  
  if (currentParts.length > 1 && otherParts.length > 1) {
    if (currentParts[1].trim() === otherParts[1].trim()) return 5;
  }
  
  return 0;
}

// Helper function to find specific skill matches between two users
function findSkillMatches(currentUser, otherUser) {
  const matches = {
    youCanTeach: [], // Skills you can teach that they want
    theyCanTeach: [], // Skills they can teach that you want
    mutualMatches: [] // Skills both can teach each other
  };

  // Find skills you can teach that they want
  currentUser.skillsOffered.forEach(offeredSkill => {
    const wantedMatch = otherUser.skillsWanted.find(wantedSkill => 
      wantedSkill.name.toLowerCase() === offeredSkill.name.toLowerCase()
    );

    if (wantedMatch) {
      matches.youCanTeach.push({
        skill: offeredSkill.name,
        yourLevel: offeredSkill.level,
        theirPriority: wantedMatch.priority,
        theirDescription: wantedMatch.description
      });
    }
  });

  // Find skills they can teach that you want
  otherUser.skillsOffered.forEach(offeredSkill => {
    const wantedMatch = currentUser.skillsWanted.find(wantedSkill => 
      wantedSkill.name.toLowerCase() === offeredSkill.name.toLowerCase()
    );

    if (wantedMatch) {
      matches.theyCanTeach.push({
        skill: offeredSkill.name,
        theirLevel: offeredSkill.level,
        yourPriority: wantedMatch.priority,
        yourDescription: wantedMatch.description
      });
    }
  });

  // Find mutual matches (same skill both can teach each other)
  currentUser.skillsOffered.forEach(offeredSkill => {
    const mutualMatch = otherUser.skillsOffered.find(otherOfferedSkill => 
      offeredSkill.name.toLowerCase() === otherOfferedSkill.name.toLowerCase()
    );

    if (mutualMatch) {
      matches.mutualMatches.push({
        skill: offeredSkill.name,
        yourLevel: offeredSkill.level,
        theirLevel: mutualMatch.level
      });
    }
  });

  return matches;
}

export default router;