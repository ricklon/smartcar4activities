/*
 * ELEGOO Smart Robot Car V4.0 - ESP32 Camera Web Server (Simplified)
 * Based on ELEGOO firmware, face detection removed for compatibility
 */
#include "CameraWebServer_AP.h"
#include <WiFi.h>
#include "esp_camera.h"

WiFiServer server(100);
CameraWebServer_AP CameraWebServerAP;

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
      static unsigned long Test_time = 0;
      if (millis() - Test_time > 1000)
      {
        Test_time = millis();
        if (0 == (WiFi.softAPgetStationNum()))
        {
          Serial2.print("{\"N\":100}");
          break;
        }
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
  // ESP32-S3: RX2=GPIO3, TX2=GPIO1 (GPIO4 conflicts with camera I2C)
  Serial2.begin(9600, SERIAL_8N1, 3, 1);
  CameraWebServerAP.CameraWebServer_AP_Init();
  server.begin();
}

void loop()
{
  CameraWebServerAP.CameraWebServer_AP_Loop();
  SocketServer_Test();
}
