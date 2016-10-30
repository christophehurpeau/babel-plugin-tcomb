const foo = ({ x }) => {
  _assert({
    x
  }, _t.interface({
    x: _t.String
  }), "{ x }");

  return bar;
};

const bar = ({ a } = {}) => {
  return _assert((() => {
    return x;
  })(), _t.String, "return value");
};

const baz = ({ x: { y = "ex" } } = {}) => {
  _assert({
    x: {
      y
    }
  }, _t.interface({
    x: _t.interface({
      y: _t.maybe(_t.String)
    })
  }), "{ x: { y = \"ex\" } }");

  return x;
};

const defaultWithReturnType = ({ x = "x" } = {}) => {
  _assert({
    x
  }, _t.interface({
    x: _t.String
  }), "{ x = \"x\" }");

  return _assert((() => {
    return x;
  })(), _t.String, "return value");
};

const rest = ({ x, ...y }) => {
  _assert({
    x,
    y
  }, _t.interface({
    x: _t.String,
    y: _t.list(_t.String)
  }), "{ x, ...y }");

  return _assert((() => {
    return x;
  })(), _t.String, "return value");
};
