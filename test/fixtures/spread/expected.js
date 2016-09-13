function foo(x, ...rest) {
  _assert(x, _t.Number, "x");

  _assert(rest, _t.list(_t.String), "rest");
}

function bar(x, ...rest) {
  _assert(x, _t.Number, "x");

  _assert(rest, _t.maybe(_t.list(_t.String)), "rest");
}

function baz(x, ...rest) {
  _assert(x, _t.Number, "x");

  _assert(rest, _t.maybe(_t.list(_t.String)), "rest");

  return _assert(void 0, _t.String, "return value");
}
