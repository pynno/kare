"use client"
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import jsPDF from "jspdf"

const modelosPadrao = [
  { id: "padrao-1", nome: "Lombalgia", texto: "S: Paciente refere dor lombar há ___ dias, com intensidade _/10, piora ao movimento e melhora com repouso.\nO: Sem déficit neurológico. Mobilidade preservada.\nA: Lombalgia mecânica aguda.\nP: Repouso relativo, anti-inflamatório por ___ dias, orientações posturais.", padrao: true },
  { id: "padrao-2", nome: "Cefaleia", texto: "S: Paciente refere cefaleia há ___ horas, intensidade _/10, localização ___, sem aura, sem febre.\nO: Sem rigidez de nuca. Pupilas isocóricas.\nA: Cefaleia tensional.\nP: Analgésico simples, hidratação, repouso em ambiente calmo.", padrao: true },
  { id: "padrao-3", nome: "Infecção respiratória", texto: "S: Paciente refere tosse ___, febre ___, coriza ___, há ___ dias.\nO: Orofaringe hiperemiada. Sem dispneia.\nA: Infecção de vias aéreas superiores.\nP: Sintomáticos, hidratação, repouso. Retorno se piora.", padrao: true },
  { id: "padrao-4", nome: "Ansiedade e insônia", texto: "S: Paciente refere ansiedade e dificuldade para dormir há ___ semanas. Nega ideação suicida.\nO: Orientado, consciente, humor ansioso.\nA: Transtorno de ansiedade.\nP: Orientações de higiene do sono, encaminhamento para psicólogo.", padrao: true },
  { id: "padrao-5", nome: "Dor abdominal", texto: "S: Paciente refere dor abdominal em ___, há ___ horas, intensidade _/10.\nO: Abdome doloroso à palpação em ___. Sem sinais de irritação peritoneal.\nA: Síndrome dispéptica.\nP: Dieta leve, antiácido, retorno se piora ou febre.", padrao: true },
  { id: "padrao-6", nome: "Hipertensão", texto: "S: Paciente refere ___. PA medida em ___.\nO: PA: _/_mmHg, FC: _bpm. Sem sinais de lesão de órgão-alvo.\nA: Hipertensão arterial sistêmica.\nP: Ajuste de medicação, orientações dietéticas, retorno em ___ dias.", padrao: true },
  { id: "padrao-7", nome: "Febre sem foco", texto: "S: Paciente refere febre de ___°C há ___ dias, sem foco identificado.\nO: Sem sinais de localização. Hemodinamicamente estável.\nA: Síndrome febril sem foco aparente.\nP: Antitérmico, hidratação, retorno se piora ou persistência além de 3 dias.", padrao: true },
]

type Modelo = { id: string; nome: string; texto: string; padrao?: boolean }
type Medico = { id: string; nome: string; crm: string; especialidade: string; email: string }

