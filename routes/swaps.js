import express from 'express';
import SwapRequest from '../models/SwapRequest.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// @desc    Create swap request
// @route   POST /api/swaps/request
// @access  Private
router.post('/request', authenticate, async (req, res) => {
  try {
    const {
      providerId,
      skillOffered,
      skillWanted,
      message,
      scheduledDate,
      duration,
      meetingType,
      meetingDetails
    } = req.body;

    // Check if provider exists
    const provider = await User.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    // Check if user is trying to request from themselves
    if (providerId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create swap request with yourself'
      });
    }

    // Check if provider has the requested skill
    const hasSkill = provider.skillsOffered.some(
      skill => skill.name.toLowerCase() === skillWanted.name.toLowerCase()
    );

    if (!hasSkill) {
      return res.status(400).json({
        success: false,
        message: 'Provider does not offer this skill'
      });
    }

    // Check if requester has the offered skill
    const hasOfferedSkill = req.user.skillsOffered.some(
      skill => skill.name.toLowerCase() === skillOffered.name.toLowerCase()
    );

    if (!hasOfferedSkill) {
      return res.status(400).json({
        success: false,
        message: 'You do not have this skill to offer'
      });
    }

    // Create swap request
    const swapRequest = await SwapRequest.create({
      requester: req.user._id,
      provider: providerId,
      skillOffered,
      skillWanted,
      message,
      scheduledDate,
      duration,
      meetingType,
      meetingDetails
    });

    await swapRequest.populate([
      { path: 'requester', select: 'name email profilePhoto' },
      { path: 'provider', select: 'name email profilePhoto' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Swap request created successfully',
      data: swapRequest
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get received swap requests
// @route   GET /api/swaps/received
// @access  Private
router.get('/received', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { provider: req.user._id };
    if (status) {
      query.status = status;
    }

    const swapRequests = await SwapRequest.find(query)
      .populate('requester', 'name email profilePhoto averageRating')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SwapRequest.countDocuments(query);

    res.json({
      success: true,
      data: swapRequests,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRequests: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get sent swap requests
// @route   GET /api/swaps/sent
// @access  Private
router.get('/sent', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { requester: req.user._id };
    if (status) {
      query.status = status;
    }

    const swapRequests = await SwapRequest.find(query)
      .populate('provider', 'name email profilePhoto averageRating')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SwapRequest.countDocuments(query);

    res.json({
      success: true,
      data: swapRequests,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRequests: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Accept swap request
// @route   PUT /api/swaps/:id/accept
// @access  Private
router.put('/:id/accept', authenticate, async (req, res) => {
  try {
    const swapRequest = await SwapRequest.findById(req.params.id);

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: 'Swap request not found'
      });
    }

    // Check if user is the provider
    if (swapRequest.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the provider can accept this request'
      });
    }

    // Check if request is still pending
    if (swapRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot accept request with status: ${swapRequest.status}`
      });
    }

    swapRequest.status = 'accepted';
    swapRequest.responseDate = new Date();
    await swapRequest.save();

    await swapRequest.populate([
      { path: 'requester', select: 'name email profilePhoto' },
      { path: 'provider', select: 'name email profilePhoto' }
    ]);

    res.json({
      success: true,
      message: 'Swap request accepted successfully',
      data: swapRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Reject swap request
// @route   PUT /api/swaps/:id/reject
// @access  Private
router.put('/:id/reject', authenticate, async (req, res) => {
  try {
    const { reason } = req.body;
    const swapRequest = await SwapRequest.findById(req.params.id);

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: 'Swap request not found'
      });
    }

    // Check if user is the provider
    if (swapRequest.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the provider can reject this request'
      });
    }

    // Check if request is still pending
    if (swapRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject request with status: ${swapRequest.status}`
      });
    }

    swapRequest.status = 'rejected';
    swapRequest.responseDate = new Date();
    if (reason) {
      swapRequest.rejectionReason = reason;
    }
    await swapRequest.save();

    res.json({
      success: true,
      message: 'Swap request rejected successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Mark swap as completed
// @route   PUT /api/swaps/:id/complete
// @access  Private
router.put('/:id/complete', authenticate, async (req, res) => {
  try {
    const swapRequest = await SwapRequest.findById(req.params.id);

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: 'Swap request not found'
      });
    }

    // Check if user is part of the swap
    const isParticipant = [swapRequest.requester.toString(), swapRequest.provider.toString()]
      .includes(req.user._id.toString());

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Only swap participants can mark as completed'
      });
    }

    // Check if request is accepted
    if (swapRequest.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Only accepted swaps can be marked as completed'
      });
    }

    swapRequest.status = 'completed';
    swapRequest.completionDate = new Date();
    await swapRequest.save();

    res.json({
      success: true,
      message: 'Swap marked as completed successfully',
      data: swapRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Delete swap request
// @route   DELETE /api/swaps/:id
// @access  Private
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const swapRequest = await SwapRequest.findById(req.params.id);

    if (!swapRequest) {
      return res.status(404).json({
        success: false,
        message: 'Swap request not found'
      });
    }

    // Check if user is the requester
    if (swapRequest.requester.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the requester can delete this request'
      });
    }

    // Check if request is still pending
    if (swapRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete pending requests'
      });
    }

    await SwapRequest.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Swap request deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get swap history
// @route   GET /api/swaps/history
// @access  Private
router.get('/history', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const query = {
      $or: [
        { requester: req.user._id },
        { provider: req.user._id }
      ],
      status: { $in: ['completed', 'rejected', 'cancelled'] }
    };

    const swapRequests = await SwapRequest.find(query)
      .populate('requester', 'name profilePhoto')
      .populate('provider', 'name profilePhoto')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await SwapRequest.countDocuments(query);

    res.json({
      success: true,
      data: swapRequests,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRequests: total
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