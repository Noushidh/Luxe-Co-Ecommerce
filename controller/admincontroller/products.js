import cloudinary from "../../config/cloudinary.js";
import ProductModel from "../../models/productmodel.js";
import SubCategory from "../../models/subcategory.js";
import asyncHandler from "../../utils/asynHandler.js";
import fs from "fs/promises";
import { HTTP_STATUS } from "../../utils/httpStatus.js";

export const load_Products = asyncHandler(async (req, res) => {
  let { page = 1, search = "", status = "", stock = "", category = "", alpha = "" } = req.query;

  page = parseInt(page);
  const limit = 10;
  let filter = {};

  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }
  if (status === "active") filter.isBlocked = false;
  if (status === "blocked") filter.isBlocked = true;

  if (stock === "in") filter["variants.stock"] = { $gt: 0 };
  if (stock === "out") {
    filter.$expr = { $eq: [{ $sum: "$variants.stock" }, 0] };
  }
  if (category) filter.subCategory_id = category;

  let sortQuery = { createdAt: -1 };

  if (alpha === "az") sortQuery = { name: 1 };
  if (alpha === "za") sortQuery = { name: -1 };

  const skip = (page - 1) * limit;

  const totalProducts = await ProductModel.countDocuments(filter);

  const products = await ProductModel.find(filter).populate("subCategory_id").sort(sortQuery).skip(skip).limit(limit);

  const totalPages = Math.ceil(totalProducts / limit);

  const subcategories = await SubCategory.find({ isBlocked: false });
  res.render("admin/layout", {
    title: "Products",
    body: "./products/products",
    products, currentPage: page, totalPages, search, status, stock, category, alpha, subcategories
  });
});


export const load_add_product = asyncHandler(async (req, res) => {

  const subcategories = await SubCategory.find({ isBlocked: false })
  res.render("admin/layout", {
    title: "Add Product",
    body: "./products/product-form",
    product: null, subcategories
  });
})

export const load_edit_product = asyncHandler(async (req, res) => {

  const { id } = req.params;
  const product = await ProductModel.findById(id).lean();
  const subcategories = await SubCategory.find({ isBlocked: false });
  res.render("admin/layout", {
    title: "Edit Product",
    body: "./products/product-form",
    product, subcategories
  });
});


export const addProduct = asyncHandler(async (req, res) => {
  const { name, description, price, discount, subCategory_id, material, highlights, specifications } = req.body;
  if(!name.trim()||!description.trim()||!material.trim()||!highlights.trim()||!specifications.trim()){
    return res.status(HTTP_STATUS.BAD_REQUEST).json({success:false,message:"Validation Error: Datas are required and cannot be empty spaces."})
  }
  await ProductModel.create({
    name, description, price, discount, subCategory_id, material,
    highlights: highlights ? highlights.split(",").map(h => h.trim()).filter(Boolean) : [],
    specifications,
  });

   res.status(HTTP_STATUS.OK).json({ success: true, message: "Product added successfully!", redirect: "/admin/products" });
});

export const editProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, price, discount, subCategory_id, material, highlights, specifications } = req.body;
    if(!name.trim()||!description.trim()||!material.trim()||!highlights.trim()||!specifications.trim()){
     return res.status(HTTP_STATUS.BAD_REQUEST).json({success:false,message:"Validation Error: Datas are required and cannot be empty spaces."})
  }
  const product = await ProductModel.findById(id);
  if (!product) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Product not found" })
  }
  await ProductModel.findByIdAndUpdate(id, { name, description, price, discount, subCategory_id, material, highlights: highlights ? highlights.split(",").map(h => h.trim()).filter(Boolean) : [], specifications }, { new: true, runValidators: true })
  return res.json({ success: true, message: "Product updated successfully", redirect: "/admin/products" })
})

export const blockProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await ProductModel.findById(req.params.id);
  if (!product) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Product not found" })
  }
  const newStatus = !product.isBlocked;

  await ProductModel.findByIdAndUpdate(id, { isBlocked: newStatus })
  res.json({ success: true, isBlocked: newStatus, message: newStatus ? "Product Blocked" : "Product Unblocked" })
})

export const load_add_variants = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  const product = await ProductModel.findById(productId).lean();

  res.render("admin/layout", {
    title: "Manage Variants",
    body: "products/variants",
    product
  });
});

