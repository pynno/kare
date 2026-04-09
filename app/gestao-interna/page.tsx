"use client"
import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"

export default function AdminPage() {
  const [etapa, setEtapa] = useState<"login" | "painel">("login")
  const [form, setForm] = useState({ email: "", senha: "" })
  const [erro, setErro] = useState("")
  const [loading, setLoading] = useState(false)
  const [medicos, setMedicos] = useState<any[]>([])
  const [novoMedico, setNovoMedico] = useState({ nome: "", crm: "", email: "", especialidade: "", senha: "" })
  const [mostrarFormMedico, setMostrarFormMedico] = useState(false)
  const [fila, setFila] = useState<any[]>([])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro("")

    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.senha,
    })

    if (error) {
      setErro("E-mail ou senha incorretos.")
      setLoading(false)
      return
    }

    const { data: adminData } = await supabase
      .from("admins")
      .select("id")
      .eq("id", data.user.id)
      .single()

    if (!adminData) {
      setErro("Acesso negado. Você não tem permissão de administrador.")
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    setLoading(false)
    setEtapa("painel")
    carregarDados()
  }

  async function carregarDados() {
    const { data: medicosData } = await supabase
      .from("medicos")
      .select("*")
      .order("nome", { ascending: true })

    const { data: filaData } = await supabase
      .from("fila")
      .select("*, pacientes(nome, cpf)")
      .eq("status", "aguardando")
      .order("posicao", { ascending: true })

    if (medicosData) setMedicos(medicosData)
    if (filaData) setFila(filaData)
  }

  async function aprovarMedico(id: string) {
    await supabase.from("medicos").update({ ativo: true }).eq("id", id)
    carregarDados()
  }

  async function bloquearMedico(id: string) {
    await supabase.from("medicos").update({ ativo: false }).eq("id", id)
    carregarDados()
  }

  async function cadastrarMedico(e: React.FormEvent) {
    e.preventDefault()
    const bcrypt = await import("bcryptjs")
    const senhaHash = await bcrypt.hash(novoMedico.senha, 10)

    const { error } = await supabase.from("medicos").insert({
      nome: novoMedico.nome,
      crm: novoMedico.crm,
      email: novoMedico.email,
      especialidade: novoMedico.especialidade,
      senha: senhaHash,
      ativo: true
    })
    if (!error) {
      setNovoMedico({ nome: "", crm: "", email: "", especialidade: "", senha: "" })
      setMostrarFormMedico(false)
      carregarDados()
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setEtapa("login")
  }

  const inputStyle = {
    width: "100%",
    background: "#F8FDFB",
    border: "0.5px solid #9FE1CB",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "14px",
    color: "#085041",
    outline: "none"
  }

  if (etapa === "login") {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{background: "#F0FAF6"}}>
        <div style={{background: "#fff", borderRadius: "20px", border: "0.5px solid #9FE1CB", padding: "32px 28px", width: "100%", maxWidth: "400px", margin: "0 16px"}}>
          <div style={{textAlign: "center", marginBottom: "28px"}}>
            <h1 style={{fontSize: "24px", fontWeight: 500, color: "#085041"}}>
              Kare <span style={{color: "#1D9E75", fontWeight: 400, fontSize: "18px"}}>saúde</span>
            </h1>
            <p style={{fontSize: "13px", color: "#0F6E56", marginTop: "6px"}}>Acesso administrativo</p>
          </div>
          <form onSubmit={handleLogin} style={{display: "flex", flexDirection: "column", gap: "16px"}}>
            <div>
              <label style={{fontSize: "12px", fontWeight: 500, color: "#0F6E56", display: "block", marginBottom: "6px"}}>E-mail</label>
              <input required type="email" placeholder="seu@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={inputStyle} />
            </div>
            <div>
              <label style={{fontSize: "12px", fontWeight: 500, color: "#0F6E56", display: "block", marginBottom: "6px"}}>Senha</label>
              <input required type="password" placeholder="••••••••" value={form.senha} onChange={e => setForm({...form, senha: e.target.value})} style={inputStyle} />
            </div>
            {erro && (
              <div style={{background: "#FCEBEB", border: "0.5px solid #F09595", borderRadius: "10px", padding: "10px 14px"}}>
                <p style={{fontSize: "13px", color: "#A32D2D"}}>{erro}</p>
              </div>
            )}
            <button type="submit" disabled={loading} style={{background: loading ? "#B4B2A9" : "#085041", color: "#fff", padding: "14px", borderRadius: "12px", fontWeight: 500, fontSize: "15px", border: "none", cursor: loading ? "not-allowed" : "pointer"}}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen" style={{background: "#F0FAF6"}}>
      <div style={{background: "#085041", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between"}}>
        <div>
          <h1 style={{fontSize: "20px", fontWeight: 500, color: "#E1F5EE"}}>Kare saúde</h1>
          <p style={{fontSize: "12px", color: "#9FE1CB", marginTop: "2px"}}>Painel administrativo</p>
        </div>
        <button onClick={handleLogout} style={{background: "transparent", color: "#9FE1CB", border: "0.5px solid #9FE1CB", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", cursor: "pointer"}}>
          Sair
        </button>
      </div>

      <div style={{maxWidth: "800px", margin: "0 auto", padding: "24px 16px"}}>

        <div style={{display: "flex", gap: "12px", marginBottom: "24px"}}>
          <div style={{flex: 1, background: "#fff", borderRadius: "12px", border: "0.5px solid #9FE1CB", padding: "16px", textAlign: "center"}}>
            <p style={{fontSize: "28px", fontWeight: 500, color: "#085041"}}>{fila.length}</p>
            <p style={{fontSize: "12px", color: "#0F6E56"}}>pacientes na fila</p>
          </div>
          <div style={{flex: 1, background: "#fff", borderRadius: "12px", border: "0.5px solid #9FE1CB", padding: "16px", textAlign: "center"}}>
            <p style={{fontSize: "28px", fontWeight: 500, color: "#085041"}}>{medicos.filter(m => m.ativo).length}</p>
            <p style={{fontSize: "12px", color: "#0F6E56"}}>médicos ativos</p>
          </div>
          <div style={{flex: 1, background: "#fff", borderRadius: "12px", border: "0.5px solid #9FE1CB", padding: "16px", textAlign: "center"}}>
            <p style={{fontSize: "28px", fontWeight: 500, color: "#085041"}}>{medicos.filter(m => !m.ativo).length}</p>
            <p style={{fontSize: "12px", color: "#0F6E56"}}>aguardando aprovação</p>
          </div>
        </div>

        <div style={{background: "#fff", borderRadius: "16px", border: "0.5px solid #9FE1CB", padding: "20px", marginBottom: "20px"}}>
          <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px"}}>
            <p style={{fontSize: "12px", fontWeight: 500, color: "#0F6E56", textTransform: "uppercase", letterSpacing: "0.8px"}}>Médicos cadastrados</p>
            <button onClick={() => setMostrarFormMedico(!mostrarFormMedico)} style={{background: "#0F6E56", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 14px", fontSize: "13px", fontWeight: 500, cursor: "pointer"}}>
              + Cadastrar médico
            </button>
          </div>

          {mostrarFormMedico && (
            <form onSubmit={cadastrarMedico} style={{background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "12px", padding: "16px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px"}}>
              <p style={{fontSize: "11px", fontWeight: 500, color: "#0F6E56", textTransform: "uppercase", letterSpacing: "0.8px"}}>Novo médico</p>
              <input required placeholder="Nome completo" value={novoMedico.nome} onChange={e => setNovoMedico({...novoMedico, nome: e.target.value})} style={inputStyle} />
              <input required placeholder="CRM (somente números)" value={novoMedico.crm} onChange={e => setNovoMedico({...novoMedico, crm: e.target.value})} style={inputStyle} />
              <input required type="email" placeholder="E-mail" value={novoMedico.email} onChange={e => setNovoMedico({...novoMedico, email: e.target.value})} style={inputStyle} />
              <input placeholder="Especialidade" value={novoMedico.especialidade} onChange={e => setNovoMedico({...novoMedico, especialidade: e.target.value})} style={inputStyle} />
              <input required type="password" placeholder="Senha de acesso" value={novoMedico.senha} onChange={e => setNovoMedico({...novoMedico, senha: e.target.value})} style={inputStyle} />
              <div style={{display: "flex", gap: "8px"}}>
                <button type="submit" style={{flex: 1, background: "#0F6E56", color: "#fff", border: "none", borderRadius: "10px", padding: "10px", fontSize: "13px", fontWeight: 500, cursor: "pointer"}}>Cadastrar</button>
                <button type="button" onClick={() => setMostrarFormMedico(false)} style={{flex: 1, background: "#F8FDFB", color: "#0F6E56", border: "0.5px solid #9FE1CB", borderRadius: "10px", padding: "10px", fontSize: "13px", cursor: "pointer"}}>Cancelar</button>
              </div>
            </form>
          )}

          {medicos.length === 0 ? (
            <p style={{fontSize: "14px", color: "#B4B2A9", textAlign: "center", padding: "20px 0"}}>Nenhum médico cadastrado ainda.</p>
          ) : (
            <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
              {medicos.map(m => (
                <div key={m.id} style={{display: "flex", alignItems: "center", gap: "12px", background: "#F8FDFB", borderRadius: "10px", padding: "12px 14px", border: "0.5px solid #E1F5EE"}}>
                  <div style={{flex: 1}}>
                    <p style={{fontSize: "14px", fontWeight: 500, color: "#085041"}}>{m.nome}</p>
                    <p style={{fontSize: "12px", color: "#0F6E56"}}>CRM {m.crm} {m.especialidade ? `· ${m.especialidade}` : ""}</p>
                    <p style={{fontSize: "11px", color: "#888780"}}>{m.email}</p>
                  </div>
                  <div style={{display: "flex", gap: "6px", alignItems: "center"}}>
                    <span style={{fontSize: "11px", padding: "4px 10px", borderRadius: "20px", background: m.ativo ? "#E1F5EE" : "#FCEBEB", color: m.ativo ? "#085041" : "#A32D2D", fontWeight: 500}}>
                      {m.ativo ? "Ativo" : "Inativo"}
                    </span>
                    {m.ativo ? (
                      <button onClick={() => bloquearMedico(m.id)} style={{background: "#FCEBEB", color: "#A32D2D", border: "none", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", cursor: "pointer"}}>Bloquear</button>
                    ) : (
                      <button onClick={() => aprovarMedico(m.id)} style={{background: "#E1F5EE", color: "#085041", border: "none", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", cursor: "pointer"}}>Aprovar</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{background: "#fff", borderRadius: "16px", border: "0.5px solid #9FE1CB", padding: "20px"}}>
          <p style={{fontSize: "12px", fontWeight: 500, color: "#0F6E56", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "14px"}}>Fila de espera atual</p>
          {fila.length === 0 ? (
            <p style={{fontSize: "14px", color: "#B4B2A9", textAlign: "center", padding: "20px 0"}}>Nenhum paciente na fila agora.</p>
          ) : (
            <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
              {fila.map((p, i) => (
                <div key={p.id} style={{display: "flex", alignItems: "center", gap: "12px", background: "#F8FDFB", borderRadius: "10px", padding: "12px 14px", border: "0.5px solid #E1F5EE"}}>
                  <div style={{width: "28px", height: "28px", borderRadius: "50%", background: "#E1F5EE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 500, color: "#0F6E56", flexShrink: 0}}>{i + 1}</div>
                  <div style={{flex: 1}}>
                    <p style={{fontSize: "14px", fontWeight: 500, color: "#085041"}}>{p.pacientes?.nome}</p>
                    <p style={{fontSize: "12px", color: "#0F6E56"}}>{p.queixa}</p>
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