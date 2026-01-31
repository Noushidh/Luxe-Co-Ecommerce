
import Usermodel from "../../models/usermodel.js";
import asyncHandler from "../../utils/asynHandler.js";
import { HTTP_STATUS } from "../../utils/httpStatus.js";
import orderModel from "../../models/ordermodel.js";

export const load_customers = asyncHandler(async (req, res) => {

  let { page = 1, search = "", status = "", alpha = "" } = req.query;
  page = parseInt(page);

  let filter = {};

  if (search) {
    filter.$or = [
      { fullname: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } }
    ];
  }

  if (status === "active") filter.isBlocked = false;
  if (status === "blocked") filter.isBlocked = true;

  let sortQuery = { createdAt: -1 };

  if (alpha === "az") sortQuery = { fullname: 1 };
  if (alpha === "za") sortQuery = { fullname: -1 };

  const limit = 10;
  const skip = (page - 1) * limit;

  const totalUsers = await Usermodel.countDocuments(filter);

  const users = await Usermodel.find(filter).collation({ locale: "en", strength: 1 }).sort(sortQuery).skip(skip).limit(limit);    

  const totalPages = Math.ceil(totalUsers / limit);

  res.render("admin/layout", {
    title: "Customers",
    body: "./customers",
    users,currentPage: page,totalPages,search,status,alpha
  });
});


export const blockUser = asyncHandler(async (req, res) => {

  const user = await Usermodel.findById(req.params.id);

  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "user not found" })
  }

  const newStatus = !user.isBlocked;

  await Usermodel.findByIdAndUpdate(req.params.id, { isBlocked: newStatus })

  res.json({ success: true, isBlocked: newStatus, message: newStatus ? "User Blocked" : "User Unblocked" })

});
