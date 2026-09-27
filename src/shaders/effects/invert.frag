precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_intensity;

void main() {
  vec4 c = texture2D(u_tex, v_uv);
  vec3 inv = 1.0 - c.rgb;
  gl_FragColor = vec4(mix(c.rgb, inv, u_intensity), c.a);
}
