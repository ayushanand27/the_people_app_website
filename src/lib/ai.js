const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export async function generateIcebreaker(context = 'new connection') {
  if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('your_openai_api_key_here')) {
    return `Hey! Nice to connect — what got you interested in ${context}?`;
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You generate short, friendly social icebreakers.',
        },
        {
          role: 'user',
          content: `Create one icebreaker line about: ${context}`,
        },
      ],
      max_tokens: 40,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate AI icebreaker');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || 'Hey there 👋';
}
