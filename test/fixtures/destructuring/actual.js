function foo({ x }: { x: string }) {
  return bar;
}

function bar({ a } = {}): string {
  return x;
}

function baz({x: {y = "ex"}}: {x: {y?: string}} = {}) {
  return x
}

function defaultWithReturnType({x = "x"}: {x: string } = {}): string {
  return x
}

function rest({ x, ...y }: { x: string, y: Array<string> }): string {
  return x
}

