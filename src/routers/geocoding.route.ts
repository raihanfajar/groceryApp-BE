import express from "express";
import { addNewUserAddressController, fgcController, getUserAddressController, rgcController } from "../controllers/geocoding.controller";
import { mainVerifyToken } from "../middlewares/jwt.middleware";

const geoCodingRouter = express.Router();

geoCodingRouter.get("/rgc", rgcController);
geoCodingRouter.get("/fgc", fgcController);
geoCodingRouter.post("/add-new-user-address", mainVerifyToken, addNewUserAddressController);
geoCodingRouter.get("/user-address", mainVerifyToken, getUserAddressController);

export default geoCodingRouter;