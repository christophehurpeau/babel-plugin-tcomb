function foo(x) {
  _assert(x, _t.interface({
    foo: _t.Boolean,
    y: _t.interface({
      bar: _t.String
    })
  }), "x");

  return _assert(function () {
    return { baz: foo, a: { bob: bar } };
  }.apply(this, arguments), _t.interface({
    baz: _t.Boolean,
    a: _t.interface({
      bob: _t.String
    })
  }), "return value");
}

function getFullName(person) {
  _assert(person, _t.interface({
    name: _t.String,
    surname: _t.String
  }), "person");

  return `${ name } ${ surname }`;
}
