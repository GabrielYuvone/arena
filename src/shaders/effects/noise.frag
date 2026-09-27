precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_resolution;
uniform float u_intensity;
uniform float u_scale;
uniform float u_time;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec4 c = texture2D(u_tex, v_uv);
  vec2 cell = v_uv * u_resolution / max(u_scale, 1.0);
  float n = hash(floor(cell) + fract(u_time) * 13.7);
  vec3 noiseColor = mix(vec3(n), c.rgb * (0.5 + n), 0.35);
  gl_FragColor = vec4(mix(c.rgb, noiseColor, clamp(u_intensity, 0.0, 1.0)), c.a);
}
