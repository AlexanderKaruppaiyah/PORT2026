// Save this as server.js
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
const path = require('path');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI; // Update this with your MongoDB connection string
let dbClient = null;

// Connect to MongoDB
async function connectToMongo() {
    if (!dbClient) {
        dbClient = new MongoClient(MONGODB_URI);
        await dbClient.connect();
        console.log('Connected to MongoDB');
    }
    return dbClient;
}

app.get('/', (req, res) => {   res.sendFile(path.join(__dirname, 'viewer.html'));
});
// Get all databases
app.get('/api/databases', async (req, res) => {
    try {
        const client = await connectToMongo();
        const admin = client.db().admin();
        const dbs = await admin.listDatabases();
        
        // Filter out system databases if needed
        const dbNames = dbs.databases
            .map(db => db.name)
            .filter(name => !['admin', 'local', 'config'].includes(name));
        
        res.json(dbNames);
    } catch (error) {
        console.error('Error fetching databases:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all collections in a database
app.get('/api/databases/:dbName/collections', async (req, res) => {
    try {
        const client = await connectToMongo();
        const db = client.db(req.params.dbName);
        const collections = await db.listCollections().toArray();
        res.json(collections.map(col => col.name));
    } catch (error) {
        console.error('Error fetching collections:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all documents from a collection (with limit)
app.get('/api/databases/:dbName/collections/:collectionName/documents', async (req, res) => {
    try {
        const client = await connectToMongo();
        const db = client.db(req.params.dbName);
        const collection = db.collection(req.params.collectionName);
        
        // Get first 100 documents with basic fields
        const documents = await collection.find({})
            .limit(100)
            .toArray();
        
        res.json(documents);
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single document by ID
app.get('/api/databases/:dbName/collections/:collectionName/documents/:id', async (req, res) => {
    try {
        const client = await connectToMongo();
        const db = client.db(req.params.dbName);
        const collection = db.collection(req.params.collectionName);
        
        let query;
        try {
            // Try as ObjectId first
            query = { _id: new ObjectId(req.params.id) };
        } catch {
            // If not valid ObjectId, try as string
            query = { _id: req.params.id };
        }
        
        const document = await collection.findOne(query);
        
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        res.json(document);
    } catch (error) {
        console.error('Error fetching document:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    if (dbClient) {
        await dbClient.close();
        console.log('MongoDB connection closed');
    }
    process.exit(0);
});