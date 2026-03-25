require('dotenv').config();

const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
  },
  server: {
    port: process.env.PORT || 3000
  }
};

// Validate required config
if (!config.openai.apiKey) {
  throw new Error('OPENAI_API_KEY environment variable is not set. Please create a .env file with your API key.');
}

// Log configuration on startup (mask the API key for security)
console.log('🔑 Configuration Loaded:');
console.log(`   - API Key: ${config.openai.apiKey.substring(0, 15)}...${config.openai.apiKey.substring(config.openai.apiKey.length - 4)}`);
console.log(`   - Model: ${config.openai.model}`);
console.log(`   - Port: ${config.server.port}`);

module.exports = config;
