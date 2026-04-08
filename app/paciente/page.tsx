"use client"
import { useState, useEffect, useRef } from "react"
import { supabase } from "../lib/supabase"

type Etapa = "cadastro" | "fila" | "chamado" | "concluido" | "nao_compareceu" | "problemas_tecnicos"

export default function PacientePage() {
  const [etapa, setEtapa] = useState<Etapa>("cadastro")
  const [form, setForm] = useState({ nome: "", cpf: "", email: "", queixa: "" })
  const [posicao, setPosicao] = useState(0)
  const [tempo, setTempo] = useState(0)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")
  const [linkConsulta, setLinkConsulta] = useState("")
  const filaIdRef = useRef<string>("")

  useEffect(() => {
    if (etapa !== "fila" && etapa !== "chamado") return

    const interval = setInterval(async () => {
      if (!filaIdRef.current) return

      const { data } = await supabase
        .from("fila")
        .select("status, posicao, link_meet")
        .eq("id", filaIdRef.current)
        .single()

      if (!data) return

      if (data.status === "em_atendimento" && data.link_meet) {
        setLinkConsulta(data.link_meet)
        setEtapa("chamado")
        return
      }

      if (data.status === "concluido") {
        setEtapa("concluido")
        clearInterval(interval)
        return
      }

      if (data.status === "nao_compareceu") {
        setEtapa("nao_compareceu")
        clearInterval(interval)
        return
      }

      if (data.status === "problemas_tecnicos" || data.status === "aguardando") {
        if (etapa === "chamado" && data.status === "aguardando") {
          setEtapa("problemas_tecnicos")
          clearInterval(interval)
          return
        }
        if (data.status === "aguardando") {
          const { count } = await supabase
            .from("fila")
            .select("*", { count: "exact", head: true })
            .eq("status", "aguardando")
            .lt("posicao", data.posicao)
          setPosicao((count || 0) + 1)
          setTempo(((count || 0) + 1) * 8)
        }
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [etapa])

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro("")

    try {
      let pacienteId = ""
      const { data: pacienteExistente } = await supabase
        .from("pacientes")
        .select("id")
        .eq("cpf", form.cpf)
        .single()

      if (pacienteExistente) {
        pacienteId = pacienteExistente.id
      } else {
        const { data: novoPaciente, error: erroPaciente } = await supabase
          .from("pacientes")
          .insert({ nome: form.nome, cpf: form.cpf, email: form.email })
          .select("id")
          .single()
        if (erroPaciente) throw erroPaciente
        pacienteId = novoPaciente.id
      }

      const { count } = await supabase
        .from("fila")
        .select("*", { count: "exact", head: true })
        .eq("status", "aguardando")

      const posicaoNaFila = (count || 0) + 1
      const tempoEstimado = posicaoNaFila * 8

      const { data: filaData, error: erroFila } = await supabase
        .from("fila")
        .insert({
          paciente_id: pacienteId,
          queixa: form.queixa,
          posicao: posicaoNaFila,
          status: "aguardando"
        })
        .select("id")
        .single()

      if (erroFila) throw erroFila

      filaIdRef.current = filaData.id
      setPosicao(posicaoNaFila)
      setTempo(tempoEstimado)
      setEtapa("fila")

    } catch (err) {
      setErro("Ocorreu um erro ao entrar na fila. Tente novamente.")
      console.error("ERRO DETALHADO:", JSON.stringify(err))
    } finally {
      setLoading(false)
    }
  }

  const logo = (
    <h1 style={{fontSize: "24px", fontWeight: 500, color: "#085041", marginBottom: "24px", textAlign: "center"}}>
      Kare <span style={{color: "#1D9E75", fontWeight: 400, fontSize: "18px"}}>saúde</span>
    </h1>
  )

  const card = (children: React.ReactNode) => (
    <main className="min-h-screen flex items-center justify-center" style={{background: "#F0FAF6"}}>
      <div style={{background: "#fff", borderRadius: "20px", border: "0.5px solid #9FE1CB", padding: "32px 28px", width: "100%", maxWidth: "400px", margin: "0 16px"}}>
        {children}
      </div>
    </main>
  )

  // TELA: CONCLUIDO
  if (etapa === "concluido") {
    return card(
      <>
        {logo}
        <div style={{background: "#E1F5EE", borderRadius: "16px", padding: "28px", textAlign: "center", marginBottom: "20px"}}>
          <div style={{width: "48px", height: "4px", background: "#0F6E56", borderRadius: "2px", margin: "0 auto 20px"}}/>
          <h2 style={{fontSize: "20px", fontWeight: 500, color: "#085041"}}>Consulta encerrada</h2>
          <p style={{fontSize: "14px", color: "#0F6E56", marginTop: "8px", lineHeight: 1.6}}>
            Obrigado por usar a Kare Saúde. Esperamos que tenha sido bem atendido.
          </p>
        </div>
        <div style={{background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "12px", padding: "16px", marginBottom: "20px"}}>
          <p style={{fontSize: "13px", fontWeight: 500, color: "#085041", marginBottom: "6px"}}>Documentos</p>
          <p style={{fontSize: "12px", color: "#0F6E56", lineHeight: 1.6}}>
            Receitas e atestados emitidos durante a consulta serão enviados para o e-mail <strong>{form.email}</strong> em instantes.
          </p>
        </div>
        <button
          onClick={() => {
            setEtapa("cadastro")
            setForm({ nome: "", cpf: "", email: "", queixa: "" })
            filaIdRef.current = ""
          }}
          style={{width: "100%", background: "#0F6E56", color: "#fff", padding: "14px", borderRadius: "12px", fontWeight: 500, fontSize: "15px", border: "none", cursor: "pointer"}}
        >
          Nova consulta
        </button>
        <p style={{fontSize: "11px", color: "#B4B2A9", textAlign: "center", marginTop: "16px"}}>
          Em caso de dúvidas, entre em contato pelo e-mail contato@karesaude.com.br
        </p>
      </>
    )
  }

  // TELA: NAO COMPARECEU
  if (etapa === "nao_compareceu") {
    return card(
      <>
        {logo}
        <div style={{background: "#FAEEDA", border: "0.5px solid #EF9F27", borderRadius: "16px", padding: "28px", textAlign: "center", marginBottom: "20px"}}>
          <div style={{width: "48px", height: "4px", background: "#854F0B", borderRadius: "2px", margin: "0 auto 20px"}}/>
          <h2 style={{fontSize: "20px", fontWeight: 500, color: "#633806"}}>Você perdeu sua vez</h2>
          <p style={{fontSize: "14px", color: "#854F0B", marginTop: "8px", lineHeight: 1.6}}>
            O médico aguardou sua entrada na chamada mas você não compareceu a tempo.
          </p>
        </div>
        <div style={{background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "12px", padding: "16px", marginBottom: "20px"}}>
          <p style={{fontSize: "13px", color: "#085041", lineHeight: 1.6}}>
            Se ainda precisar de atendimento, entre na fila novamente. Sua queixa anterior será lembrada.
          </p>
        </div>
        <button
          onClick={() => {
            setEtapa("cadastro")
            filaIdRef.current = ""
          }}
          style={{width: "100%", background: "#0F6E56", color: "#fff", padding: "14px", borderRadius: "12px", fontWeight: 500, fontSize: "15px", border: "none", cursor: "pointer"}}
        >
          Entrar na fila novamente
        </button>
      </>
    )
  }

  // TELA: PROBLEMAS TECNICOS
  if (etapa === "problemas_tecnicos") {
    return card(
      <>
        {logo}
        <div style={{background: "#FCEBEB", border: "0.5px solid #F09595", borderRadius: "16px", padding: "28px", textAlign: "center", marginBottom: "20px"}}>
          <div style={{width: "48px", height: "4px", background: "#A32D2D", borderRadius: "2px", margin: "0 auto 20px"}}/>
          <h2 style={{fontSize: "20px", fontWeight: 500, color: "#791F1F"}}>Problema técnico</h2>
          <p style={{fontSize: "14px", color: "#A32D2D", marginTop: "8px", lineHeight: 1.6}}>
            Houve um problema técnico durante sua consulta. Pedimos desculpas pelo transtorno.
          </p>
        </div>
        <div style={{background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "12px", padding: "16px", marginBottom: "20px"}}>
          <p style={{fontSize: "13px", color: "#085041", lineHeight: 1.6}}>
            Você foi recolocado com prioridade na fila. Clique abaixo para acompanhar seu atendimento.
          </p>
        </div>
        <button
          onClick={() => setEtapa("fila")}
          style={{width: "100%", background: "#0F6E56", color: "#fff", padding: "14px", borderRadius: "12px", fontWeight: 500, fontSize: "15px", border: "none", cursor: "pointer"}}
        >
          Voltar para a fila
        </button>
      </>
    )
  }

  // TELA: CHAMADO
  if (etapa === "chamado") {
    return card(
      <>
        {logo}
        <div style={{background: "#E1F5EE", borderRadius: "16px", padding: "32px 28px", marginBottom: "24px", textAlign: "center"}}>
          <div style={{width: "48px", height: "4px", background: "#0F6E56", borderRadius: "2px", margin: "0 auto 20px"}}/>
          <h2 style={{fontSize: "22px", fontWeight: 500, color: "#085041"}}>É a sua vez</h2>
          <p style={{fontSize: "14px", color: "#0F6E56", marginTop: "8px", lineHeight: 1.6}}>
            O médico está pronto para te atender. Clique no botão abaixo para entrar na consulta.
          </p>
        </div>
        <button
          onClick={() => window.open(linkConsulta)}
          style={{width: "100%", background: "#0F6E56", color: "#fff", padding: "16px", borderRadius: "12px", fontWeight: 500, fontSize: "16px", border: "none", cursor: "pointer", marginBottom: "12px"}}
        >
          Entrar na consulta
        </button>
        <p style={{fontSize: "11px", color: "#B4B2A9", textAlign: "center"}}>
          A videochamada abrirá em uma nova aba do navegador.
        </p>
      </>
    )
  }

  // TELA: FILA
  if (etapa === "fila") {
    return card(
      <>
        <div style={{textAlign: "center", marginBottom: "20px"}}>
          <h1 style={{fontSize: "24px", fontWeight: 500, color: "#085041"}}>
            Kare <span style={{color: "#1D9E75", fontWeight: 400, fontSize: "18px"}}>saúde</span>
          </h1>
        </div>
        <div style={{background: "#E1F5EE", borderRadius: "16px", padding: "28px", textAlign: "center", marginBottom: "16px"}}>
          <p style={{fontSize: "12px", fontWeight: 500, color: "#0F6E56", textTransform: "uppercase", letterSpacing: "0.8px"}}>Sua posição na fila</p>
          <div style={{fontSize: "72px", fontWeight: 500, color: "#085041", lineHeight: 1.1, margin: "8px 0"}}>
            {posicao}
          </div>
          <div style={{display: "flex", justifyContent: "center", gap: "6px", marginTop: "12px", flexWrap: "wrap"}}>
            {Array.from({length: Math.min(posicao, 10)}).map((_, i) => (
              <div key={i} style={{width: "10px", height: "10px", borderRadius: "50%", background: i === Math.min(posicao, 10) - 1 ? "#0F6E56" : "#9FE1CB"}}/>
            ))}
          </div>
        </div>
        <div style={{background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "12px", padding: "16px", marginBottom: "16px"}}>
          <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
            <div>
              <p style={{fontSize: "12px", color: "#0F6E56"}}>Tempo estimado</p>
              <p style={{fontSize: "22px", fontWeight: 500, color: "#085041", marginTop: "2px"}}>{tempo} min</p>
            </div>
            <div style={{textAlign: "right"}}>
              <p style={{fontSize: "12px", color: "#0F6E56"}}>Olá,</p>
              <p style={{fontSize: "14px", fontWeight: 500, color: "#085041"}}>{form.nome.split(" ")[0]}</p>
            </div>
          </div>
        </div>
        <div style={{background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "12px", padding: "14px", marginBottom: "20px"}}>
          <p style={{fontSize: "11px", color: "#0F6E56", fontWeight: 500, marginBottom: "6px"}}>Queixa registrada</p>
          <p style={{fontSize: "13px", color: "#085041"}}>{form.queixa}</p>
        </div>
        <p style={{fontSize: "11px", color: "#B4B2A9", textAlign: "center"}}>
          Não feche essa aba. Você será avisado quando for sua vez.
        </p>
      </>
    )
  }

  // TELA: CADASTRO
  return card(
    <>
      <div style={{textAlign: "center", marginBottom: "24px"}}>
        <h1 style={{fontSize: "24px", fontWeight: 500, color: "#085041"}}>
          Kare <span style={{color: "#1D9E75", fontWeight: 400, fontSize: "18px"}}>saúde</span>
        </h1>
        <p style={{fontSize: "13px", color: "#0F6E56", marginTop: "6px"}}>Preencha seus dados para entrar na fila</p>
      </div>

      <form onSubmit={handleCadastro} style={{display: "flex", flexDirection: "column", gap: "16px"}}>
        <div>
          <label style={{fontSize: "12px", fontWeight: 500, color: "#0F6E56", display: "block", marginBottom: "6px"}}>Nome completo</label>
          <input required placeholder="Seu nome completo" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} style={{width: "100%", background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", color: "#085041", outline: "none"}} />
        </div>
        <div>
          <label style={{fontSize: "12px", fontWeight: 500, color: "#0F6E56", display: "block", marginBottom: "6px"}}>CPF</label>
          <input required placeholder="000.000.000-00" value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} style={{width: "100%", background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", color: "#085041", outline: "none"}} />
        </div>
        <div>
          <label style={{fontSize: "12px", fontWeight: 500, color: "#0F6E56", display: "block", marginBottom: "6px"}}>E-mail</label>
          <input required type="email" placeholder="seu@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={{width: "100%", background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", color: "#085041", outline: "none"}} />
        </div>
        <div>
          <label style={{fontSize: "12px", fontWeight: 500, color: "#0F6E56", display: "block", marginBottom: "6px"}}>Queixa principal</label>
          <textarea required placeholder="Descreva brevemente o motivo da consulta..." rows={3} value={form.queixa} onChange={e => setForm({...form, queixa: e.target.value})} style={{width: "100%", background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", color: "#085041", outline: "none", resize: "none"}} />
        </div>

        {erro && (
          <div style={{background: "#FCEBEB", border: "0.5px solid #F09595", borderRadius: "10px", padding: "10px 14px"}}>
            <p style={{fontSize: "13px", color: "#A32D2D"}}>{erro}</p>
          </div>
        )}

        <button type="submit" disabled={loading} style={{background: loading ? "#B4B2A9" : "#0F6E56", color: "#fff", padding: "14px", borderRadius: "12px", fontWeight: 500, fontSize: "15px", border: "none", cursor: loading ? "not-allowed" : "pointer", marginTop: "4px"}}>
          {loading ? "Entrando na fila..." : "Entrar na fila"}
        </button>
      </form>

      <p style={{fontSize: "11px", color: "#B4B2A9", textAlign: "center", marginTop: "20px"}}>
        Ao continuar você aceita nossos{" "}
        <a href="#" style={{color: "#5DCAA5", textDecoration: "none"}}>termos de uso</a>
        {" "}e{" "}
        <a href="#" style={{color: "#5DCAA5", textDecoration: "none"}}>política de privacidade</a>
      </p>
    </>
  )
}