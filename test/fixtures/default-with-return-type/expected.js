import t from 'tcomb';
function foo(x = 'foo') {
  _assert(x, t.String, 'x');

  return _assert(function () {
    return x;
  }.apply(this, arguments), t.String, 'return value');
}
