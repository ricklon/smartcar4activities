#include "esp_http_server.h"
#include "esp_timer.h"
#include "esp_camera.h"
#include "img_converters.h"
#include "CameraWebServer_AP.h"
#include "camera_index.h"
#include "Arduino.h"
#include <ctype.h>

#define PART_BOUNDARY "123456789000000000000987654321"
static const char *_STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char *_STREAM_BOUNDARY = "\r\n";
static const char *_STREAM_PART = "Len: %u\r\n";
static const char *_STREAM_BOUNDARY_test = "\r\n--" PART_BOUNDARY "\r\n";
static const char *_STREAM_PART_test = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

httpd_handle_t stream_httpd = NULL;
httpd_handle_t camera_httpd = NULL;

static int from_hex(char c)
{
  if (c >= '0' && c <= '9')
  {
    return c - '0';
  }
  c = tolower(c);
  if (c >= 'a' && c <= 'f')
  {
    return 10 + (c - 'a');
  }
  return -1;
}

static String url_decode(const String &input)
{
  String decoded;
  decoded.reserve(input.length());
  for (size_t i = 0; i < input.length(); ++i)
  {
    char c = input.charAt(i);
    if (c == '+')
    {
      decoded += ' ';
    }
    else if (c == '%' && i + 2 < input.length())
    {
      int hi = from_hex(input.charAt(i + 1));
      int lo = from_hex(input.charAt(i + 2));
      if (hi >= 0 && lo >= 0)
      {
        decoded += char((hi << 4) | lo);
        i += 2;
      }
      else
      {
        decoded += c;
      }
    }
    else
    {
      decoded += c;
    }
  }
  return decoded;
}

static String form_value(const String &body, const String &key)
{
  String prefix = key + "=";
  int start = body.indexOf(prefix);
  if (start < 0)
  {
    return "";
  }
  start += prefix.length();
  int end = body.indexOf('&', start);
  if (end < 0)
  {
    end = body.length();
  }
  return url_decode(body.substring(start, end));
}

static esp_err_t wifi_page_handler(httpd_req_t *req)
{
  String html;
  html.reserve(2200);
  html += "<!doctype html><html><head><meta charset='utf-8'><title>Wi-Fi Setup</title>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<style>body{font-family:sans-serif;max-width:720px;margin:2rem auto;padding:0 1rem;}form{display:grid;gap:.75rem;margin:1rem 0;}input{padding:.65rem;font-size:1rem;}button{padding:.7rem 1rem;font-size:1rem;}code{background:#eee;padding:.1rem .3rem;} .card{border:1px solid #ddd;border-radius:10px;padding:1rem;margin:1rem 0;}</style></head><body>";
  html += "<h1>ESP32 Wi-Fi Setup</h1>";
  html += "<div class='card'><p><strong>Mode:</strong> " + CameraWebServerAP.GetModeLabel() + "</p>";
  html += "<p><strong>AP SSID:</strong> " + CameraWebServerAP.GetActiveAccessPointSSID() + "</p>";
  html += "<p><strong>AP IP:</strong> " + CameraWebServerAP.GetAccessPointIP() + "</p>";
  html += "<p><strong>Saved STA SSID:</strong> " + CameraWebServerAP.GetSavedStationSSID() + "</p>";
  html += "<p><strong>STA Connected:</strong> " + String(CameraWebServerAP.IsStationConnected() ? "yes" : "no") + "</p>";
  html += "<p><strong>STA IP:</strong> " + CameraWebServerAP.GetStationIP() + "</p></div>";
  html += "<div class='card'><h2>Join Local Wi-Fi</h2><form method='POST' action='/wifi/config'>";
  html += "<input name='ssid' placeholder='Wi-Fi SSID' maxlength='32' required>";
  html += "<input name='password' placeholder='Wi-Fi Password' maxlength='63' type='password'>";
  html += "<button type='submit'>Save And Reboot</button></form>";
  html += "<p>This stores credentials in NVS, reboots, tries STA first, and falls back to AP if join fails.</p></div>";
  html += "<div class='card'><h2>Forget Saved Wi-Fi</h2><form method='POST' action='/wifi/forget'>";
  html += "<button type='submit'>Forget And Reboot To AP</button></form></div>";
  html += "<p>JSON status is available at <code>/wifi/status</code>.</p></body></html>";

  httpd_resp_set_type(req, "text/html");
  return httpd_resp_send(req, html.c_str(), html.length());
}

