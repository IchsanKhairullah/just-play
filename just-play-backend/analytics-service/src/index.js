// src/index.js
const { app } = require('@azure/functions');

// --- HILANGKAN/KOMENTARI SEMUA KODE INISIALISASI MOONGOSE DAN APPLICATION INSIGHTS DI SINI ---

app.http('trackEvent', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        // --- HILANGKAN/KOMENTARI SEMUA KODE PANGGILAN KONEKSI DB DI SINI ---
        
        // Hanya respons sukses sederhana untuk memverifikasi worker berjalan
        context.log("Worker received request successfully!");

        const eventData = await request.json();
        context.log(`Received event for user: ${eventData.userId}`);
        
        return { status: 200, body: "Worker is running (DB/AI bypassed)." };
    }
});