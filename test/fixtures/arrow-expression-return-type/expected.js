import t from "tcomb-forked";
const f = x => {
  _assert(x, t.String, "x");

  return _assert((() => {
    return x;
  })(), t.String, "return value");
};
const b = ({ v }) => {
  return _assert((() => {
    return v;
  })(), _t.list(_t.Object), "return value");
};
