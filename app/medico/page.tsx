"use client"
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

const modelosPadrao = [
  { id: 1, nome: "Lombalgia", texto: "S: Paciente refere dor lombar há ___ dias, com intensidade _/10, piora ao movimento e melhora com repouso.\nO: Sem déficit neurológico. Mobilidade preservada.\nA: Lombalgia mecânica aguda.\nP: Repouso relativo, anti-inflamatório por ___ dias, orientações posturais." },
  { id: 2, nome: "Cefaleia", texto: "S: Paciente refere cefaleia há ___ horas, intensidade _/10, localização ___, sem aura, sem febre.\nO: Sem rigidez de nuca. Pupilas isocóricas.\nA: Cefaleia tensional.\nP: Analgésico simples, hidratação, repouso em ambiente calmo." },
  { id: 3, nome: "Infecção respiratória", texto: "S: Paciente refere tosse ___, febre ___, coriza ___, há ___ dias.\nO: Orofaringe hiperemiada. Sem dispneia.\nA: Infecção de vias aéreas superiores.\nP: Sintomáticos, hidratação, repouso. Retorno se piora." },
  { id: 4, nome: "Ansiedade e insônia", texto: "S: Paciente refere ansiedade e dificuldade para dormir há ___ semanas. Nega ideação suicida.\nO: Orientado, consciente, humor ansioso.\nA: Transtorno de ansiedade.\nP: Orientações de higiene do sono, encaminhamento para psicólogo." },
  { id: 5, nome: "Dor abdominal", texto: "S: Paciente refere dor abdominal em ___, há ___ horas, intensidade _/10.\nO: Abdome doloroso à palpação em ___. Sem sinais de irritação peritoneal.\nA: Síndrome dispéptica.\nP: Dieta leve, antiácido, retorno se piora ou febre." },
  { id: 6, nome: "Hipertensão", texto: "S: Paciente refere ___. PA medida em ___.\nO: PA: _/_mmHg, FC: _bpm. Sem sinais de lesão de órgão-alvo.\nA: Hipertensão arterial sistêmica.\nP: Ajuste de medicação, orientações dietéticas, retorno em ___ dias." },
  { id: 7, nome: "Febre sem foco", texto: "S: Paciente refere febre de ___°C há ___ dias, sem foco identificado.\nO: Sem sinais de localização. Hemodinamicamente estável.\nA: Síndrome febril sem foco aparente.\nP: Antitérmico, hidratação, retorno se piora ou persistência além de 3 dias." },
]

type Modelo = { id: number; nome: string; texto: string }

