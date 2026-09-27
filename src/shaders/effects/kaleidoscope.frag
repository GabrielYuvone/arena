precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_intensity;
uniform float u_segments; // number of mirrored wedges
uniform float u_rotation;

void main() {
  vec2 p = v_uv - 0.5;
  float seg = max(floor(mix(1.0, 16.0, u_segments)), 1.0);
  float r = length(p);
  float a = atan(p.y, p.x) + u_rotation * 3.14159265 / 180.0;
  float segAngle = 6.2831853 / seg;
  a = mod(a, segAngle);
  a = abs(a - segAngle * 0.5);
  vec2 uv = vec2(cos(a), sin(a)) * r + 0.5;
  vec4 kaleido = texture2D(u_tex, clamp(uv, 0.0, 1.0));
  gl_FragColor = mix(texture2D(u_tex, v_uv), kaleido, clamp(u_intensity, 0.0, 1.0));
}
