import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOpenSite extends Document {
  userId: Types.ObjectId;
  title: string;
  address: string;
  addressDetail?: string;
  lat: number;
  lng: number;

  propertyType: 'villa' | 'urban' | 'officetel' | 'apartment' | 'single' | 'multi' | 'commercial';

  // 단지 정보
  complex: {
    buildings?: number;
    units?: number;
    rooms?: number;
  };

  parking: string[];
  management: 'solo' | 'group';
  contacts: { name: string; phone: string }[];

  // 일정
  scheduledDate: Date;
  surveyStatus: 'none' | 'planned' | 'completed';

  description?: string;
  photos: { url: string; order: number }[];

  createdAt: Date;
  updatedAt: Date;
}

const openSiteSchema = new Schema<IOpenSite>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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

    complex: {
      buildings: { type: Number },
      units: { type: Number },
      rooms: { type: Number },
    },

    parking: [{ type: String, enum: ['parallel', 'double', 'mechanical', 'impossible'] }],
    management: { type: String, enum: ['solo', 'group'], default: 'solo' },
    contacts: [
      {
        name: { type: String, required: true },
        phone: { type: String, required: true },
      },
    ],

    scheduledDate: { type: Date, required: true },
    surveyStatus: { type: String, enum: ['none', 'planned', 'completed'], default: 'none' },

    description: { type: String },
    photos: [
      {
        url: { type: String, required: true },
        order: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

openSiteSchema.index({ userId: 1, scheduledDate: 1 });
openSiteSchema.index({ scheduledDate: 1 });

export default mongoose.model<IOpenSite>('OpenSite', openSiteSchema);
