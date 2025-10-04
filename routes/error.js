const express = require("express")
const app = express()
const router = express.Router()
const errorController = require("../controllers/error")

router.get(errorController)

module.exports = router