import express from 'express';
import mysql from 'mysql2/promise';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import cors from 'cors';
import 'dotenv/config';

// --- NEW IMPORTS for serving static files ---
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

// --- NEWESM setup for __dirname ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename); // This is the 'backend' directory

const app = express();
const port = process.env.PORT || 3000;

// --- Database Connection (Points to RDS) ---
const dbPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test DB connection
dbPool.getConnection()
  .then(connection => {
    console.log('Connected to AWS RDS database successfully!');
    connection.release();
  })
  .catch(err => {
    console.error(`!!! FAILED TO CONNECT TO RDS: ${err.message}`);
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

// --- NEW: Serve Static Frontend Files ---
// Get the path to the 'frontend' directory (one level up from 'backend')
const frontendPath = path.join(__dirname, '..', 'frontend');
console.log(`Serving static files from: ${frontendPath}`);
// Serve all files in the 'frontend' folder
app.use(express.static(frontendPath)); 

// --- API Routes ---

/**
 * GET /api/gallery
 * Fetches ALL images from the shared RDS database.
 */
app.get('/api/gallery', async (req, res) => {
  console.log('[API] GET /api/gallery requested');
  try {
    const [rows] = await dbPool.query('SELECT * FROM images ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('[API] Error fetching gallery from RDS DB:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch gallery.' });
  }
});

/**
 * POST /upload
 * Uploads the ORIGINAL file to the `uploads/` folder in S3.
 * This S3 upload triggers the Lambda function.
 */
app.post('/upload', upload.single('imageFile'), async (req, res) => {
  console.log('[API] POST /upload request received');
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No image file provided.' });
    }
    const { title, description, category, location, photographer } = req.body;
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const extension = path.extname(file.originalname);
    const s3Key = `uploads/${Date.now()}-${randomBytes}${extension}`;

    const s3Metadata = {
      title: title || 'Untitled',
      description: description || '',
      category: category || 'Uncategorized',
      location: location || 'Unknown',
      photographer: photographer || 'Anonymous',
    };

    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: s3Metadata,
    };

    console.log(`[API] Uploading original to S3: ${uploadParams.Bucket}/${s3Key}`);
    await s3.send(new PutObjectCommand(uploadParams));

    res.json({
      success: true,
      message: 'File uploaded. Processing will be done by Lambda.',
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

// --- NEW: Fallback for SPA (Single Page App) ---
// This sends 'index.html' for any request that doesn't match an API route
// or a static file, allowing your hash-based navigation to work.
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// --- Start Server ---
app.listen(port, '0.0.0.0', () => { // Listen on all network interfaces
  console.log('\n--- Server Configuration (PRODUCTION / RDS) ---');
  console.log(`Server Port: ${port}`);
  console.log(`Database Host: ${process.env.DB_HOST}`);
  console.log(`S3 Upload Target: /uploads/ folder (triggers Lambda)`);
  console.log(`WildLens server running at http://0.0.0.0:${port}\n`);
});