export const saveVarients = asyncHandler(async (req, res) => {

  const productId = req.body.productId;

  if (!productId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: true, message: "Product ID is missing" })
  }
  const variantsData = JSON.parse(req.body.variants);

  for (const v of variantsData) {
    if (Number(v.size) <= 0 || Number(v.stock) <= 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Size and Stock must be greater than 0" });
    }
  }

  const fileGroups = {};
  for (const file of req.files) {
    if (!fileGroups[file.fieldname]) fileGroups[file.fieldname] = [];
    fileGroups[file.fieldname].push(file);
  }

  const finalVariants = variantsData.map((v, i) => ({
    size: v.size, stock: v.stock, color: v.color, images: (fileGroups[`images_${i}`] || []).map(f => f.path)
  }));

  await ProductModel.findByIdAndUpdate(productId, { $push: { variants: { $each: finalVariants } } })

  const product = await ProductModel.findById(productId);

  if (!product.image && finalVariants[0]?.images?.length) {
    await ProductModel.findByIdAndUpdate(productId, { image: finalVariants[0].images[0] });
  }

  res.json({ success: true, message: "Varients saved successfully", redirect: "/admin/products" })
})

export const load_edit_variants = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  if (!productId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).send("Product ID missing");
  }
  const product = await ProductModel.findById(productId).lean()
  if (!product) {
    return res.status(HTTP_STATUS.NOT_FOUND).send("Product not found");
  }
  res.render("admin/layout", {
    title: "Edit Variants",
    body: "products/edit-variants",
    product,
  });
});

export const updateSingleVariants = asyncHandler(async (req, res) => {
  const { variantId } = req.params;
  const { size, stock, color } = req.body;
  const files = req.files || [];
  let { oldImages } = req.body;

  const cleanupTempFiles = async () => {
    for (const file of files) {
      await fs.unlink(file.path).catch(err => console.error("Failed to clean up temp file:", err));
    }
  };

  if (!oldImages) {
    oldImages = [];
  } else if (!Array.isArray(oldImages)) {
    oldImages = [oldImages];
  }


  if (Number(size) < 0 || Number(stock) < 0) {
    await cleanupTempFiles()
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Size and stock must be positive numbers." });
  }
  const product = await ProductModel.findOne({ "variants._id": variantId });
  if (!product) {
    await cleanupTempFiles()
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Variant not found" });
  }

  const variant = product.variants.id(variantId);

  const existingImages = variant.images;

  const removedImages = existingImages.filter(img => !oldImages.includes(img));

  for (let img of removedImages) {
    try {
      const publicId = img.split("/upload/")[1].split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.log("Failed to delete image:", img);
    }
  }

  const newImages = [];
  for (let file of files) {
    const upload = await cloudinary.uploader.upload(file.path, { folder: "products/variants" });
    newImages.push(upload.secure_url);
  }

  const finalImages = [...oldImages, ...newImages];

  if (finalImages.length < 3) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Please upload at least 3 images" });
  }

  await ProductModel.updateOne(
    { "variants._id": variantId }, {
    $set: { "variants.$.size": size, "variants.$.stock": stock, "variants.$.color": color, "variants.$.images": finalImages }
  })

  const firstVariantId = product.variants[0]._id.toString();

  if (variantId === firstVariantId) {
    await ProductModel.findByIdAndUpdate(product._id, {
      image: finalImages[0]
    });
  }

  const updatedProduct = await ProductModel.findById(product._id);

  const hasAvailableVariant = updatedProduct.variants.some(v => v.isBlocked === false && v.stock > 0);
  let newProductBlockStatus;
  if (!hasAvailableVariant) {
    newProductBlockStatus = true;
  } else {
    newProductBlockStatus = false;
  }
  if (updatedProduct.isBlocked !== newProductBlockStatus) {
    await ProductModel.findByIdAndUpdate(updatedProduct._id, { isBlocked: newProductBlockStatus });
  }

  return res.json({ success: true, message: "Variant updated successfully" });
});

//block and unblock the varients
export const blockVariants = asyncHandler(async (req, res) => {
  const { variantId } = req.params;
  const product = await ProductModel.findOne({ "variants._id": variantId });

  if (!product) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Variant not found" });
  }

  const variant = product.variants.id(variantId);

  if (!variant) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Variant not found in product" });
  }

  const newStatus = !variant.isBlocked;

  await ProductModel.updateOne({ "variants._id": variantId }, { $set: { "variants.$.isBlocked": newStatus } });

  const updatedProduct = await ProductModel.findById(product._id);

  const hasUnblockedVariant = updatedProduct.variants.some(v => v.isBlocked === false);

  let newProductBlockStatus;

  if (!hasUnblockedVariant) {
    newProductBlockStatus = true;
  } else {
    newProductBlockStatus = false;
  }

  if (updatedProduct.isBlocked !== newProductBlockStatus) {
    await ProductModel.findByIdAndUpdate(product._id, { isBlocked: newProductBlockStatus });
  }
  res.json({ success: true, isBlocked: newStatus, message: newStatus ? "Varient Blocked" : "Varient Unblocked" })
});


