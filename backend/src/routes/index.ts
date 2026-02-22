import { Router } from "express";
import { createPayoutsRouter } from "./payouts";
import { createWorkerRouter } from "./worker";
import { createAuthRouter } from "./auth";
import type { PayoutsController } from "../controllers/payouts.controller";
import type { WorkerController } from "../controllers/worker.controller";
import type { AuthController } from "../controllers/auth.controller";
import type { RequestHandler } from "express";

export function createApiRouter(
  payoutsController: PayoutsController,
  workerController: WorkerController,
  authController: AuthController,
  requireAuth: RequestHandler
): Router {
  const router = Router();

  router.use("/auth", createAuthRouter(authController, requireAuth));
  router.use("/payouts", createPayoutsRouter(payoutsController));
  router.use("/worker", createWorkerRouter(workerController));

  return router;
}
