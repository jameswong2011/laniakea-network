const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const repo = path.resolve(__dirname, "../..");
const config = getDefaultConfig(__dirname);

// The app imports these shared folders from the website; the rest of the repository stays unwatched.
config.watchFolders = [
  path.join(repo, "packages/domain"),
  path.join(repo, "src/types"),
  path.join(repo, "src/lib/research"),
  path.join(repo, "src/lib/supabase"),
];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];

module.exports = config;
