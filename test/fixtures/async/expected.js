function foo() {
  return _assert(async function () {
    return await bar();
  }.apply(this, arguments), _t.Promise, "return value");
}

const f = () => {
  return _assert((async () => {
    await somePromise();
  })(), _t.Promise, "return value");
};
