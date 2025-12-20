import userModal from "../../models/usermodel.js"
import asyncHandler from "../../utils/asynHandler.js";
import addressModel from "../../models/addressmodel.js"

export const load_address = asyncHandler(async (req, res) => {
    const from = req.query.from || "address";

    if (!req.session.user || !req.session.user._id) {
        return res.redirect('/login');
    }
    const userId = req.session.user._id;

    const userData = await userModal.findById(userId);

    const addresses = await addressModel.find({ userId: userId }).sort({ isDefault: -1, createdAt: 1 });

    res.render('user/layout', {
        title: "Address",
        body: "user/address/address",
        userData, addresses, from,
        currentPath: '/user/address'
    });
});

export const addAddress = asyncHandler(async (req, res) => {
    const { type, name, phone, street, street2, city, state, pincode, from } = req.body;
    console.log(req.body)
    const phoneRegex = /^(?:\+91|0)?[6-9]\d{9}$/;

    if (!phone || !phoneRegex.test(phone)) {
        return res.status(400).json({ success: false, message: "Invalid phone number" });
    }

    const normalizedPhone = phone.replace(/^\+91|^0/, "");

    if (!name || !street || !city || !state || !pincode) {
        return res.status(400).json({ success: false, message: "All required fields must be filled" });
    }

    const userId = req.session.user._id;

    const newAddress = { userId: userId, type, name, phone: normalizedPhone, street, street2, city, state, pincode, isDefault: false };

    await addressModel.create(newAddress);


    return res.status(201).json({ success: true, message: "Address added successfully", redirectTo: from === "checkout" ? "/user/checkout" : null });
})

export const editAddress = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { type, name, phone, street, street2, city, state, pincode, from } = req.body;
    console.log(req.body)
    const phoneRegex = /^(?:\+91|0)?[6-9]\d{9}$/;

    if (!phone || !phoneRegex.test(phone)) {
        return res.status(400).json({ success: false, message: "Invalid phone number" });
    }

    const normalizedPhone = phone.replace(/^\+91|^0/, "");

    if (!name || !street || !city || !state || !pincode) {
        return res.status(400).json({ success: false, message: "All required fields must be filled" });
    }

    const userId = req.session.user._id;

    await addressModel.findOneAndUpdate({ _id: id, userId }, { type, name, phone: normalizedPhone, street, street2, city, state, pincode }, { new: true })

    return res.status(200).json({ success: true, message: "Address updated successfully", redirectTo: from === "checkout" ? "/user/checkout" : null })
})

//update default address
export const setDefaultAddress = asyncHandler(async (req, res) => {
    const userId = req.session.user._id;
    const { addressId } = req.params;
    console.log(req.params);
    await addressModel.updateMany({ userId }, { $set: { isDefault: false } });
    await addressModel.findByIdAndUpdate(addressId, { isDefault: true })
    return res.status(200).json({ success: true })
})

export const deleteAddress = asyncHandler(async (req, res) => {
    const { id } = req.params;
    console.log(id)
    const userId = req.session.user._id;

    await addressModel.findOneAndDelete({ _id: id, userId: userId })

    return res.status(200).json({ success: true, message: "Address deleted successfully." })
})