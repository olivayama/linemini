import { ScheduledHandler } from "aws-lambda";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const apiBaseUrl = process.env.API_BASE_URL;
const secretName = process.env.API_WEBHOOK_TOKEN_SECRET_NAME;

export const handler: ScheduledHandler<{
  name: string;
  method: string;
  path: string;
  contentType?: string;
  body?: string;
}> = async (event) => {
  console.log(`Event: ${JSON.stringify(event)}`);

  if (apiBaseUrl == null) throw new Error('API_BASE_URL is required');

  const { name, method, path, contentType, body } = event.detail;
  const requestedAt = Date.now();

  try {
    const url = new URL(path, apiBaseUrl).href;
    const apiWebhookToken = await (async function () {
        const cli = new SecretsManagerClient({});
        const res = await cli.send( new GetSecretValueCommand({SecretId: secretName}) );
        return JSON.parse(res.SecretString).secret_token;
    })();

    const res = await fetch(url, {
      method,
      headers: {
        "webhook-token": apiWebhookToken,
        ...(contentType ? { "Content-Type": contentType } : {}),
      },
      body,
    });

    const responseBody = await res.text();
    const runtime = Date.now() - requestedAt;

    console.log(
      JSON.stringify({
        name,
        method,
        path,
        runtime,
        status: res.status,
        body: await responseBody,
      })
    );

    if (!res.ok) {
      throw new Error(
        `API request failed with status ${res.status}: ${responseBody}`,
      );
    }
  } catch (error) {
    console.error('Failed to trigger API call:', error);
    throw error;
  }
}
