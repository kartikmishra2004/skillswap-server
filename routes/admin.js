import express from 'express';
import User from '../models/User.js';
import SwapRequest from '../models/SwapRequest.js';
import Rating from '../models/Rating.js';
import AdminMessage from '../models/AdminMessage.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Apply admin authorization to all routes
router.use(authenticate, authorize('admin'));

// @desc    Get all users with filters
// @route   GET /api/admin/users
// @access  Private/Admin
router.get('/users', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      role,
      sortBy = 'joinedAt'
    } = req.query;

    const query = {};

    // Search by name or email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by status
    if (status === 'banned') {
      query.isBanned = true;
    } else if (status === 'active') {
      query.isBanned = false;
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    // Filter by role
    if (role) {
      query.role = role;
    }

    const sortOptions = {};
    if (sortBy === 'joinedAt') {
      sortOptions.joinedAt = -1;
    } else if (sortBy === 'lastActive') {
      sortOptions.lastActive = -1;
    } else if (sortBy === 'rating') {
      sortOptions.averageRating = -1;
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
        totalUsers: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Ban/Unban user
// @route   PUT /api/admin/users/:id/ban
// @access  Private/Admin
router.put('/users/:id/ban', async (req, res) => {
  try {
    const { ban, reason } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent banning other admins
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot ban admin users'
      });
    }

    user.isBanned = ban;
    if (ban && reason) {
      user.banReason = reason;
    } else if (!ban) {
      user.banReason = undefined;
    }

    await user.save();

    res.json({
      success: true,
      message: `User ${ban ? 'banned' : 'unbanned'} successfully`,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get all swap requests
// @route   GET /api/admin/swaps
// @access  Private/Admin
router.get('/swaps', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      sortBy = 'createdAt'
    } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const sortOptions = {};
    if (sortBy === 'createdAt') {
      sortOptions.createdAt = -1;
    } else if (sortBy === 'responseDate') {
      sortOptions.responseDate = -1;
    }

    const swaps = await SwapRequest.find(query)
      .populate('requester', 'name email')
      .populate('provider', 'name email')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SwapRequest.countDocuments(query);

    res.json({
      success: true,
      data: swaps,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalSwaps: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Moderate swap request
// @route   PUT /api/admin/swaps/:id/moderate
// @access  Private/Admin
router.put('/swaps/:id/moderate', async (req, res) => {
  try {
    const { action, reason } = req.body; // action: 'approve', 'reject', 'cancel'
    
    const swap = await SwapRequest.findById(req.params.id);
    if (!swap) {
      return res.status(404).json({
        success: false,
        message: 'Swap request not found'
      });
    }

    if (action === 'cancel') {
      swap.status = 'cancelled';
      swap.moderationReason = reason;
    }

    await swap.save();

    res.json({
      success: true,
      message: `Swap request ${action}ed successfully`,
      data: swap
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Send platform-wide message
// @route   POST /api/admin/messages
// @access  Private/Admin
router.post('/messages', async (req, res) => {
  try {
    const { title, message, type, expiryDate } = req.body;

    const adminMessage = await AdminMessage.create({
      title,
      message,
      type: type || 'announcement',
      createdBy: req.user._id,
      expiryDate
    });

    res.status(201).json({
      success: true,
      message: 'Platform message sent successfully',
      data: adminMessage
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get platform messages
// @route   GET /api/admin/messages
// @access  Private/Admin
router.get('/messages', async (req, res) => {
  try {
    const messages = await AdminMessage.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true, isBanned: false });
    const bannedUsers = await User.countDocuments({ isBanned: true });
    
    const totalSwaps = await SwapRequest.countDocuments();
    const pendingSwaps = await SwapRequest.countDocuments({ status: 'pending' });
    const completedSwaps = await SwapRequest.countDocuments({ status: 'completed' });
    
    const totalRatings = await Rating.countDocuments();
    const averageRating = await Rating.aggregate([
      { $group: { _id: null, avg: { $avg: '$rating' } } }
    ]);

    // Monthly user growth
    const monthlyUsers = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$joinedAt' },
            month: { $month: '$joinedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          banned: bannedUsers
        },
        swaps: {
          total: totalSwaps,
          pending: pendingSwaps,
          completed: completedSwaps
        },
        ratings: {
          total: totalRatings,
          average: averageRating[0]?.avg || 0
        },
        monthlyGrowth: monthlyUsers
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Download user activity report
// @route   GET /api/admin/reports/users
// @access  Private/Admin
router.get('/reports/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('name email joinedAt lastActive skillsOffered skillsWanted averageRating totalRatings isActive isBanned')
      .lean();

    // Add swap counts for each user
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const swapCount = await SwapRequest.countDocuments({
        $or: [{ requester: user._id }, { provider: user._id }]
      });
      
      return {
        ...user,
        totalSwaps: swapCount
      };
    }));

    res.json({
      success: true,
      data: usersWithStats,
      generatedAt: new Date(),
      totalUsers: usersWithStats.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;