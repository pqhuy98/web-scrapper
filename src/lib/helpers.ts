export function randomN(n: number) {
  return Math.floor(Math.random() * n);
}

export async function sleep(ms: number) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((r) => setTimeout(r, ms));
}

export function unleakString(s: string) {
  return (` ${s}`).substring(1);
}
