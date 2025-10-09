const express = require("express")
const app = express();
const bodyParser = require("body-parser")
const path = require('path'); 
const csurf = require('csurf');
const cookieParser = require('cookie-parser');
const sequelize = require('./util/database');
// npm install express-session connect-session-sequelize
const session = require('express-session')
const SequelizeStore = require('connect-session-sequelize')(session.Store)
const bcrypt = require("bcryptjs");
const http = require('http');
const {Server} = require('socket.io');
const flash = require('connect-flash');
const helmet = require('helmet');
const compression = require('compression');


const server = http.createServer(app)
// const io = new Server(server);
// console.log(io)


// app.use(helmet({
//     contentSecurityPolicy: {
//         directives: {
//             defaultSrc: ["'self'"],
//             scriptSrc: ["'self'", "'unsafe-inline'", "http://localhost:3000"],
//             connectSrc: ["'self'", "ws://localhost:3000", "http://localhost:3000"],
//             styleSrc: ["'self'", "'unsafe-inline'"]
//         }
//     }
// }))
const isProduction = process.env.NODE_ENV === 'production';

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                ...(isProduction ? [] : ["'unsafe-inline'", "http://localhost:3000"])
            ],
            connectSrc: [
                "'self'",
                isProduction ? "https://chatapp-mw90.onrender.com/" : "http://localhost:3000",
                isProduction ? "ws://chatapp-mw90.onrender.com/ ": "ws://localhost:3000"],
            styleSrc: ["'self'", "'unsafe-inline'"]

        }
    }
}))
app.use(compression())
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize cookie parser
app.use(cookieParser())

// // Enable CSRF protection
app.use(csurf({
    cookie: true,
    ignoreMethods: ['POST', 'GET', 'HEAD', 'OPTIONS']
}))

// // Middleware to set CSRF token for views or responses
app.use((req, res, next) => {
    res.cookie('XSRF-TOKEN', req.csrfToken()); // Add token as cookie
    // console.log(req.csrfToken())
    next();
})


app.set('view engine', 'ejs');
app.set('views', 'views');


const sessionMiddleware =
session({
    // store: SequelizeStore,
    secret: process.env.SESSION_SECRET || "MySecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // will set to true in production
        httpOnly: true,
        maxAge: 1000 * 60 * 60
    }
})
const User = require('./models/user');
const Chat = require('./models/chat');
const Forum = require('./models/forum');

const authenticationRoutes = require('./routes/authentication');
const chatRoutes = require('./routes/chat');

const errorController = require("./controllers/error")
const authenticationController = require("./controllers/autentication")
const chatController = require("./controllers/chat");
const { contentSecurityPolicy } = require("helmet");

// Session Store
const sessionStore = new SequelizeStore({
    db: sequelize,
});


app.use(
   sessionMiddleware
    );
    
app.use(flash())
    
    // Sync the session store
sessionStore.sync();
    app.use((req, res, next) =>{
        res.locals.success_msg = req.flash('success_msg');
        res.locals.error_msg = req.flash('error_msg');
        next();
    })
    
    app.use(authenticationRoutes);
    app.use(chatRoutes);
    app.use(errorController.get404);
   
//     app.get('/test-db', async (req, res) => {
//     console.log("Test-db")
//     try {
//         const chatTest = await Chat.create({
//             message: "Test chat message",
//             sender_id: 1,
//             receiver_id: 2
//         })
//     } catch(error) {
//         res.json({
//             success: false,
//             error: error.message
//         })
//     }
// })



// A user can send many messages
User.hasMany(Chat, {foreignKey: 'sender_id', as:'sentMessages'});

// A user can receive many messages
User.hasMany(Chat, {foreignKey: 'receiver_id', as: 'receivedMessages'});

// A user can send many messages to the forum
User.hasMany(Forum, {foreignKey: 'sender_id', as: 'sentForumMessages'});

// A chat belongs to a sender
Chat.belongsTo(User, {foreignKey: 'sender_id', as: 'sender'})

// A chat belongs to a receiver
Chat.belongsTo(User,{ foreignKey:'receiver_id', as: 'receiver',constraints: true, onDelete: 'CASCADE' })

// A forum_message belongs to a sender
Forum.belongsTo(User,{ foreignKey:'sender_id', as: 'forumSender',constraints: true, onDelete: 'CASCADE' })

sequelize.authenticate().then(()=>console.log('Connection established to:', sequelize.getDatabaseName())).catch(err=> console.error('Unable to connect: ', err))




sequelize
    .sync(
    { alter: true }
        // {force: true}
    )
    .then(result => {
        // console.log(result)
        console.log("All models are synchronized successfully");
        console.log("Tables created");
        // app.listen(3000); 
}).catch(err =>{
    console.log('Tables not created');
    console.log(err);
})


// const expressServer = app.listen(3000)
const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            callback(null, true)
        },
        methods: ['GET', 'POST']
    }
});
// console.log("SERVER")
io.on('connection', (socket) => {
    console.log('ROOT')
    socket.on('disconnect', () => {
        console.log("ROOT disconnect")
    })
})
const chatNamespace = io.of('/chat')
const forumNamespace = io.of('/forum')


// Chat namespaces
chatNamespace.on('connection', (socket) =>{
    console.log("Connected to chat namespace")
    socket.on("chatMessage", (data) =>{
        console.log(data)
        console.log("Chat message received from:", socket.id)
        Chat.create({
            message: data.message,
            sender_id: Number(data.sender_id),
            receiver_id: Number(data.receiver_id)
        })
            .then(
                (result) => {
                    result = result.get({ plain: true })
                    console.log(result)
                    console.log("Message saved!")
                    // res.redirect(`/chat/${receiver_id}`)
                    chatNamespace.emit('chatMessage', data);
                }).catch(err => {
                    console.log(err);
                            
                });
                        // chatNamespace.emit('chatMessage', data);
                    
                        })
                        // Handle user disconnect
        socket.on('disconnect', () =>{
            console.log('User disconnected:', socket.id)
        
    })
})

// Forum namespace
forumNamespace.on('connection', (socket) =>{
    console.log("Connected to forum namesapce");
    socket.on("forumMessage", async(data) =>{
        console.log(data)
        if (data.isForum === "true") {
            await User.findByPk(data.sender_id).then(user => {
                console.log(user.username);
                Forum.create({
                    message: data.message,
                    sender_id: data.sender_id,
                    username: user.username
                })
                .then(result =>{
                    console.log(result);
                    console.log("Message saved!")
                    forumNamespace.emit("forumMessage",
                        {
                    message: data.message,
                    sender_id: data.sender_id,
                    username: user.username
                }
                    );
                    // res.redirect('/forum')
                }).catch(err => {
                    console.log(err)
                })
                
            })

                    }})
                    // Handle user disconnect
                socket.on('disconnect', () =>{
                    console.log('User disconnected:', )
                })
})

server.listen(3000, () => {
    console.log("Server running on localhost")
    console.log("Socket.IO ready for connection")
})

