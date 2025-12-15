import mongoose from "mongoose";

const subCategorySchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["Men", "Women", "Kids"],  // FIXED categories
      required: true,
    },

    subcategory: {
      type: String,
      required: true,
      trim: true,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);

subCategorySchema.index({ category: 1, subcategory: 1 }, { unique: true });

export default mongoose.model("SubCategory", subCategorySchema);