static esp_err_t wifi_status_handler(httpd_req_t *req)
{
  String json = "{";
  json += "\"mode\":\"" + CameraWebServerAP.GetModeLabel() + "\",";
  json += "\"ap_ssid\":\"" + CameraWebServerAP.GetActiveAccessPointSSID() + "\",";
  json += "\"ap_ip\":\"" + CameraWebServerAP.GetAccessPointIP() + "\",";
  json += "\"saved_sta_ssid\":\"" + CameraWebServerAP.GetSavedStationSSID() + "\",";
  json += "\"sta_connected\":";
  json += CameraWebServerAP.IsStationConnected() ? "true" : "false";
  json += ",\"sta_ip\":\"" + CameraWebServerAP.GetStationIP() + "\"}";

  httpd_resp_set_type(req, "application/json");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  return httpd_resp_send(req, json.c_str(), json.length());
}

static esp_err_t wifi_config_handler(httpd_req_t *req)
{
  int total = req->content_len;
  if (total <= 0 || total > 256)
  {
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "invalid request body");
    return ESP_FAIL;
  }

  char body[257];
  int received = httpd_req_recv(req, body, total);
  if (received <= 0)
  {
    httpd_resp_send_err(req, HTTPD_500_INTERNAL_SERVER_ERROR, "failed to read request body");
    return ESP_FAIL;
  }
  body[received] = '\0';

  String form = String(body);
  String station_ssid = form_value(form, "ssid");
  String station_password = form_value(form, "password");

  if (station_ssid.length() == 0)
  {
    httpd_resp_send_err(req, HTTPD_400_BAD_REQUEST, "ssid is required");
    return ESP_FAIL;
  }

  if (!CameraWebServerAP.SaveStationCredentials(station_ssid, station_password))
  {
    httpd_resp_send_err(req, HTTPD_500_INTERNAL_SERVER_ERROR, "failed to save credentials");
    return ESP_FAIL;
  }

  String html;
  html += "<!doctype html><html><body><h1>Wi-Fi Saved</h1>";
  html += "<p>Saved SSID <strong>" + station_ssid + "</strong>.</p>";
  html += "<p>Rebooting now. After reboot, the device will try your local network first and fall back to its own AP if it cannot connect.</p>";
  html += "</body></html>";
  httpd_resp_set_type(req, "text/html");
  httpd_resp_send(req, html.c_str(), html.length());
  delay(500);
  ESP.restart();
  return ESP_OK;
}

static esp_err_t wifi_forget_handler(httpd_req_t *req)
{
  CameraWebServerAP.ClearStationCredentials();
  String html = "<!doctype html><html><body><h1>Wi-Fi Cleared</h1><p>Saved local network credentials were removed. Rebooting to AP mode.</p></body></html>";
  httpd_resp_set_type(req, "text/html");
  httpd_resp_send(req, html.c_str(), html.length());
  delay(500);
  ESP.restart();
  return ESP_OK;
}

static size_t jpg_encode_stream(void *arg, size_t index, const void *data, size_t len)
{
  httpd_req_t *req = (httpd_req_t *)arg;
  if (!index)
  {
  }
  if (httpd_resp_send_chunk(req, (const char *)data, len) != ESP_OK)
  {
    return 0;
  }
  return len;
}

