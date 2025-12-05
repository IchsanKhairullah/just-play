// Polyfill for global.crypto (required by Application Insights in some environments)
global.crypto = require('crypto');

const express = require('express');
const mongoose = require('mongoose');
const appInsights = require('applicationinsights');

// Initialize Application Insights
// Expects APPLICATIONINSIGHTS_CONNECTION_STRING in environment variables
if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    appInsights.setup()
        .setAutoCollectRequests(true)
        .setAutoCollectPerformance(true, true)
        .setAutoCollectExceptions(true)
        .start();
    console.log("Application Insights started");
} else {
    console.log("APPLICATIONINSIGHTS_CONNECTION_STRING not set, telemetry disabled");
}

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

const PORT = process.env.FUNCTIONS_CUSTOMHANDLER_PORT || 3000;

// Mongoose Schema
const eventSchema = new mongoose.Schema({
    userId: String,
    event: String,
    timestamp: { type: Date, default: Date.now },
    metadata: mongoose.Schema.Types.Mixed
});

// Explicitly set the collection name to 'play-events'
const AnalyticsEvent = mongoose.model('AnalyticsEvent', eventSchema, 'play-events');

// Connect to MongoDB
// Expects COSMOS_DB_CONNECTION_STRING in environment variables
const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) return;

    const dbConnectionString = process.env.COSMOS_DB_CONNECTION_STRING;
    if (!dbConnectionString) {
        console.error("COSMOS_DB_CONNECTION_STRING not set");
        return;
    }

    try {
        // Explicitly set the database name to 'analytics-core'
        await mongoose.connect(dbConnectionString, {
            dbName: 'analytics-core'
        });
        console.log("Connected to Cosmos DB (MongoDB API)");
    } catch (err) {
        console.error("Failed to connect to Cosmos DB", err);
    }
};

// Health check endpoint
app.get('/', (req, res) => {
    res.send('Analytics Service Worker is running');
});

// Main event tracking endpoint
app.post('/api/trackEvent', async (req, res) => {
    console.log("Worker received request at /api/trackEvent");

    // Ensure DB is connected
    await connectDB();

    const client = appInsights.defaultClient;

    try {
        const eventData = req.body;
        console.log(`Received event data:`, JSON.stringify(eventData));

        // 1. Save to DB
        const newEvent = new AnalyticsEvent(eventData);
        await newEvent.save();
        console.log("Event saved to DB");

        // 2. Track in App Insights
        if (client) {
            client.trackEvent({
                name: "PlayerEvent",
                properties: eventData
            });
        }

        res.status(200).json({
            status: 200,
            body: "Event processed successfully.",
            received: eventData
        });
    } catch (error) {
        console.error("Error processing request:", error);

        if (client) {
            client.trackException({ exception: error });
        }

        res.status(500).send("Internal Server Error");
    }
});

// Catch-all for other routes (404 handling)
app.use((req, res) => {
    console.log(`Received request for unhandled route: ${req.method} ${req.path}`);
    res.status(404).send(`Route not found: ${req.path}`);
});

app.listen(PORT, () => {
    console.log(`Worker listening on port ${PORT}`);
});