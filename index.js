const express = require('express');
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const admin = require("firebase-admin");
require('dotenv').config()
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;


const serviceAccount = (`./mobile-shop-a9ca5-firebase-adminsdk.json`);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oedwv.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith(`Bearer `)) {
        const token = req.headers.authorization.split(' ')[1]

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}

async function run() {

    try {
        await client.connect();
        // console.log('database connected');
        const database = client.db('mobile_shop');
        const productsCollection = database.collection('products');
        const reviewsCollection = database.collection('reviews')
        const ordersCollection = database.collection('orders')
        const usersCollection = database.collection('users')

        //GET API FOR ALL PRODUCTS
        app.get('/products', async (req, res) => {
            const cursor = productsCollection.find({});
            const products = await cursor.toArray()
            res.send(products)
        })

        //POST API FOR EXTRA ADDED PRODUCT
        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product)
            console.log(result)
            res.json(result);
        })



        //GET API FOR CUSTOMER REVIEW
        app.get('/reviews', async (req, res) => {
            const cursor = reviewsCollection.find({})
            const reviews = await cursor.toArray()
            res.send(reviews)

        })


        //POST API FOR EXTRA ADDED REVIEW
        app.post('/reviews', async (req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review)
            res.json(result);
        })


        //GET API FOR SINGLE PRODUCT
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const products = await productsCollection.findOne(query);
            res.send(products)
        })

        //GET API FOR ALL ORDERS
        app.get('/orders', async (req, res) => {
            const cursor = ordersCollection.find({});
            const orders = await cursor.toArray();
            res.send(orders)
        })

        //GET API FOR SPECIFIC BOOKING ORDERS
        app.get('/orders', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const cursor = ordersCollection.find(query)
            const order = await cursor.toArray()
            res.json(order)
        })

        //POST API FOR BOOKIN ORDERS
        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.json(result);
        })


        //GET API FOR ADMIN
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.send({ admin: isAdmin })
        })

        //POST API FOR USERS
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.json(result)
        })

        //update upsert 
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user }
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            res.json(result);
        })

        //MAKE A ROLE AS ADMIN
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requersterAccount = await usersCollection.findOne({ email: requester });

                if (requersterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make a admin' })
            }
        })


        // DELET API
        app.delete("/orders/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.json(result);
        });

    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir)


app.get('/', (req, res) => {
    res.send('hello i am making a website')
})

app.listen(port, () => {
    console.log('runing my server in port no', port)
})