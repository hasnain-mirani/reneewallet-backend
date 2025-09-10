import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middleware/validate";
import { addressParamSchema, trc20BalanceParams, transfersQuery, transferBody } from "../validators/tronValidators";
import { getAccount, getTrc20Balance, getTrc20Transfers, postTrc20Transfer } from "../controllers/tronController";

const router = Router();

router.get("/account/:address",
  validate(addressParamSchema, "params"),
  asyncHandler(getAccount),
);

router.get("/trc20/:tokenAddress/balance/:address",
  validate(trc20BalanceParams, "params"),
  asyncHandler(getTrc20Balance),
);

router.get("/account/:address/trc20-transfers",
  validate(addressParamSchema, "params"),
  validate(transfersQuery, "query"),
  asyncHandler(getTrc20Transfers),
);

router.post("/trc20/transfer",
  validate(transferBody, "body"),
  asyncHandler(postTrc20Transfer),
);

export default router;