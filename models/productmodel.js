import mongoose from "mongoose";

const variantSchema = new mongoose.Schema({
  color: { type: String, required: true, trim: true },
  size: { type: String, required: true, trim: true },
  stock: { type: Number, required: true, min: 0 },
  images: {
  type: [String],
   validate: {
    validator: arr => arr.length >= 3,
    message: "Each variant must have at least 3 images"
  }
},
  isBlocked: { type: Boolean, default: false }
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    description: { type: String, required: true, trim: true },

    discount: { type: Number, default: 0, min: 0, max: 90 },

    price: { type: Number, required: true, min: 0 },

    subCategory_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true
    },

    material: { type: String, required: true },

    highlights: { type: [String], default: [] },

    specifications: { type: Object, default: {} },
    
    image: { type: String, default: "" },

    variants: [variantSchema],

    isBlocked: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const ProductModel = mongoose.model("Product", productSchema);
export default ProductModel;