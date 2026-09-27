precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_intensity;
uniform float u_axis; // 0 = x, 1 = y, 2 = both

void main() {
  vec2 uv = v_uv;
  float t = clamp(u_intensity, 0.0, 1.0);
  if (u_axis < 0.5 || u_axis > 1.5) {
    if (uv.x > 0.5) uv.x = mix(uv.x, 1.0 - uv.x, t);
  }
  if (u_axis > 0.5) {
    if (uv.y > 0.5) uv.y = mix(uv.y, 1.0 - uv.y, t);
  }
  gl_FragColor = texture2D(u_tex, uv);
}
