export async function POST() {
  try {
    const exp = Math.round(Date.now() / 1000) + 60 * 20

    const response = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          exp,
          eject_at_room_exp: true,
          enable_recording: "none",
        },
      }),
    })

    const data = await response.json()

    if (!data.url) {
      return Response.json({ error: "Link não gerado", data }, { status: 500 })
    }

    return Response.json({ url: data.url })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}