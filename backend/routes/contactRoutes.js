import { Router } from "express";
import {createContacts} from "../controllers/contactController.js";

const router = Router();

router.post("/saveContacts",createContacts);


export default router;