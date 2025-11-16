const express = require("express");
const cors = require("cors");
const { signup, login } = require("../controllers/authController");

const router = express.Router();

router.options("*", cors());

router.post("/signup", cors(), signup);
router.post("/login", cors(), login);

module.exports = router;
