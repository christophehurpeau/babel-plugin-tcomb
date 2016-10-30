const foo = ({ x }: { x: string }) => bar;

const bar = ({ a } = {}): string => x;

const baz = ({x: {y = "ex"}}: {x: {y?: string}} = {}) => x;

const defaultWithReturnType = ({x = "x"}: {x: string } = {}): string => x;

const rest = ({ x, ...y }: { x: string, y: Array<string> }): string => x;

