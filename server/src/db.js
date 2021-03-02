'use strict'
require('dotenv').config();

const { Client } = require('pg');

const connection = new Client({
    user: process.env.USER_NAME,
    host: process.env.HOST,
    database: process.env.DB,
    password: process.env.PASSWORD,
    port: process.env.PORT,
    max: 20,
    connectionTimeoutMillis: 2000,
});

connection.connect();
connection.on('connect', () => {
    console.log("connected to database on port: " + process.env.PORT);
});

connection.on('error', error => {
    console.log(error);
    throw err;
});

module.exports = { 

    addPosition : (record) => {
        
        return new Promise((resolve, reject) => {
            let sql = "INSERT INTO position(timestamp, latitude, longitude, altitude, quality, satellites, hdop, status) VALUES ( '" + record.timestamp + "'," +
            "" + record.latitude + ", " + record.longitude + ", " + record.altitude + ", '" + record.quality + "', " + record.satellites + "," +
            " " + record.hdop + ", '" + record.status + "')";
            connection.query(sql, (err, result) => {
                if (err) {
                    console.error('Error executing query', err.stack)
                    return reject(err);
                }
                return resolve(result);
            });
        });
    },

    addCourse : (record) => {
        return new Promise((resolve, reject) => {
            let sql = "INSERT INTO course(timestamp, status, course, speed) VALUES ( '" + record.timestamp + "'," +
            "'" + record.status + "', " + record.course + ", " + record.speed + ")";
            connection.query(sql, (err, result) => {
                if (err) {
                    console.error('Error executing query', err.stack)
                    console.log(record);
                    return reject(err);
                }
                return resolve(result);
            });
        });
    },

    closestFootpath: (lat, lng) => {
        return new Promise((resolve, reject) => {
            let sql = "SELECT r.id, r.roadid, r.side, r.label, ST_AsGeoJSON(geom) as geojson, ST_Distance(geom, ST_SetSRID(ST_MakePoint(" + lng + "," + lat + "),4326)) AS dist FROM centrelinefp as r ORDER BY geom <-> ST_SetSRID(ST_MakePoint(" + lng + "," + lat + "),4326) LIMIT 100";
            connection.query(sql, (err, result) => {
                if (err) {
                    console.error('Error executing query', err.stack)
                    return reject(err);
                }
                let carriage = resolve(result);
                return carriage;
            });
        });
    },

}
