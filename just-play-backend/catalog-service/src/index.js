const { app } = require('@azure/functions');
const mongoose = require('mongoose');

// --- 1. Database Configuration (Cached Connection) ---
let isConnected = false;
const connectToDatabase = async () => {
    if (isConnected) return;
    
    // Mengambil Connection String dari Environment Variables
    await mongoose.connect(process.env.COSMOS_DB_CONNECTION_STRING, {
        dbName: 'cloudtunes-db' // Nama database
    });
    isConnected = true;
    console.log("Connected to Cosmos DB");
};

// --- 2. Schema Definition ---
const songSchema = new mongoose.Schema({
    title: String,
    artist: String,
    album: String,
    url: String, // URL file mp3 dari storage
    createdAt: { type: Date, default: Date.now }
});

// Cek apakah model sudah ada (untuk mencegah overwrite saat hot reload)
const Song = mongoose.models.Song || mongoose.model('Song', songSchema);

// --- 3. Functions ---

// [GET] Get All Songs
app.http('getSongs', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Processing getSongs request');
        try {
            await connectToDatabase();
            const songs = await Song.find({}).sort({ createdAt: -1 });
            
            return {
                status: 200,
                jsonBody: songs
            };
        } catch (error) {
            context.log.error(error);
            return { status: 500, body: "Database error" };
        }
    }
});

// [POST] Add Song Metadata
app.http('addSong', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Processing addSong request');
        try {
            await connectToDatabase();
            
            // Baca body request
            const body = await request.json();
            
            if (!body.title || !body.url) {
                return { status: 400, body: "Missing title or url" };
            }

            const newSong = await Song.create(body);
            
            return {
                status: 201,
                jsonBody: newSong
            };
        } catch (error) {
            context.log.error(error);
            return { status: 500, body: "Error saving data" };
        }
    }
});