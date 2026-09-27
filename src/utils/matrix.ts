// 2D affine matrix helpers (column-major mat3 for WebGL)

export type Mat3 = Float32Array;

export function identity(): Mat3 {
  return new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
}

export function multiply(a: Mat3, b: Mat3): Mat3 {
  // returns a * b (apply b first, then a)
  const out = new Float32Array(9);
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) {
      out[col * 3 + row] =
        a[0 * 3 + row] * b[col * 3 + 0] +
        a[1 * 3 + row] * b[col * 3 + 1] +
        a[2 * 3 + row] * b[col * 3 + 2];
    }
  }
  return out;
}

export function translation(tx: number, ty: number): Mat3 {
  return new Float32Array([1, 0, 0, 0, 1, 0, tx, ty, 1]);
}

export function scaling(sx: number, sy: number): Mat3 {
  return new Float32Array([sx, 0, 0, 0, sy, 0, 0, 0, 1]);
}

export function rotation(rad: number): Mat3 {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return new Float32Array([c, s, 0, -s, c, 0, 0, 0, 1]);
}

export function compose(...mats: Mat3[]): Mat3 {
  return mats.reduce((acc, m) => multiply(acc, m), identity());
}
