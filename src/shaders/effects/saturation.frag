precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_intensity;

void main() {
  vec4 c = texture2D(u_tex, v_uv);
  float luma = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
  gl_FragColor = vec4(clamp(mix(vec3(luma), c.rgb, u_intensity * 2.0), 0.0, 1.0), c.a);
}
