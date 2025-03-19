import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

export async function invokeLambda(
  functionName: string, 
  payload: Record<string, any>
) {
  const command = new InvokeCommand({
    FunctionName: functionName,
    Payload: Buffer.from(JSON.stringify(payload)),
  });

  const response = await lambdaClient.send(command);
  if (response.Payload) {
    const result = Buffer.from(response.Payload).toString('utf-8');
    return JSON.parse(result);
  }
  return null;
}

export async function generateQuotePDF(payload: any) {
  try {
    const result = await invokeLambda('cotizador', payload);
    return result;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}