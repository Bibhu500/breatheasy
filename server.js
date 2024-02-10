const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB Atlas URI
const uri = 'mongodb+srv://bibhu500:JITwdWLIbLPKtxy4@cluster1.bsdgv4s.mongodb.net/ieltsusers?retryWrites=true&w=majority';

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: 'secret', // Change this to a random string
    resave: true,
    saveUninitialized: true
}));

// Connect to MongoDB Atlas
let db;
MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        console.log('Connected to MongoDB Atlas');
        db = client.db('ieltsusers');
    })
    .catch(err => console.error('Error connecting to MongoDB Atlas:', err));


app.use(express.static(__dirname));

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

// Serve registration page
app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/register.html');
});

// Handle registration POST request
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Check if the username already exists in the database
        const existingUser = await db.collection('users').findOne({ username });
        if (existingUser) {
            return res.status(400).send('Username already exists');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the new user into the database
        await db.collection('users').insertOne({ username, password: hashedPassword });

        // Redirect to login page after successful registration
        res.redirect('/login');
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Handle login POST request
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find the user by username in the database
        const user = await db.collection('users').findOne({ username });
        if (!user) {
            return res.status(400).send('Invalid username or password');
        }

        // Check if the password matches
        if (await bcrypt.compare(password, user.password)) {
            // Store the user in the session
            req.session.user = user;
            // Redirect to the breathing app page after successful login
            res.redirect('/breathapp.html');
        } else {
            res.status(400).send('Invalid username or password');
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Serve the breathing app page
app.get('/breathapp.html', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }
    res.sendFile(__dirname + '/breathapp.html');
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error during logout:', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.redirect('/login');
        }
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
