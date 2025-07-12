import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', upload.single('profilePhoto'), async (req, res) => {
  try {
    const { name, email, password, location, profileType } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const userData = {
      name,
      email,
      password,
      location,
      profileType: profileType || 'public'
    };

    if (req.file) {
      userData.profilePhoto = req.file.path;
    }

    const user = await User.create(userData);

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        location: user.location,
        profilePhoto: user.profilePhoto,
        profileType: user.profileType,
        role: user.role
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is banned
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: 'Account has been banned',
        banReason: user.banReason
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last active
    user.updateLastActive();

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        location: user.location,
        profilePhoto: user.profilePhoto,
        profileType: user.profileType,
        role: user.role,
        averageRating: user.averageRating,
        totalRatings: user.totalRatings
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', authenticate, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', authenticate, upload.single('profilePhoto'), async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = ['name', 'location', 'profileType'];
    
    // Filter allowed updates
    const validUpdates = {};
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        validUpdates[field] = updates[field];
      }
    });

    if (req.file) {
      validUpdates.profilePhoto = req.file.path;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      validUpdates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Update user skills
// @route   PUT /api/auth/skills
// @access  Private
router.put('/skills', authenticate, async (req, res) => {
  try {
    const { skillsOffered, skillsWanted } = req.body;

    const updates = {};
    if (skillsOffered) updates.skillsOffered = skillsOffered;
    if (skillsWanted) updates.skillsWanted = skillsWanted;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Skills updated successfully',
      user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Update user availability
// @route   PUT /api/auth/availability
// @access  Private
router.put('/availability', authenticate, async (req, res) => {
  try {
    const { availability } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { availability },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Availability updated successfully',
      user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

export default router;