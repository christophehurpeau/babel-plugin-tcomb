import t from 'tcomb';
class A {
  foo(x) {
    _assert(x, t.String, 'x');

    return _assert(function () {
      return x;
    }.apply(this, arguments), t.String, 'return value');
  }
}

class B {
  bar() {
    [].forEach(n => {
      return _assert((() => {
        console.log(this);
      })(), _t.Nil, 'return value');
    });
  }
}
