export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return new Response('GROQ_API_KEY not configured', { status: 500 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return new Response('Invalid form data', { status: 400 });
  }

  const audio = formData.get('audio') as File | null;
  if (!audio) return new Response('audio is required', { status: 400 });

  const groqForm = new FormData();
  groqForm.append('file', audio, 'recording.webm');
  groqForm.append('model', 'whisper-large-v3-turbo');
  groqForm.append('language', 'ko');
  groqForm.append('response_format', 'json');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: groqForm,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    return new Response(`Groq error: ${err}`, { status: 502 });
  }

  const data = await res.json() as { text: string };
  return Response.json({ transcript: data.text.trim() });
}

export const config = { runtime: 'edge' };
