const express = require("express")
const app = express()
const router = express.Router()
// const chatController = require("../controllers/chat")
const authenticationController = require("../controllers/autentication")


router.get('/', authenticationController.getSignUp)
router.get('/signin', authenticationController.getSignIn)
router.post('/signup', authenticationController.postSignUp)
router.post('/signin', authenticationController.postSignIn)


module.exports = router