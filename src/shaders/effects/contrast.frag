precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_intensity;

void main() {
  vec4 c = texture2D(u_tex, v_uv);
  float k = mix(0.0, 3.0, u_intensity);
  gl_FragColor = vec4(clamp((c.rgb - 0.5) * k + 0.5, 0.0, 1.0), c.a);
}
