precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_resolution;
uniform float u_intensity;

void main() {
  float cells = mix(1.0, 128.0, u_intensity * u_intensity);
  if (cells < 1.5) {
    gl_FragColor = texture2D(u_tex, v_uv);
    return;
  }
  vec2 grid = u_resolution / cells;
  vec2 uv = (floor(v_uv * grid) + 0.5) / grid;
  gl_FragColor = texture2D(u_tex, uv);
}
