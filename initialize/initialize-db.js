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
var mongoose = require('mongoose');
var _ = require('lodash');

mongoose.connect('mongodb://192.168.1.1/iotdemo');
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

// Import the Database Model Objects
//var DataModel = require('../../../../commercial-edge-network-database').DataModel;
//var SensorCloudModel = require('../../../../commercial-edge-network-database').SensorCloudModel;
var TriggerModel = require('intel-commercial-edge-network-database-models').TriggerModel;
var SensorModel = require('intel-commercial-edge-network-database-models').SensorModel;
var ActuatorModel = require('intel-commercial-edge-network-database-models').ActuatorModel;

var actuators = [
    {
        "id": "lcd",
        "ipaddress": "http://192.168.1.194:10010",
        "name": "fan",
        "description": "Decreases the temperature",
        "active": "true",
        "ioType": "digital"
    }
];

var sensors = [
    {
        "id":"temperature",
        "name":"temperature",
        "description":"read the temp",
        "maxfrequency":"200",
        "frequency":"1000",
        "active":"true",
        "ioType":"Analog"
    }
];

console.log("Before trigger definitions");

var triggers = [
    {
        id : "temperature_greater_than_27",
        name : "temperature_greater_than_27",
        sensor_id : "temperature",
        condition :  "( function(sensor_value) { return sensor_value > 27 } )",
        triggerFunc: "( function() { console.log('Temperature is to Hot'); })",
        active: true
    },

    {
        id : "temperature_less_than_20",
        name : "temperature_less_than_20",
        sensor_id : "temperature",
        condition : "( function(sensor_value) { return sensor_value < 20 } )",
        triggerFunc : "( function() { console.log('Temperature is to Hot'); } )",
        active: true
    },

    {
        id : "temperature_ok",
        name : "temperature_ok",
        sensor_id : "temperature",
        condition :  "( function(temperature) { return sensor_value > 20 && sensor_value < 27  } )",
        triggerFunc: "( function() {  } )",
        active: true
    }];

TriggerModel.remove({}, function() {
    console.log("Removing document");
});

SensorModel.remove({},  function() {
   console.log("Removing document");
});

ActuatorModel.remove({},  function() {
   console.log("Removing document");
});

db.once('open', function (callback) {
    console.log("Connection to MongoDB successful");

    _.forEach(triggers,
              function(triggerJSON) {
                  var trigger = new TriggerModel(triggerJSON);
                  console.log(trigger);
                  trigger.save(function(err) {
                      console.log("Trigger Saved");
                      if (err) console.log(err);
		      console.log(trigger);
                  });
              });


    _.forEach(sensors,
              function(sensorJSON) {
                  var sensor = new SensorModel(sensorJSON);
                  sensor.save(function(err) {
                      if (err) console.log(err);
                  });
              });


    _.forEach(actuators,
              function(JSON) {
                  var rec = new ActuatorModel(JSON);
                  rec.save(function(err) {
                      if (err) console.log(err);
                  });
              });

});
// //db.close();
