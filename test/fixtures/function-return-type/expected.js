function foo(x, y) {
  _assert(x, _t.Number, "x");

  _assert(y, _t.String, "y");

  return _assert(function () {
    return x + y;
  }.apply(this, arguments), _t.String, "return value");
}

function bar(x, y) {
  _assert(y, _t.String, "y");

  return _assert(function () {
    return x + y;
  }.apply(this, arguments), _t.String, "return value");
}

function f({ x = "ex" }) {
  return _assert(function () {
    console.log({ x });
  }.apply(this, arguments), _t.Nil, "return value");
}
