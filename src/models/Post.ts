import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPost extends Document {
  userId: Types.ObjectId;
  category: 'notice' | 'jobs' | 'info' | 'free';
  title: string;
  content: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  likedBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, enum: ['notice', 'jobs', 'info', 'free'], required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    viewCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    likedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IPost>('Post', postSchema);
