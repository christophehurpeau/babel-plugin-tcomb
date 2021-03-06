import _t from 'tcomb-forked';
let a = 's1';
let aa = 's1';

let aaa = _assert(s1, _t.String, 'aaa');
let aaaa = _assert(s1, _t.maybe(_t.String), 'aaaa');

let b = 's2';

let [c] = _assert([1, 2], _t.list(_t.Number), '[c]');
let [d] = [];

let { e } = _assert({ e: 's3' }, _t.interface({
  e: _t.String
}), '{ e }');
let { f } = {};

let g = _assert(x(), _t.interface({
  foo: _t.Boolean,
  y: _t.interface({
    bar: _t.String
  })
}), 'g');

function h() {
  let x = _assert(1, _t.Any, 'x');
}

class Klass1 {
  method1() {
    let x = _assert('a', _t.Any, 'x');
  }
  method2() {
    let x = _assert('a', _t.union([_t.Any, _t.Any]), 'x');
  }
}

const Predicate = _t.Function;

let i = _assert(() => true, Predicate, 'i');
