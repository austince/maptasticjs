/**
 * @fileoverview A snippet from the {@link https://github.com/sloisel/numeric | numeric} project, as it is unmaintained and doesn't export correctly.
 * @see {@link https://github.com/sloisel/numeric/blob/656fa1254be540f428710738ca9c1539625777f1/src/numeric.js#L3001-L3089 | Source}
 */

/**
 * @see {@link https://github.com/sloisel/numeric/blob/master/src/numeric.js#L315-L329}
 */
function _foreach2(x, s, k, f) {
  if (k === s.length - 1) {
    return f(x);
  }
  var i, n = s[k], ret = Array(n);
  for (i = n - 1; i >= 0; i--) {
    ret[i] = _foreach2(x[i], s, k + 1, f);
  }
  return ret;
}


function _dim(x) {
  var ret = [];
  while (typeof x === "object") {
    ret.push(x.length);
    x = x[0];
  }
  return ret;
}

/**
 * @see {@link https://github.com/sloisel/numeric/blob/656fa1254be540f428710738ca9c1539625777f1/src/numeric.js#L309-L329}
 * @param {*} x 
 */
function dim(x) {
  var y, z;
  if (typeof x === "object") {
    y = x[0];
    if (typeof y === "object") {
      z = y[0];
      if (typeof z === "object") {
        return _dim(x);
      }
      return [x.length, y.length];
    }
    return [x.length];
  }
  return [];
}


function cloneV(x) {
  var _n = x.length;
  var i, ret = Array(_n);

  for (i = _n - 1; i !== -1; --i) {
    ret[i] = (x[i]);
  }
  return ret;
}

function clone(x) {
  if (typeof x !== "object") {
    return (x);
  }
  var s = dim(x);
  return _foreach2(x, s, 0, cloneV);
}

// 11. Ax = b
/**
 * @param {*} A 
 * @param {boolean} [fast=false] 
 * @returns {{ LU: *, P: * }}
 */
function LU(A, fast = false) {
  var abs = Math.abs;
  var i, j, k, absAjk, Akk, Ak, Pk, Ai;
  var max;
  var n = A.length, n1 = n - 1;
  var P = new Array(n);
  if (!fast) {
    A = clone(A);
  }
  
  for (k = 0; k < n; ++k) {
    Pk = k;
    Ak = A[k];
    max = abs(Ak[k]);
    for (j = k + 1; j < n; ++j) {
      absAjk = abs(A[j][k]);
      if (max < absAjk) {
        max = absAjk;
        Pk = j;
      }
    }
    P[k] = Pk;

    if (Pk != k) {
      A[k] = A[Pk];
      A[Pk] = Ak;
      Ak = A[k];
    }

    Akk = Ak[k];

    for (i = k + 1; i < n; ++i) {
      A[i][k] /= Akk;
    }

    for (i = k + 1; i < n; ++i) {
      Ai = A[i];
      for (j = k + 1; j < n1; ++j) {
        Ai[j] -= Ai[k] * Ak[j];
        ++j;
        Ai[j] -= Ai[k] * Ak[j];
      }
      if (j === n1) Ai[j] -= Ai[k] * Ak[j];
    }
  }

  return {
    LU: A,
    P: P
  };
}

function LUsolve(LUP, b) {
  var i, j;
  var LU = LUP.LU;
  var n = LU.length;
  var x = clone(b);
  var P = LUP.P;
  var Pi, LUi, tmp;

  for (i = n - 1; i !== -1; --i) x[i] = b[i];
  for (i = 0; i < n; ++i) {
    Pi = P[i];
    if (P[i] !== i) {
      tmp = x[i];
      x[i] = x[Pi];
      x[Pi] = tmp;
    }

    LUi = LU[i];
    for (j = 0; j < i; ++j) {
      x[i] -= x[j] * LUi[j];
    }
  }

  for (i = n - 1; i >= 0; --i) {
    LUi = LU[i];
    for (j = i + 1; j < n; ++j) {
      x[i] -= x[j] * LUi[j];
    }

    x[i] /= LUi[i];
  }

  return x;
}

export default function solve(A, b, fast) {
  return LUsolve(LU(A, fast), b);
}