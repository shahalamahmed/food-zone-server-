const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Uncomment this if Stripe is needed
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
    cors()
);
app.use(express.json());
// {
//     origin: [
//         "http://localhost:5173",
//         "https://knowledgecenterbd.netlify.app",
//         "https://food-zone-3f1b9.firebaseapp.com",
//         "https://food-zone-3f1b9.web.app",

//     ]

// }

// MongoDB connection URI
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
        await client.connect();
        //F console.log("Connected to MongoDB!");

        // Database Collections
        const db = client.db("ElectroDB");
        const subscribersCollection = db.collection("subscribers");
        const userCollection = db.collection("users");
        const blogCollection = db.collection("blogs");
        const courseCollection = db.collection("courses");


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



        // Subscription API
        app.get('/subscribe', async (req, res) => {
            const result = await subscribersCollection.find().toArray();
            res.send(result);
        });


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

        // Blogs API
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
            const blogs = await blogCollection.find().sort({ _id: -1 }).limit(6).toArray();
            res.send({ blogs });
        });
        app.get('/blogs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await blogCollection.findOne(query);
            res.send(result);
        })
        app.post("/blogs", async (req, res) => {
            const newBlog = req.body;
            const result = await blogCollection.insertOne(newBlog);
            res.send(result);
        });
        app.delete('/blogs/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);

            // Ensure the ID is properly formatted as an ObjectId
            const query = { _id: new ObjectId(id) };

            try {
                const result = await blogCollection.deleteOne(query);
                if (result.deletedCount === 1) {
                    console.log('Successfully deleted one document.');
                    res.send(result);
                } else {
                    console.log('No documents matched the query. Deleted 0 documents.');
                    res.status(404).send({ error: 'Course not found.' });
                }
            } catch (error) {
                console.error('Error deleting courses:', error);
                res.status(500).send({ error: 'An error occurred while deleting the course.' });
            }
        })

        // Courses API
        // Fetch all courses with pagination
        app.get("/courses", async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 6;
            const skip = (page - 1) * pageSize;

            try {
                const totalCourses = await courseCollection.countDocuments();
                const courses = await courseCollection
                    .find()
                    .skip(skip)
                    .limit(pageSize)
                    .toArray();
                res.send({
                    totalCourses,
                    courses,
                    page,
                    pageSize,
                    totalPages: Math.ceil(totalCourses / pageSize),
                });
            } catch (error) {
                console.error("Failed to fetch courses:", error);
                res.status(500).send("Failed to fetch courses");
            }
        });
        app.get('/courses/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await courseCollection.findOne(query);
            res.send(result);
        })


        // Add a new course
        app.post("/courses", async (req, res) => {
            try {
                const data = req.body;
                const result = await courseCollection.insertOne(data);
                res.status(201).json(result);
            } catch (error) {
                res.status(400).json({ message: "Error adding course", error });
            }
        });

        app.put('/courses/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const { courseName, image, description, rating, price } = req.body;
            const updateData = {
                $set: {
                    courseName,
                    image,
                    description,
                    rating,
                    price

                }
            };
            const result = await courseCollection.updateOne(filter, updateData, options);
            res.send(result);
        })



        app.delete('/courses/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);

            // Ensure the ID is properly formatted as an ObjectId
            const query = { _id: new ObjectId(id) };

            try {
                const result = await courseCollection.deleteOne(query);
                if (result.deletedCount === 1) {
                    console.log('Successfully deleted one document.');
                    res.send(result);
                } else {
                    console.log('No documents matched the query. Deleted 0 documents.');
                    res.status(404).send({ error: 'Course not found.' });
                }
            } catch (error) {
                console.error('Error deleting courses:', error);
                res.status(500).send({ error: 'An error occurred while deleting the course.' });
            }
        })
        // Search courses by name
        app.get("/searchCourses", async (req, res) => {
            const name = req.query.searchValue;

            const query = {};
            const regex = new RegExp(name, "i");
            query.courseName = { $regex: regex };

            const result = await courseCollection.find(query).toArray();
            res.send(result);
        });

        // Count the total number of courses
        app.get("/countCourses", async (req, res) => {
            const count = await courseCollection.estimatedDocumentCount();
            res.send({ count });
        });

        // Fetch courses for pagination
        app.get("/pagiCourses", async (req, res) => {
            const page = parseInt(req.query.page);
            const size = 6;

            const result = await courseCollection
                .find()
                .skip(page > 0 ? (page - 1) * size : 0)
                .limit(size)
                .toArray();
            res.send(result);
        });

        app.get("/filterCourses", async (req, res) => {
            const { search, category, page } = req.query;
            const pageSize = 6;
            const skip = (parseInt(page) - 1) * pageSize;

            const query = {};
            if (search) {
                query.courseName = { $regex: new RegExp(search, "i") };
            }
            if (category) {
                query.category = category;
            }

            try {
                const totalCourses = await courseCollection.countDocuments(query);
                const courses = await courseCollection
                    .find(query)
                    .skip(skip)
                    .limit(pageSize)
                    .toArray();
                res.send({
                    totalCourses,
                    courses,
                    page: parseInt(page),
                    pageSize,
                    totalPages: Math.ceil(totalCourses / pageSize),
                });
            } catch (error) {
                res.status(500).send("Failed to fetch courses");
            }
        });

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");


    } finally {
        // Close the client connection when server stops
        // await client.close();
    }
}

// Connect to MongoDB and start the server
client.connect()
    .then(() => {
        run().catch(console.dir);
        app.listen(port, () => {
            console.log(`Electro App is running on port ${port}`);
        });
    })
    .catch(err => {
        console.error("Failed to connect to MongoDB", err);
    });

// Default route
app.get('/', (req, res) => {
    res.send('Electro App is running');
});
