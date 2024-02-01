import { run } from './create-release';

if (!process.env.JEST_WORKER_ID) {
  run();
}
