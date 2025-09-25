/**
 * Debug Lambda Handler for HIPAA Photo Collector API
 */

const serverlessExpress = require('@vendia/serverless-express');
const app = require('./app-debug');

// Create the serverless express handler
let serverlessExpressInstance;

async function setup(event, context) {
  console.log('Setting up serverless express instance');
  serverlessExpressInstance = serverlessExpress({ app });
  return serverlessExpressInstance(event, context);
}

// Lambda handler function
exports.handler = async (event, context) => {
  console.log('Lambda handler called');
  console.log('Event:', JSON.stringify(event, null, 2));

  // Configure context for better performance
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Initialize serverless express if not already done
    if (serverlessExpressInstance) {
      console.log('Using existing serverless express instance');
      return serverlessExpressInstance(event, context);
    }

    console.log('Creating new serverless express instance');
    return setup(event, context);
  } catch (error) {
    console.error('Lambda handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://dbotana.github.io',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify({
        success: false,
        message: 'Lambda handler error',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};