static esp_err_t capture_handler(httpd_req_t *req)
{
  camera_fb_t *fb = NULL;
  esp_err_t res = ESP_OK;
  int64_t fr_start = esp_timer_get_time();

  fb = esp_camera_fb_get();
  if (!fb)
  {
    Serial.println("Camera capture failed");
    httpd_resp_send_500(req);
    return ESP_FAIL;
  }

  httpd_resp_set_type(req, "image/jpeg");
  httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  size_t fb_len = 0;
  if (fb->format == PIXFORMAT_JPEG)
  {
    fb_len = fb->len;
    res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
  }
  else
  {
    struct jpg_chunking_t {
      httpd_req_t *req;
      size_t len;
    } jchunk = {req, 0};
    res = frame2jpg_cb(fb, 80, jpg_encode_stream, &jchunk) ? ESP_OK : ESP_FAIL;
    httpd_resp_send_chunk(req, NULL, 0);
    fb_len = jchunk.len;
  }
  esp_camera_fb_return(fb);
  int64_t fr_end = esp_timer_get_time();
  Serial.printf("JPG: %uB %ums\n", (uint32_t)(fb_len), (uint32_t)((fr_end - fr_start) / 1000));
  return res;
}

static esp_err_t stream_handler(httpd_req_t *req)
{
  camera_fb_t *fb = NULL;
  esp_err_t res = ESP_OK;
  size_t _jpg_buf_len = 0;
  uint8_t *_jpg_buf = NULL;
  char *part_buf[64];
  int64_t fr_start = 0;

  static int64_t last_frame = 0;
  if (!last_frame)
  {
    last_frame = esp_timer_get_time();
  }

  res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
  if (res != ESP_OK)
  {
    return res;
  }

  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  
  while (true)
  {
    fb = esp_camera_fb_get();
    if (!fb)
    {
      Serial.println("Camera capture failed");
      res = ESP_FAIL;
    }
    else
    {
      fr_start = esp_timer_get_time();
      if (fb->format != PIXFORMAT_JPEG)
      {
        bool jpeg_converted = frame2jpg(fb, 80, &_jpg_buf, &_jpg_buf_len);
        esp_camera_fb_return(fb);
        fb = NULL;
        if (!jpeg_converted)
        {
          Serial.println("JPEG compression failed");
          res = ESP_FAIL;
        }
      }
      else
      {
        _jpg_buf_len = fb->len;
        _jpg_buf = fb->buf;
      }
    }
    
    if (res == ESP_OK)
    {
      size_t hlen = snprintf((char *)part_buf, 64, _STREAM_PART_test, _jpg_buf_len);
      res = httpd_resp_send_chunk(req, (const char *)part_buf, hlen);
    }
    if (res == ESP_OK)
    {
      res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
    }
    if (res == ESP_OK)
    {
      res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY_test, strlen(_STREAM_BOUNDARY_test));
    }

    if (fb)
    {
      esp_camera_fb_return(fb);
      fb = NULL;
      _jpg_buf = NULL;
    }
    else if (_jpg_buf)
    {
      free(_jpg_buf);
      _jpg_buf = NULL;
    }
    if (res != ESP_OK)
    {
      break;
    }
  }
  last_frame = 0;
  return res;
}

