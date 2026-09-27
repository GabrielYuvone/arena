precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_density;

void main() {
  vec4 c = texture2D(u_tex, v_uv);
  float lines = sin(v_uv.y * u_resolution.y * mix(0.25, 2.0, u_density) * 3.14159265);
  float scan = smoothstep(-1.0, 1.0, lines) * 0.5 + 0.5;
  vec3 rgb = c.rgb * mix(1.0, scan, clamp(u_intensity, 0.0, 1.0));
  gl_FragColor = vec4(rgb, c.a);
}
