import express from "express";
import { addNewUserAddressController, deleteUserAddressController, fgcController, getAllStoreController, getUserAddressController, rgcController, setUserDefaultAddressController } from "../controllers/geocoding.controller";
import { mainVerifyToken } from "../middlewares/jwt.middleware";

const geoCodingRouter = express.Router();

geoCodingRouter.get("/rgc", rgcController);
geoCodingRouter.get("/fgc", fgcController);
geoCodingRouter.post("/add-new-user-address", mainVerifyToken, addNewUserAddressController);
geoCodingRouter.get("/user-address", mainVerifyToken, getUserAddressController);
geoCodingRouter.post("/set-user-default-address", mainVerifyToken, setUserDefaultAddressController);
geoCodingRouter.delete("/delete-user-address", mainVerifyToken, deleteUserAddressController);
geoCodingRouter.get("/get-all-store", mainVerifyToken, getAllStoreController);

export default geoCodingRouter;