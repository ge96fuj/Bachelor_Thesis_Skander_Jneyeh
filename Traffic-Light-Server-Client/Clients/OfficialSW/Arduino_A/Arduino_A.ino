// TODO : ADD hashing to the response if hashing is true
// if msg received >1 -> hashing and timestamp should be false ... otherwise error and close
#include <WiFi101.h>
#include <WiFiUdp.h>
#include <ArduinoJson.h>
#include <Crypto.h>
#include <SHA256.h>
#include <NTPClient.h>

WiFiClient client;
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, 60000);

// Security Config :
const char* secret_key = "f2b7d0c6a3e1c9d56fa43ec0e75bd98b192de4f3914bc7ecb487a3eb5f68a219";
const char* secret_key_fake = "f2b7d0c6a3e1c9d56fa43ec0e75bd98b192de4f3914bc7ecb487a3eb5f68a218";
const size_t MSG_LEN = 37;
const uint32_t allowedDelay = 5;
boolean verifyTimeStamp = false; //false if no internet 
boolean Hashing = true;

// Wi-Fi Credentials
char ssid[] = "SKA";
char password[] = "55333932s";

// Server Configuration
const char* serverIP = "192.168.0.104";
const int serverPort = 12345;

enum TrafficLightState { RED, YELLOW, GREEN };
TrafficLightState currentState;

// Traffic Light Pins
const int redPin = 2;
const int yellowPin = 3;
const int greenPin = 4;

// Traffic Light Location
uint16_t locX = 0x1234;
uint16_t locY = 0x200;

// State Variables
bool begin = false;
bool blink = false;

void setup() {
  Serial.begin(115200);
  pinMode(redPin, OUTPUT);
  pinMode(yellowPin, OUTPUT);
  pinMode(greenPin, OUTPUT);

  connectToWiFi();

  if (verifyTimeStamp) {
    timeClient.begin();
    timeClient.update();
  }

  connectToServer();
}

void loop() {
  if (!client.connected()) {
    digitalWrite(redPin, LOW);
    digitalWrite(greenPin, LOW);
    Serial.println("Lost connection to server, reconnecting...");
    client.stop();
    connectToServer();
  }

  handleRequests();
}

void connectToWiFi() {
  Serial.print("Connecting to Wi-Fi...");
  WiFi.begin(ssid, password);
  unsigned long startTime = millis();

  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - startTime >= 120000) {
      Serial.println("More than 120 sec with no connection .. Restarting");
      NVIC_SystemReset();
    }
    delay(5000);
    Serial.print(".");
  }
  Serial.println("\nConnected to Wi-Fi");
}

void connectToServer() {
  Serial.print("Connecting to server...");
  unsigned long startTime = millis();
  digitalWrite(redPin, LOW);
  digitalWrite(greenPin, LOW);

  while (!client.connect(serverIP, serverPort)) {
    if (millis() - startTime >= 30000) {
      Serial.println("More than 30 sec with no connection .. Restarting");
      NVIC_SystemReset();
    }
    Serial.println("Connection failed, retrying...");
    digitalWrite(yellowPin, !digitalRead(yellowPin));
    delay(500);
  }
  Serial.println("Connected to server!");
}

void handleRequests() {
  if (!client.connected()) {
    Serial.println("Lost connection to server, reconnecting...");
    client.stop();
    connectToServer();
  }

  if (client.available()) {
    String jsonString = client.readStringUntil('}');  // Read until end of JSON
    jsonString += "}";  // Re-add closing brace

    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, jsonString);
    if (error) {
      Serial.print("JSON Parse Error: ");
      Serial.println(error.c_str());
      client.stop();
      return;
    }

    // Extract values
    int command = doc["command"];
    const char* hmac = doc["hmac"];
    unsigned long timestamp = doc["timestamp"] | 0;

    // --- Timestamp check ---
    if (verifyTimeStamp) {
      timeClient.update();
      unsigned long now = timeClient.getEpochTime();
      if (abs((long)(now - timestamp)) > allowedDelay) {
        Serial.println("Timestamp invalid - possible replay attack");
        client.stop();
        turnAll();
        delay(5000);
        return;
      }
      Serial.println("Timestamp check passed");
    }

    // --- HMAC check ---
    if (Hashing) {
      // Remove hmac from the JSON before recomputing hash
      doc.remove("hmac");

      String jsonToHash;
      serializeJson(doc, jsonToHash);

      SHA256 sha256;
      uint8_t hmacBytes[SHA256::HASH_SIZE];
      const uint8_t* key = (const uint8_t*)secret_key;
      size_t keyLen = strlen(secret_key);

      sha256.resetHMAC(key, keyLen);
      sha256.update((const uint8_t*)jsonToHash.c_str(), jsonToHash.length());
      sha256.finalizeHMAC(key, keyLen, hmacBytes, sizeof(hmacBytes));

      // Convert HMAC to hex
      char computedHmac[65];
      for (int i = 0; i < SHA256::HASH_SIZE; i++) {
        sprintf(&computedHmac[i * 2], "%02x", hmacBytes[i]);
      }
      computedHmac[64] = '\0';

      if (strcmp(hmac, computedHmac) != 0) {
        Serial.println("HMAC mismatch - authentication failed .. retrying in 5 seconds");
        client.stop();
        turnAll();
        delay(5000);
        return;
      }

      Serial.println("HMAC check passed");
    }

    // --- Command Execution ---
    Serial.print("Valid command received: 0x");
    Serial.println(command, HEX);

    switch (command) {
      case 0x20: sendStatus(); break;
      case 0x21: goRed(); break;
      case 0x22: goGreen(); break;
      case 0x23: goYellow(); break;
      case 0x25: goBlink(); break;
      default:
        Serial.print("Unknown command: 0x");
        Serial.println(command, HEX);
        break;
    }
  }
}

