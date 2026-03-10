import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProperty extends Document {
  userId: Types.ObjectId;
  type: 'open' | 'general';
  title: string;
  address: string;
  lat: number;
  lng: number;
  price: string;
  deposit?: string;
  monthlyRent?: string;
  area?: number;
  floor?: string;
  rooms?: number;
  description?: string;
  images: { url: string; order: number }[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const propertySchema = new Schema<IProperty>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['open', 'general'], required: true },
    title: { type: String, required: true },
    address: { type: String, required: true },
    lat: { type: Number },
    lng: { type: Number },
    price: { type: String, required: true },
    deposit: { type: String },
    monthlyRent: { type: String },
    area: { type: Number },
    floor: { type: String },
    rooms: { type: Number },
    description: { type: String },
    images: [
      {
        url: { type: String, required: true },
        order: { type: Number, default: 0 },
      },
    ],
    status: { type: String, default: 'active' },
  },
  { timestamps: true }
);

// 위치 기반 검색을 위한 2dsphere 인덱스
propertySchema.index({ lat: 1, lng: 1 });

export default mongoose.model<IProperty>('Property', propertySchema);
