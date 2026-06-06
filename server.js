require('dotenv').config();

const express = require('express');
const mysql   = require('mysql2');
const app     = express();
const router  = express.Router();

//  Middleware
router.use(express.json());

const ALLOWED_ORIGINS = [
    'https://www.comecodeafrica.com',
    'https://comecodeafrica.com',
];

router.use((req, res, next) => {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.append('Access-Control-Allow-Origin', origin);
    }
    res.append('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.append('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Database 
const pool = mysql.createPool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit:    10,
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.message);
        return;
    }
    console.log('Connected to MySQL database!');
    connection.release();
});

// Auto-create table if it doesn't exist
const CREATE_TABLE = `
    CREATE TABLE IF NOT EXISTS business_talk_registrations (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        full_name        VARCHAR(255)  NOT NULL,
        email            VARCHAR(255)  NOT NULL,
        phone            VARCHAR(50)   NOT NULL,
        location         VARCHAR(255)  NOT NULL,
        gender           VARCHAR(50),
        role             VARCHAR(100),
        has_business     VARCHAR(10),
        business_name    VARCHAR(255),
        position         VARCHAR(100),
        industry         VARCHAR(100),
        stage            VARCHAR(100),
        registered       VARCHAR(50),
        biggest_challenge TEXT,
        expectations     TEXT,
        referral_source  VARCHAR(100),
        attended_before  VARCHAR(10),
        join_community   VARCHAR(10),
        submitted_at     VARCHAR(50),
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`;

pool.query(CREATE_TABLE, (err) => {
    if (err) console.error('Error creating table:', err.message);
    else console.log('Table ready.');
});

//  POST /submit 
router.post('/submit', (req, res) => {
    const {
        full_name,
        email,
        phone,
        location,
        gender,
        role,
        has_business,
        business_name,
        position,
        industry,
        stage,
        registered,
        biggest_challenge,
        expectations,
        referral_source,
        attended_before,
        join_community,
        submitted_at,
    } = req.body;

    // Required fields
    if (!full_name || !email || !phone || !location) {
        return res.status(400).json({ message: 'full_name, email, phone, and location are required.' });
    }

    const query = `
        INSERT INTO business_talk_registrations
            (full_name, email, phone, location, gender, role,
             has_business, business_name, position, industry, stage,
             registered, biggest_challenge, expectations,
             referral_source, attended_before, join_community, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        full_name,
        email,
        phone,
        location,
        gender            || null,
        role              || null,
        has_business      || null,
        business_name     || null,
        position          || null,
        industry          || null,
        stage             || null,
        registered        || null,
        biggest_challenge || null,
        expectations      || null,
        referral_source   || null,
        attended_before   || null,
        join_community    || null,
        submitted_at      || null,
    ];

    pool.query(query, values, (err, result) => {
        if (err) {
            console.error('Error inserting data:', err.message);
            return res.status(500).json({ message: 'Failed to save registration. Please try again.' });
        }
        res.status(200).json({
            message: 'Registration submitted successfully!',
            id: result.insertId,
        });
    });
});

//  GET /registrations 
// Returns all registrations. Protect this with the API_KEY env variable.
router.get('/registrations', (req, res) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;

    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(401).json({ message: 'Unauthorised. Provide a valid API key.' });
    }

    pool.query(
        'SELECT * FROM business_talk_registrations ORDER BY created_at DESC',
        (err, rows) => {
            if (err) {
                console.error('Error fetching registrations:', err.message);
                return res.status(500).json({ message: 'Failed to fetch registrations.' });
            }
            res.status(200).json({ count: rows.length, registrations: rows });
        }
    );
});

//  Mount & Listen 
app.use('/', router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
