export async function POST() {
  try {
    const response = await fetch("https://api.daily.co/v1/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.DAILY_API_KEY}`,
      },
      body: JSON.stringify({}),
    })

    const data = await response.json()
    console.log("Daily response:", JSON.stringify(data))

    if (!data.url) {
      return Response.json({ error: "Link não gerado", data }, { status: 500 })
    }

    return Response.json({ url: data.url })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}