const dotenv = require('dotenv');
const path = require('path');

const API_KEY_NAMES = ['API_KEY', 'X_API_KEY', 'X-API-Key'];
const runtimeEnvironment = Object.fromEntries(API_KEY_NAMES.map((name) => [name, process.env[name]]));
const dotenvResult = dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function resolveApiKey(values, source) {
  const candidates = API_KEY_NAMES
    .map((name) => [name, values[name]])
    .filter(([, value]) => typeof value === 'string' && value.trim() !== '');

  if (new Set(candidates.map(([, value]) => value.trim())).size > 1) {
    throw new Error(`Conflicting API key values found in ${source}. Configure one of: ${API_KEY_NAMES.join(', ')}.`);
  }

  if (candidates.length === 0) return { value: undefined, source: undefined };
  return {
    value: candidates[0][1].trim(),
    source: `${source} ${candidates[0][0]}`,
  };
}

// Platform-injected variables take precedence over the project's .env file,
// regardless of which supported alias the deploy platform uses.
const runtimeKey = resolveApiKey(runtimeEnvironment, 'environment variable');
const fileKey = resolveApiKey(dotenvResult.parsed || {}, '.env');
const resolvedKey = runtimeKey.value ? runtimeKey : fileKey;

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/koya-booking',
  API_KEY: resolvedKey.value,
  API_KEY_SOURCE: resolvedKey.source,
};
