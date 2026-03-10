import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  phone: string;
  name: string;
  agencyName: string;
  licenseNo?: string;
  businessCardUrl?: string;
  isApproved: boolean;
  // 구독 정보
  subscription: {
    plan: string;
    expiresAt: Date;
    points: number;
    pinCount: number;
    pushCount: number;
  };
  deviceTokens: { token: string; platform: string; createdAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    phone: { type: String, required: true, unique: true },
    name: { type: String, default: '' },
    agencyName: { type: String, default: '' },
    licenseNo: { type: String },
    businessCardUrl: { type: String },
    isApproved: { type: Boolean, default: false },
    subscription: {
      plan: { type: String, default: 'free' },
      expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      points: { type: Number, default: 0 },
      pinCount: { type: Number, default: 0 },
      pushCount: { type: Number, default: 0 },
    },
    deviceTokens: [{
      token: { type: String, required: true },
      platform: { type: String, enum: ['ios', 'android'], required: true },
      createdAt: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', userSchema);
