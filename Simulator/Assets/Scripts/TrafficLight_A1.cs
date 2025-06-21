using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using uPLibrary.Networking.M2Mqtt;
using uPLibrary.Networking.M2Mqtt.Messages;
using M2MqttUnity;
using System.Text;

public class TrafficLight_A1 : M2MqttUnityClient
{
    [Header("Traffic Light GameObjects")]
    public GameObject traffic_A1_RED;
    public GameObject traffic_A1_YELLOW;
    public GameObject traffic_A1_GREEN;
    public GameObject traffic_A1_OFF;

    [Header("Debug Options")]
    public bool debug = true;

    protected override void Start()
    {
        if (debug) Debug.Log("TrafficLight_A1: Start()");

        brokerAddress = "10.181.241.34"; 
        brokerPort = 1883;
        autoConnect = true;
        base.Start();
    }

    protected override void OnConnecting()
    {
        if (debug) Debug.Log("TrafficLight_A1: Connecting to MQTT broker...");
    }

    protected override void OnConnected()
    {
         SubscribeTopics();
        if (debug) Debug.Log("TrafficLight_A1: Connected to MQTT broker.");
    }

    protected override void OnConnectionFailed(string errorMessage)
    {
        Debug.LogError("TrafficLight_A1: Connection failed! Error: " + errorMessage);
    }

    protected override void OnDisconnected()
    {
        if (debug) Debug.Log("TrafficLight_A1: Disconnected from MQTT broker.");
    }

    protected override void OnConnectionLost()
    {
        Debug.LogError("TrafficLight_A1: Connection lost!");
    }

    protected override void SubscribeTopics()
    {
        if (debug) Debug.Log("TrafficLight_A1: Subscribing to topic 'detection/status/A1'");
        client.Subscribe(new string[] { "detection/status/tl_1" }, new byte[] { MqttMsgBase.QOS_LEVEL_AT_MOST_ONCE });
    }

    protected override void UnsubscribeTopics()
    {
        if (debug) Debug.Log("TrafficLight_A1: Unsubscribing from topic 'detection/status/A1'");
        client.Unsubscribe(new string[] { "detection/status/tl_1" });
    }

    protected override void DecodeMessage(string topic, byte[] message)
    {
        string status = Encoding.UTF8.GetString(message);
        if (debug) Debug.Log($"TrafficLight_A1: [DecodeMessage] Topic: {topic} - Status: {status}");

        HandleTrafficLightStatus(status);
    }

    private void HandleTrafficLightStatus(string status)
    {
        if (debug) Debug.Log($"TrafficLight_A1: Handling status [{status}]");

        TurnOffAllLights();

        switch (status.ToUpper())
        {
            case "RED":
                if (debug) Debug.Log("TrafficLight_A1: Turning RED light ON");
                traffic_A1_RED.SetActive(true);
                break;

            case "YELLOW":
                if (debug) Debug.Log("TrafficLight_A1: Turning YELLOW light ON");
                traffic_A1_YELLOW.SetActive(true);
                break;

            case "GREEN":
                if (debug) Debug.Log("TrafficLight_A1: Turning GREEN light ON");
                traffic_A1_GREEN.SetActive(true);
                break;

            default:
                Debug.LogWarning($"TrafficLight_A1: Unknown status [{status}] received.");
                break;
        }
    }

    private void TurnOffAllLights()
    {
        if (debug) Debug.Log("TrafficLight_A1: Turning OFF all lights");
        traffic_A1_RED.SetActive(false);
        traffic_A1_YELLOW.SetActive(false);
        traffic_A1_GREEN.SetActive(false);
        traffic_A1_OFF.SetActive(false);
    }
}
