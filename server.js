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
////////////////////////////////////////////////////////////////////////////////
// ISTV Block 1
// Load the application configuration file or exit the process
var config = require("./config.json")
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// ISTV Block 2
// Load NodeJS Library to interact with the filesystem
// Require MQTT and setup the connection to the broker
// Require the MongoDB libraries and connect to the database
////////////////////////////////////////////////////////////////////////////////
var fs = require('fs');
var mqtt = require('mqtt');
var mongoose = require('mongoose');
// end ISTV Block

////////////////////////////////////////////////////////////////////////////////
// ISTV Block 3
// Create a connection to the database and define a event callback function 
// that will print "Connection to MongoDB successful" when the NodeJS service
// connects to the Mongo database.
////////////////////////////////////////////////////////////////////////////////
mongoose.connect(config.mongodb.host);
var db = mongoose.connection;

// Log when a connection is established to the MongoDB server
db.once('open', function (callback) {
    console.log("Connection to MongoDB successful");
});
// end ISTV Block

////////////////////////////////////////////////////////////////////////////////
// ISTV Block 4
// Next, we define the MongoDB schemas and models for this video in a NPM 
// module named intel-commercial-edge-network-database-models.
// Import these Database Model Objects
////////////////////////////////////////////////////////////////////////////////
var Data = require('intel-commercial-edge-network-database-models').Data;
var Sensor = require('intel-commercial-edge-network-database-models').Sensor;
// end ISTV Block

////////////////////////////////////////////////////////////////////////////////
// ISTV Block 5
// options - an object to initialize the TLS connection settings
////////////////////////////////////////////////////////////////////////////////
var options = {
  port: config.tls.port,
  host: config.tls.host,
  protocol: 'mqtts',
  protocolId: 'MQIsdp',
  keyPath: fs.readFileSync(config.tls.serverKey);,
  certPath: fs.readFileSync(config.tls.serverCrt),
  rejectUnauthorized : false,
  //The CA list will be used to determine if server is authorized
  ca: [fs.readFileSync(config.tls.ca_certificates)], 
  secureProtocol: 'TLSv1_method',
  protocolVersion: 3
};

// Connect to the MQTT server
var mqttClient  = mqtt.connect(options);
// end ISTV Block

////////////////////////////////////////////////////////////////////////////////
// ISTV Block 6
// When our database service connects to the MQTT server, we want to subscribe
// to all sensor data on the local area network.
////////////////////////////////////////////////////////////////////////////////
// MQTT connection function
mqttClient.on('connect', function () {
    console.log("Connected to MQTT server");
    mqttClient.subscribe('sensors/+/data');
});
// end ISTV Block

////////////////////////////////////////////////////////////////////////////////
// ISTV Block 7
// When a message event is received we will parse the stringified data and convert
// it into a JSON Object that we can serialize to the MongoDB database.
////////////////////////////////////////////////////////////////////////////////
// A function that runs when MQTT receives a message
mqttClient.on('message', function (topic, message) {
    // Parse the incoming data
    try {
        json = JSON.parse(message);
    } catch(e) {
        console.log(e);
    }

    if (topic.match(/data/)) {
        var value = new Data(json);
        value.save(function(err, data) {
            if (err)
                console.error(err);
            else
                console.log(topic + ":" + message.toString());
        });
    }
});
// end ISTV Block
