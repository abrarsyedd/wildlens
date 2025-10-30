WildLens - A Serverless, Full-Stack Image Gallery

WildLens is a dynamic, cloud-native web application that serves as a portfolio for wildlife photography. It features a scalable, event-driven architecture that automatically processes, resizes, and optimizes user-uploaded images in real-time.

This project demonstrates a modern, full-stack workflow using AWS services (S3, Lambda, RDS, and EC2) for a cost-efficient, serverless backend that processes user-generated content.

🚀 Live Demo Here
(Note: This links to your EC2 public IP. The server must be running.)

Architecture Diagram

The core of this project is an event-driven, serverless pipeline. When a user uploads an image, the backend server (on EC2) uploads the original file to an S3 uploads/ folder, which triggers a chain of serverless events.

The upload flow is as follows:

User selects an image in the frontend index.html.

EC2 Server (server.js) receives the file and uploads it to the s3://[bucket-name]/uploads/ folder with metadata (title, photographer, etc.).

S3 Event (ObjectCreated:Put) triggers the AWS Lambda function.

Lambda Function (wildlens-image-processor):
a.  Retrieves the original image from uploads/.
b.  Uses sharp to resize the image to a 1920px-wide JPEG.
c.  Uploads the new resized image to the s3://[bucket-name]/resized/ folder.
d.  Connects to the AWS RDS (MySQL) database.
e.  Inserts a new record into the images table with the metadata and the new S3 URL for the resized image.
f.  Deletes the original, high-resolution file from uploads/ to save costs.

Gallery (/api/gallery) on the EC2 server fetches all image records from the RDS database (both initial and new) to display to the user.

Features

Single-Page Application (SPA): A clean, responsive frontend built with Vanilla JavaScript and Tailwind CSS.

Dynamic Gallery: All gallery images are fetched from a central RDS database.

Drag-and-Drop Image Upload: A modern, user-friendly upload interface.

Serverless Image Processing: New uploads are automatically and asynchronously resized to web-friendly JPEGs using AWS Lambda and the sharp library.

Automated Database Entry: The Lambda function automatically writes the new image's metadata and S3 URL to the production database.

Scalable Architecture: The serverless design can handle any number of uploads without bogging down the main web server.

Cost Optimization: Original files are automatically deleted from S3 after processing.

Tech Stack

Frontend: HTML5, Tailwind CSS, Vanilla JavaScript (ESM)

Backend Server: Node.js, Express.js

Database: AWS RDS (MySQL)

Storage: AWS S3

Serverless Compute: AWS Lambda

Hosting: AWS EC2

Networking: AWS VPC, Security Groups, S3 Gateway Endpoint

Recommended Project Structure

For your GitHub repository, this structure holds all the necessary code:

wildlens/
├── backend/
│   ├── server.js         # The main EC2 web server
│   ├── database.sql      # SQL script to set up the DB
│   ├── package.json
│   └── .env.example      # Example environment file for the server
├── frontend/
│   └── index.html        # The complete frontend SPA
└── lambda/
    └── index.js          # The Node.js code for the image processor


Configuration & Environment Variables

This project requires environment variables for both the EC2 server and the Lambda function.

1. EC2 Server (/backend/.env)

Your server.js on the EC2 instance needs these variables.

# --- AWS RDS Credentials ---
DB_HOST=wildlens-db.xxxxxxxx.us-east-1.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=your-rds-password
DB_NAME=wildlens

# --- AWS Credentials ---
# (Best Practice: Use an IAM Role on the EC2 instance instead of these keys)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_KEY
AWS_BUCKET_NAME=wildlens-gallery-images


2. Lambda Environment Variables

In the AWS Lambda console, go to Configuration > Environment variables and add these:

# --- AWS RDS Credentials ---
DB_HOST=wildlens-db.xxxxxxxx.us-east-1.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=your-rds-password
DB_NAME=wildlens


Complete Deployment & Execution Steps

These are the steps to deploy this entire application from scratch.

Prerequisites

An AWS Account

AWS CLI configured

Node.js and npm installed locally

A MySQL client (like MySQL Workbench or a CLI)

Git

Step 1: Create the Database (AWS RDS)

Navigate to the RDS service in the AWS Console.

Create a new MySQL database. Use the "Free tier" template.

Set a DB instance identifier (e.g., wildlens-db).

Set your admin username and password.

