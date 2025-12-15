import mongoose from "mongoose";

const connectDB = async ()=> {
    try {
        await mongoose.connect(process.env.MONGO_URI)

        console.log("Database connected successfully");

        mongoose.connection.on("connected", () => {
            console.log("Connected to DB:", mongoose.connection.name);
        });

    } catch(err) {
        console.error("DB Connection Failed:", err);
    }
}

export default connectDB;
