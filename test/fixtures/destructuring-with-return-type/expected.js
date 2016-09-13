import t from 'tcomb';
function foo({ x: { y: foo, z: { bar } }, a: { bob } }) {
  return _assert(function () {
    return bar;
  }.apply(this, arguments), t.String, 'return value');
}
