const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

const crypto = require('crypto');
if (!global.crypto) {
    global.crypto = crypto;
}

const CONTAINER_NAME = 'music-files';

app.http('uploadFile', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log('Processing upload request...');

        try {
            const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
            if (!AZURE_STORAGE_CONNECTION_STRING) {
                throw new Error("Storage connection string not configured");
            }

            const formData = await request.formData();
            const file = formData.get('file');

            if (!file) {
                return { status: 400, body: "No file found in request" };
            }

            const filename = file.name || `song-${Date.now()}.mp3`;
            const fileType = file.type || 'audio/mpeg';
            
            const arrayBuffer = await file.arrayBuffer();
            const fileBuffer = Buffer.from(arrayBuffer);

            context.log(`Uploading file: ${filename}, Size: ${fileBuffer.length}`);

            const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
            const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
            
            await containerClient.createIfNotExists({ access: 'blob' });

            const blockBlobClient = containerClient.getBlockBlobClient(filename);
            
            await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
                blobHTTPHeaders: { blobContentType: fileType }
            });

            context.log("Upload success!");

            return {
                status: 200,
                jsonBody: {
                    filename: filename,
                    url: blockBlobClient.url 
                }
            };

        } catch (error) {
            context.error("UPLOAD CRASH DETAIL:", error); 
            
            return { status: 500, body: `Upload failed: ${error.message}` };
        }
    }
});