export default function MedicoPage() {
  const [medico, setMedico] = useState<Medico | null>(null)
  const [loginForm, setLoginForm] = useState({ crm: "", senha: "" })
  const [loginErro, setLoginErro] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [fila, setFila] = useState<any[]>([])
  const [pacienteAtual, setPacienteAtual] = useState<any>(null)
  const [prontuario, setProntuario] = useState<string>("")
  const [concluidas, setConcluidas] = useState<number>(0)
  const [emAtendimento, setEmAtendimento] = useState<boolean>(false)
  const [modelos, setModelos] = useState<Modelo[]>(modelosPadrao)
  const [mostrarModelos, setMostrarModelos] = useState<boolean>(false)
  const [mostrarNovoModelo, setMostrarNovoModelo] = useState<boolean>(false)
  const [novoModelo, setNovoModelo] = useState({ nome: "", texto: "" })
  const [mostrarReceita, setMostrarReceita] = useState<boolean>(false)
  const [mostrarAtestado, setMostrarAtestado] = useState<boolean>(false)
  const [receita, setReceita] = useState({ medicamento: "", dose: "", duracao: "", instrucoes: "", cid: "" })
  const [atestado, setAtestado] = useState({ dias: "", motivo: "", cid: "", observacoes: "" })
  const [receitaAssinada, setReceitaAssinada] = useState<boolean>(false)
  const [atestadoAssinado, setAtestadoAssinado] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [enviandoEmail, setEnviandoEmail] = useState<boolean>(false)

  useEffect(() => {
    const medicoSalvo = localStorage.getItem("medico")
    if (medicoSalvo) {
      const m = JSON.parse(medicoSalvo)
      setMedico(m)
      carregarModelos(m.id)
    }
  }, [])

  useEffect(() => {
    if (!medico) return
    carregarFila()
    const interval = setInterval(carregarFila, 5000)
    return () => clearInterval(interval)
  }, [medico])

  async function carregarModelos(medicoId: string) {
    const { data } = await supabase
      .from("modelos")
      .select("*")
      .eq("medico_id", medicoId)
      .order("criado_em", { ascending: true })

    if (data && data.length > 0) {
      const modelosPersonalizados = data.map(m => ({ id: m.id, nome: m.nome, texto: m.texto, padrao: false }))
      setModelos([...modelosPadrao, ...modelosPersonalizados])
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    setLoginErro("")
    const { data: medicoData } = await supabase
      .from("medicos")
      .select("*")
      .eq("crm", loginForm.crm)
      .eq("ativo", true)
      .single()
    if (!medicoData) {
      setLoginErro("CRM não encontrado ou médico não autorizado.")
      setLoginLoading(false)
      return
    }
    const bcrypt = await import("bcryptjs")
    const senhaCorreta = await bcrypt.compare(loginForm.senha, medicoData.senha || "")
    if (!senhaCorreta) {
      setLoginErro("Senha incorreta.")
      setLoginLoading(false)
      return
    }
    localStorage.setItem("medico", JSON.stringify(medicoData))
    setMedico(medicoData)
    carregarModelos(medicoData.id)
    setLoginLoading(false)
  }

  async function carregarFila() {
    const { data } = await supabase
      .from("fila")
      .select("*, pacientes(nome, cpf, email)")
      .eq("status", "aguardando")
      .order("posicao", { ascending: true })
    if (data) setFila(data)
  }

  async function iniciarAtendimento() {
    if (fila.length === 0) return
    setLoading(true)
    const proximo = fila[0]
    const res = await fetch("/api/criar-sala", { method: "POST" })
    const { url } = await res.json()
    await supabase.from("fila").update({ status: "em_atendimento", link_meet: url }).eq("id", proximo.id)
    setPacienteAtual({...proximo, link_meet: url})
    setFila((f: any[]) => f.slice(1))
    setEmAtendimento(true)
    setProntuario("")
    setMostrarModelos(false)
    setMostrarReceita(false)
    setMostrarAtestado(false)
    setReceitaAssinada(false)
    setAtestadoAssinado(false)
    setLoading(false)
  }

  async function encerrar(motivo: string) {
    if (!pacienteAtual) return
    if (motivo === "concluido") {
      await supabase.from("fila").update({ status: "concluido" }).eq("id", pacienteAtual.id)
      setConcluidas((c: number) => c + 1)
    }
    if (motivo === "problemas_tecnicos") {
      await supabase.from("fila").update({ status: "aguardando", posicao: 0 }).eq("id", pacienteAtual.id)
    }
    if (motivo === "nao_compareceu") {
      await supabase.from("fila").update({ status: "nao_compareceu" }).eq("id", pacienteAtual.id)
    }
    setPacienteAtual(null)
    setEmAtendimento(false)
    setProntuario("")
    setReceita({ medicamento: "", dose: "", duracao: "", instrucoes: "", cid: "" })
    setAtestado({ dias: "", motivo: "", cid: "", observacoes: "" })
    setReceitaAssinada(false)
    setAtestadoAssinado(false)
    carregarFila()
  }

  function aplicarModelo(texto: string) {
    setProntuario(texto)
    setMostrarModelos(false)
  }

  async function salvarNovoModelo() {
    if (!novoModelo.nome || !novoModelo.texto || !medico) return

    const { data, error } = await supabase.from("modelos").insert({
      medico_id: medico.id,
      nome: novoModelo.nome,
      texto: novoModelo.texto,
    }).select("id").single()

    if (!error && data) {
      setModelos(m => [...m, { id: data.id, nome: novoModelo.nome, texto: novoModelo.texto, padrao: false }])
      setNovoModelo({ nome: "", texto: "" })
      setMostrarNovoModelo(false)
    }
  }

  async function deletarModelo(id: string) {
    await supabase.from("modelos").delete().eq("id", id)
    setModelos(m => m.filter(modelo => modelo.id !== id))
  }

  async function gerarPDFReceita() {
    const doc = new jsPDF()
    const agora = new Date().toLocaleString("pt-BR")
    const nomePaciente = pacienteAtual?.pacientes?.nome || "Não informado"
    const cpfPaciente = pacienteAtual?.pacientes?.cpf || "Não informado"
    const emailPaciente = pacienteAtual?.pacientes?.email || ""
    doc.setFontSize(18); doc.setTextColor(8, 80, 65)
    doc.text("Kare Saúde", 105, 20, { align: "center" })
    doc.setFontSize(12); doc.setTextColor(0, 0, 0)
    doc.text("RECEITUÁRIO MÉDICO", 105, 30, { align: "center" })
    doc.setFontSize(10); doc.setTextColor(100, 100, 100)
    doc.text(`Emitido em: ${agora}`, 105, 38, { align: "center" })
    doc.setDrawColor(15, 110, 86); doc.line(15, 42, 195, 42)
    doc.setFontSize(11); doc.setTextColor(0, 0, 0)
    doc.text("DADOS DO MÉDICO", 15, 52)
    doc.setFontSize(10)
    doc.text(`Nome: ${medico?.nome || "Não informado"}`, 15, 60)
    doc.text(`CRM: ${medico?.crm || "Não informado"}`, 15, 67)
    doc.text(`Especialidade: ${medico?.especialidade || "Clínico Geral"}`, 15, 74)
    doc.line(15, 80, 195, 80)
    doc.setFontSize(11); doc.text("DADOS DO PACIENTE", 15, 90)
    doc.setFontSize(10)
    doc.text(`Nome: ${nomePaciente}`, 15, 98)
    doc.text(`CPF: ${cpfPaciente}`, 15, 105)
    doc.line(15, 111, 195, 111)
    doc.setFontSize(11); doc.text("PRESCRIÇÃO", 15, 121)
    doc.setFontSize(10)
    doc.text(`CID-10: ${receita.cid || "Não informado"}`, 15, 129)
    doc.text(`Medicamento: ${receita.medicamento}`, 15, 136)
    doc.text(`Dose: ${receita.dose}`, 15, 143)
    doc.text(`Duração: ${receita.duracao}`, 15, 150)
    doc.text(`Instruções: ${receita.instrucoes}`, 15, 157)
    doc.line(15, 200, 195, 200)
    doc.text("Assinatura e carimbo do médico", 105, 210, { align: "center" })
    doc.text("(Assinatura digital ICP-Brasil via BirdID — em implementação)", 105, 217, { align: "center" })
    doc.setFontSize(8); doc.setTextColor(150, 150, 150)
    doc.text("Este documento foi emitido pela plataforma Kare Saúde | karesaude.com.br", 105, 280, { align: "center" })
    doc.text("A teleconsulta não substitui a consulta presencial. Em caso de emergência, procure o pronto-socorro.", 105, 285, { align: "center" })
    if (emailPaciente) {
      setEnviandoEmail(true)
      const pdfBase64 = doc.output("datauristring").split(",")[1]
      await fetch("/api/enviar-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailPaciente, nomePaciente, tipo: "receita", pdfBase64, nomeMedico: medico?.nome || "Não informado", crmMedico: medico?.crm || "Não informado" }),
      })
      setEnviandoEmail(false)
    }
    setReceitaAssinada(true)
  }

  async function gerarPDFAtestado() {
    const doc = new jsPDF()
    const agora = new Date().toLocaleString("pt-BR")
    const nomePaciente = pacienteAtual?.pacientes?.nome || "Não informado"
    const cpfPaciente = pacienteAtual?.pacientes?.cpf || "Não informado"
    const emailPaciente = pacienteAtual?.pacientes?.email || ""
    doc.setFontSize(18); doc.setTextColor(8, 80, 65)
    doc.text("Kare Saúde", 105, 20, { align: "center" })
    doc.setFontSize(12); doc.setTextColor(0, 0, 0)
    doc.text("ATESTADO MÉDICO", 105, 30, { align: "center" })
    doc.setFontSize(10); doc.setTextColor(100, 100, 100)
    doc.text(`Emitido em: ${agora}`, 105, 38, { align: "center" })
    doc.setDrawColor(15, 110, 86); doc.line(15, 42, 195, 42)
    doc.setFontSize(11); doc.setTextColor(0, 0, 0)
    doc.text("DADOS DO MÉDICO", 15, 52)
    doc.setFontSize(10)
    doc.text(`Nome: ${medico?.nome || "Não informado"}`, 15, 60)
    doc.text(`CRM: ${medico?.crm || "Não informado"}`, 15, 67)
    doc.text(`Especialidade: ${medico?.especialidade || "Clínico Geral"}`, 15, 74)
    doc.line(15, 80, 195, 80)
    doc.setFontSize(11); doc.text("DADOS DO PACIENTE", 15, 90)
    doc.setFontSize(10)
    doc.text(`Nome: ${nomePaciente}`, 15, 98)
    doc.text(`CPF: ${cpfPaciente}`, 15, 105)
    doc.line(15, 111, 195, 111)
    doc.setFontSize(11); doc.text("ATESTADO", 15, 121)
    doc.setFontSize(10)
    doc.text(`CID-10: ${atestado.cid || "Não informado"}`, 15, 129)
    const texto = `Atesto para os devidos fins que o(a) paciente ${nomePaciente}, CPF ${cpfPaciente}, encontra-se sob meus cuidados médicos e necessita de afastamento de suas atividades pelo período de ${atestado.dias} dia(s), a partir da data de emissão deste documento, em razão de ${atestado.motivo}.`
    const linhas = doc.splitTextToSize(texto, 175)
    doc.text(linhas, 15, 137)
    if (atestado.observacoes) doc.text(`Observações: ${atestado.observacoes}`, 15, 165)
    doc.line(15, 200, 195, 200)
    doc.text("Assinatura e carimbo do médico", 105, 210, { align: "center" })
    doc.text("(Assinatura digital ICP-Brasil via BirdID — em implementação)", 105, 217, { align: "center" })
    doc.setFontSize(8); doc.setTextColor(150, 150, 150)
    doc.text("Este documento foi emitido pela plataforma Kare Saúde | karesaude.com.br", 105, 280, { align: "center" })
    doc.text("A teleconsulta não substitui a consulta presencial. Em caso de emergência, procure o pronto-socorro.", 105, 285, { align: "center" })
    if (emailPaciente) {
      setEnviandoEmail(true)
      const pdfBase64 = doc.output("datauristring").split(",")[1]
      await fetch("/api/enviar-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailPaciente, nomePaciente, tipo: "atestado", pdfBase64, nomeMedico: medico?.nome || "Não informado", crmMedico: medico?.crm || "Não informado" }),
      })
      setEnviandoEmail(false)
    }
    setAtestadoAssinado(true)
  }

  const btnVerde = { background: "#0F6E56", color: "#fff", padding: "10px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 500, border: "none", cursor: "pointer" }
  const btnCinza = { background: "#F8FDFB", color: "#0F6E56", padding: "10px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 500, border: "0.5px solid #9FE1CB", cursor: "pointer" }
  const inputStyle = { width: "100%", background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", color: "#085041", outline: "none", resize: "none" as const }

  if (!medico) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{background: "#F0FAF6"}}>
        <div style={{background: "#fff", borderRadius: "20px", border: "0.5px solid #9FE1CB", padding: "32px 28px", width: "100%", maxWidth: "400px", margin: "0 16px"}}>
          <div style={{textAlign: "center", marginBottom: "28px"}}>
            <h1 style={{fontSize: "24px", fontWeight: 500, color: "#085041"}}>
              Kare <span style={{color: "#1D9E75", fontWeight: 400, fontSize: "18px"}}>saúde</span>
            </h1>
            <p style={{fontSize: "13px", color: "#0F6E56", marginTop: "6px"}}>Acesso restrito a profissionais cadastrados</p>
          </div>
          <form onSubmit={handleLogin} style={{display: "flex", flexDirection: "column", gap: "16px"}}>
            <div>
              <label style={{fontSize: "12px", fontWeight: 500, color: "#0F6E56", display: "block", marginBottom: "6px"}}>CRM</label>
              <input required placeholder="Somente números" value={loginForm.crm} onChange={e => setLoginForm({...loginForm, crm: e.target.value})} style={{width: "100%", background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", color: "#085041", outline: "none"}} />
            </div>
            <div>
              <label style={{fontSize: "12px", fontWeight: 500, color: "#0F6E56", display: "block", marginBottom: "6px"}}>Senha</label>
              <input required type="password" placeholder="••••••••" value={loginForm.senha} onChange={e => setLoginForm({...loginForm, senha: e.target.value})} style={{width: "100%", background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", color: "#085041", outline: "none"}} />
            </div>
            {loginErro && (
              <div style={{background: "#FCEBEB", border: "0.5px solid #F09595", borderRadius: "10px", padding: "10px 14px"}}>
                <p style={{fontSize: "13px", color: "#A32D2D"}}>{loginErro}</p>
              </div>
            )}
            <button type="submit" disabled={loginLoading} style={{background: loginLoading ? "#B4B2A9" : "#0F6E56", color: "#fff", padding: "14px", borderRadius: "12px", fontWeight: 500, fontSize: "15px", border: "none", cursor: loginLoading ? "not-allowed" : "pointer"}}>
              {loginLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>
          <p style={{fontSize: "11px", color: "#B4B2A9", textAlign: "center", marginTop: "24px"}}>
            Problemas com o acesso? Entre em contato com a administração.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen" style={{background: "#F0FAF6"}}>
      <div style={{background: "#085041", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between"}}>
        <div>
          <h1 style={{fontSize: "20px", fontWeight: 500, color: "#E1F5EE"}}>Kare saúde</h1>
          <p style={{fontSize: "12px", color: "#9FE1CB", marginTop: "2px"}}>Dr(a). {medico.nome} — CRM {medico.crm}</p>
        </div>
        <div style={{display: "flex", gap: "12px", alignItems: "center"}}>
          <div style={{background: "#0F6E56", borderRadius: "10px", padding: "8px 16px", textAlign: "center"}}>
            <p style={{fontSize: "20px", fontWeight: 500, color: "#E1F5EE"}}>{fila.length}</p>
            <p style={{fontSize: "10px", color: "#9FE1CB"}}>na fila</p>
          </div>
          <div style={{background: "#0F6E56", borderRadius: "10px", padding: "8px 16px", textAlign: "center"}}>
            <p style={{fontSize: "20px", fontWeight: 500, color: "#E1F5EE"}}>{concluidas}</p>
            <p style={{fontSize: "10px", color: "#9FE1CB"}}>concluídas</p>
          </div>
          <button onClick={() => { localStorage.removeItem("medico"); setMedico(null) }} style={{background: "transparent", color: "#9FE1CB", border: "0.5px solid #9FE1CB", padding: "8px 14px", borderRadius: "8px", fontSize: "12px", cursor: "pointer"}}>
            Sair
          </button>
        </div>
      </div>

      <div style={{maxWidth: "720px", margin: "0 auto", padding: "24px 16px"}}>

        {emAtendimento && pacienteAtual && (
          <div style={{background: "#fff", borderRadius: "16px", border: "0.5px solid #9FE1CB", padding: "24px", marginBottom: "20px"}}>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px"}}>
              <div>
                <p style={{fontSize: "11px", fontWeight: 500, color: "#1D9E75", textTransform: "uppercase", letterSpacing: "0.8px"}}>Em atendimento agora</p>
                <h2 style={{fontSize: "20px", fontWeight: 500, color: "#085041", marginTop: "4px"}}>{pacienteAtual.pacientes?.nome}</h2>
                <p style={{fontSize: "12px", color: "#888780"}}>CPF: {pacienteAtual.pacientes?.cpf}</p>
              </div>
              <button onClick={() => { if (pacienteAtual?.link_meet) window.open(pacienteAtual.link_meet) }} style={btnVerde}>
                Abrir videochamada
              </button>
            </div>

            <div style={{background: "#E1F5EE", borderRadius: "10px", padding: "14px", marginBottom: "16px"}}>
              <p style={{fontSize: "11px", fontWeight: 500, color: "#0F6E56", marginBottom: "4px"}}>Queixa principal</p>
              <p style={{fontSize: "14px", color: "#085041"}}>{pacienteAtual.queixa}</p>
            </div>

            <details style={{marginBottom: "16px"}}>
              <summary style={{fontSize: "13px", fontWeight: 500, color: "#0F6E56", cursor: "pointer", padding: "10px 14px", background: "#F8FDFB", borderRadius: "10px", border: "0.5px solid #9FE1CB", listStyle: "none"}}>
                Consultas passadas
              </summary>
              <div style={{background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderTop: "none", borderRadius: "0 0 10px 10px", padding: "14px"}}>
                <p style={{fontSize: "13px", color: "#888780", textAlign: "center"}}>Nenhuma consulta anterior registrada.</p>
              </div>
            </details>

            <div style={{marginBottom: "12px"}}>
              <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px"}}>
                <label style={{fontSize: "12px", fontWeight: 500, color: "#0F6E56"}}>Prontuário</label>
                <div style={{display: "flex", gap: "8px"}}>
                  <button onClick={() => setMostrarModelos(!mostrarModelos)} style={btnCinza}>Usar modelo</button>
                  <button onClick={() => setMostrarNovoModelo(!mostrarNovoModelo)} style={btnCinza}>+ Novo modelo</button>
                </div>
              </div>

              {mostrarModelos && (
                <div style={{background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "10px", padding: "12px", marginBottom: "10px"}}>
                  <p style={{fontSize: "11px", fontWeight: 500, color: "#0F6E56", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.8px"}}>Selecione um modelo</p>
                  {modelos.filter(m => m.padrao).length > 0 && (
                    <p style={{fontSize: "10px", color: "#B4B2A9", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.6px"}}>Padrão</p>
                  )}
                  <div style={{display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px"}}>
                    {modelos.filter(m => m.padrao).map((m: Modelo) => (
                      <button key={m.id} onClick={() => aplicarModelo(m.texto)} style={{background: "#fff", border: "0.5px solid #9FE1CB", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#085041", cursor: "pointer", textAlign: "left", fontWeight: 500}}>
                        {m.nome}
                      </button>
                    ))}
                  </div>
                  {modelos.filter(m => !m.padrao).length > 0 && (
                    <>
                      <p style={{fontSize: "10px", color: "#B4B2A9", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.6px"}}>Meus modelos</p>
                      <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                        {modelos.filter(m => !m.padrao).map((m: Modelo) => (
                          <div key={m.id} style={{display: "flex", gap: "6px", alignItems: "center"}}>
                            <button onClick={() => aplicarModelo(m.texto)} style={{flex: 1, background: "#E1F5EE", border: "0.5px solid #9FE1CB", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#085041", cursor: "pointer", textAlign: "left", fontWeight: 500}}>
                              {m.nome}
                            </button>
                            <button onClick={() => deletarModelo(m.id)} style={{background: "#FCEBEB", color: "#A32D2D", border: "none", borderRadius: "8px", padding: "8px 10px", fontSize: "12px", cursor: "pointer"}}>
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {mostrarNovoModelo && (
                <div style={{background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "10px", padding: "14px", marginBottom: "10px"}}>
                  <p style={{fontSize: "11px", fontWeight: 500, color: "#0F6E56", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.8px"}}>Novo modelo</p>
                  <input placeholder="Nome do modelo" value={novoModelo.nome} onChange={e => setNovoModelo({...novoModelo, nome: e.target.value})} style={{...inputStyle, marginBottom: "8px"}} />
                  <textarea rows={4} placeholder="Texto do modelo..." value={novoModelo.texto} onChange={e => setNovoModelo({...novoModelo, texto: e.target.value})} style={inputStyle} />
                  <div style={{display: "flex", gap: "8px", marginTop: "10px"}}>
                    <button onClick={salvarNovoModelo} style={{...btnVerde, flex: 1}}>Salvar modelo</button>
                    <button onClick={() => setMostrarNovoModelo(false)} style={{...btnCinza, flex: 1}}>Cancelar</button>
                  </div>
                </div>
              )}

              <textarea rows={6} placeholder="S: Paciente refere..." value={prontuario} onChange={e => setProntuario(e.target.value)} style={inputStyle} />
            </div>

            <div style={{display: "flex", gap: "8px", marginBottom: "20px"}}>
              <button onClick={() => { setMostrarReceita(!mostrarReceita); setMostrarAtestado(false) }} style={{...btnCinza, flex: 1}}>Receituário</button>
              <button onClick={() => { setMostrarAtestado(!mostrarAtestado); setMostrarReceita(false) }} style={{...btnCinza, flex: 1}}>Atestado</button>
            </div>

            {mostrarReceita && (
              <div style={{background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "12px", padding: "16px", marginBottom: "16px"}}>
                <p style={{fontSize: "12px", fontWeight: 500, color: "#0F6E56", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "12px"}}>Receituário</p>
                <input placeholder="CID-10 (ex: M54.5)" value={receita.cid} onChange={e => setReceita({...receita, cid: e.target.value})} style={{...inputStyle, marginBottom: "8px"}} />
                <input placeholder="Medicamento" value={receita.medicamento} onChange={e => setReceita({...receita, medicamento: e.target.value})} style={{...inputStyle, marginBottom: "8px"}} />
                <input placeholder="Dose (ex: 500mg)" value={receita.dose} onChange={e => setReceita({...receita, dose: e.target.value})} style={{...inputStyle, marginBottom: "8px"}} />
                <input placeholder="Duração (ex: 7 dias)" value={receita.duracao} onChange={e => setReceita({...receita, duracao: e.target.value})} style={{...inputStyle, marginBottom: "8px"}} />
                <input placeholder="Instruções (ex: 1 comprimido de 8 em 8h)" value={receita.instrucoes} onChange={e => setReceita({...receita, instrucoes: e.target.value})} style={{...inputStyle, marginBottom: "12px"}} />
                {receitaAssinada ? (
                  <div style={{background: "#E1F5EE", border: "0.5px solid #9FE1CB", borderRadius: "10px", padding: "12px", textAlign: "center"}}>
                    <p style={{fontSize: "13px", fontWeight: 500, color: "#085041"}}>✓ Receita enviada para o e-mail do paciente</p>
                  </div>
                ) : (
                  <button onClick={gerarPDFReceita} disabled={enviandoEmail} style={{...btnVerde, width: "100%", opacity: enviandoEmail ? 0.7 : 1}}>
                    {enviandoEmail ? "Enviando..." : "Gerar e enviar receita por e-mail"}
                  </button>
                )}
              </div>
            )}

            {mostrarAtestado && (
              <div style={{background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "12px", padding: "16px", marginBottom: "16px"}}>
                <p style={{fontSize: "12px", fontWeight: 500, color: "#0F6E56", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "12px"}}>Atestado médico</p>
                <input placeholder="CID-10 (ex: J06.9)" value={atestado.cid} onChange={e => setAtestado({...atestado, cid: e.target.value})} style={{...inputStyle, marginBottom: "8px"}} />
                <input placeholder="Número de dias de afastamento" value={atestado.dias} onChange={e => setAtestado({...atestado, dias: e.target.value})} style={{...inputStyle, marginBottom: "8px"}} />
                <input placeholder="Motivo clínico (ex: tratamento de infecção respiratória aguda)" value={atestado.motivo} onChange={e => setAtestado({...atestado, motivo: e.target.value})} style={{...inputStyle, marginBottom: "8px"}} />
                <input placeholder="Observações (opcional)" value={atestado.observacoes} onChange={e => setAtestado({...atestado, observacoes: e.target.value})} style={{...inputStyle, marginBottom: "12px"}} />
                {atestadoAssinado ? (
                  <div style={{background: "#E1F5EE", border: "0.5px solid #9FE1CB", borderRadius: "10px", padding: "12px", textAlign: "center"}}>
                    <p style={{fontSize: "13px", fontWeight: 500, color: "#085041"}}>✓ Atestado enviado para o e-mail do paciente</p>
                  </div>
                ) : (
                  <button onClick={gerarPDFAtestado} disabled={enviandoEmail} style={{...btnVerde, width: "100%", opacity: enviandoEmail ? 0.7 : 1}}>
                    {enviandoEmail ? "Enviando..." : "Gerar e enviar atestado por e-mail"}
                  </button>
                )}
              </div>
            )}

            <div>
              <p style={{fontSize: "12px", fontWeight: 500, color: "#0F6E56", marginBottom: "10px"}}>Encerrar consulta</p>
              <div style={{display: "flex", gap: "8px"}}>
                <button onClick={() => encerrar("concluido")} style={{flex: 1, background: "#0F6E56", color: "#fff", padding: "12px", borderRadius: "10px", fontSize: "13px", fontWeight: 500, border: "none", cursor: "pointer"}}>Concluído</button>
                <button onClick={() => encerrar("problemas_tecnicos")} style={{flex: 1, background: "#854F0B", color: "#fff", padding: "12px", borderRadius: "10px", fontSize: "13px", fontWeight: 500, border: "none", cursor: "pointer"}}>Prob. técnicos</button>
                <button onClick={() => encerrar("nao_compareceu")} style={{flex: 1, background: "#A32D2D", color: "#fff", padding: "12px", borderRadius: "10px", fontSize: "13px", fontWeight: 500, border: "none", cursor: "pointer"}}>Não compareceu</button>
              </div>
            </div>
          </div>
        )}

        {!emAtendimento && (
          <button onClick={iniciarAtendimento} disabled={fila.length === 0 || loading} style={{width: "100%", background: fila.length === 0 ? "#B4B2A9" : "#0F6E56", color: "#fff", padding: "18px", borderRadius: "14px", fontSize: "17px", fontWeight: 500, border: "none", cursor: fila.length === 0 ? "not-allowed" : "pointer", marginBottom: "20px"}}>
            {loading ? "Carregando..." : fila.length === 0 ? "Nenhum paciente na fila" : "Iniciar atendimento"}
          </button>
        )}

        <div style={{background: "#fff", borderRadius: "16px", border: "0.5px solid #9FE1CB", padding: "20px"}}>
          <p style={{fontSize: "12px", fontWeight: 500, color: "#0F6E56", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "14px"}}>Fila de espera</p>
          {fila.length === 0 ? (
            <p style={{fontSize: "14px", color: "#B4B2A9", textAlign: "center", padding: "20px 0"}}>Nenhum paciente aguardando</p>
          ) : (
            <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
              {fila.map((p: any, i: number) => (
                <div key={p.id} style={{display: "flex", alignItems: "center", gap: "12px", background: "#F8FDFB", borderRadius: "10px", padding: "12px 14px", border: "0.5px solid #E1F5EE"}}>
                  <div style={{width: "28px", height: "28px", borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 500, color: "#0F6E56", flexShrink: 0}}>{i + 1}</div>
                  <div style={{flex: 1}}>
                    <p style={{fontSize: "14px", fontWeight: 500, color: "#085041"}}>{p.pacientes?.nome}</p>
                    <p style={{fontSize: "12px", color: "#0F6E56", marginTop: "2px"}}>{p.queixa}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}