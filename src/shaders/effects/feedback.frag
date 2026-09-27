// Feedback: mixes the transformed previous frame into the current one.
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform sampler2D u_prev;
uniform float u_amount;  // 0..1 mix of feedback into output
uniform float u_zoom;    // 1 = no zoom
uniform float u_rotation; // degrees
uniform float u_decay;   // 0..1 brightness of the feedback trail

void main() {
  vec2 uv = v_uv - 0.5;
  float s = 1.0 / max(u_zoom, 0.01);
  float rad = u_rotation * 3.14159265 / 180.0;
  float cs = cos(rad) * s;
  float sn = sin(rad) * s;
  uv = vec2(uv.x * cs - uv.y * sn, uv.x * sn + uv.y * cs);
  uv += 0.5;
  vec4 prev = vec4(0.0);
  if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
    prev = texture2D(u_prev, uv);
  }
  vec4 cur = texture2D(u_tex, v_uv);
  vec4 fb = prev * u_decay;
  vec3 rgb = mix(cur.rgb, max(cur.rgb, fb.rgb), clamp(u_amount, 0.0, 1.0));
  float a = max(cur.a, fb.a * clamp(u_amount, 0.0, 1.0));
  gl_FragColor = vec4(rgb, a);
}
