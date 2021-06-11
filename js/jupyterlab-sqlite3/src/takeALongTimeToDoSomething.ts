// Copyright (c) 2021 University System of Georgia and janki contributors
// Distributed under the terms of the BSD-3-Clause License.

export function takeALongTimeToDoSomething() {
  console.log('Start our long running job...');
  const seconds = 5;
  const start = new Date().getTime();
  const delay = seconds * 1000;
  let retries = 1000;
  while (retries--) {
    if (new Date().getTime() - start > delay) {
      break;
    }
  }
  console.log('Finished our long running job');
}
