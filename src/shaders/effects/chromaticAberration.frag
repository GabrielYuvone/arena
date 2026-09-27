precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_spread;

void main() {
  vec2 center = v_uv - 0.5;
  float dist = length(center);
  vec2 dir = normalize(center + 1e-6) * dist * u_intensity * 0.08 * (1.0 + u_spread * 3.0);
  float r = texture2D(u_tex, v_uv + dir).r;
  vec4 g = texture2D(u_tex, v_uv);
  float b = texture2D(u_tex, v_uv - dir).b;
  gl_FragColor = vec4(r, g.g, b, g.a);
}
