import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
  InvokeAgentCommandOutput,
} from '@aws-sdk/client-bedrock-agent-runtime'
import { awsCredentialsProvider } from '@vercel/functions/oidc'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'

function getCredentials() {
  // On Vercel: use OIDC role federation. Locally: fall back to default provider chain.
  if (process.env.AWS_ROLE_ARN && process.env.VERCEL) {
    return awsCredentialsProvider({
      roleArn: process.env.AWS_ROLE_ARN!,
      clientConfig: { region: process.env.AWS_REGION || 'ap-south-1' },
    })
  }
  return fromNodeProviderChain()
}

let _client: BedrockAgentRuntimeClient | null = null

export function getBedrockAgentRuntimeClient(): BedrockAgentRuntimeClient {
  if (!_client) {
    _client = new BedrockAgentRuntimeClient({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: getCredentials(),
    })
  }
  return _client
}

/**
 * Invoke a Bedrock AgentCore agent and collect the full completion text.
 * Returns an async generator so callers can stream chunks to the client.
 */
export async function* invokeAgentStreaming(
  agentId: string,
  agentAliasId: string,
  sessionId: string,
  inputText: string,
): AsyncGenerator<string> {
  const client = getBedrockAgentRuntimeClient()
  const command = new InvokeAgentCommand({
    agentId,
    agentAliasId,
    sessionId,
    inputText,
  })

  const response: InvokeAgentCommandOutput = await client.send(command)

  if (!response.completion) return

  for await (const event of response.completion) {
    const chunk = (event as { chunk?: { bytes?: Uint8Array } }).chunk
    if (chunk?.bytes) {
      yield new TextDecoder().decode(chunk.bytes)
    }
  }
}

/**
 * Invoke a Bedrock AgentCore agent and collect the full response text (non-streaming).
 */
export async function invokeAgent(
  agentId: string,
  agentAliasId: string,
  sessionId: string,
  inputText: string,
): Promise<string> {
  let full = ''
  for await (const chunk of invokeAgentStreaming(agentId, agentAliasId, sessionId, inputText)) {
    full += chunk
  }
  return full
}
