import express, {Router} from "express";
import {userReportController} from "@/controllers/userReportController";

export const userReportRouter: Router = express.Router();

userReportRouter.post("/", userReportController.create)
userReportRouter.get("/", userReportController.index)
userReportRouter.post("/:id/votes", userReportController.vote)
