
const Redis = jest.fn().mockImplementation(() => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  quit: jest.fn(),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
}));

export default Redis;
