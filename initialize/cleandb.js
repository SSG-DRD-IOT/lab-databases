var mongoose = require('mongoose');
var _ = require('lodash');

mongoose.Promise = Promise;
mongoose.connect('mongodb://localhost/iotdemo');
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

// Import the Database Model Objects
//var DataModel = require('../../../../commercial-edge-network-database').DataModel;
//var SensorCloudModel = require('../../../../commercial-edge-network-database').SensorCloudModel;
var TriggerModel = require('intel-commercial-edge-network-database-models').TriggerModel;
var SensorModel = require('intel-commercial-edge-network-database-models').SensorModel;
var ActuatorModel = require('intel-commercial-edge-network-database-models').ActuatorModel;
var DataModel = require('intel-commercial-edge-network-database-models').DataModel;

TriggerModel.remove({}, function() {
    console.log("Removing Triggers");
})

SensorModel.remove({}, function() {
   console.log("Removing Sensors");
});

ActuatorModel.remove({}, function() {
   console.log("Removing Actuators");
});

DataModel.remove({}, function() {
   console.log("Removing Data");
});
console.log("Press CRTL+C to exit.")
