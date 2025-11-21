import contactModel from "../models/contactModel.js";

const createContacts = async(req,res)=>{
    try {
        const res = contactModel.insertOne(req.body);
        res.status(200).json({success:"done"})
    } catch (error) {
        res.status(500).json({error:error.message});
    }
}


export {createContacts};