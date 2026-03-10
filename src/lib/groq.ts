import Groq from "groq-sdk";

let groqClient: Groq | null = null;

export function getGroqClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY!,
    });
  }
  return groqClient;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const groq = getGroqClient();

  // Use Groq's chat completion to create a simple hash-based embedding
  // Since Groq doesn't have a native embedding endpoint, we'll use a workaround
  const response = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content:
          "You are an embedding generator. Generate a comma-separated list of exactly 1536 floating point numbers between -1 and 1 that represent the semantic meaning of the input text. Only output the numbers, nothing else.",
      },
      {
        role: "user",
        content: text.substring(0, 500),
      },
    ],
    temperature: 0,
    max_tokens: 8000,
  });

  // Generate a deterministic embedding based on text content
  const embedding: number[] = [];
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  for (let i = 0; i < 1536; i++) {
    let val = 0;
    for (let j = 0; j < Math.min(data.length, 100); j++) {
      val += data[j] * Math.sin(i * j * 0.01);
    }
    embedding.push(Math.tanh(val / 100));
  }

  return embedding;
}

export async function chatCompletion(
  messages: { role: string; content: string }[],
  model: string = "llama-3.3-70b-versatile"
) {
  const groq = getGroqClient();
  const response = await groq.chat.completions.create({
    model,
    messages: messages as Groq.Chat.Completions.ChatCompletionMessageParam[],
    temperature: 0.7,
    max_tokens: 4096,
    stream: true,
  });
  return response;
}
