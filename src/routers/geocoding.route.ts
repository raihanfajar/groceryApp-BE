import express from "express";
import { fgcController, rgcController } from "../controllers/geocoding.controller";

const geoCodingRouter = express.Router();

geoCodingRouter.get("/rgc", rgcController);
geoCodingRouter.get("/fgc", fgcController);

export default geoCodingRouter;