Crucially: Under Connectivity, set Public access to Yes. * (For a real production app, you'd keep this private and use a bastion host, but for a portfolio, this is simpler).*

Note your database Endpoint (e.g., wildlens-db.xxxxxxxx.us-east-1.rds.amazonaws.com).

Connect to your new database with your MySQL client.

Run the backend/database.sql script to create the images table and populate it with the 40 initial images.

Step 2: Create the Storage Bucket (AWS S3)

Navigate to the S3 service.

Create a new bucket (e.g., wildlens-gallery-images).

Uncheck "Block all public access".

Go to the Permissions tab and add a Bucket Policy to allow public reads (this lets your website display the images):

{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}


Create two empty folders: uploads/ and resized/.

Upload your 40 initial images (wild1.jpg... wild40.jpg) to the root of the bucket.

Step 3: Create the Image Processor (AWS Lambda)

Create the Layer: The Lambda needs sharp and mysql2.

On your local machine (Linux/Mac or WSL), create a folder:

mkdir sharp-layer && cd sharp-layer
mkdir nodejs && cd nodejs
npm init -y
npm install sharp mysql2
cd ..
zip -r sharp-mysql-layer.zip .


In the Lambda console, go to Layers > Create layer.

Upload sharp-mysql-layer.zip and select the Node.js 20 runtime.

Create the Lambda Function:

Go to Lambda > Create function.

Name it wildlens-image-processor.

Set Runtime to Node.js 20.x.

Copy the code from lambda/index.js into the Lambda's index.js file.

Add the sharp-mysql-layer you just created.

Configure the Lambda:

Environment Variables: Add your DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME.

VPC: Edit VPC settings and connect the Lambda to the same Default VPC as your RDS instance. Select the subnets.

Timeout & Memory: In General configuration, set Memory to 512 MB and Timeout to 30 seconds.

Permissions: Go to the Lambda's IAM Role. Attach the following policies:

AmazonS3FullAccess

AWSLambdaVPCAccessExecutionRole (to connect to the VPC)

AmazonRDSDataFullAccess (to connect to RDS)

Step 4: Configure Networking & Triggers

Create S3 Trigger:

Go to your S3 bucket > Properties > Event notifications.

Create a new event.

Prefix: uploads/

Event types: Select s3:ObjectCreated:Put.

Destination: Your wildlens-image-processor Lambda function.

Create S3 Gateway Endpoint (To Fix Timeout):

Go to the VPC service > Endpoints.

Create Endpoint.

Service: Find com.amazonaws.us-east-1.s3 (Type: Gateway).

VPC: Select your Default VPC.

Route tables: Select the main route table for your VPC.

Configure Security Groups:

Go to EC2 > Security Groups.

Find your RDS security group (rds-launch-wizard or similar).

Edit Inbound rules. Add a rule:

Type: MySQL/Aurora (Port 3306)

Source: The Security Group for your Lambda function (search for aws-lambda-vpc-...). This allows the Lambda to talk to the DB.

Find your EC2 security group. Edit Inbound rules. Add a rule:

Type: MySQL/Aurora (Port 3306)

Source: Self (select the same EC2 security group ID). This allows your server.js to talk to the DB. (Note: A better rule is to allow your EC2 group to talk to your RDS group, as outlined in the Lambda setup).

Step 5: Deploy the Server (AWS EC2)

Go to the EC2 service > Launch instance.

Choose an Ubuntu 22.04 AMI (Free tier eligible).

Select a t2.micro instance.

Create a new key pair and download the .pem file.

Security Group: Create a new security group with these Inbound rules:

SSH (Port 22) from My IP

Custom TCP (Port 3000) from Anywhere (0.0.0.0/0)

Launch the instance.

Step 6: Run the Application

SSH into your EC2 instance:

# Set permissions for your key
chmod 400 your-key.pem

# Connect
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP


Install Node.js 18+:

curl -fsSL [https://deb.nodesource.com/setup_18.x](https://deb.nodesource.com/setup_18.x) | sudo -E bash -
sudo apt-get install -y nodejs


Install Git and PM2 (a process manager):

sudo apt-get install -y git
sudo npm install -g pm2


Clone Your Repo:

git clone [https://github.com/abrarsyedd/wildlens.git](https://github.com/abrarsyedd/wildlens.git)
cd wildlens/backend


Install Dependencies:

npm install


Create Environment File:

nano .env


Paste your environment variables (from the "Configuration" step above) into this file. Save (Ctrl+O) and Exit (Ctrl+X).

Start the Server with PM2:

pm2 start server.js


Done! Visit http://YOUR_EC2_PUBLIC_IP:3000 in your browser. The application is now live.
