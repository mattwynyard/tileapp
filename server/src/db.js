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
    connectionTimeoutMillis: 10000,
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
                    return reject(err);
                }
                return resolve(result);
            });
        });
    },

    insertPhoto : (record) => {
        return new Promise((resolve, reject) => {
            let sql = "INSERT INTO photo(gnsstime, corrected, photo, savetime, frequency) VALUES ( '" + record.gnsstime + "'," +
            "'" + record.corrected + "', '" + record.photo + "', " + record.savetime +  ", " + record.frequency + ")";
            connection.query(sql, (err, result) => {
                if (err) {
                    return reject(err);
                }
                return resolve(result);
            });
        });
    },

    closestFootpath: (lat, lng) => {
        return new Promise((resolve, reject) => {
            let sql = "SELECT r.id, r.roadid, r.side, r.label, ST_AsGeoJSON(geom) as geojson, ST_Distance(geom, ST_SetSRID(ST_MakePoint(" + lng + "," + lat + "),4326)) AS dist FROM centrelinefp as r ORDER BY geom <-> ST_SetSRID(ST_MakePoint(" + lng + "," + lat + "),4326) LIMIT 1";
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

    footpath: () => {
        return new Promise((resolve, reject) => {
            let sql = "SELECT id, roadid, side, label, ST_AsGeoJSON(geom) as geojson FROM centrelinefp";
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

    bbox: () => {
        return new Promise((resolve, reject) => {
            let sql = "SELECT ST_Extent(geom) as extent FROM centrelinefp";
            connection.query(sql, (err, result) => {
                if (err) {
                    console.error('Error executing query', err.stack)
                    return reject(err);
                }
                let res = resolve(result);
                return res;
            });
        });
    },

    isCompleted: (id) => {
        return new Promise((resolve, reject) => {
            let sql = "SELECT id, grade FROM condition WHERE id = '" + id + "'";
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

    updateCompleted: (id, grade) => {
        return new Promise((resolve, reject) => {
            let sql = "UPDATE condition SET grade = '" +  grade + "' WHERE id = '" + id + "'";
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

    insertCompleted: (id, grade) => {
        return new Promise((resolve, reject) => {
            let sql = "INSERT INTO condition(id, grade) VALUES('" + id + "', " + grade +  ")";
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

    deleteCompleted: (id) => {
        return new Promise((resolve, reject) => {
            let sql = "DELETE FROM condition WHERE id = '" + id + "'";
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
