precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_resolution;
uniform float u_intensity;

void main() {
  vec2 px = 1.0 / u_resolution;
  vec4 c = texture2D(u_tex, v_uv);
  vec4 n = texture2D(u_tex, v_uv + vec2(0.0, px.y))
         + texture2D(u_tex, v_uv - vec2(0.0, px.y))
         + texture2D(u_tex, v_uv + vec2(px.x, 0.0))
         + texture2D(u_tex, v_uv - vec2(px.x, 0.0));
  vec4 sharp = c + (c - n * 0.25) * u_intensity * 2.5;
  gl_FragColor = vec4(clamp(sharp.rgb, 0.0, 1.0), c.a);
}
