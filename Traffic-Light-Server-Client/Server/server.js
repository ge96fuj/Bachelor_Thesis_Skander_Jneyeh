const net = require('net');
const { TrafficLight } = require('./core/TrafficLight.js');
const TrafficGroup = require('./core/TrafficGroup.js');
const lightConfig = require('./config/lightConfig.js');
require('./services/api.server.js');
require('./services/mqtt.service.js');
// SERVER CONFIG 
IP = '192.168.0.101';
// IP = '192.168.1.21' ;
// IP = '172.20.10.2';
PORT = 12345;
global.lights = {};
global.trafficGroupsList = [];

const DEFAULT_DURATIONS = {
  red: 2000,
  yellow: 2000,
  green: 10000
};

const server = net.createServer((socket) => {
  let resReceived = false;
  let cnt=0;
  console.log(`${socket.remoteAddress} Connected`);
  // Identify the Arduino , send 0x20
  //socket.write(Buffer.from([0x20]));
  //console.log('➡️ Sent 0x20 to client');
  socket.setKeepAlive(true, 1000);

  
  const requestIdentification = () => {
    if (resReceived) return;

    if (cnt >= 3) {
      console.warn(socket.remoteAddress , " do not send 0x60 response");
      socket.destroy();
      return;
    }
    socket.write(Buffer.from([0x20]));
    console.log("Sent 0x20" , socket.remoteAddress , " attempt ", cnt + 1 );
    cnt++;
    //retry evry 3 sec
    idInterval = setTimeout(requestIdentification, 3000);
  };

  requestIdentification();
 

  socket.on('data', (data) => {
    console.log(" Received message: " , data.toString() , " from " , socket.remoteAddress );
    try {
      const { command } = JSON.parse(data);

      if (command === 60 && !resReceived) {
        resReceived = true;
        clearTimeout(idInterval);
        console.log(`${socket.remoteAddress} sent 0x60 `);
        console.log("0x60 is sent from " ,socket.remoteAddress );
}

    } catch (err) {
      console.log("Json Error , msg from " ,socket.remoteAddress  , " ", data.toString() );
      return;
    }
    handleReceivedMessage(data.toString(), socket);
  });
  //  handle disconnects
  const cleanDisconnect = () => {
    console.log('Socket disconnected');
    // Find the light corresponding to the socket
    const light = Object.values(global.lights).find(l => l.socket === socket);
    if (light) {
      console.log( light.id , "is Disconnected");
      light.socket = null;
      light.status = null;
    }
  };

  socket.on('end', cleanDisconnect);
  socket.on('close', cleanDisconnect);
  socket.on('error', (err) => {
    console.log( err.message , "Socket Error from " ,socket.remoteAddress );

    cleanDisconnect();
  });
});

server.listen(PORT, IP, () => {
  console.log('TCP server running on ', IP,":",PORT);
});

function handleReceivedMessage(data, socket) {
  try {
    if (!data.trim()) return console.log("Empty message. Ignoring...");

    const {command} = JSON.parse(data);
    switch (command) {
      case 60:
        addNewTrafficLight(JSON.parse(data), Object.keys(data).length, socket);
        break;

      case 90:
        break;
      default:
        console.log("Invalid Command" , command);
    }
  } catch (error) {
    socket.end();
    console.log(' JSON error:', error.message);
  }
}

function addNewTrafficLight(parsedData, dataLength, socket) {
  console.log('Adding Traffic Light...');
  let {lightID} = parsedData;
  if (!lightID ) {
    return console.log("Missing lightID");
  }

  // Get the light 
  let light = global.lights[lightID];

  if (!light) {
    return console.log("lightID ist not from Config" , lightID);
  }
  // Attach socket
  light.socket = socket;
  light.goBlink();

  console.log(lightID , "is now connected.");

}

function initializeLightsAndGroups() {
  const groupedIDs = {};
  global.lights = {};
  global.trafficGroupsList = [];
  global.launchedGroups = new Set();
  const usedIDs = new Set();
  
  
  for (const { id, localization_x, localization_y, group, durations } of lightConfig) {
    if (usedIDs.has(id)) {
      throw new Error(`❌ Duplicate light ID found: "${id}" in group "${group}"`);
    }
  
    const lightDurations = durations || DEFAULT_DURATIONS; // fallback duration values if there is no duration in the config file
  
    global.lights[id] = new TrafficLight(id, localization_x, localization_y, undefined, null, lightDurations);
    console.log(`✅ Created light ${id} with durations:`, lightDurations);

    usedIDs.add(id);
  
    if (!groupedIDs[group]) groupedIDs[group] = [];
    groupedIDs[group].push(id);
  }
  
  for (const [groupName, lightIDs] of Object.entries(groupedIDs)) {
    const group = new TrafficGroup(groupName, lightIDs);

    global.trafficGroupsList.push(group);
  }

  console.log("✅ Lights initialized:", Object.keys(global.lights));
  console.log("✅ Groups initialized:", global.trafficGroupsList.map(g => g.name));
}


global.launchedGroups = new Set();
  
async function checkAndLaunchGroups() {
  console.log("Running checkandlaunch function");
  for (const group of global.trafficGroupsList) {
    const groupName = group.name;

    //running
    if (global.launchedGroups.has(groupName)) continue;

    //Ready
    if (group.isReady()) {
      global.launchedGroups.add(groupName);
      group.goAllRed();
      console.log(` Group ${groupName} is ready. Starting cycle `);
      group.runCycle();
    } else {
      console.log(` Group ${groupName} not ready...`);
    }
  }
}

initializeLightsAndGroups();
setInterval(() => {
  const allGroupsLaunched = global.trafficGroupsList.length === global.launchedGroups.size;
  if (!allGroupsLaunched) {
    checkAndLaunchGroups().catch(console.error);
  }
}, 3000);