const foo = function ({ x }) {
  _assert(arguments[0], _t.interface({
    x: _t.String
  }), "{ x }");

  return bar;
}.bind(this);

const bar = ({ a } = {}) => {
  return _assert((() => {
    return x;
  })(), _t.String, "return value");
};

const baz = function ({ x: { y = "ex" } } = {}) {
  _assert(arguments[0], _t.interface({
    x: _t.interface({
      y: _t.maybe(_t.String)
    })
  }), "{ x: { y = \"ex\" } }");

  return x;
}.bind(this);

const defaultWithReturnType = function ({ x = "x" } = {}) {
  _assert(arguments[0], _t.interface({
    x: _t.String
  }), "{ x = \"x\" }");

  return _assert((() => {
    return x;
  })(), _t.String, "return value");
}.bind(this);

const rest = function ({ x, ...y }) {
  _assert(arguments[0], _t.interface({
    x: _t.String,
    y: _t.list(_t.String)
  }), "{ x, ...y }");

  return _assert((() => {
    return x;
  })(), _t.String, "return value");
}.bind(this);
