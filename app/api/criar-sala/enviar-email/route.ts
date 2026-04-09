import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const { emailPaciente, nomePaciente, tipo, pdfBase64, nomeMedico, crmMedico } = await request.json()

    const assunto = tipo === "receita"
      ? "Sua receita médica — Kare Saúde"
      : "Seu atestado médico — Kare Saúde"

    const nomeDocumento = tipo === "receita" ? "receita" : "atestado"

    const { data, error } = await resend.emails.send({
      from: "Kare Saúde <noreply@karesaude.com.br>",
      to: emailPaciente,
      subject: assunto,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <h2 style="color: #085041; font-weight: 500;">Kare <span style="color: #1D9E75; font-weight: 400;">saúde</span></h2>
          <p style="color: #333; font-size: 15px;">Olá, <strong>${nomePaciente}</strong>!</p>
          <p style="color: #333; font-size: 15px;">Seu ${nomeDocumento} médico está em anexo neste e-mail.</p>
          <p style="color: #555; font-size: 13px;">Emitido por: Dr(a). ${nomeMedico} — CRM ${crmMedico}</p>
          <hr style="border: none; border-top: 1px solid #E1F5EE; margin: 24px 0;" />
          <p style="color: #888; font-size: 11px;">Este documento foi emitido pela plataforma Kare Saúde. A teleconsulta não substitui a consulta presencial. Em caso de emergência, procure o pronto-socorro.</p>
          <p style="color: #888; font-size: 11px;">karesaude.com.br</p>
        </div>
      `,
      attachments: [
        {
          filename: `${nomeDocumento}_kare_saude.pdf`,
          content: pdfBase64,
        },
      ],
    })

    if (error) {
      return Response.json({ error }, { status: 500 })
    }

    return Response.json({ success: true, data })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}