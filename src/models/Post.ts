import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPost extends Document {
  userId: Types.ObjectId;
  category: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IPost>('Post', postSchema);
