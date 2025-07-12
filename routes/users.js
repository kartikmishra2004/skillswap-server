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

export default router;