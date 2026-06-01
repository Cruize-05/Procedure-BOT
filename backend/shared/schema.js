import mongoose from 'mongoose';

const stepSchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    description: { type: String, required: true },
  },
  { _id: false }
);

const localizedContentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    steps: { type: [stepSchema], required: true },
    required_documents: { type: [String], required: true },
    fees: { type: String, required: true },
    estimated_duration: { type: String, required: true },
    issuing_authority: { type: String, required: true },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const procedureSchema = new mongoose.Schema(
  {
    procedure_code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    en: { type: localizedContentSchema, required: true },
    fr: { type: localizedContentSchema, required: true },
    tags: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: 'procedures',
  }
);

export const Procedure =
  mongoose.models.Procedure ?? mongoose.model('Procedure', procedureSchema);
