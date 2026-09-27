precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_intensity;
uniform float u_softness;

void main() {
  vec4 c = texture2D(u_tex, v_uv);
  float d = distance(v_uv, vec2(0.5)) * 1.41421356;
  float soft = mix(0.2, 1.0, clamp(u_softness, 0.0, 1.0));
  float v = smoothstep(soft, 1.0, d);
  vec3 rgb = c.rgb * (1.0 - v * clamp(u_intensity, 0.0, 1.0));
  gl_FragColor = vec4(rgb, c.a);
}
