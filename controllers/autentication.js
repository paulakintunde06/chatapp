const User = require('../models/user')
const bcrypt = require('bcryptjs')


exports.isAuthenticated = (req, res, next) =>{
    // console.log(req.session.user_id)
    // console.log("This is the authentication section")
    if (req.session.user_id){
        return next()
    } else{
        res.redirect('/signin')
    }
}
exports.getSignUp = (req, res, next) =>{
    res.render('index', {csrfToken: req.csrfToken()})
}


exports.getSignIn = (req, res, next) =>{

    res.render('signin', {csrfToken: req.csrfToken()})
}


exports.postSignUp = async (req, res, next) => {
    console.log("postSignUp")

    // console.log(req.body);
    const username = req.body.username;
    const password = req.body.password;
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?_&])[A-Za-z\d@$!%*?_&]{8,}$/;

    try {
        // Check password strength 
        if (!strongPasswordRegex.test(password)) {
            req.flash('error_msg', 'Password must be at least 8 characters long and contain uppercase, lowercase, a number, and a special character');
            return res.redirect('/')
        }

        // Check if username exists
        const existingUser = await User.findOne({ where: { username: username } });
        if (existingUser) {
            console.log('User already exist!')
            // req.flash('error_msg', 'User already exist!')
            return res.redirect('/')
        }

        // Hash password and create user
        const hashPassword = await bcrypt.hash(password, 10);
        await User.create({
            username: username,
            password: hashPassword
        });
        console.log("This is ...")
        req.flash('success_msg', 'Registration successful!')

        req.session.save((err) => {
            if (err) {
                console.error('Session save error during signup:', err);
                return res.redirect('/signin');
            }
            console.log("Signup successful, redirecting to signin");
            return res.redirect('/signin');
        })
    } catch (error) {
        console.log("Error during signup:", error);
        req.flash('error_msg', 'An error occured during registration');
        return res.redirect('/');
    }
}


exports.postSignIn = async (req, res, next) =>{
    let {username, password} = req.body;

    try {
        console.log("=== SIGNIN ATTEMPT ===")
        console.log("Username:", username)

        // Input Validation
        if (!username || !password) {
            req.flash('error_msg', 'Please provide both username and password');
            return res.redirect('/signin')
        }

        // Find user
        const user = await User.findOne({ where: { username } });
        if (!user) {
            console.log('User not found: ', username)
            req.flash('error_msg', 'Invalid username or password');
            return res.redirect('/signin')
        }

        // Compare Password
        const userData = user.get({plain:true})
        const isMatch = await bcrypt.compare(password, userData.password);
        if (!isMatch) {
            console.log('Password mismatch for user:', username);
            req.flash('error_msg', "Invalid username or password");
            return res.redirect('/signin');
        }

        // Set session data
        req.session.user_id = userData.id
        req.session.username = userData.username;

        console.log("Login Successful for user:", username);
        console.log("Session user_id set to:", req.session.user_id);

        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                req.flash('error_msg', 'Login faied');
                return res.redirect('/signin');
            }
            console.log("Session saved successfully, redirecting...");
            // SINGLE redirect for success
            return res.redirect('/dashboard'); // FINAL return
        }) 
    } catch (error) {
        console.error('LOGIN ERROR: ', error);
        req.flash('error_msg', 'An error occured logging in');
        return res.redirect('/signin')
    }           
                    }
