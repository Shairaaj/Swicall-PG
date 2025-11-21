import mongoose from "mongoose";

const NoSchema = new mongoose.Schema({}, { strict: false });

const contactModel = mongoose.model("MyCollection", NoSchema);


export default contactModel;
