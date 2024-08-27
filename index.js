const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const app = express();
const User = require('./models/user');
const Post = require('./models/post');

mongoose.connect('mongodb://localhost:27017/blog_platform', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
})
.catch((err) => {
    console.error('Error connecting to MongoDB:', err);
});

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Set up session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
}));

// Middleware to make userId available in all EJS templates
app.use((req, res, next) => {
    res.locals.userId = req.session.userId || null; // Set to null if not logged in
    next();
});

// Middleware to redirect to login if not authenticated
const redirectToLoginIfNotAuthenticated = (req, res, next) => {
    if (!req.session.userId) {
        res.redirect('/login');
    } else {
        next();
    }
};

// Redirect to login page on server start
app.get('/', redirectToLoginIfNotAuthenticated, async (req, res) => {
    try {
        const posts = await Post.find({});
        res.render('home', { posts });
    } catch (err) {
        res.send('Error loading posts');
    }
});

// Register route
app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = new User({
            username: req.body.username,
            password: hashedPassword
        });
        await newUser.save();
        req.session.userId = newUser._id; // Store userId in session
        res.redirect('/');
    } catch (err) {
        res.send('Error registering user');
    }
});

// Login route
app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.body.username });
        if (user && await bcrypt.compare(req.body.password, user.password)) {
            req.session.userId = user._id; // Store userId in session
            res.redirect('/');
        } else {
            // res.send('Invalid credentials');
            res.render('invalid');
        }
    } catch (err) {
        res.send('Error logging in');
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.send('Error logging out');
        }
        res.redirect('/login'); // Redirect to login after logout
    });
});

// Compose route
app.get('/compose', redirectToLoginIfNotAuthenticated, (req, res) => {
    res.render('compose');
});

app.post('/compose', redirectToLoginIfNotAuthenticated, async (req, res) => {
    try {
        const newPost = new Post({
            title: req.body.postTitle,
            content: req.body.postContent,
            userId: req.session.userId
        });
        await newPost.save();
        res.redirect('/');
    } catch (err) {
        res.send('Error creating post');
    }
});

// Edit route
app.get('/edit/:id', redirectToLoginIfNotAuthenticated, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (post.userId.toString() === req.session.userId) {
            res.render('edit', { post });
        } else {
            res.send('Not authorized to edit this post');
        }
    } catch (err) {
        res.send('Error loading post');
    }
});

app.post('/edit/:id', redirectToLoginIfNotAuthenticated, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (post.userId.toString() === req.session.userId) {
            post.title = req.body.postTitle;
            post.content = req.body.postContent;
            await post.save();
            res.redirect('/');
        } else {
            res.send('Not authorized to edit this post');
        }
    } catch (err) {
        res.send('Error updating post');
    }
});

// Delete route
app.post('/delete/:id', redirectToLoginIfNotAuthenticated, async (req, res) => {
    const postId = req.params.id;
    try {
        await Post.findByIdAndDelete(postId);
        res.redirect('/');
    } catch (err) {
        console.error("Error deleting post:", err);
        res.status(500).send("Error deleting post");
    }
});

// Individual post view route
app.get('/posts/:id', async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        res.render('post', { post });
    } catch (err) {
        res.send('Error loading post');
    }
});

// My Posts route
app.get('/myposts', redirectToLoginIfNotAuthenticated, async (req, res) => {
    try {
        const userPosts = await Post.find({ userId: req.session.userId });
        res.render('myposts', { posts: userPosts });
    } catch (err) {
        res.send('Error loading posts');
    }
});


// Start the server
app.listen(3000, () => {
    console.log('Server started on http://localhost:3000');
});
