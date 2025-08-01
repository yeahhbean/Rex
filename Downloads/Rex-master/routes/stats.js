const express = require("express");
const router = express.Router();
const statsController = require("../controllers/statsController");
const { verifyToken } = require("./auth");

router.get("/", verifyToken, statsController.renderStatsPage);
module.exports = router;
