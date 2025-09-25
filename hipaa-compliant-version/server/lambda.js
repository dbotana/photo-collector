/**
 * AWS Lambda Handler for HIPAA Photo Collector API
 * Wraps the Express application for serverless deployment
 */

const serverlessExpress = require('@vendia/serverless-express');
const app = require('./app');

// Create the serverless express handler
let serverlessExpressInstance;

async function setup(event, context) {
  serverlessExpressInstance = serverlessExpress({ app });
  return serverlessExpressInstance(event, context);
}

// Lambda handler function
exports.handler = async (event, context) => {
  // Configure context for better performance
  context.callbackWaitsForEmptyEventLoop = false;

  // Log the incoming request for debugging (remove in production)
  if (process.env.DEBUG_LOGGING === 'true') {
    console.log('Lambda Event:', JSON.stringify(event, null, 2));
  }

  // Initialize serverless express if not already done
  if (serverlessExpressInstance) {
    return serverlessExpressInstance(event, context);
  }

  return setup(event, context);
};