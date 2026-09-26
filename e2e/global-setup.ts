import { rmSync } from 'node:fs';

/** Fresh demo workspace for every e2e run. */
export default function globalSetup() {
  rmSync('.data/e2e', { recursive: true, force: true });
}
