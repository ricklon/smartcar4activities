#ifndef _CameraWebServer_AP_H
#define _CameraWebServer_AP_H
#include "esp_camera.h"
#include <Preferences.h>
#include <WiFi.h>

class CameraWebServer_AP
{
public:
  void CameraWebServer_AP_Init(void);
  void CameraWebServer_AP_Loop(void);
  bool SaveStationCredentials(const String &ssid, const String &password);
  bool ClearStationCredentials(void);
  bool HasSavedStationCredentials(void);
  bool IsStationConnected(void);
  bool IsAccessPointActive(void);
  String GetSavedStationSSID(void);
  String GetActiveAccessPointSSID(void);
  String GetStationIP(void);
  String GetAccessPointIP(void);
  String GetModeLabel(void);
  String wifi_name;

private:
  bool ConnectSavedStation(uint32_t timeout_ms);
  void BeginStationConnection(void);
  void StartAccessPoint(void);
  void StopAccessPoint(void);
  String BuildDefaultAccessPointSSID(void);
  void LoadStationCredentials(String *ssid, String *password);

  char *ssid = (char *)"ELEGOO-";
  char *password = (char *)"";
  String access_point_ssid;
  unsigned long sta_retry_started_at = 0;
};

extern CameraWebServer_AP CameraWebServerAP;

#endif
