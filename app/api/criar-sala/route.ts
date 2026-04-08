export async function POST() {
  try {
    const response = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        privacy: "public",
        properties: {
          exp: Math.round(Date.now() / 1000) + 60 * 60,
          enable_recording: "none",
        },
      }),
    })

    const data = await response.json()
    return Response.json({ url: data.url })
  } catch {
    return Response.json({ error: "Erro ao criar sala" }, { status: 500 })
  }
}