import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IInquiry extends Document {
  userId: Types.ObjectId;
  title: string;
  content: string;
  propertyId?: Types.ObjectId;
  status: 'pending' | 'answered' | 'closed';
  answer?: string;
  createdAt: Date;
  updatedAt: Date;
}

const inquirySchema = new Schema<IInquiry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property' },
    status: { type: String, enum: ['pending', 'answered', 'closed'], default: 'pending' },
    answer: { type: String },
  },
  { timestamps: true }
);

inquirySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IInquiry>('Inquiry', inquirySchema);
