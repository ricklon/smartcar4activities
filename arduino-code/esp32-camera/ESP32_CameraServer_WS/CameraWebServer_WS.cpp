#if defined(CONFIG_IDF_TARGET_ESP32)
#define CAMERA_MODEL_M5STACK_WIDE
#elif defined(CONFIG_IDF_TARGET_ESP32S3)
#define CAMERA_MODEL_ESP32_S3
#endif

#include "CameraWebServer_WS.h"
#include "camera_pins.h"
#include "esp_system.h"
#include <ctype.h>

void startCameraServer();

namespace
{
const char *kWifiPrefsNamespace = "wifi";
const char *kWifiSsidKey = "ssid";
const char *kWifiPasswordKey = "password";
const char *kWifiHostnameKey = "hostname";
const char *kCarPrefsNamespace = "car";
const char *kCarNameKey = "name";
const uint32_t kInitialStaConnectTimeoutMs = 15000;
const uint32_t kFallbackRetryWindowMs = 20000;
}

void CameraWebServer_WS::CameraWebServer_WS_Init(void)
{
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 10000000;
  config.pixel_format = PIXFORMAT_JPEG;
  
  if (psramFound())
  {
    config.frame_size = FRAMESIZE_UXGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
  }
  else
  {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK)
  {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
  
  sensor_t *s = esp_camera_sensor_get();
  s->set_framesize(s, FRAMESIZE_VGA);

#if defined(CONFIG_IDF_TARGET_ESP32)
  s->set_vflip(s, 0);
  s->set_hmirror(s, 0);
#elif defined(CONFIG_IDF_TARGET_ESP32S3)
  s->set_vflip(s, 1);
  s->set_hmirror(s, 0);
#endif

  Serial.println("\r\n");

  access_point_ssid = BuildDefaultAccessPointSSID();
  wifi_name = access_point_ssid.substring(strlen(ssid));
  WiFi.setTxPower(WIFI_POWER_19_5dBm);
  WiFi.setSleep(false);
  WiFi.persistent(false);
  if (!ConnectSavedStation(kInitialStaConnectTimeoutMs))
  {
    StartAccessPoint();
  }
  startCameraServer();

  if (IsStationConnected())
  {
    Serial.print("Camera Ready on STA! Use 'http://");
    Serial.print(WiFi.localIP());
    Serial.println("' to connect");
  }
  if (IsAccessPointActive())
  {
    Serial.print("Camera Ready on AP! Use 'http://");
    Serial.print(WiFi.softAPIP());
    Serial.println("' to connect");
  }
}

void CameraWebServer_WS::CameraWebServer_WS_Loop(void)
{
  if (!HasSavedStationCredentials())
  {
    return;
  }

  if (IsStationConnected())
  {
    EnsureMdnsStarted();
    sta_retry_started_at = 0;
    return;
  }

  StopMdns();

  wifi_mode_t mode = WiFi.getMode();
  if (mode == WIFI_AP || mode == WIFI_AP_STA)
  {
    return;
  }

  if (sta_retry_started_at == 0)
  {
    sta_retry_started_at = millis();
    WiFi.reconnect();
    return;
  }

  if (millis() - sta_retry_started_at > kFallbackRetryWindowMs)
  {
    Serial.println("STA reconnect timed out, enabling fallback AP");
    StartAccessPoint();
    sta_retry_started_at = 0;
  }
}

bool CameraWebServer_WS::SaveStationCredentials(const String &station_ssid, const String &station_password, const String &station_hostname)
{
  Preferences prefs;
  if (!prefs.begin(kWifiPrefsNamespace, false))
  {
    return false;
  }

  bool ok = prefs.putString(kWifiSsidKey, station_ssid) > 0;
  ok = ok && prefs.putString(kWifiPasswordKey, station_password) >= 0;
  ok = ok && prefs.putString(kWifiHostnameKey, station_hostname) >= 0;
  prefs.end();
  return ok;
}

bool CameraWebServer_WS::ClearStationCredentials(void)
{
  Preferences prefs;
  if (!prefs.begin(kWifiPrefsNamespace, false))
  {
    return false;
  }

  bool ok = prefs.remove(kWifiSsidKey);
  ok = prefs.remove(kWifiPasswordKey) || ok;
  ok = prefs.remove(kWifiHostnameKey) || ok;
  prefs.end();
  return ok;
}

bool CameraWebServer_WS::HasSavedStationCredentials(void)
{
  Preferences prefs;
  if (!prefs.begin(kWifiPrefsNamespace, true))
  {
    return false;
  }

  bool has_credentials = prefs.isKey(kWifiSsidKey);
  prefs.end();
  return has_credentials;
}

bool CameraWebServer_WS::IsStationConnected(void)
{
  return WiFi.status() == WL_CONNECTED;
}

bool CameraWebServer_WS::IsAccessPointActive(void)
{
  wifi_mode_t mode = WiFi.getMode();
  return mode == WIFI_AP || mode == WIFI_AP_STA;
}

String CameraWebServer_WS::GetSavedStationSSID(void)
{
  String station_ssid;
  String station_password;
  String station_hostname;
  LoadStationCredentials(&station_ssid, &station_password, &station_hostname);
  return station_ssid;
}

String CameraWebServer_WS::GetSavedStationHostname(void)
{
  String station_ssid;
  String station_password;
  String station_hostname;
  LoadStationCredentials(&station_ssid, &station_password, &station_hostname);
  return station_hostname;
}

String CameraWebServer_WS::GetActiveAccessPointSSID(void)
{
  return access_point_ssid;
}

String CameraWebServer_WS::GetStationIP(void)
{
  return IsStationConnected() ? WiFi.localIP().toString() : String();
}

String CameraWebServer_WS::GetAccessPointIP(void)
{
  return IsAccessPointActive() ? WiFi.softAPIP().toString() : String();
}

String CameraWebServer_WS::GetMdnsName(void)
{
  if (mdns_hostname.length() == 0)
  {
    mdns_hostname = GetSavedStationHostname();
  }
  if (mdns_hostname.length() == 0)
  {
    return "";
  }
  return mdns_hostname + ".local";
}

String CameraWebServer_WS::GetModeLabel(void)
{
  wifi_mode_t mode = WiFi.getMode();
  if (mode == WIFI_AP_STA)
  {
    return "AP+STA";
  }
  if (mode == WIFI_STA)
  {
    return "STA";
  }
  if (mode == WIFI_AP)
  {
    return "AP";
  }
  return "OFF";
}

String CameraWebServer_WS::GetCarName(void)
{
  Preferences prefs;
  if (!prefs.begin(kCarPrefsNamespace, true))
  {
    return "";
  }
  String name = prefs.getString(kCarNameKey, "");
  prefs.end();
  return name;
}

bool CameraWebServer_WS::IsValidHostnameLabel(const String &hostname)
{
  if (hostname.length() == 0 || hostname.length() > 63)
  {
    return false;
  }

  if (hostname.endsWith(".local"))
  {
    return false;
  }

  if (hostname.charAt(0) == '-' || hostname.charAt(hostname.length() - 1) == '-')
  {
    return false;
  }

  for (size_t i = 0; i < hostname.length(); ++i)
  {
    char c = hostname.charAt(i);
    if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-')
    {
      continue;
    }
    return false;
  }

  return true;
}

bool CameraWebServer_WS::ConnectSavedStation(uint32_t timeout_ms)
{
  String station_ssid;
  String station_password;
  String station_hostname;
  LoadStationCredentials(&station_ssid, &station_password, &station_hostname);
  if (station_ssid.length() == 0)
  {
    return false;
  }

  mdns_hostname = station_hostname;
  Serial.print("Trying saved STA network: ");
  Serial.println(station_ssid);
  WiFi.mode(WIFI_STA);
  if (mdns_hostname.length() > 0)
  {
    WiFi.setHostname(mdns_hostname.c_str());
  }
  WiFi.begin(station_ssid.c_str(), station_password.c_str());

  unsigned long started_at = millis();
  while (millis() - started_at < timeout_ms)
  {
    if (WiFi.status() == WL_CONNECTED)
    {
      Serial.print("STA connected with IP: ");
      Serial.println(WiFi.localIP());
      EnsureMdnsStarted();
      sta_retry_started_at = 0;
      return true;
    }
    delay(250);
  }

  Serial.println("Saved STA network connect timed out");
  WiFi.disconnect(false, false);
  return false;
}

void CameraWebServer_WS::BeginStationConnection(void)
{
  String station_ssid;
  String station_password;
  String station_hostname;
  LoadStationCredentials(&station_ssid, &station_password, &station_hostname);
  if (station_ssid.length() == 0)
  {
    return;
  }

  mdns_hostname = station_hostname;
  WiFi.mode(WIFI_STA);
  if (mdns_hostname.length() > 0)
  {
    WiFi.setHostname(mdns_hostname.c_str());
  }
  WiFi.begin(station_ssid.c_str(), station_password.c_str());
  sta_retry_started_at = millis();
}

bool CameraWebServer_WS::EnsureMdnsStarted(void)
{
  if (!IsStationConnected())
  {
    return false;
  }

  if (mdns_hostname.length() == 0)
  {
    mdns_hostname = GetSavedStationHostname();
  }
  if (mdns_hostname.length() == 0)
  {
    return false;
  }

  if (mdns_started)
  {
    return true;
  }

  if (!MDNS.begin(mdns_hostname.c_str()))
  {
    Serial.print("mDNS start failed for ");
    Serial.println(mdns_hostname);
    return false;
  }

  MDNS.addService("http", "tcp", 80);
  MDNS.addService("http", "tcp", 81);
  mdns_started = true;
  Serial.print("mDNS ready at http://");
  Serial.print(GetMdnsName());
  Serial.println("/");
  return true;
}

void CameraWebServer_WS::StopMdns(void)
{
  if (!mdns_started)
  {
    return;
  }
  MDNS.end();
  mdns_started = false;
}

void CameraWebServer_WS::StartAccessPoint(void)
{
  if (access_point_ssid.length() == 0)
  {
    access_point_ssid = BuildDefaultAccessPointSSID();
  }

  Serial.println(":----------------------------:");
  Serial.print("wifi_name:");
  Serial.println(access_point_ssid);
  Serial.println(":----------------------------:");

  wifi_mode_t mode = WiFi.getMode();
  if (mode == WIFI_STA && HasSavedStationCredentials())
  {
    WiFi.mode(WIFI_AP_STA);
  }
  else
  {
    WiFi.mode(WIFI_AP);
  }
  WiFi.softAP(access_point_ssid.c_str(), password, 9);
}

void CameraWebServer_WS::StopAccessPoint(void)
{
  WiFi.softAPdisconnect(true);
  if (IsStationConnected())
  {
    WiFi.mode(WIFI_STA);
  }
}

String CameraWebServer_WS::BuildDefaultAccessPointSSID(void)
{
  uint64_t chipid = ESP.getEfuseMac();
  char string[10];
  sprintf(string, "%04X", (uint16_t)(chipid >> 32));
  String mac0_default = String(string);
  sprintf(string, "%08X", (uint32_t)chipid);
  String mac1_default = String(string);
  return String(ssid) + mac0_default + mac1_default;
}

void CameraWebServer_WS::LoadStationCredentials(String *station_ssid, String *station_password, String *station_hostname)
{
  Preferences prefs;
  if (!prefs.begin(kWifiPrefsNamespace, true))
  {
    *station_ssid = "";
    *station_password = "";
    *station_hostname = "";
    return;
  }

  *station_ssid = prefs.getString(kWifiSsidKey, "");
  *station_password = prefs.getString(kWifiPasswordKey, "");
  *station_hostname = prefs.getString(kWifiHostnameKey, "");
  prefs.end();
}
