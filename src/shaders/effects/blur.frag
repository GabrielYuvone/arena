precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_resolution;
uniform float u_intensity;

void main() {
  if (u_intensity <= 0.001) {
    gl_FragColor = texture2D(u_tex, v_uv);
    return;
  }
  float radius = u_intensity * 24.0;
  vec2 px = radius / u_resolution;
  vec4 sum = vec4(0.0);
  float total = 0.0;
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      float fx = float(x);
      float fy = float(y);
      float w = exp(-(fx * fx + fy * fy) / 4.0);
      sum += texture2D(u_tex, v_uv + vec2(fx, fy) * px * 0.5) * w;
      total += w;
    }
  }
  gl_FragColor = sum / total;
}
