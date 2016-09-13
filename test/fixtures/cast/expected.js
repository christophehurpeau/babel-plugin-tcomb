import _t from 'tcomb';

const User = _t.interface({
  name: _t.String
}, 'User');

export function getUser(userId) {
  _assert(userId, _t.String, 'userId');

  return _assert(function () {
    return axios.get('').then(p => _assert(p.data, User, 'p.data'));
  }.apply(this, arguments), _t.Promise, 'return value');
}

const a = _assert('a string', A, '\'a string\'');
const b = _assert({}, B, '{}');

function coerce(a) {
  _assert(a, _t.Any, 'a');

  return _assert(function () {
    return _assert(_assert(a, _t.Any, 'a'), _t.Any, '(a: any)');
  }.apply(this, arguments), _t.Any, 'return value');
}
