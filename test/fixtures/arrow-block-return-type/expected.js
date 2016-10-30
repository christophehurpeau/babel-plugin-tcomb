import t from 'tcomb';
const f = function (x) {
  _assert(x, t.String, 'x');

  return _assert((() => {
    return x;
  })(), t.String, 'return value');
}.bind(this);
