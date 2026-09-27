// Applies color adjustments (brightness/contrast/saturation/hue) in one pass.
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_brightness; // 1 = neutral
uniform float u_contrast;   // 1 = neutral
uniform float u_saturation; // 1 = neutral
uniform float u_hue;        // degrees

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec4 tex = texture2D(u_tex, v_uv);
  vec3 c = tex.rgb;
  // brightness
  c *= u_brightness;
  // contrast around 0.5 pivot
  c = (c - 0.5) * u_contrast + 0.5;
  // saturation
  float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(luma), c, u_saturation);
  // hue rotate
  if (abs(u_hue) > 0.01) {
    vec3 hsv = rgb2hsv(clamp(c, 0.0, 1.0));
    hsv.x = fract(hsv.x + u_hue / 360.0);
    c = mix(c, hsv2rgb(hsv), 1.0);
  }
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), tex.a);
}
