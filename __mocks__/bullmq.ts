export class Queue {
  constructor(name: string, opts?: any) {
  }
  add = jest.fn();
  close = jest.fn();
}
