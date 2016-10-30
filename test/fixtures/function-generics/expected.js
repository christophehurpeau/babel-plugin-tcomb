function foo(x) {
  _assert(x, _t.Any, "x");
}

function bar(x) {
  return function (y) {
    _assert(y, _t.Any, "y");

    return y;
  }.bind(this);
}
