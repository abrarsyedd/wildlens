import express from 'express';
import mysql from 'mysql2/promise';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import cors from 'cors';
import path from 'path';
import 'dotenv/config'; // Use this syntax for dotenv with ES modules

const app = express();
const port = process.env.PORT || 3000;

// --- Database Connection (Now points to RDS) ---
// The connection details are now read from your .env file
const dbPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test DB connection on startup
dbPool.getConnection()
  .then(connection => {
    console.log('Connected to AWS RDS database successfully!');
    connection.release();
  })
  .catch(err => {
    console.error('!!! FAILED TO CONNECT TO RDS DATABASE !!!');
    console.error(`Error: ${err.message}`);
    console.error('Check your .env file and RDS Security Group settings.');
  });


// --- S3 Client Initialization ---
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// --- Multer (Memory Storage) ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Middleware ---
app.use(cors({ origin: '*' }));
app.use(express.json()); 

// --- API Routes ---

/**
 * GET /api/gallery
 * Fetches ALL images (initial + resized) from the shared RDS database.
 */
app.get('/api/gallery', async (req, res) => {
  console.log('[API] GET /api/gallery requested');
  try {
    const [rows] = await dbPool.query('SELECT * FROM images ORDER BY id DESC');
    console.log(`[API] Responding with ${rows.length} images from RDS.`);
    res.json(rows);
  } catch (error) {
    console.error('[API] Error fetching gallery from RDS DB:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch gallery.' });
  }
});

/**
 * POST /upload
 * This is the FIRST step.
 * 1. Receives file from frontend.
 * 2. Uploads the ORIGINAL file to the `uploads/` folder in S3.
 * 3. This S3 upload will trigger the Lambda function.
 */
app.post('/upload', upload.single('imageFile'), async (req, res) => {
  console.log('[API] POST /upload request received');
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No image file provided.' });
    }

    console.log(`[API] Received file: ${file.originalname}`);

    // Get metadata from form body
    const { title, description, category, location, photographer } = req.body;

    // Prepare S3 Key (in 'uploads/' folder)
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const extension = path.extname(file.originalname);
    // NEW: Upload to 'uploads/' folder
    const s3Key = `uploads/${Date.now()}-${randomBytes}${extension}`;

    // Prepare metadata for S3 object (will be read by Lambda)
    const s3Metadata = {
      title: title || 'Untitled',
      description: description || '',
      category: category || 'Uncategorized',
      location: location || 'Unknown',
      photographer: photographer || 'Anonymous',
    };

    // Prepare S3 Upload Command
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: s3Metadata,
    };

    console.log(`[API] Uploading original to S3: ${uploadParams.Bucket}/${s3Key}`);
    await s3.send(new PutObjectCommand(uploadParams));

    // Respond with success message
    res.json({
      success: true,
      message: 'File uploaded to S3/uploads/. Processing will be done by Lambda.',
    });
  } catch (error) {
    console.error('[API] Error during S3 upload process:', error);
    res.status(500).json({
      success: false,
      message: 'S3 Upload process failed.',
      error: error.message,
    });
  }
});

// --- Start Server ---
app.listen(port, () => {
  console.log('\n--- Server Configuration (PRODUCTION / RDS) ---');
  console.log(`Server Port: ${port}`);
  console.log(`Database Host: ${process.env.DB_HOST}`);
  console.log(`Database Name: ${process.env.DB_NAME}`);
  console.log(`S3 Upload Target: /uploads/ folder (triggers Lambda)`);
  console.log('------------------------------------------------');
  console.log(`WildLens backend server running at http://localhost:${port}\n`);
});

