
/**
 * Note: These are Mongoose schema definitions for the backend implementation.
 * In this React SPA, we simulate the state, but these would be used with MongoDB.
 */

/*
import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['SUPER_ADMIN', 'EVENT_ADMIN', 'JUDGE'], required: true },
  assignedEventId: { type: Schema.Types.ObjectId, ref: 'Event' },
  password: { type: String, required: true }
});

const CriterionSchema = new Schema({
  name: String,
  weight: Number
});

const EventSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['JUDGING', 'QUIZ_BEE'], required: true },
  criteria: [CriterionSchema],
  isLocked: { type: Boolean, default: false },
  eventAdminId: { type: Schema.Types.ObjectId, ref: 'User' }
});

const ScoreSchema = new Schema({
  judgeId: { type: Schema.Types.ObjectId, ref: 'User' },
  participantId: { type: Schema.Types.ObjectId, ref: 'Participant' },
  eventId: { type: Schema.Types.ObjectId, ref: 'Event' },
  criteriaScores: { type: Map, of: Number },
  totalScore: Number
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);
export const Score = mongoose.models.Score || mongoose.model('Score', ScoreSchema);
*/
