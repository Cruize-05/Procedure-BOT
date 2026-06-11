import mongoose from 'mongoose';

const stepSchema = new mongoose.Schema(
  {
    step_number: { type: Number, required: true },
    instruction: { type: String, required: true },
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
    name: {
      en: { type: String, required: true },
      fr: { type: String, required: true },
    },
    target_office: {
      en: { type: String, required: true },
      fr: { type: String, required: true },
    },
    official_cost_cfa: {
      type: Number,
      default: 0,
    },
    estimated_timeline: {
      en: { type: String, required: true },
      fr: { type: String, required: true },
    },
    required_documents: {
      en: { type: [String], required: true },
      fr: { type: [String], required: true },
    },
    steps: {
      en: { type: [stepSchema], required: true },
      fr: { type: [stepSchema], required: true },
    },
  },
  {
    timestamps: true,
    collection: 'procedures',
  }
);

export const Procedure =
  mongoose.models.Procedure ?? mongoose.model('Procedure', procedureSchema);
