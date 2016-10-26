function dump({
  obj,
  dumper = obj => {
    return _assert((() => {
      return "object: " + obj;
    })(), _t.String, "return value");
  }
}) {
  return _assert(function () {
    return dumper(obj);
  }.apply(this, arguments), _t.String, "return value");
}
