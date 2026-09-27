// Final master pass: brightness + opacity.
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_opacity;
uniform float u_brightness;

void main() {
  vec4 c = texture2D(u_tex, v_uv);
  gl_FragColor = vec4(clamp(c.rgb * u_brightness * u_opacity, 0.0, 1.0), 1.0);
}
