import { Number } from 'tcomb';

function sum(a, b) {
  _assert(a, Number, 'a');

  _assert(b, Number, 'b');

  return _assert(function () {
    return a + b;
  }.apply(this, arguments), Number, 'return value');
}
