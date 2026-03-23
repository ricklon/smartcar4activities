#ifndef _CameraWebServer_WS_H
#define _CameraWebServer_WS_H
#include "esp_camera.h"
#include <ESPmDNS.h>
#include <Preferences.h>
#include <WiFi.h>

class CameraWebServer_WS
{
public:
  void CameraWebServer_WS_Init(void);
  void CameraWebServer_WS_Loop(void);
  bool SaveStationCredentials(const String &ssid, const String &password, const String &hostname);
  bool ClearStationCredentials(void);
  bool HasSavedStationCredentials(void);
  bool IsStationConnected(void);
  bool IsAccessPointActive(void);
  String GetSavedStationSSID(void);
  String GetSavedStationHostname(void);
  String GetActiveAccessPointSSID(void);
  String GetStationIP(void);
  String GetAccessPointIP(void);
  String GetMdnsName(void);
  String GetModeLabel(void);
  bool IsValidHostnameLabel(const String &hostname);
  String GetCarName(void);
  String wifi_name;

private:
  bool ConnectSavedStation(uint32_t timeout_ms);
  void BeginStationConnection(void);
  bool EnsureMdnsStarted(void);
  void StopMdns(void);
  void StartAccessPoint(void);
  void StopAccessPoint(void);
  String BuildDefaultAccessPointSSID(void);
  void LoadStationCredentials(String *ssid, String *password, String *hostname);

  char *ssid = (char *)"ELEGOO-";
  char *password = (char *)"";
  String access_point_ssid;
  unsigned long sta_retry_started_at = 0;
  bool mdns_started = false;
  String mdns_hostname;
};

extern CameraWebServer_WS CameraWebServerWS;

#endif
