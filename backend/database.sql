-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS wildlens;
USE wildlens;
DROP TABLE IF EXISTS images;

CREATE TABLE `images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) DEFAULT NULL,
  `description` text,
  `category` varchar(100) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `photographer` varchar(255) DEFAULT NULL,
  `s3_url` varchar(1024) NOT NULL, -- Will store the full S3 URL
  `s3_key` varchar(500) DEFAULT NULL, -- Will store the S3 object key (filename)
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_location` (`location`),
  KEY `idx_uploaded_at` (`uploaded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Set the base URL for your specific S3 bucket and region
SET @s3_base_url = 'https://wildlens-gallery-images.s3.us-east-1.amazonaws.com';

-- Insert 40 images referencing files uploaded to your S3 bucket
-- IMPORTANT: Assumes files wild1.jpg to wild40.jpg exist in the S3 bucket root.
INSERT INTO `images` (title, description, category, location, photographer, s3_url, s3_key) VALUES
('Wildlife Image 1', 'Description for image 1', 'Wildlife', 'Location 1', 'Photographer 1', CONCAT(@s3_base_url, '/wild1.jpg'), 'wild1.jpg'),
('Wildlife Image 2', 'Description for image 2', 'Wildlife', 'Location 2', 'Photographer 2', CONCAT(@s3_base_url, '/wild2.jpg'), 'wild2.jpg'),
('Wildlife Image 3', 'Description for image 3', 'Wildlife', 'Location 3', 'Photographer 3', CONCAT(@s3_base_url, '/wild3.jpg'), 'wild3.jpg'),
('Wildlife Image 4', 'Description for image 4', 'Wildlife', 'Location 4', 'Photographer 4', CONCAT(@s3_base_url, '/wild4.jpg'), 'wild4.jpg'),
('Wildlife Image 5', 'Description for image 5', 'Wildlife', 'Location 5', 'Photographer 5', CONCAT(@s3_base_url, '/wild5.jpg'), 'wild5.jpg'),
('Wildlife Image 6', 'Description for image 6', 'Wildlife', 'Location 6', 'Photographer 6', CONCAT(@s3_base_url, '/wild6.jpg'), 'wild6.jpg'),
('Wildlife Image 7', 'Description for image 7', 'Wildlife', 'Location 7', 'Photographer 7', CONCAT(@s3_base_url, '/wild7.jpg'), 'wild7.jpg'),
('Wildlife Image 8', 'Description for image 8', 'Wildlife', 'Location 8', 'Photographer 8', CONCAT(@s3_base_url, '/wild8.jpg'), 'wild8.jpg'),
('Wildlife Image 9', 'Description for image 9', 'Wildlife', 'Location 9', 'Photographer 9', CONCAT(@s3_base_url, '/wild9.jpg'), 'wild9.jpg'),
('Wildlife Image 10', 'Description for image 10', 'Wildlife', 'Location 10', 'Photographer 10', CONCAT(@s3_base_url, '/wild10.jpg'), 'wild10.jpg'),
('Wildlife Image 11', 'Description for image 11', 'Wildlife', 'Location 11', 'Photographer 11', CONCAT(@s3_base_url, '/wild11.jpg'), 'wild11.jpg'),
('Wildlife Image 12', 'Description for image 12', 'Wildlife', 'Location 12', 'Photographer 12', CONCAT(@s3_base_url, '/wild12.jpg'), 'wild12.jpg'),
('Wildlife Image 13', 'Description for image 13', 'Wildlife', 'Location 13', 'Photographer 13', CONCAT(@s3_base_url, '/wild13.jpg'), 'wild13.jpg'),
('Wildlife Image 14', 'Description for image 14', 'Wildlife', 'Location 14', 'Photographer 14', CONCAT(@s3_base_url, '/wild14.jpg'), 'wild14.jpg'),
('Wildlife Image 15', 'Description for image 15', 'Wildlife', 'Location 15', 'Photographer 15', CONCAT(@s3_base_url, '/wild15.jpg'), 'wild15.jpg'),
('Wildlife Image 16', 'Description for image 16', 'Wildlife', 'Location 16', 'Photographer 16', CONCAT(@s3_base_url, '/wild16.jpg'), 'wild16.jpg'),
('Wildlife Image 17', 'Description for image 17', 'Wildlife', 'Location 17', 'Photographer 17', CONCAT(@s3_base_url, '/wild17.jpg'), 'wild17.jpg'),
('Wildlife Image 18', 'Description for image 18', 'Wildlife', 'Location 18', 'Photographer 18', CONCAT(@s3_base_url, '/wild18.jpg'), 'wild18.jpg'),
('Wildlife Image 19', 'Description for image 19', 'Wildlife', 'Location 19', 'Photographer 19', CONCAT(@s3_base_url, '/wild19.jpg'), 'wild19.jpg'),
('Wildlife Image 20', 'Description for image 20', 'Wildlife', 'Location 20', 'Photographer 20', CONCAT(@s3_base_url, '/wild20.jpg'), 'wild20.jpg'),
('Wildlife Image 21', 'Description for image 21', 'Wildlife', 'Location 21', 'Photographer 21', CONCAT(@s3_base_url, '/wild21.jpg'), 'wild21.jpg'),
('Wildlife Image 22', 'Description for image 22', 'Wildlife', 'Location 22', 'Photographer 22', CONCAT(@s3_base_url, '/wild22.jpg'), 'wild22.jpg'),
('Wildlife Image 23', 'Description for image 23', 'Wildlife', 'Location 23', 'Photographer 23', CONCAT(@s3_base_url, '/wild23.jpg'), 'wild23.jpg'),
('Wildlife Image 24', 'Description for image 24', 'Wildlife', 'Location 24', 'Photographer 24', CONCAT(@s3_base_url, '/wild24.jpg'), 'wild24.jpg'),
('Wildlife Image 25', 'Description for image 25', 'Wildlife', 'Location 25', 'Photographer 25', CONCAT(@s3_base_url, '/wild25.jpg'), 'wild25.jpg'),
('Wildlife Image 26', 'Description for image 26', 'Wildlife', 'Location 26', 'Photographer 26', CONCAT(@s3_base_url, '/wild26.jpg'), 'wild26.jpg'),
('Wildlife Image 27', 'Description for image 27', 'Wildlife', 'Location 27', 'Photographer 27', CONCAT(@s3_base_url, '/wild27.jpg'), 'wild27.jpg'),
('Wildlife Image 28', 'Description for image 28', 'Wildlife', 'Location 28', 'Photographer 28', CONCAT(@s3_base_url, '/wild28.jpg'), 'wild28.jpg'),
('Wildlife Image 29', 'Description for image 29', 'Wildlife', 'Location 29', 'Photographer 29', CONCAT(@s3_base_url, '/wild29.jpg'), 'wild29.jpg'),
('Wildlife Image 30', 'Description for image 30', 'Wildlife', 'Location 30', 'Photographer 30', CONCAT(@s3_base_url, '/wild30.jpg'), 'wild30.jpg'),
('Wildlife Image 31', 'Description for image 31', 'Wildlife', 'Location 31', 'Photographer 31', CONCAT(@s3_base_url, '/wild31.jpg'), 'wild31.jpg'),
('Wildlife Image 32', 'Description for image 32', 'Wildlife', 'Location 32', 'Photographer 32', CONCAT(@s3_base_url, '/wild32.jpg'), 'wild32.jpg'),
('Wildlife Image 33', 'Description for image 33', 'Wildlife', 'Location 33', 'Photographer 33', CONCAT(@s3_base_url, '/wild33.jpg'), 'wild33.jpg'),
('Wildlife Image 34', 'Description for image 34', 'Wildlife', 'Location 34', 'Photographer 34', CONCAT(@s3_base_url, '/wild34.jpg'), 'wild34.jpg'),
('Wildlife Image 35', 'Description for image 35', 'Wildlife', 'Location 35', 'Photographer 35', CONCAT(@s3_base_url, '/wild35.jpg'), 'wild35.jpg'),
('Wildlife Image 36', 'Description for image 36', 'Wildlife', 'Location 36', 'Photographer 36', CONCAT(@s3_base_url, '/wild36.jpg'), 'wild36.jpg'),
('Wildlife Image 37', 'Description for image 37', 'Wildlife', 'Location 37', 'Photographer 37', CONCAT(@s3_base_url, '/wild37.jpg'), 'wild37.jpg'),
('Wildlife Image 38', 'Description for image 38', 'Wildlife', 'Location 38', 'Photographer 38', CONCAT(@s3_base_url, '/wild38.jpg'), 'wild38.jpg'),
('Wildlife Image 39', 'Description for image 39', 'Wildlife', 'Location 39', 'Photographer 39', CONCAT(@s3_base_url, '/wild39.jpg'), 'wild39.jpg'),
('Wildlife Image 40', 'Description for image 40', 'Wildlife', 'Location 40', 'Photographer 40', CONCAT(@s3_base_url, '/wild40.jpg'), 'wild40.jpg');

-- Create indexes
CREATE INDEX idx_title ON images(title);

