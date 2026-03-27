import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IFormat extends Document {
  userId: Types.ObjectId;
  name: string;
  tradeTypes: string[];
  contacts: { name: string; phone: string }[];
  description?: string;
  management: 'solo' | 'group';
  createdAt: Date;
  updatedAt: Date;
}

const formatSchema = new Schema<IFormat>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    tradeTypes: [{ type: String, enum: ['sale', 'investment', 'charter', 'monthly'] }],
    contacts: [
      {
        name: { type: String, required: true },
        phone: { type: String, required: true },
      },
    ],
    description: { type: String },
    management: { type: String, enum: ['solo', 'group'], default: 'solo' },
  },
  { timestamps: true }
);

formatSchema.index({ userId: 1 });

export default mongoose.model<IFormat>('Format', formatSchema);
