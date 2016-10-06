import _t from "tcomb-forked";

const A = _t.interface({
  x: _t.String
}, {
  name: "A",
  strict: true
});

const B = _t.interface({
  x: _t.String
}, {
  name: "B",
  strict: true
});

function f(x) {
  _assert(x, _t.interface({
    x: _t.String
  }, {
    strict: true
  }), "x");
}
function g() {
  return _assert(void 0, _t.interface({
    x: _t.String
  }, {
    strict: true
  }), "return value");
}
function h(x) {
  _assert(x, _t.interface({
    x: _t.String
  }, {
    strict: true
  }), "x");
}
function i() {
  return _assert(void 0, _t.interface({
    x: _t.String
  }, {
    strict: true
  }), "return value");
}
