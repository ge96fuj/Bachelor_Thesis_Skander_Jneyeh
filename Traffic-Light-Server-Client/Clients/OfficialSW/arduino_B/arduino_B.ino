#include <WiFiNINA.h>
#include <ArduinoJson.h>

// Wi-Fi Credentials
char ssid[] = "AST_LAN"; 
char password[] = "sandboxlab"; 



//char ssid[] = "iPhone de Skander"; 
//char password[] = "123456789bb"; 


//char ssid[] = "AST_LAN"; 
//char password[] = "sandboxlab"; 

// Server Configuration
//const char* serverIP = "192.168.0.105"; 
const char* serverIP = "192.168.0.101"; 
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

WiFiClient client;

void setup() {
    // Initialize Serial Monitor
    Serial.begin(115200);
    
    // Set Pin Modes
    pinMode(redPin, OUTPUT);
    pinMode(yellowPin, OUTPUT);
    pinMode(greenPin, OUTPUT);
    
    // Connect to Wi-Fi and Server
    connectToWiFi();
    connectToServer();
}

void loop() {
    // Reconnect if the client is disconnected
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
   
        char request = client.read();
        Serial.print("Received request: ");
        Serial.println(request, HEX);
        
        switch (request) {
            case 0x20: sendStatus(); break;
            case 0x21: goRed(); break;
            case 0x22: goGreen(); break;
            case 0x23: goYellow(); break;
            case 0x25: goBlink(); break;
            default: Serial.println("Unknown request received"); break;
        }
    }
}

void sendStatus() {
    StaticJsonDocument<200> doc;
    doc["command"] = 60;
    doc["lightID"] = "traffic1";

    
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
   // sendConfirmation();
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
   // sendConfirmation();
}

void goBlink() {
    //sendConfirmation();
    blink = true;
    digitalWrite(redPin, LOW);
    digitalWrite(greenPin, LOW);
    while (blink) {
       if (!client.connected()) {
        Serial.println("Lost connection to server while blink , reconnecting...");
        blink = false;
    }
      
        Serial.println("Blinking...");
        digitalWrite(yellowPin, !digitalRead(yellowPin));
        delay(500);
        handleRequests();
    }
    Serial.println("Blinking stopped");
}
