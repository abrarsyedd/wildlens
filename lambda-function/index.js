// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * AWS Lambda Function: WildLens-ImageProcessor-Production
 *
 * This function is the final, production-ready function.
 * It is triggered by an S3 'Put' event in the 'uploads/' folder.
 * It performs the following actions:
 * 1. Reads the newly uploaded image from S3.
 * 2. Reads the user-supplied metadata (title, photographer, etc.).
 * 3. Resizes the image to a web-friendly format (1920px wide, JPEG).
 * 4. Uploads the resized image to a 'resized/' folder in the same S3 bucket.
 * 5. Connects to the production RDS database.
 * 6. Inserts a new record into the 'images' table with the new S3 URL.
 * 7. (NEW) Deletes the original image from the 'uploads/' folder.
 */

// Use CommonJS `require` syntax for high compatibility in Lambda
const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand, // --- NEWLY ADDED ---
} = require('@aws-sdk/client-s3');

// These modules are provided by the 'sharp-mysql-rds' Lambda Layer
const sharp = require('sharp');
const path = require('path');
const mysql = require('mysql2/promise');

// Initialize S3 client
const s3 = new S3Client({});

const MAX_WIDTH = 1920; // Max width for resized images
const JPEG_QUALITY = 85; // Quality for resized images

// --- Database Connection Pool ---
let dbPool;

/**
 * Helper function to convert a readable stream (like S3.Body) into a Buffer.
 */
const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });

/**
 * Main Lambda Handler
 */
exports.handler = async (event) => {
  console.log('Event Received:', JSON.stringify(event, null, 2));

  let connection; // To manage the DB connection safely

  // Get Event Details (we need these for the delete step)
  const record = event.Records[0];
  const srcBucket = record.s3.bucket.name;
  const srcKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
  const s3Region = record.awsRegion || 'us-east-1';

  try {
    // 1. Prevent infinite loops
    if (!srcKey.startsWith('uploads/')) {
      console.log('Object is not in uploads/. Skipping processing.');
      return { statusCode: 200, body: 'Skipped: Not an original upload.' };
    }

    // 2. Get Original Image and its Metadata
    console.log('Fetching object metadata from S3...');
    const headObjectParams = { Bucket: srcBucket, Key: srcKey };
    const headObjectResult = await s3.send(
      new HeadObjectCommand(headObjectParams)
    );
    const s3Metadata = headObjectResult.Metadata;
    console.log('S3 Metadata Received:', s3Metadata);

    console.log('Fetching object body from S3...');
    const getObjectParams = { Bucket: srcBucket, Key: srcKey };
    const getObjectResult = await s3.send(new GetObjectCommand(getObjectParams));
    const originalImageBuffer = await streamToBuffer(getObjectResult.Body);
    console.log(`Original image buffer size: ${originalImageBuffer.length}`);

    // 3. Resize the Image
    console.log('Resizing image with sharp...');
    const resizedImageBuffer = await sharp(originalImageBuffer)
      .resize(MAX_WIDTH, null, { withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    console.log(`Resized image buffer size: ${resizedImageBuffer.length}`);

    // 4. Upload Resized Image to 'resized/' Folder
    const baseFilename = path.basename(srcKey, path.extname(srcKey));
    const destKey = `resized/${baseFilename}.jpg`; // New key in 'resized/' folder
    const destBucket = srcBucket; // Save to the same bucket

    console.log(`Uploading resized image to: ${destBucket}/${destKey}`);

    const putObjectParams = {
      Bucket: destBucket,
      Key: destKey,
      Body: resizedImageBuffer,
      ContentType: 'image/jpeg',
      Metadata: s3Metadata, // Carry over the metadata
    };
    await s3.send(new PutObjectCommand(putObjectParams));

    const newS3Url = `https://${destBucket}.s3.${s3Region}.amazonaws.com/${destKey}`;
    console.log(`New Resized S3 URL: ${newS3Url}`);

    // 5. Database Insertion
    if (!dbPool) {
      console.log('Initializing RDS database connection pool...');
      try {
        dbPool = mysql.createPool({
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          waitForConnections: true,
          connectionLimit: 2,
          queueLimit: 0,
        });
        console.log('Database pool created.');
      } catch (poolError) {
        console.error('FAILED to create database pool:', poolError);
        throw poolError;
      }
    }

    console.log('Attempting to get connection from pool and insert record...');
    connection = await dbPool.getConnection();
    console.log('Database connection acquired.');
    
    const [result] = await connection.execute(
      `INSERT INTO images (title, description, category, location, photographer, s3_url, s3_key)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        s3Metadata.title,
        s3Metadata.description,
        s3Metadata.category,
        s3Metadata.location,
        s3Metadata.photographer,
        newS3Url, // The URL of the *resized* image
        destKey, // The S3 Key of the *resized* image
      ]
    );

    console.log(`Database Insert Successful. New Image ID: ${result.insertId}`);
    
    // --- 6. (NEW) Delete Original from 'uploads/' ---
    // This runs only after all previous steps have succeeded.
    console.log(`Deleting original image from: ${srcBucket}/${srcKey}`);
    const deleteParams = {
      Bucket: srcBucket,
      Key: srcKey,
    };
    await s3.send(new DeleteObjectCommand(deleteParams));
    console.log('Original image deleted successfully.');
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Image processed, added to gallery, and original deleted.',
        newUrl: newS3Url,
        newImageId: result.insertId,
      }),
    };

  } catch (error) {
    console.error('--- LAMBDA EXECUTION FAILED ---');
    console.error('The original file in "uploads/" will NOT be deleted.', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing image.',
        error: error.message,
      }),
    };
  } finally {
    // Release the connection back to the pool
    if (connection) {
      console.log('Releasing database connection.');
      connection.release();
    }
  }
};

