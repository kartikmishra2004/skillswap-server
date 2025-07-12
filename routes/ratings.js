import express from 'express';
import Rating from '../models/Rating.js';
import SwapRequest from '../models/SwapRequest.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// @desc    Create rating for completed swap
// @route   POST /api/ratings
// @access  Private
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      swapRequestId,
      ratedUserId,
      rating,
      feedback,
      skillAccuracy,
      communication,
      punctuality,
      wouldRecommend
    } = req.body;

    // Check if swap request exists and is completed
    const swapRequest = await SwapRequest.findById(swapRequestId);
    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: 'Swap request not found'
      });
    }

    if (swapRequest.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate completed swaps'
      });
    }

    // Check if user is part of the swap
    const isParticipant = [swapRequest.requester.toString(), swapRequest.provider.toString()]
      .includes(req.user._id.toString());

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Only swap participants can create ratings'
      });
    }

    // Check if rating already exists
    const existingRating = await Rating.findOne({
      swapRequest: swapRequestId,
      rater: req.user._id
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this swap'
      });
    }

    // Create rating
    const newRating = await Rating.create({
      swapRequest: swapRequestId,
      rater: req.user._id,
      rated: ratedUserId,
      rating,
      feedback,
      skillAccuracy,
      communication,
      punctuality,
      wouldRecommend
    });

    // Update user's average rating
    await updateUserRating(ratedUserId);

    await newRating.populate([
      { path: 'rater', select: 'name profilePhoto' },
      { path: 'rated', select: 'name profilePhoto' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Rating created successfully',
      data: newRating
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Helper function to update user's average rating
const updateUserRating = async (userId) => {
  const ratings = await Rating.find({ rated: userId });
  
  if (ratings.length > 0) {
    const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
    const averageRating = totalRating / ratings.length;
    
    await User.findByIdAndUpdate(userId, {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalRatings: ratings.length
    });
  }
};

// @desc    Get ratings for a user
// @route   GET /api/ratings/user/:id
// @access  Private
router.get('/user/:id', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const ratings = await Rating.find({ rated: req.params.id })
      .populate('rater', 'name profilePhoto')
      .populate('swapRequest', 'skillOffered skillWanted')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Rating.countDocuments({ rated: req.params.id });

    // Calculate rating statistics
    const stats = await Rating.aggregate([
      { $match: { rated: mongoose.Types.ObjectId(req.params.id) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          fiveStars: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          fourStars: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          threeStars: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          twoStars: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          oneStar: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: ratings,
      statistics: stats[0] || {
        averageRating: 0,
        totalRatings: 0,
        fiveStars: 0,
        fourStars: 0,
        threeStars: 0,
        twoStars: 0,
        oneStar: 0
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRatings: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get my ratings (ratings I've given)
// @route   GET /api/ratings/my-ratings
// @access  Private
router.get('/my-ratings', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const ratings = await Rating.find({ rater: req.user._id })
      .populate('rated', 'name profilePhoto')
      .populate('swapRequest', 'skillOffered skillWanted')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Rating.countDocuments({ rater: req.user._id });

    res.json({
      success: true,
      data: ratings,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRatings: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;