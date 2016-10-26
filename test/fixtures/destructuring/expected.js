function foo({ x }) {
  _assert(arguments[0], _t.interface({
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
  _assert(arguments[0], _t.interface({
    x: _t.interface({
      y: _t.maybe(_t.String)
    })
  }), "{ x: { y = \"ex\" } }");

  return x;
}

function defaultWithReturnType({ x = "x" } = {}) {
  _assert(arguments[0], _t.interface({
    x: _t.String
  }), "{ x = \"x\" }");

  return _assert(function () {
    return x;
  }.apply(this, arguments), _t.String, "return value");
}

function rest({ x, ...y }) {
  _assert(arguments[0], _t.interface({
    x: _t.String,
    y: _t.list(_t.String)
  }), "{ x, ...y }");

  return _assert(function () {
    return x;
  }.apply(this, arguments), _t.String, "return value");
}
