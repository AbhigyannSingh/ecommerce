const port = 4000;
const express = require("express"); // Framework to handle routing and middleware
const app = express();
const mongoose = require("mongoose"); // For MongoDB connection.
const jwt = require("jsonwebtoken"); // To handle user authentication.
const multer = require("multer"); // For file uploading (used here for images)
const path = require("path"); // For handling file paths.
const cors = require("cors"); // To enable cross-origin requests
const bcrypt = require("bcryptjs"); // For hashing and salting passwords

app.use(express.json()); // Express middleware to parse incoming JSON requests.
app.use(cors()); // Enables Cross-Origin Resource Sharing, allowing requests from different origins.

// Database connection with MongoDB
mongoose.connect("mongodb+srv://abhigyansingh419:PPpwHS5XHwUvVxu7@cluster0.jia9fzg.mongodb.net/e-commerce");
console.log("db");

// API creation
app.get("/", (req, res) => {
    res.send("Express App is Running");
});

// Image storage engine
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });
app.use('/images', express.static('upload/images'));

// Creating Upload Endpoint for images
app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    });
});

// Schema for creating products
const Product = mongoose.model("Product", {
    id: { type: Number, required: true },
    name: { type: String, required: true },
    image: { type: String, required: true },
    category: { type: String, required: true },
    new_price: { type: Number, required: true },
    old_price: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    available: { type: Boolean, default: true },
});

// API for adding a product
app.post('/addproduct', async (req, res) => {
    let products = await Product.find({});
    let id = (products.length > 0) ? products.slice(-1)[0].id + 1 : 1;
    
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price
    });

    await product.save();
    res.json({ success: true, name: req.body.name });
});

// API for deleting a product
app.post('/removeproduct', async (req, res) => {
    await Product.findOneAndDelete({ id: req.body.id });
    res.json({ success: true });
});

// API for getting all products
app.get('/allproducts', async (req, res) => {
    let products = await Product.find({});
    res.send(products);
});

// Schema for creating users
const Users = mongoose.model('Users', {
    name: { type: String },
    email: { type: String, unique: true },
    password: { type: String },
    cartData: { type: Object },
    date: { type: Date, default: Date.now }
});

// API for user sign-up
app.post('/signup', async (req, res) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(req.body.email)) {
        return res.status(400).json({ success: false, errors: "Invalid email format" });
    }

    let check = await Users.findOne({ email: req.body.email });
    if (check) {
        return res.status(400).json({ success: false, errors: "Existing user found with the same email ID" });
    }

    let cart = {};
    for (let i = 0; i < 300; i++) {
        cart[i] = 0;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    const user = new Users({
        name: req.body.username,
        email: req.body.email,
        password: hashedPassword, // Store the hashed password
        cartData: cart,
    });

    await user.save();

    const data = { user: { id: user.id } };
    const token = jwt.sign(data, 'secret_ecom', { expiresIn: '24h' });
    res.json({ success: true, token });
});

// API for user login
app.post('/login', async (req, res) => {
    let user = await Users.findOne({ email: req.body.email });
    if (user) {
        const passCompare = await bcrypt.compare(req.body.password, user.password);
        if (passCompare) {
            const data = { user: { id: user.id } };
            const token = jwt.sign(data, 'secret_ecom', { expiresIn: '24h' });
            res.json({ success: true, token });
        } else {
            res.json({ success: false, errors: "Wrong Password" });
        }
    } else {
        res.json({ success: false, errors: "Wrong Email-id" });
    }
});

// API for fetching new collection
app.get('/newcollections', async (req, res) => {
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    res.send(newcollection);
});

// API for fetching popular items in women's section
app.get('/popularinwomen', async (req, res) => {
    let products = await Product.find({ category: "women" });
    let popular_in_women = products.slice(0, 4);
    res.send(popular_in_women);
});

// Middleware to fetch user using JWT
const fetchUser = async (req, res, next) => {
    const token = req.header('auth-token');
    if (!token) {
        return res.status(401).send({ errors: "Please authenticate using a valid token" });
    }
    try {
        const data = jwt.verify(token, 'secret_ecom');
        req.user = data.user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).send({ errors: "Token expired. Please log in again." });
        }
        return res.status(401).send({ errors: "Please authenticate using a valid token" });
    }
};

// API for adding products to cart
app.post('/addtocart', fetchUser, async (req, res) => {
    let userData = await Users.findOne({ _id: req.user.id });
    userData.cartData[req.body.itemId] += 1;
    await Users.findByIdAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.send("Added");
});

// API for removing products from cart
app.post('/removefromcart', fetchUser, async (req, res) => {
    let userData = await Users.findOne({ _id: req.user.id });
    if (userData.cartData[req.body.itemId] > 0) {
        userData.cartData[req.body.itemId] -= 1;
    }
    await Users.findByIdAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.send("Removed");
});

// API for getting cart data
app.post('/getcart', fetchUser, async (req, res) => {
    try {
        let userData = await Users.findOne({ _id: req.user.id });
        res.json(userData.cartData);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start the server
app.listen(port, (error) => {
    if (!error) {
        console.log("Server Running on Port " + port);
    } else {
        console.log("Error: " + error);
    }
});
