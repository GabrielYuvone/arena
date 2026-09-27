// Composites "over" on top of "under" using a blend mode + layer opacity.
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_under;
uniform sampler2D u_over;
uniform float u_opacity;
uniform int u_blend; // 0 normal 1 add 2 screen 3 multiply 4 overlay 5 difference 6 lighten 7 darken

vec3 blendMode(int mode, vec3 b, vec3 s) {
  if (mode == 1) return b + s;                                  // add
  if (mode == 2) return 1.0 - (1.0 - b) * (1.0 - s);            // screen
  if (mode == 3) return b * s;                                  // multiply
  if (mode == 4) {                                              // overlay
    vec3 r = mix(2.0 * b * s, 1.0 - 2.0 * (1.0 - b) * (1.0 - s), step(0.5, b));
    return r;
  }
  if (mode == 5) return abs(b - s);                             // difference
  if (mode == 6) return max(b, s);                              // lighten
  if (mode == 7) return min(b, s);                              // darken
  return s;                                                     // normal
}

void main() {
  vec4 under = texture2D(u_under, v_uv);
  vec4 over = texture2D(u_over, v_uv);
  vec3 blended = blendMode(u_blend, under.rgb, over.rgb);
  float a = clamp(over.a * u_opacity, 0.0, 1.0);
  vec3 rgb = mix(under.rgb, blended, a);
  gl_FragColor = vec4(rgb, 1.0);
}
