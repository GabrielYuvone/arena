precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_intensity;

void main() {
  vec4 c = texture2D(u_tex, v_uv);
  float luma = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
  gl_FragColor = vec4(mix(c.rgb, vec3(luma), u_intensity), c.a);
}
