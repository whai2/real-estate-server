import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INotification extends Document {
  senderId: Types.ObjectId;
  title: string;
  content: string;
  targetArea?: string;
  conditions?: Record<string, any>;
  sentCount: number;
  failedCount: number;
  sentAt: Date;
}

const notificationSchema = new Schema<INotification>({
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  targetArea: { type: String },
  conditions: { type: Schema.Types.Mixed },
  sentCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  sentAt: { type: Date, default: Date.now },
});

export default mongoose.model<INotification>('Notification', notificationSchema);
