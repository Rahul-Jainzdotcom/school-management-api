const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const helmet = require('helmet');
const Joi = require('joi');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

const createTableQuery = `
  CREATE TABLE IF NOT EXISTS schools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

db.query(createTableQuery, (err) => {
  if (err) {
    console.error('Error creating schools table:', err);
  } else {
    console.log('Schools table ready');
  }
});

const addSchoolSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  address: Joi.string().trim().min(1).max(500).required(),
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required()
});

const listSchoolsSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required(),
  longitude: Joi.number().min(-180).max(180).required()
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// Routes

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'School Management API is running',
    version: '1.0.0',
    endpoints: {
      addSchool: 'POST /addSchool',
      listSchools: 'GET /listSchools?latitude=<lat>&longitude=<lng>'
    }
  });
});

// Add School API
app.post('/addSchool', (req, res) => {
  try {
    // Validate input data
    console.log("Headers:", req.headers);
    console.log("Incoming body:", req.body);


    const { error, value } = addSchoolSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.details[0].message
      });
    }

    const { name, address, latitude, longitude } = value;

    // Insert school into database
    const insertQuery = 'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)';
    
    db.query(insertQuery, [name, address, latitude, longitude], (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to add school',
          error: 'Database error'
        });
      }

      res.status(201).json({
        success: true,
        message: 'School added successfully',
        data: {
          id: result.insertId,
          name,
          address,
          latitude,
          longitude
        }
      });
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all schools
app.get("/getSchools", (req, res) => {
  db.query("SELECT * FROM schools", (err, results) => {
    if (err) {
      console.error("Error fetching schools:", err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
    res.json({ success: true, schools: results });
  });
});


// List Schools API
app.get('/listSchools', (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    // Validate query parameters
    const { error, value } = listSchoolsSchema.validate({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: error.details[0].message
      });
    }

    const userLat = value.latitude;
    const userLng = value.longitude;

    // Fetch all schools from database
    const selectQuery = 'SELECT * FROM schools ORDER BY id';
    
    db.query(selectQuery, (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch schools',
          error: 'Database error'
        });
      }

      // Calculate distance for each school and sort by proximity
      const schoolsWithDistance = results.map(school => {
        const distance = calculateDistance(
          userLat, 
          userLng, 
          school.latitude, 
          school.longitude
        );

        return {
          id: school.id,
          name: school.name,
          address: school.address,
          latitude: school.latitude,
          longitude: school.longitude,
          distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
        };
      });

      // Sort by distance (closest first)
      schoolsWithDistance.sort((a, b) => a.distance - b.distance);

      res.json({
        success: true,
        message: 'Schools retrieved successfully',
        userLocation: {
          latitude: userLat,
          longitude: userLng
        },
        totalSchools: schoolsWithDistance.length,
        data: schoolsWithDistance
      });
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT NOW() AS now');
    res.json({ success: true, db_time: rows[0].now });
  } catch (err) {
    console.error('DB connection error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  db.end();
  process.exit(0);
});

module.exports = app;