import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUnit {
  floor: string;
  unitNumber: string;
  area?: number;
  rooms?: number;
  price?: string;
  deposit?: string;
  monthlyRent?: string;
}

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
  units: IUnit[];
  description?: string;
  images: { url: string; order: number }[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const unitSchema = new Schema<IUnit>(
  {
    floor: { type: String, required: true },
    unitNumber: { type: String, required: true },
    area: { type: Number },
    rooms: { type: Number },
    price: { type: String },
    deposit: { type: String },
    monthlyRent: { type: String },
  },
  { _id: false }
);

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
    units: [unitSchema],
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