bool verifyHMAC(const byte* message, size_t len, const byte* expectedHMAC) {
  SHA256 sha256;
  uint8_t result[SHA256::HASH_SIZE];
  const uint8_t* key = (const uint8_t*)secret_key;
  size_t keyLen = strlen(secret_key);

  sha256.resetHMAC(key, keyLen);
  sha256.update(message, len);
  sha256.finalizeHMAC(key, keyLen, result, sizeof(result));

  return memcmp(result, expectedHMAC, SHA256::HASH_SIZE) == 0;
}


void sendStatus() {
  StaticJsonDocument<256> doc;
  doc["command"] = 0x60;
  doc["lightID"] = "traffic2";

  // Add timestamp if enabled
  if (verifyTimeStamp) {
    timeClient.update();
    unsigned long now = timeClient.getEpochTime();
    doc["timestamp"] = now;
  }

  // Prepare JSON string before HMAC (exclude hmac field)
  String jsonToHash;
  serializeJson(doc, jsonToHash);

  // Compute HMAC if needed
  if (Hashing) {
    SHA256 sha256;
    uint8_t hmacBytes[SHA256::HASH_SIZE];
    const uint8_t* key = (const uint8_t*)secret_key;
    size_t keyLen = strlen(secret_key);

    sha256.resetHMAC(key, keyLen);
    sha256.update((const uint8_t*)jsonToHash.c_str(), jsonToHash.length());
    sha256.finalizeHMAC(key, keyLen, hmacBytes, sizeof(hmacBytes));

    // Convert HMAC bytes to hex string
    String hmacHex;
    char buf[3];
    for (int i = 0; i < SHA256::HASH_SIZE; i++) {
      sprintf(buf, "%02x", hmacBytes[i]);
      hmacHex += buf;
    }

    doc["hmac"] = hmacHex;
  }

  // Serialize final JSON (with optional hmac) and send
  String finalJson;
  serializeJson(doc, finalJson);
  client.print(finalJson);
  client.flush();

  Serial.println("Sent status JSON:");
  Serial.println(finalJson);
}





void sendStatusss() {
  StaticJsonDocument<200> doc;
  doc["command"] = 0x60;
  doc["lightID"] = "traffic2";

  String jsonString;
  serializeJson(doc, jsonString);
  client.print(jsonString);
  client.flush();
}

void goRed() {
  blink = false;
  Serial.println("Changing to RED");
  currentState = RED;
  digitalWrite(redPin, HIGH);
  digitalWrite(yellowPin, LOW);
  digitalWrite(greenPin, LOW);
}

void goYellow() {
  blink = false;
  Serial.println("Changing to YELLOW");
  currentState = YELLOW;
  digitalWrite(redPin, LOW);
  digitalWrite(yellowPin, HIGH);
  digitalWrite(greenPin, LOW);
}

void goGreen() {
  blink = false;
  Serial.println("Changing to GREEN");
  currentState = GREEN;
  digitalWrite(redPin, LOW);
  digitalWrite(yellowPin, LOW);
  digitalWrite(greenPin, HIGH);
}

void goBlink() {
  blink = true;
  digitalWrite(redPin, LOW);
  digitalWrite(greenPin, LOW);
  while (blink) {
    if (!client.connected()) {
      Serial.println("Lost connection to server while blinking, reconnecting...");
      blink = false;
    }

    Serial.println("Blinking...");
    digitalWrite(yellowPin, !digitalRead(yellowPin));
    delay(500);
    handleRequests();
  }
  Serial.println("Blinking stopped");
}

void turnAll() {
  blink = false;
  Serial.println("TURN ON ALL THE LIGHTS! MALICIOUS DETECTED");
  digitalWrite(redPin, HIGH);
  digitalWrite(yellowPin, HIGH);
  digitalWrite(greenPin, HIGH);
}
