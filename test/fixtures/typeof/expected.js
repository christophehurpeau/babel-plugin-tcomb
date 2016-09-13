import _t from 'tcomb-forked';
const A = { type: 'Nil' };

const B = _t.union([_t.Any, _t.String], 'B');
