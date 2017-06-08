## Database Lab: Objectives

### Read the Objectives

![](./images/lab4.png)

Write a NodeJS server that listens to all the MQTT sensor traffic on the network and writes it to a database on the gateway.

The steps to write the MQTT to database service are as follows:

*   Install MongoDB and the MongooseJS database bindings
*   Write a NodeJS server that listens to all sensor traffic over MQTT
*   Write the collected sensor information to the database.

## Verify if MongoDB service is running

The mongod process should already by running on your system, check with below command if it is running properly

    ps aux | grep mongod

This should list the mongodb process, if it does not try and launch it again with below command

    mongod --dbpath=/data/db

## Defining Types for the Edge Network

As we build our Internet of Things system, we will need to define the objects and events that we want to track on our edge network.

For this edge network, we will define five types that we will track in the database.

*   **Sensor** - this data describes an edge device that publishes data to the Intel® IoT Gateway. Examples of sensors include the sensors included in your Intel IoT Developer Kit. For a complete list of supported sensors see the [libUPM project](https://github.com/intel-iot-devkit/upm).
*   **Actuator** - this data describes an edge device that performs an action and can be triggered by the Intel® IoT Gateway. For example, an LCD screen can have text sent to it to be displayed, a servo motor can be told to rotate a certain number of degrees, or a buzzer may be told to activate. Any device that performs an action is considered an actuator. Note that actuators usually do not publish sensor data to the network but they may be queried for the current status.
*   **Data** - the data contained within a single reading from a sensor
*   **Trigger** - Triggers have a four important aspects: a name, a sensor that it watches, a condition function (a predicate) that returns TRUE or FALSE and a trigger function that performs an action when the predicate function is true. This will be used more in the Automation Lab. It will watch data coming from a temperature sensor. Its predicate function will evaluate if the temperature is greater than 27 degrees, and its action function will send an alert, log a system error and send text to the LCD screen.
*   **Error** - a text string and a timestamp describing the errors on the edge network.

Our database will store five types: **sensors, actuators, data, trigger and error**. We've prepared the MongooseJS schemas that you will need to complete this lab. Install the NPM package below and then you will be able to import the schemas.

#### About MongooseJS

MongooseJS is an Object Data Manager that let’s you build JavaScript objects that can create, read, validate, update and remove entries from a MongoDB.

Read through the documentation on building Mongoose Schemas and Models at [http://mongoosejs.com/docs/guide.html](http://mongoosejs.com/docs/guide.html) then start the exercise.

## MQTT Sensor Monitoring on the Gateway

Before we start monitoring sensor data, let's make sure the sensors are publishing the data. We saw two ways to do this:

*   Using the node-red flow for temperature sensor that we did in "Application Protocols: MQTT and HTTP". However this needs a small change where we have to change the mqtt output and input nodes to use port **8883** instead of 1883 and re-deploy

*   Second is by running the virtual-sensor.js program. This program simulates temperature and other sensor readings in absence of actual hardware. We will execute this program to generate random temperature data on port **8883**

*   Follow below steps to download and run it

    git clone https://github.com/SSG-DRD-IOT/virtual-sensor.git

    cd virtual-sensor

    npm install

    node virtual-sensor.js --tls

Ensure that sensor data is published using any one of the above two methods.

Now that the database schemas are defined and the sensors are publishing data on the edge network, we can listen to the data and begin to use it to trigger actions or perform edge analytics.

The purpose of this project is to track new sensors on the edge network and to record their data into the MongoDB database.

#### Overview on MQTT Topics on the Edge Network

Each sensor is publishing to an MQTT topic that has a three level hierarchy. Here is an example of a possible hierarchy that could be used in an IoT Edge Network.

    sensor
        | temperature
            | data
            | error
        | light
            | data
            | error
        | vibration
            | data
            | error
        | sound
            | data
            | error

The first level which is just the literal "**sensor**" which denotes that all of the items under this point in the hierarchy are sensors.

The second level in the hierarchy is the **unique ID of the sensor**. This could be a randomly generated unique number or the MAC address of the sensor. In our case, we are using the strings "temperature", "light", "vibration" and "sound" because these are unique on our network. If the IoT network had more than one temperature sensor, which is ususally the case, then the system should have a different method of assigning unique IDs to each sensor.

The third describes the **type of communication** that is coming from the sensor.

The server will be listening to two MQTT topics:

*   sensors/+/data

Note the `+` is a wildcard character that matches any alphanumeric string. In this case, we are using it where the sensor name would be. This lets us receive data from all sensors on the edge network.

The `monitord` does this by listening to all MQTT sensor topics 'sensors/+/data' that are published on the edge network. New sensor data is written to the database.

#### <a name="sensorMonitor">Create "monitord" Project and Import NPM Modules</a>

Open a new console to your gateway and create a project named **monitord** under the **/home/{user}/labs** directory and change to that directory.

    cd ~/labs
    mkdir monitord
    cd monitord

Next generate an NPM package file which holds the metadata associated with this project.

    npm init

You will need to answer a few questions to generate the file. However, the defaults that are provided are excellent and you can, if you wish, just hit enter to move through the questions.

To install MongooseJS, MQTT and the Mongoose schemas that we've prepared for you, execute the following commands:

    npm install --save mqtt lodash mongoose intel-commercial-edge-network-database-models

The package.json file should look like this now.

./package.json

```json
{
  "name": "monitord",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "intel-commercial-edge-network-database-models": "^1.0.9",
    "lodash": "^4.13.1",
    "mongoose": "^4.5.0",
    "mqtt": "^1.11.0"
  }
}
```

You should also change the **main** property to **"server.js"** instead of "index.js"

You can again run "npm install" to confirm all the dependencies are installed

#### Connect to the MQTT Broker and MongoDB

Create a file called `server.js` in your monitord folder. This will be the main entry point into your monitord.

After importing the MQTT module, setup a connection to the MQTT broker with changes as below

The "options" variable is to set up a secure connection using SSL and TLS properties as described earlier in "Security and the Internet of Things" lab

./server.js

``` js
// Require MQTT and setup the connection to the broker
var mqtt = require('mqtt');
var fs = require('fs');
var KEY = fs.readFileSync('/etc/tls-certs/certs/server.key');
var CERT = fs.readFileSync('/etc/tls-certs/certs/server.crt');
var TRUSTED_CA_LIST = [fs.readFileSync('/etc/tls-certs/ca_certificates/ca.crt')];

var PORT = 8883;
var HOST = 'localhost';

var options = {
  port: PORT,
  host: HOST,
  protocol: 'mqtts',
  protocolId: 'MQIsdp',
  keyPath: KEY,
  certPath: CERT,
  rejectUnauthorized : false,
  //The CA list will be used to determine if server is authorized
  ca: TRUSTED_CA_LIST,
  secureProtocol: 'TLSv1_method',
  protocolVersion: 3
};
var mqttClient = mqtt.connect(options);
```

Likewise, require the MongooseJS module and setup the connection to the MongoDB server.

   ./server.js

``` js
// Require the MongoDB libraries and connect to the database
var mongoose = require('mongoose');
mongoose.connect("mongodb://localhost/iotdemo");
var db = mongoose.connection;

// Report database errors to the console
db.on('error', console.error.bind(console, 'connection error:'));

// Log when a connection is established to the MongoDB server
db.once('open', function(callback) {
  console.log("Connection to MongoDB successful");
});
```

Here we are also demonstrating binding a handler to two database events the `open` and `error` events.

Now import and initialize a sensor and a data model.

./server.js

<ui-codemirror ui-codemirror-opts="editorOptions">

<pre class="brush:jscript;">// Import the Database Model Objects
var Data = require('intel-commercial-edge-network-database-models').Data;
var Sensor = require('intel-commercial-edge-network-database-models').Sensor;</pre>

</ui-codemirror>

Now that the dependencies are included and the connection code to the MQTT broker and MongoDB database is written. Proceed to create the main loop of the program.

#### The MQTT Event Loop

1.  In Application Protocol lab, you learned how to create a handler for the MQTT `connect` event with NodeRed. Here we show how to create such handlers in JavaScript. In this event handler, the handler subscribes to the following MQTT topics:

    *   `sensors/+/data`
2.  ./server.js

    <ui-codemirror ui-codemirror-opts="editorOptions">

    <pre class="brush:jscript;">// MQTT connection function
    mqttClient.on('connect', function() {
      console.log("Connected to MQTT server");

      // Subscribe to the MQTT topics
      mqttClient.subscribe('sensors/+/data');
    });</pre>

    </ui-codemirror>

Next, write a handler for the MQTT `message` event.

Parse the incoming message using a `try-catch` block and the `JSON.parse` function.

./server.js

<ui-codemirror ui-codemirror-opts="editorOptions">

<pre class="brush:jscript;">// A function that runs when MQTT receives a message
mqttClient.on('message', function(topic, message) {
      var json;
      // Parse the incoming data
      try {
        json = JSON.parse(message);
      } catch (e) {
        console.log(e);
      };</pre>

</ui-codemirror>

./server.js

<ui-codemirror ui-codemirror-opts="editorOptions">

<pre class="brush:jscript;">    if (topic.match(/data/)) {
      var value = new Data(json);
      value.save(function(err, data) {
        if (err)
          console.log(err);
        else
          console.log(topic + ":" + message.toString());
      });
    }
  });</pre>

</ui-codemirror>

Verify that MongoDB is running. You can do this in two ways:

1.  Type `ps aux | egrep mongod` at the command and verify that a process is displayed.
2.  If you are running MongoDB in a screen session, then you can switch to the screen running the MongoDB server by typing `Ctrl-a "` and selecting the screen that you are running MongoDB in.

Start the server to monitor sensor data:

    node server.js

You should start seeing prints of data that is monitored by this monitord server:

    sensors/temperature/data:{"sensor_id": "temperature", "value": 29, "timestamp": 1486420487851}
    sensors/temperature/data:{"sensor_id": "temperature", "value": 18, "timestamp": 1486420487854}

## Verify that Temperature Data is being Put in the Database

To verify that data is being spooled into the database, you will need to use the command line Mongo client.

Open a new ssh terminal to your gateway and start the Mongo client by typing on a command line

    mongo

Once in the mongo client type

    show dbs

the **iotdemo** database should be in the displayed list. Now you can switch to the database.

    use iotdemo

Collections in MongoDB are similar to tables in an SQL database. To see the collections in the iotdemo database type

    show collections

Now you can begin querying data. The first command will list all data in the collection and the second will count the number of data entries in the collection.

    db.datamodels.find()

or

    db.datamodels.count()

## Lab Solutions

The code described above in this lab can also be downloaded and deployed by cloning a repository from Github.

Change to the directory that you would like to download the solution into, and then type:

    git clone https://github.com/SSG-DRD-IOT/lab-solution-monitor-daemon.git

    cd lab-solution-monitor-daemon

    npm install

Verify that MongoDB is running. You can do this in two way:

1.  Type `ps aux | egrep mongod` at the command and verify that a process is displayed.
2.  If you are running MongoDB in a screen session, then you can switch to the screen running the MongoDB server by typing `Ctrl-a "` and selecting the screen that you are running MongoDB in.

Start the server:

    node server.js

You should start seeing prints of data that is monitored by this server and written to the database

## Additional Resources

*   [Mongoose](http://mongoosejs.com/docs/guide.html) [MQTT](http://mqtt.org/) [JSON](http://www.w3schools.com/js/js_json.asp)

</labels>