static esp_err_t cmd_handler(httpd_req_t *req)
{
  char *buf;
  size_t buf_len;
  char variable[32] = {0};
  char value[32] = {0};

  buf_len = httpd_req_get_url_query_len(req) + 1;
  if (buf_len > 1)
  {
    buf = (char *)malloc(buf_len);
    if (!buf)
    {
      httpd_resp_send_500(req);
      return ESP_FAIL;
    }
    if (httpd_req_get_url_query_str(req, buf, buf_len) == ESP_OK)
    {
      if (httpd_query_key_value(buf, "var", variable, sizeof(variable)) == ESP_OK &&
          httpd_query_key_value(buf, "val", value, sizeof(value)) == ESP_OK)
      {
      }
      else
      {
        free(buf);
        httpd_resp_send_404(req);
        return ESP_FAIL;
      }
    }
    else
    {
      free(buf);
      httpd_resp_send_404(req);
      return ESP_FAIL;
    }
    free(buf);
  }
  else
  {
    httpd_resp_send_404(req);
    return ESP_FAIL;
  }

  int val = atoi(value);
  Serial.println(val);
  Serial.println(variable);
  sensor_t *s = esp_camera_sensor_get();
  int res = 0;

  if (!strcmp(variable, "framesize"))
  {
    if (s->pixformat == PIXFORMAT_JPEG)
      res = s->set_framesize(s, (framesize_t)val);
  }
  else if (!strcmp(variable, "quality"))
    res = s->set_quality(s, val);
  else if (!strcmp(variable, "contrast"))
    res = s->set_contrast(s, val);
  else if (!strcmp(variable, "brightness"))
    res = s->set_brightness(s, val);
  else if (!strcmp(variable, "saturation"))
    res = s->set_saturation(s, val);
  else if (!strcmp(variable, "gainceiling"))
    res = s->set_gainceiling(s, (gainceiling_t)val);
  else if (!strcmp(variable, "colorbar"))
    res = s->set_colorbar(s, val);
  else if (!strcmp(variable, "awb"))
    res = s->set_whitebal(s, val);
  else if (!strcmp(variable, "agc"))
    res = s->set_gain_ctrl(s, val);
  else if (!strcmp(variable, "aec"))
    res = s->set_exposure_ctrl(s, val);
  else if (!strcmp(variable, "hmirror"))
    res = s->set_hmirror(s, val);
  else if (!strcmp(variable, "vflip"))
    res = s->set_vflip(s, val);
  else if (!strcmp(variable, "awb_gain"))
    res = s->set_awb_gain(s, val);
  else if (!strcmp(variable, "agc_gain"))
    res = s->set_agc_gain(s, val);
  else if (!strcmp(variable, "aec_value"))
    res = s->set_aec_value(s, val);
  else if (!strcmp(variable, "aec2"))
    res = s->set_aec2(s, val);
  else if (!strcmp(variable, "dcw"))
    res = s->set_dcw(s, val);
  else if (!strcmp(variable, "bpc"))
    res = s->set_bpc(s, val);
  else if (!strcmp(variable, "wpc"))
    res = s->set_wpc(s, val);
  else if (!strcmp(variable, "raw_gma"))
    res = s->set_raw_gma(s, val);
  else if (!strcmp(variable, "lenc"))
    res = s->set_lenc(s, val);
  else if (!strcmp(variable, "special_effect"))
    res = s->set_special_effect(s, val);
  else if (!strcmp(variable, "wb_mode"))
    res = s->set_wb_mode(s, val);
  else if (!strcmp(variable, "ae_level"))
    res = s->set_ae_level(s, val);
  else
  {
    res = -1;
  }

  if (res)
  {
    return httpd_resp_send_500(req);
  }

  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  return httpd_resp_send(req, NULL, 0);
}

static esp_err_t status_handler(httpd_req_t *req)
{
  static char json_response[1024];

  sensor_t *s = esp_camera_sensor_get();
  char *p = json_response;
  *p++ = '{';

  p += sprintf(p, "\"framesize\":%u,", s->status.framesize);
  p += sprintf(p, "\"quality\":%u,", s->status.quality);
  p += sprintf(p, "\"brightness\":%d,", s->status.brightness);
  p += sprintf(p, "\"contrast\":%d,", s->status.contrast);
  p += sprintf(p, "\"saturation\":%d,", s->status.saturation);
  p += sprintf(p, "\"sharpness\":%d,", s->status.sharpness);
  p += sprintf(p, "\"special_effect\":%u,", s->status.special_effect);
  p += sprintf(p, "\"wb_mode\":%u,", s->status.wb_mode);
  p += sprintf(p, "\"awb\":%u,", s->status.awb);
  p += sprintf(p, "\"awb_gain\":%u,", s->status.awb_gain);
  p += sprintf(p, "\"aec\":%u,", s->status.aec);
  p += sprintf(p, "\"aec2\":%u,", s->status.aec2);
  p += sprintf(p, "\"ae_level\":%d,", s->status.ae_level);
  p += sprintf(p, "\"aec_value\":%u,", s->status.aec_value);
  p += sprintf(p, "\"agc\":%u,", s->status.agc);
  p += sprintf(p, "\"agc_gain\":%u,", s->status.agc_gain);
  p += sprintf(p, "\"gainceiling\":%u,", s->status.gainceiling);
  p += sprintf(p, "\"bpc\":%u,", s->status.bpc);
  p += sprintf(p, "\"wpc\":%u,", s->status.wpc);
  p += sprintf(p, "\"raw_gma\":%u,", s->status.raw_gma);
  p += sprintf(p, "\"lenc\":%u,", s->status.lenc);
  p += sprintf(p, "\"vflip\":%u,", s->status.vflip);
  p += sprintf(p, "\"hmirror\":%u,", s->status.hmirror);
  p += sprintf(p, "\"dcw\":%u,", s->status.dcw);
  p += sprintf(p, "\"colorbar\":%u", s->status.colorbar);
  *p++ = '}';
  *p++ = 0;
  httpd_resp_set_type(req, "application/json");
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
  return httpd_resp_send(req, json_response, strlen(json_response));
}

