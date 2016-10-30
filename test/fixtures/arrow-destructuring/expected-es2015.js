"use strict";

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

var foo = function foo(_ref) {
  var x = _ref.x;

  _assert({
    x: x
  }, _t.interface({
    x: _t.String
  }), "{ x }");

  return bar;
};

var bar = function bar() {
  var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      a = _ref2.a;

  return _assert(function () {
    return x;
  }(), _t.String, "return value");
};

var baz = function baz() {
  var _ref3 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      _ref3$x$y = _ref3.x.y,
      y = _ref3$x$y === undefined ? "ex" : _ref3$x$y;

  _assert({
    x: {
      y: y
    }
  }, _t.interface({
    x: _t.interface({
      y: _t.maybe(_t.String)
    })
  }), "{ x: { y = \"ex\" } }");

  return x;
};

var defaultWithReturnType = function defaultWithReturnType() {
  var _ref4 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      _ref4$x = _ref4.x,
      x = _ref4$x === undefined ? "x" : _ref4$x;

  _assert({
    x: x
  }, _t.interface({
    x: _t.String
  }), "{ x = \"x\" }");

  return _assert(function () {
    return x;
  }(), _t.String, "return value");
};

var rest = function rest(_ref5) {
  var x = _ref5.x,
      y = _objectWithoutProperties(_ref5, ["x"]);

  _assert({
    x: x,
    y: y
  }, _t.interface({
    x: _t.String,
    y: _t.list(_t.String)
  }), "{ x, ...y }");

  return _assert(function () {
    return x;
  }(), _t.String, "return value");
};
