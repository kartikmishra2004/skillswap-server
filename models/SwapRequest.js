import mongoose from 'mongoose';

const swapRequestSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  skillOffered: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      required: true
    }
  },
  skillWanted: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      required: true
    }
  },
  message: {
    type: String,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  scheduledDate: {
    type: Date
  },
  duration: {
    type: String,
    enum: ['30min', '1hour', '2hours', '3hours', 'half-day', 'full-day'],
    default: '1hour'
  },
  meetingType: {
    type: String,
    enum: ['online', 'in-person', 'flexible'],
    default: 'flexible'
  },
  meetingDetails: {
    type: String,
    maxlength: [300, 'Meeting details cannot exceed 300 characters']
  },
  responseDate: {
    type: Date
  },
  completionDate: {
    type: Date
  },
  isRated: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
swapRequestSchema.index({ requester: 1, status: 1 });
swapRequestSchema.index({ provider: 1, status: 1 });
swapRequestSchema.index({ createdAt: -1 });

export default mongoose.model('SwapRequest', swapRequestSchema);