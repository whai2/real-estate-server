import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPointHistory extends Document {
  userId: Types.ObjectId;
  amount: number;
  type: string;
  description: string;
  createdAt: Date;
}

const pointHistorySchema = new Schema<IPointHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['charge', 'use', 'reward', 'refund'], required: true },
    description: { type: String, required: true },
  },
  { timestamps: true }
);

pointHistorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IPointHistory>('PointHistory', pointHistorySchema);
