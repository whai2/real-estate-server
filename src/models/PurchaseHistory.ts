import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPurchaseHistory extends Document {
  userId: Types.ObjectId;
  type: 'point' | 'subscription' | 'pin' | 'push' | 'package';
  amount: number;
  price: number;
  method?: 'card' | 'bank';
  description: string;
  createdAt: Date;
}

const purchaseHistorySchema = new Schema<IPurchaseHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['point', 'subscription', 'pin', 'push', 'package'],
      required: true,
    },
    amount: { type: Number, required: true },
    price: { type: Number, required: true },
    method: { type: String, enum: ['card', 'bank'] },
    description: { type: String, required: true },
  },
  { timestamps: true }
);

purchaseHistorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IPurchaseHistory>('PurchaseHistory', purchaseHistorySchema);
