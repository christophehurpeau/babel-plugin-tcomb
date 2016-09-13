function foo({ x }) {
  _assert({
    x
  }, _t.interface({
    x: _t.String
  }), "{ x }");

  return bar;
}

function bar({ a } = {}) {
  return _assert(function () {
    return x;
  }.apply(this, arguments), _t.String, "return value");
}

function baz({ x: { y = "ex" } } = {}) {
  _assert({
    x: {
      y
    }
  }, _t.interface({
    x: _t.interface({
      y: _t.maybe(_t.String)
    })
  }), "{ x: { y } }");

  return x;
}

function defaultWithReturnTypeAndDefault({ x = "x" } = {}) {
  _assert({
    x
  }, _t.interface({
    x: _t.String
  }), "{ x }");

  return _assert(function () {
    return x;
  }.apply(this, arguments), _t.String, "return value");
}
