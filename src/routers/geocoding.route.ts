import express from "express";
import { addNewUserAddressController, deleteUserAddressController, fgcController, getAllStoreController, getRajongCityByProvinceId, getRajongDistrictByCityId, getRajongProvince, getUserAddressController, rgcController, setUserDefaultAddressController } from "../controllers/geocoding.controller";
import { mainVerifyToken } from "../middlewares/jwt.middleware";

const geoCodingRouter = express.Router();

geoCodingRouter.get("/rgc", rgcController);
geoCodingRouter.get("/fgc", fgcController);
geoCodingRouter.post("/add-new-user-address", mainVerifyToken, addNewUserAddressController);
geoCodingRouter.get("/user-address", mainVerifyToken, getUserAddressController);
geoCodingRouter.post("/set-user-default-address", mainVerifyToken, setUserDefaultAddressController);
geoCodingRouter.delete("/delete-user-address", mainVerifyToken, deleteUserAddressController);
geoCodingRouter.get("/get-all-store", mainVerifyToken, getAllStoreController);

// !WARNING:RAJONG STUFFS BELOW
geoCodingRouter.get("/rajong-province", getRajongProvince);
geoCodingRouter.get("/rajong-city", getRajongCityByProvinceId);
geoCodingRouter.get("/rajong-district", getRajongDistrictByCityId);

export default geoCodingRouter;