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
const RedisStore = require("connect-redis").RedisStore;
const { createClient } = require("redis");

// const Chat = require('../models/chat');
// const Forum = require('../models/forum');

console.log

const server = http.createServer(app)
// const io = new Server(server);
// console.log(io)



const redisClient = createClient({
    socket: {
        host: "127.0.0.1",
        port: 6379
    }
}); // defaults to localhost: 6379
redisClient.on("connect", () => console.log("Redis Client Connected!"))
redisClient.on("error", (err) => console.error("Redis error", err))


const redisStore = new RedisStore({
    client: redisClient,
    prefix: "chatapp:sess:",
})

const User = require('./models/user');
const Chat = require('./models/chat');
const Forum = require('./models/forum');
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));
// Initialize cookie parser
app.use(cookieParser())

// Enable CSRF protection
app.use(csurf({cookie: true}))

// Middleware to set CSRF token for views or responses
app.use((req, res, next) =>{
    res.cookie('XSRF-TOKEN', req.csrfToken()); // Add token as cookie
    console.log(req.csrfToken())
    next();
})


app.set('view engine', 'ejs');
app.set('views', 'views');

// app.set('view options', {async: true});

app.use(
    session({
        store: redisStore,
        secret: process.env.SESSION_SECRET || "MySecret",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false, // will set to true in production
            httpOnly: true,
            maxAge: 1000 * 60 * 60
        }
    }))

const authenticationRoutes = require('./routes/authentication');
const chatRoutes = require('./routes/chat');

const errorController = require("./controllers/error")
const authenticationController = require("./controllers/autentication")
const chatController = require("./controllers/chat")

// Session Store
const sessionStore = new SequelizeStore({
    db: sequelize,
});


app.use(
    session({
        store: redisStore,
        secret: process.env.SESSION_SECRET ||'myLittleSecret',
        store: sessionStore,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            maxAge: 30 * 60 * 1000, // 30 minutes
            secure: process.env.NODE_ENV === 'production'
        },
    })
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
   
    


// A user can send many messages
User.hasMany(Chat, {foreignKey: 'sender_id', as:'sentMessages'});

// A user can receive many messages
User.hasMany(Chat, {foreignKey: 'receiver_id', as: 'receivedMessages'});

// A user can send many messages to the forum
User.hasMany(Forum, {foreignKey: 'sender_id', as: 'sentForumMessages'});

// A chat belongs to a sender
Chat.belongsTo(User, {foreignKey: 'sender_id', as: 'sender'})

// A chat belongs to a receiver
Chat.belongsTo(User,{ foreignKey:'received_id', as: 'receiver',constraints: true, onDelete: 'CASCADE' })

// A forum_message belongs to a sender
Forum.belongsTo(User,{ foreignKey:'sender_id', as: 'forumSender',constraints: true, onDelete: 'CASCADE' })

sequelize.authenticate().then(()=>console.log('Connection established to:', sequelize.getDatabaseName())).catch(err=> console.error('Unable to connect: ', err))




sequelize
    .sync(
        // { alter: true }
    )
    .then(result =>{
        // console.log(result);
        console.log("Tables created");
        // app.listen(3000); 
}).catch(err =>{
    console.log('Tables not created');
    console.log(err);
})

const expressServer = app.listen(3000)
const io = new Server(expressServer)

const chatNamespace = io.of('/chat')
const forumNamespace = io.of('/forum')

// Chat namespaces
chatNamespace.on('connection', (socket) =>{
    console.log("Connected to chat namespace")
    socket.on("chatMessage", (data) =>{
        console.log(data)
        Chat.create({
                            message: data.message,
                            sender_id: Number(data.sender_id),
                            receiver_id: Number(data.receiver_id)
                        })
                        .then(
                            (result) =>{
                                result = result.get({plain:true})
                                console.log(result)
                                console.log("Message saved!")
                            // res.redirect(`/chat/${receiver_id}`)
                        }).catch(err =>{console.log(err)});
                    
        chatNamespace.emit('chatMessage', data);
           // Handle user disconnect
    socket.on('disconnect', () =>{
        console.log('User disconnected:', )
    })
        
    })
})

// Forum namespace
forumNamespace.on('connection', (socket) =>{
    console.log("Connected to forum namesapce");
    socket.on("forumMessage", (data) =>{
        console.log(data)
        if(data.isForum === "true"){
                        Forum.create({
                            message: data.message,
                            sender_id: data.sender_id
                        })
                        .then(result =>{
                            console.log(result);
                            console.log("Message saved!")
                            // res.redirect('/forum')
                        }).catch(err => {
                            console.log(err)
                        })
        forumNamespace.emit("forumMessage", data);

        // Handle user disconnect
    socket.on('disconnect', () =>{
        console.log('User disconnected:', )
    })
}})
})

