import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAutoNotification extends Document {
  userId: Types.ObjectId;
  title: string;
  content: string;
  propertyIds: Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const autoNotificationSchema = new Schema<IAutoNotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    propertyIds: [{ type: Schema.Types.ObjectId, ref: 'Property' }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

autoNotificationSchema.index({ userId: 1 });

export default mongoose.model<IAutoNotification>('AutoNotification', autoNotificationSchema);
