// Transformed quad — u_matrix maps the unit quad into clip space
attribute vec2 a_pos;
uniform mat3 u_matrix;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  vec3 p = u_matrix * vec3(a_pos, 1.0);
  gl_Position = vec4(p.xy, 0.0, 1.0);
}