static esp_err_t index_handler(httpd_req_t *req)
{
  httpd_resp_set_type(req, "text/html");
  httpd_resp_set_hdr(req, "Content-Encoding", "gzip");
  sensor_t *s = esp_camera_sensor_get();
  if (s->id.PID == OV3660_PID)
  {
    return httpd_resp_send(req, (const char *)index_ov3660_html_gz, index_ov3660_html_gz_len);
  }
  return httpd_resp_send(req, (const char *)index_ov2640_html_gz, index_ov2640_html_gz_len);
}

void startCameraServer()
{
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();

  httpd_uri_t index_uri = {
      .uri = "/",
      .method = HTTP_GET,
      .handler = index_handler,
      .user_ctx = NULL};

  httpd_uri_t status_uri = {
      .uri = "/status",
      .method = HTTP_GET,
      .handler = status_handler,
      .user_ctx = NULL};

  httpd_uri_t wifi_page_uri = {
      .uri = "/wifi",
      .method = HTTP_GET,
      .handler = wifi_page_handler,
      .user_ctx = NULL};

  httpd_uri_t wifi_status_uri = {
      .uri = "/wifi/status",
      .method = HTTP_GET,
      .handler = wifi_status_handler,
      .user_ctx = NULL};

  httpd_uri_t wifi_config_uri = {
      .uri = "/wifi/config",
      .method = HTTP_POST,
      .handler = wifi_config_handler,
      .user_ctx = NULL};

  httpd_uri_t wifi_forget_uri = {
      .uri = "/wifi/forget",
      .method = HTTP_POST,
      .handler = wifi_forget_handler,
      .user_ctx = NULL};

  httpd_uri_t cmd_uri = {
      .uri = "/control",
      .method = HTTP_GET,
      .handler = cmd_handler,
      .user_ctx = NULL};

  httpd_uri_t capture_uri = {
      .uri = "/capture",
      .method = HTTP_GET,
      .handler = capture_handler,
      .user_ctx = NULL};

  httpd_uri_t stream_uri = {
      .uri = "/stream",
      .method = HTTP_GET,
      .handler = stream_handler,
      .user_ctx = NULL};

  Serial.printf("Starting web server on port: '%d'\n", config.server_port);
  if (httpd_start(&camera_httpd, &config) == ESP_OK)
  {
    httpd_register_uri_handler(camera_httpd, &index_uri);
    httpd_register_uri_handler(camera_httpd, &cmd_uri);
    httpd_register_uri_handler(camera_httpd, &status_uri);
    httpd_register_uri_handler(camera_httpd, &wifi_page_uri);
    httpd_register_uri_handler(camera_httpd, &wifi_status_uri);
    httpd_register_uri_handler(camera_httpd, &wifi_config_uri);
    httpd_register_uri_handler(camera_httpd, &wifi_forget_uri);
    httpd_register_uri_handler(camera_httpd, &capture_uri);
  }
  config.server_port += 1;
  config.ctrl_port += 1;
  Serial.printf("Starting stream server on port: '%d'\n", config.server_port);
  if (httpd_start(&stream_httpd, &config) == ESP_OK)
  {
    httpd_register_uri_handler(stream_httpd, &stream_uri);
  }
}
