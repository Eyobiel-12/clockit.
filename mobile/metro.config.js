const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// In de map erboven (klolit/node_modules) staan losse, oude pakketten zonder package.json.
// Die mogen nooit meegebundeld worden: alles moet uit mobile/node_modules komen.
const parentModules = path.resolve(__dirname, '..', 'node_modules');
const pattern = parentModules
  .split(/[/\\]/)
  .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('[/\\\\]');
const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  new RegExp(`^${pattern}[/\\\\].*`),
];

module.exports = config;
