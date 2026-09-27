import express, { type Router } from "express";

import type { UserReportController } from "../controllers/userReportController";

export function createUserReportRouter(controller: UserReportController): Router {
    const router = express.Router();

    router.post("/", controller.create);
    router.get("/", controller.index);
    router.post("/:id/votes", controller.vote);

    return router;
}
