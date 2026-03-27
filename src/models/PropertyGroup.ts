import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPropertyGroup extends Document {
  userId: Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const propertyGroupSchema = new Schema<IPropertyGroup>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

propertyGroupSchema.index({ userId: 1 });

export default mongoose.model<IPropertyGroup>('PropertyGroup', propertyGroupSchema);
