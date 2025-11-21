import mongoose from "mongoose";

const connectDB = async()=>{
    try {
        await mongoose.connect("mongodb://localhost:27017/swicall");
        console.log("Swicall connected....");
    } catch (error) {
        console.log("Error connected");
    }
}

export default connectDB;