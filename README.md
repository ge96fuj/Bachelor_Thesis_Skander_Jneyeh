# 🚦 Traffic Light Control System

This project is a traffic light control system that includes a server (Node.js) and multiple clients (e.g., Arduino). The system supports optional security features like HMAC signing and timestamp verification.

## 📦 Features

- Control traffic lights via MQTT/HTTP
- Support for secure communication (HMAC + timestamp)
- Real-time status updates between clients and server
- Configurable client ID and IP setup

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
