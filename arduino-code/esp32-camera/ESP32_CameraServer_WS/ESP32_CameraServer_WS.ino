/*
 * ELEGOO Smart Robot Car V4.0 - ESP32 Camera Web Server (WS / mDNS tier)
 * Tier 3: mDNS hostname provisioning, WebSocket control (in progress)
 * Supports ESP32-WROVER and ESP32-S3 via board_profile.h
 */
#include "CameraWebServer_WS.h"
#include "board_profile.h"
#include <WiFi.h>
#include "esp_camera.h"

namespace
{
const char *kProjectFirmwareVersion = "smartcar4activities-esp32-ws 2026-03-22";
}

WiFiServer server(100);
CameraWebServer_WS CameraWebServerWS;

bool WA_en = false;

void SocketServer_Test(void)
{
  static bool ED_client = true;
  WiFiClient client = server.available();
  if (client)
  {
    WA_en = true;
    ED_client = true;
    Serial.println("[Client connected]");
    String readBuff;
    String sendBuff;
    uint8_t Heartbeat_count = 0;
    bool Heartbeat_status = false;
    bool data_begin = true;
    while (client.connected())
    {
      if (client.available())
      {
        char c = client.read();
        Serial.print(c);
        if (true == data_begin && c == '{')
        {
          data_begin = false;
        }
        if (false == data_begin && c != ' ')
        {
          readBuff += c;
        }
        if (false == data_begin && c == '}')
        {
          data_begin = true;
          if (true == readBuff.equals("{Heartbeat}"))
          {
            Heartbeat_status = true;
          }
          else
          {
            Serial2.print(readBuff);
          }
          readBuff = "";
        }
      }
      if (Serial2.available())
      {
        char c = Serial2.read();
        sendBuff += c;
        if (c == '}')
        {
          client.print(sendBuff);
          Serial.print(sendBuff);
          sendBuff = "";
        }
      }

      static unsigned long Heartbeat_time = 0;
      if (millis() - Heartbeat_time > 1000)
      {
        client.print("{Heartbeat}");
        if (true == Heartbeat_status)
        {
          Heartbeat_status = false;
          Heartbeat_count = 0;
        }
        else if (false == Heartbeat_status)
        {
          Heartbeat_count += 1;
        }
        if (Heartbeat_count > 3)
        {
          Heartbeat_count = 0;
          Heartbeat_status = false;
          break;
        }
        Heartbeat_time = millis();
      }
    }
    Serial2.print("{\"N\":100}");
    client.stop();
    Serial.println("[Client disconnected]");
  }
  else
  {
    if (ED_client == true)
    {
      ED_client = false;
      Serial2.print("{\"N\":100}");
    }
  }
}

void setup()
{
  Serial.begin(115200);
  Serial.printf("Firmware version: %s\r\n", kProjectFirmwareVersion);
  Serial.printf("Board profile: %s\r\n", CAR_BOARD_PROFILE_LABEL);
  Serial.printf("Serial2 RX=%d TX=%d\r\n", CAR_UART_RX_PIN, CAR_UART_TX_PIN);
  Serial.printf("STA MAC: %s\r\n", WiFi.macAddress().c_str());
  Serial.printf("AP MAC: %s\r\n", WiFi.softAPmacAddress().c_str());
  Serial2.begin(9600, SERIAL_8N1, CAR_UART_RX_PIN, CAR_UART_TX_PIN);

  if (CameraWebServerWS.HasSavedStationCredentials())
  {
    Serial.println("Saved Wi-Fi found. Send 'r' within 3s to clear and force AP mode...");
    unsigned long deadline = millis() + 3000;
    while (millis() < deadline)
    {
      if (Serial.available() && Serial.read() == 'r')
      {
        CameraWebServerWS.ClearStationCredentials();
        Serial.println("Credentials cleared. Starting in AP mode.");
        break;
      }
    }
  }

  CameraWebServerWS.CameraWebServer_WS_Init();
  server.begin();
}

void loop()
{
  CameraWebServerWS.CameraWebServer_WS_Loop();
  SocketServer_Test();
}