export default function MedicoPage() {
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
  const [receita, setReceita] = useState({ medicamento: "", dose: "", duracao: "", instrucoes: "" })
  const [atestado, setAtestado] = useState({ dias: "", motivo: "", observacoes: "" })
  const [receitaAssinada, setReceitaAssinada] = useState<boolean>(false)
  const [atestadoAssinado, setAtestadoAssinado] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    carregarFila()
    const interval = setInterval(carregarFila, 5000)
    return () => clearInterval(interval)
  }, [])

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
    await supabase.from("fila").update({ status: "em_atendimento" }).eq("id", proximo.id)
    setPacienteAtual(proximo)
    setFila((f: any[]) => f.slice(1))
    setEmAtendimento(true)
    setProntuario("")
    setMostrarModelos(false)
    setMostrarReceita(false)
    setMostrarAtestado(false)
    setReceitaAssinada(false)
    setAtestadoAssinado(false)
    setLoading(false)

    async function iniciarAtendimento() {
  if (fila.length === 0) return
  setLoading(true)
  const proximo = fila[0]

  // Gera link do Daily.co
  const res = await fetch("/api/criar-sala", { method: "POST" })
  const { url } = await res.json()

  await supabase
    .from("fila")
    .update({ status: "em_atendimento", link_meet: url })
    .eq("id", proximo.id)

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
    carregarFila()
  }

  function aplicarModelo(texto: string) {
    setProntuario(texto)
    setMostrarModelos(false)
  }

  function salvarNovoModelo() {
    if (!novoModelo.nome || !novoModelo.texto) return
    setModelos((m: Modelo[]) => [...m, { id: Date.now(), ...novoModelo }])
    setNovoModelo({ nome: "", texto: "" })
    setMostrarNovoModelo(false)
  }

  function assinarBirdID(tipo: string) {
    setTimeout(() => {
      if (tipo === "receita") setReceitaAssinada(true)
      if (tipo === "atestado") setAtestadoAssinado(true)
    }, 1500)
  }

  const btnVerde = { background: "#0F6E56", color: "#fff", padding: "10px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 500, border: "none", cursor: "pointer" }
  const btnCinza = { background: "#F8FDFB", color: "#0F6E56", padding: "10px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 500, border: "0.5px solid #9FE1CB", cursor: "pointer" }
  const inputStyle = { width: "100%", background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", color: "#085041", outline: "none", resize: "none" as const }

  return (
    <main className="min-h-screen" style={{background: "#F0FAF6"}}>
      <div style={{background: "#085041", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between"}}>
        <div>
          <h1 style={{fontSize: "20px", fontWeight: 500, color: "#E1F5EE"}}>Kare saúde</h1>
          <p style={{fontSize: "12px", color: "#9FE1CB", marginTop: "2px"}}>Painel do médico</p>
        </div>
        <div style={{display: "flex", gap: "12px"}}>
          <div style={{background: "#0F6E56", borderRadius: "10px", padding: "8px 16px", textAlign: "center"}}>
            <p style={{fontSize: "20px", fontWeight: 500, color: "#E1F5EE"}}>{fila.length}</p>
            <p style={{fontSize: "10px", color: "#9FE1CB"}}>na fila</p>
          </div>
          <div style={{background: "#0F6E56", borderRadius: "10px", padding: "8px 16px", textAlign: "center"}}>
            <p style={{fontSize: "20px", fontWeight: 500, color: "#E1F5EE"}}>{concluidas}</p>
            <p style={{fontSize: "10px", color: "#9FE1CB"}}>concluídas</p>
          </div>
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
              <button
                onClick={() => window.open(pacienteAtual.link_meet)}
                style={btnVerde}
              >
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
                  <div style={{display: "flex", flexDirection: "column", gap: "6px"}}>
                    {modelos.map((m: Modelo) => (
                      <button key={m.id} onClick={() => aplicarModelo(m.texto)} style={{background: "#fff", border: "0.5px solid #9FE1CB", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", color: "#085041", cursor: "pointer", textAlign: "left", fontWeight: 500}}>
                        {m.nome}
                      </button>
                    ))}
                  </div>
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
                <input placeholder="Medicamento" value={receita.medicamento} onChange={e => setReceita({...receita, medicamento: e.target.value})} style={{...inputStyle, marginBottom: "8px"}} />
                <input placeholder="Dose (ex: 500mg)" value={receita.dose} onChange={e => setReceita({...receita, dose: e.target.value})} style={{...inputStyle, marginBottom: "8px"}} />
                <input placeholder="Duração (ex: 7 dias)" value={receita.duracao} onChange={e => setReceita({...receita, duracao: e.target.value})} style={{...inputStyle, marginBottom: "8px"}} />
                <input placeholder="Instruções" value={receita.instrucoes} onChange={e => setReceita({...receita, instrucoes: e.target.value})} style={{...inputStyle, marginBottom: "12px"}} />
                {receitaAssinada ? (
                  <div style={{background: "#E1F5EE", border: "0.5px solid #9FE1CB", borderRadius: "10px", padding: "12px", textAlign: "center"}}>
                    <p style={{fontSize: "13px", fontWeight: 500, color: "#085041"}}>Receita assinada com BirdID</p>
                  </div>
                ) : (
                  <button onClick={() => assinarBirdID("receita")} style={{...btnVerde, width: "100%"}}>Assinar com BirdID</button>
                )}
              </div>
            )}

            {mostrarAtestado && (
              <div style={{background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "12px", padding: "16px", marginBottom: "16px"}}>
                <p style={{fontSize: "12px", fontWeight: 500, color: "#0F6E56", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "12px"}}>Atestado médico</p>
                <input placeholder="Número de dias" value={atestado.dias} onChange={e => setAtestado({...atestado, dias: e.target.value})} style={{...inputStyle, marginBottom: "8px"}} />
                <input placeholder="Motivo" value={atestado.motivo} onChange={e => setAtestado({...atestado, motivo: e.target.value})} style={{...inputStyle, marginBottom: "8px"}} />
                <input placeholder="Observações (opcional)" value={atestado.observacoes} onChange={e => setAtestado({...atestado, observacoes: e.target.value})} style={{...inputStyle, marginBottom: "12px"}} />
                {atestadoAssinado ? (
                  <div style={{background: "#E1F5EE", border: "0.5px solid #9FE1CB", borderRadius: "10px", padding: "12px", textAlign: "center"}}>
                    <p style={{fontSize: "13px", fontWeight: 500, color: "#085041"}}>Atestado assinado com BirdID</p>
                  </div>
                ) : (
                  <button onClick={() => assinarBirdID("atestado")} style={{...btnVerde, width: "100%"}}>Assinar com BirdID</button>
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
          <button
            onClick={iniciarAtendimento}
            disabled={fila.length === 0 || loading}
            style={{width: "100%", background: fila.length === 0 ? "#B4B2A9" : "#0F6E56", color: "#fff", padding: "18px", borderRadius: "14px", fontSize: "17px", fontWeight: 500, border: "none", cursor: fila.length === 0 ? "not-allowed" : "pointer", marginBottom: "20px"}}
          >
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