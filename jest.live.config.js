// Live check against the real market data sources (network needed; not part of CI):
//   npm run test:live
// Plain Node environment so the real fetch is used (the app's Jest preset stubs it).
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/data/market/__tests__/live.test.ts'],
  transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
