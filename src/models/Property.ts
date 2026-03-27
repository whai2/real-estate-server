import mongoose, { Schema, Document, Types } from 'mongoose';

// 거래 정보
export interface ITrade {
  tradeType: 'sale' | 'investment' | 'charter' | 'monthly';
  price?: number;
  deposit?: number;
  monthlyRent?: number;
  commission: {
    type: 'none' | 'single' | 'double';
    amount?: number;
  };
  fieldInquiry: boolean;
}

// 세대 정보 (오픈현장용)
export interface IUnit {
  floor: string;
  unitNumber: string;
  area?: number;
  rooms?: number;
  price?: string;
  deposit?: string;
  monthlyRent?: string;
}

// 담당자
export interface IContact {
  name: string;
  phone: string;
}

export interface IProperty extends Document {
  userId: Types.ObjectId;
  type: 'open' | 'general';
  title: string;
  address: string;
  addressDetail?: string;
  lat: number;
  lng: number;

  // 매물 유형
  propertyType: 'villa' | 'urban' | 'officetel' | 'apartment' | 'single' | 'multi' | 'commercial';

  // 거래 정보 (다중)
  trades: ITrade[];

  // 구조 정보
  rooms: number;
  bathrooms: number;
  balcony: number;
  utilityRoom: number;
  special: 'none' | 'duplex' | 'terrace';
  area?: number;
  floor?: string;

  // 주차
  parking: string[];

  // 입주 상태
  occupancy: 'none' | 'occupied' | 'vacant' | 'moving';

  // 담당자
  contacts: IContact[];

  // 관리
  management: 'solo' | 'group';
  groupId?: Types.ObjectId;
  memo?: string;

  // 매물 설명
  description?: string;

  // 사진
  photos: { url: string; order: number }[];

  // 세대 (오픈현장용)
  units: IUnit[];

  // 점수/위험도 (대시보드용)
  score: number;
  riskLevel: 'danger' | 'caution' | 'safe';

  // 상태 관리
  status: 'active' | 'hidden' | 'completed' | 'deleted' | 'autoHide';
  lastRefreshedAt: Date;
  autoHideAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const tradeSchema = new Schema<ITrade>(
  {
    tradeType: { type: String, enum: ['sale', 'investment', 'charter', 'monthly'], required: true },
    price: { type: Number },
    deposit: { type: Number },
    monthlyRent: { type: Number },
    commission: {
      type: { type: String, enum: ['none', 'single', 'double'], default: 'none' },
      amount: { type: Number },
    },
    fieldInquiry: { type: Boolean, default: false },
  },
  { _id: false }
);

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

const contactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { _id: false }
);

const propertySchema = new Schema<IProperty>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['open', 'general'], required: true },
    title: { type: String, required: true },
    address: { type: String, required: true },
    addressDetail: { type: String },
    lat: { type: Number },
    lng: { type: Number },

    propertyType: {
      type: String,
      enum: ['villa', 'urban', 'officetel', 'apartment', 'single', 'multi', 'commercial'],
      default: 'villa',
    },

    trades: [tradeSchema],

    rooms: { type: Number, default: 0 },
    bathrooms: { type: Number, default: 0 },
    balcony: { type: Number, default: 0 },
    utilityRoom: { type: Number, default: 0 },
    special: { type: String, enum: ['none', 'duplex', 'terrace'], default: 'none' },
    area: { type: Number },
    floor: { type: String },

    parking: [{ type: String, enum: ['parallel', 'double', 'mechanical', 'impossible'] }],

    occupancy: { type: String, enum: ['none', 'occupied', 'vacant', 'moving'], default: 'none' },

    contacts: [contactSchema],

    management: { type: String, enum: ['solo', 'group'], default: 'solo' },
    groupId: { type: Schema.Types.ObjectId, ref: 'PropertyGroup' },
    memo: { type: String },

    description: { type: String },

    photos: [
      {
        url: { type: String, required: true },
        order: { type: Number, default: 0 },
      },
    ],

    units: [unitSchema],

    score: { type: Number, default: 80, min: 0, max: 100 },
    riskLevel: { type: String, enum: ['danger', 'caution', 'safe'], default: 'safe' },

    status: {
      type: String,
      enum: ['active', 'hidden', 'completed', 'deleted', 'autoHide'],
      default: 'active',
    },
    lastRefreshedAt: { type: Date, default: Date.now },
    autoHideAt: { type: Date },
  },
  { timestamps: true }
);

// 인덱스
propertySchema.index({ lat: 1, lng: 1 });
propertySchema.index({ userId: 1, status: 1 });
propertySchema.index({ status: 1, lastRefreshedAt: 1 });
propertySchema.index({ groupId: 1 });

export default mongoose.model<IProperty>('Property', propertySchema);
