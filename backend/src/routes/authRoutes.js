const express = require("express");
const router = express.Router();
const authConroller = require("../controllers/authController");

router.post("/register", authConroller.register);
router.post("/login", authConroller.login);

module.exports = router;
