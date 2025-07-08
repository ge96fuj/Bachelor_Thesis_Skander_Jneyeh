# 🚦 Traffic Light Control System

This project is a traffic light control system that includes a server (Node.js) and multiple clients (e.g., Arduino). The system supports optional security features like HMAC signing and timestamp verification.


---

## 🛠️ Setup Instructions

### 1. Configure IP Addresses

Update the IP addresses on **both the client and server sides** to ensure proper communication.  


---

### 2. Configure Security Settings (Optional)

To enable security features like **HMAC** and **timestamp verification**, set the following variables **consistently on both sides** (same value and same case):

```js
verifyTimeStamp = true   // or false
Hashing = true           // or false
```


### 3. Share Traffic light Status via MQTT
node Traffic-Light-Server-Client/Server/services/mqtt.server.js




## Edit the configuration file on the server side:
In config/config.js, define the traffic lights by assigning each a unique ID, optional group name, and the duration for red, yellow, and green lights (in milliseconds). The ID used in the config must match the ID hardcoded on the corresponding client.
Example :
```js
module.exports = [
  {
    id: "traffic1",
    localization_x: 0,
    localization_y: 0,
    group: "A",
    durations: { red: 2000, yellow: 2000, green: 4000 }
  },
  {
    id: "traffic2",
    localization_x: 0,
    localization_y: 0,
    group: "A",
    durations: { red: 2000, yellow: 2000, green: 4000 }
  }

];

```
## Run The Server
```js
cd Traffic-Light-Server-Client/Server
npm install
npm start
```
## Flash the Arduino with the corresponding SW and RUN
