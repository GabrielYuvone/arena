precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_angle; // radians of split direction

void main() {
  vec2 dir = vec2(cos(u_angle), sin(u_angle)) * u_intensity * 0.05;
  float r = texture2D(u_tex, v_uv + dir).r;
  vec4 g = texture2D(u_tex, v_uv);
  float b = texture2D(u_tex, v_uv - dir).b;
  gl_FragColor = vec4(r, g.g, b, g.a);
}
