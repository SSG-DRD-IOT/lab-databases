/*
 * Author: Daniel Holmlund <daniel.w.holmlund@Intel.com>
 * Copyright (c) 2015 Intel Corporation.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// Load the application configuration file
var config = require("./config.json")

// A library to colorize console output
var chalk = require('chalk');

// Require MQTT and setup the connection to the broker
var mqtt = require('mqtt');

// Require the MongoDB libraries and connect to the database
var mongoose = require('mongoose');
mongoose.connect(config.mongodb.host);
var db = mongoose.connection;

// Report database errors to the console
db.on('error', console.error.bind(console, 'connection error:'));

// Log when a connection is established to the MongoDB server
db.once('open', function (callback) {
    console.log(chalk.bold.yellow("Connection to MongoDB successful"));
});

// Import the Database Model Objects
var DataModel = require('intel-commercial-edge-network-database-models').DataModel;
var SensorModel = require('intel-commercial-edge-network-database-models').SensorModel;

console.log(chalk.bold.yellow("Edge Device Daemon is starting"));

// Connect to the MQTT server
var mqttClient  = mqtt.connect(config.mqtt.host);

// MQTT connection function
mqttClient.on('connect', function () {
    console.log(chalk.bold.yellow("Connected to MQTT server"));

    // Subscribe to the MQTT topics
    mqttClient.subscribe('announcements');
    mqttClient.subscribe('sensors/+/data');
});

// MQTT error function - Client unable to connect
mqttClient.on('error', function () {
    console.log(chalk.bold.yellow("Unable to connect to MQTT server"));
    process.exit();
});

// A function that runs when MQTT receives a message
mqttClient.on('message', function (topic, message) {

    // Parse the incoming data
    try {
        json = JSON.parse(message);
    } catch(e){
        console.log(e);
    }

    if (topic == "announcements") {
        console.log("Received an announcement of a new edge sensor");
        console.log(topic + ":" + message.toString());

        var sensor = new SensorModel(json);
        sensor.save(function(err, sensor) {
            if (err)
                console.error(err);
            else
                console.log("Wrote sensor to db:" + topic + ":" + chalk.white(sensor.toString()));
        });
    };

    if (topic.match(/data/)) {
        var value = new DataModel(json);
        value.save(function(err, data) {
            if (err)
                console.error(err);
            else
                console.log(chalk.bold.yellow("Wrote data to db:") + topic + ":" + chalk.white(message.toString()));
        });
    }
});
