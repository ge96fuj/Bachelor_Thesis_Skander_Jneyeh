// broker.js
const aedes = require('aedes')();
const net = require('net');

const PORT = 1883;

const server = net.createServer(aedes.handle);

server.listen(PORT, '192.168.0.101', function () {
    console.log(`MQTT broker is up and running on port ${PORT}`);
  });

aedes.on('client', function (client) {
  console.log(`Client connected: ${client.id}`);
});

aedes.on('publish', function (packet, client) {
  if (client) {
   // console.log(` Message from ${client.id}: ${packet.topic} → ${packet.payload.toString()}`);
  }
});

