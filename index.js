const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yf0cbug.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const subscribersCollection = client.db("ElectroDB").collection("subscribers");
        const userCollection = client.db("ElectroDB").collection("users");
        const productsCollection = client.db("ElectroDB").collection("products");
        const blogCollection = client.db("ElectroDB").collection("blogs");

        // JWT Authentication
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        });

        // Users API
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await userCollection.findOne(query);

            if (existingUser) {
                return res.send({ message: 'User already exists', insertId: null });
            }

            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        // product 
        app.get('/products', async (req, res) => {
            const result = await productsCollection.find().toArray();
            res.send(result);
        });
        // post route to handle newsletter subscription
        app.get('/subscribe', async (req, res) => {
            const result = await subscribersCollection.find().toArray();
            res.send(result);
        });
        // Post route to handle newsletter subscription
        app.post('/subscribe', async (req, res) => {
            const { name, email } = req.body;

            if (!name || !email) {
                return res.status(400).send('Name and email are required');
            }

            try {
                const existingSubscriber = await subscribersCollection.findOne({ email });

                if (existingSubscriber) {
                    return res.status(409).send({ message: 'Email is already subscribed' });
                }

                const result = await subscribersCollection.insertOne({ name, email });
                res.status(200).send({ message: 'Subscription successful', result });
            } catch (error) {
                res.status(500).send({ message: 'Error subscribing to newsletter', error });
            }
        });

        // blogs related
        app.get("/blogs", async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 6;
            const skip = (page - 1) * pageSize;

            const totalBlogs = await blogCollection.countDocuments();
            const blogs = await blogCollection
                .find()
                .skip(skip)
                .limit(pageSize)
                .toArray();

            res.send({
                totalBlogs,
                blogs,
                page,
                pageSize,
                totalPages: Math.ceil(totalBlogs / pageSize),
            });
        });
        app.get("/allBlogs", async (req, res) => {
            const blogs = await blogCollection.find().sort({ _id: -1 }).
                limit(6).
                toArray();

            res.send({
                blogs,
            });
        });
        app.post("/blogs", async (req, res) => {
            const newBlog = req.body;
            const result = await blogCollection.insertOne(newBlog);
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

// Connect to MongoDB and start the server
client.connect()
    .then(() => {
        run().catch(console.dir);
        app.listen(port, () => {
            console.log(`Food Zone is sitting on port ${port}`);
        });
    })
    .catch(err => {
        console.error("Failed to connect to MongoDB", err);
    });

// Default route
app.get('/', (req, res) => {
    res.send('Food is coming');
});
