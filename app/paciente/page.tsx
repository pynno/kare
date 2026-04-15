"use client"
import { useState, useEffect, useRef } from "react"
import { supabase } from "../lib/supabase"

type Etapa = "login" | "cadastro" | "queixa" | "fila" | "chamado" | "concluido" | "nao_compareceu" | "problemas_tecnicos"

export default function PacientePage() {
  const [etapa, setEtapa] = useState<Etapa>("login")
  const [form, setForm] = useState({ nome: "", cpf: "", email: "", celular: "", dataNascimento: "", genero: "", senha: "", confirmarSenha: "" })
  const [queixa, setQueixa] = useState("")
  const [paciente, setPaciente] = useState<any>(null)
  const [posicao, setPosicao] = useState(0)
  const [tempo, setTempo] = useState(0)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")
  const [linkConsulta, setLinkConsulta] = useState("")
  const filaIdRef = useRef<string>("")
  const [loginForm, setLoginForm] = useState({ cpf: "", senha: "" })

  useEffect(() => {
    const sessao = localStorage.getItem("kare_sessao")
    if (!sessao) return
    const dados = JSON.parse(sessao)
    filaIdRef.current = dados.filaId
    setPaciente(dados.paciente)
    setQueixa(dados.queixa)
    supabase
      .from("fila")
      .select("status, posicao, link_meet")
      .eq("id", dados.filaId)
      .single()
      .then(({ data }) => {
        if (!data) { localStorage.removeItem("kare_sessao"); return }
        if (data.status === "concluido") { setEtapa("concluido"); localStorage.removeItem("kare_sessao") }
        else if (data.status === "nao_compareceu") { setEtapa("nao_compareceu"); localStorage.removeItem("kare_sessao") }
        else if (data.status === "em_atendimento" && data.link_meet) { setLinkConsulta(data.link_meet); setEtapa("chamado") }
        else if (data.status === "aguardando") { setPosicao(data.posicao); setTempo(data.posicao * 8); setEtapa("fila") }
      })
  }, [])

  useEffect(() => {
    if (etapa !== "fila" && etapa !== "chamado") return
    const interval = setInterval(async () => {
      if (!filaIdRef.current) return
      const { data } = await supabase.from("fila").select("status, posicao, link_meet").eq("id", filaIdRef.current).single()
      if (!data) return
      if (data.status === "em_atendimento" && data.link_meet) { setLinkConsulta(data.link_meet); setEtapa("chamado"); return }
      if (data.status === "concluido") { setEtapa("concluido"); localStorage.removeItem("kare_sessao"); clearInterval(interval); return }
      if (data.status === "nao_compareceu") { setEtapa("nao_compareceu"); localStorage.removeItem("kare_sessao"); clearInterval(interval); return }
      if (data.status === "aguardando") {
        if (etapa === "chamado") { setEtapa("problemas_tecnicos"); clearInterval(interval); return }
        const { data: filaPaciente } = await supabase.from("fila").select("entrou_em").eq("id", filaIdRef.current).single()
        if (filaPaciente) {
          const { count } = await supabase.from("fila").select("*", { count: "exact", head: true }).eq("status", "aguardando").lt("entrou_em", filaPaciente.entrou_em)
          setPosicao((count || 0) + 1)
          setTempo(((count || 0) + 1) * 8)
        }
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [etapa])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro("")
    try {
      const { data: pacienteData } = await supabase.from("pacientes").select("*").eq("cpf", loginForm.cpf).single()
      if (!pacienteData) { setErro("CPF não encontrado. Faça seu cadastro."); setLoading(false); return }
      const bcrypt = await import("bcryptjs")
      const senhaCorreta = await bcrypt.compare(loginForm.senha, pacienteData.senha || "")
      if (!senhaCorreta) { setErro("Senha incorreta."); setLoading(false); return }
      setPaciente(pacienteData)
      setEtapa("queixa")
    } catch {
      setErro("Erro ao fazer login. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro("")
    if (form.senha !== form.confirmarSenha) { setErro("As senhas não coincidem."); setLoading(false); return }
    if (form.senha.length < 6) { setErro("A senha deve ter pelo menos 6 caracteres."); setLoading(false); return }
    try {
      const { data: existe } = await supabase.from("pacientes").select("id").eq("cpf", form.cpf).single()
      if (existe) { setErro("CPF já cadastrado. Faça login."); setLoading(false); return }
      const bcrypt = await import("bcryptjs")
      const senhaHash = await bcrypt.hash(form.senha, 10)
      const { data: novoPaciente, error } = await supabase.from("pacientes").insert({
        nome: form.nome,
        cpf: form.cpf,
        email: form.email,
        celular: form.celular,
        data_nascimento: form.dataNascimento || null,
        genero: form.genero || null,
        senha: senhaHash,
      }).select("*").single()
      if (error) throw error
      setPaciente(novoPaciente)
      setEtapa("queixa")
    } catch {
      setErro("Erro ao cadastrar. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  async function handleEntrarNaFila(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro("")
    try {
      const { count } = await supabase.from("fila").select("*", { count: "exact", head: true }).eq("status", "aguardando")
      const posicaoNaFila = (count || 0) + 1
      const { data: filaData, error: erroFila } = await supabase.from("fila").insert({
        paciente_id: paciente.id,
        queixa,
        posicao: posicaoNaFila,
        status: "aguardando"
      }).select("id").single()
      if (erroFila) throw erroFila
      filaIdRef.current = filaData.id
      localStorage.setItem("kare_sessao", JSON.stringify({ filaId: filaData.id, paciente, queixa }))
      setPosicao(posicaoNaFila)
      setTempo(posicaoNaFila * 8)
      setEtapa("fila")
    } catch {
      setErro("Erro ao entrar na fila. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  function limparSessao() {
    localStorage.removeItem("kare_sessao")
    filaIdRef.current = ""
    setQueixa("")
    setEtapa("queixa")
  }

  const inputStyle = { width: "100%", background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", color: "#085041", outline: "none" }
  const labelStyle = { fontSize: "12px", fontWeight: 500, color: "#0F6E56", display: "block", marginBottom: "6px" } as const

  const logo = (
    <h1 style={{fontSize: "24px", fontWeight: 500, color: "#085041", marginBottom: "24px", textAlign: "center"}}>
      Kare <span style={{color: "#1D9E75", fontWeight: 400, fontSize: "18px"}}>saúde</span>
    </h1>
  )

  const card = (children: React.ReactNode, large = false) => (
    <main className="min-h-screen flex items-center justify-center" style={{background: "#F0FAF6", padding: "24px 0"}}>
      <div style={{background: "#fff", borderRadius: "20px", border: "0.5px solid #9FE1CB", padding: "32px 28px", width: "100%", maxWidth: large ? "480px" : "400px", margin: "0 16px"}}>
        {children}
      </div>
    </main>
  )

  // TELA: CONCLUIDO
  if (etapa === "concluido") return card(
    <>
      {logo}
      <div style={{background: "#E1F5EE", borderRadius: "16px", padding: "28px", textAlign: "center", marginBottom: "20px"}}>
        <div style={{width: "48px", height: "4px", background: "#0F6E56", borderRadius: "2px", margin: "0 auto 20px"}}/>
        <h2 style={{fontSize: "20px", fontWeight: 500, color: "#085041"}}>Consulta encerrada</h2>
        <p style={{fontSize: "14px", color: "#0F6E56", marginTop: "8px", lineHeight: 1.6}}>Obrigado por usar a Kare Saúde. Esperamos que tenha sido bem atendido.</p>
      </div>
      <div style={{background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "12px", padding: "16px", marginBottom: "20px"}}>
        <p style={{fontSize: "13px", fontWeight: 500, color: "#085041", marginBottom: "6px"}}>Documentos</p>
        <p style={{fontSize: "12px", color: "#0F6E56", lineHeight: 1.6}}>Receitas e atestados serão enviados para <strong>{paciente?.email}</strong> em instantes.</p>
      </div>
      <button onClick={limparSessao} style={{width: "100%", background: "#0F6E56", color: "#fff", padding: "14px", borderRadius: "12px", fontWeight: 500, fontSize: "15px", border: "none", cursor: "pointer"}}>Nova consulta</button>
      <p style={{fontSize: "11px", color: "#B4B2A9", textAlign: "center", marginTop: "16px"}}>Em caso de dúvidas: contato@karesaude.com.br</p>
    </>
  )

  // TELA: NAO COMPARECEU
  if (etapa === "nao_compareceu") return card(
    <>
      {logo}
      <div style={{background: "#FAEEDA", border: "0.5px solid #EF9F27", borderRadius: "16px", padding: "28px", textAlign: "center", marginBottom: "20px"}}>
        <div style={{width: "48px", height: "4px", background: "#854F0B", borderRadius: "2px", margin: "0 auto 20px"}}/>
        <h2 style={{fontSize: "20px", fontWeight: 500, color: "#633806"}}>Você perdeu sua vez</h2>
        <p style={{fontSize: "14px", color: "#854F0B", marginTop: "8px", lineHeight: 1.6}}>O médico aguardou mas você não compareceu a tempo.</p>
      </div>
      <button onClick={limparSessao} style={{width: "100%", background: "#0F6E56", color: "#fff", padding: "14px", borderRadius: "12px", fontWeight: 500, fontSize: "15px", border: "none", cursor: "pointer"}}>Entrar na fila novamente</button>
    </>
  )

  // TELA: PROBLEMAS TECNICOS
  if (etapa === "problemas_tecnicos") return card(
    <>
      {logo}
      <div style={{background: "#FCEBEB", border: "0.5px solid #F09595", borderRadius: "16px", padding: "28px", textAlign: "center", marginBottom: "20px"}}>
        <div style={{width: "48px", height: "4px", background: "#A32D2D", borderRadius: "2px", margin: "0 auto 20px"}}/>
        <h2 style={{fontSize: "20px", fontWeight: 500, color: "#791F1F"}}>Problema técnico</h2>
        <p style={{fontSize: "14px", color: "#A32D2D", marginTop: "8px", lineHeight: 1.6}}>Houve um problema durante sua consulta. Pedimos desculpas.</p>
      </div>
      <button onClick={() => setEtapa("fila")} style={{width: "100%", background: "#0F6E56", color: "#fff", padding: "14px", borderRadius: "12px", fontWeight: 500, fontSize: "15px", border: "none", cursor: "pointer"}}>Voltar para a fila</button>
    </>
  )

  // TELA: CHAMADO
  if (etapa === "chamado") return card(
    <>
      {logo}
      <div style={{background: "#E1F5EE", borderRadius: "16px", padding: "32px 28px", marginBottom: "24px", textAlign: "center"}}>
        <div style={{width: "48px", height: "4px", background: "#0F6E56", borderRadius: "2px", margin: "0 auto 20px"}}/>
        <h2 style={{fontSize: "22px", fontWeight: 500, color: "#085041"}}>É a sua vez</h2>
        <p style={{fontSize: "14px", color: "#0F6E56", marginTop: "8px", lineHeight: 1.6}}>O médico está pronto para te atender.</p>
      </div>
      <button onClick={() => window.open(linkConsulta)} style={{width: "100%", background: "#0F6E56", color: "#fff", padding: "16px", borderRadius: "12px", fontWeight: 500, fontSize: "16px", border: "none", cursor: "pointer", marginBottom: "12px"}}>Entrar na consulta</button>
      <p style={{fontSize: "11px", color: "#B4B2A9", textAlign: "center"}}>A videochamada abrirá em uma nova aba.</p>
    </>
  )

  // TELA: FILA
  if (etapa === "fila") return card(
    <>
      <div style={{textAlign: "center", marginBottom: "20px"}}>
        <h1 style={{fontSize: "24px", fontWeight: 500, color: "#085041"}}>Kare <span style={{color: "#1D9E75", fontWeight: 400, fontSize: "18px"}}>saúde</span></h1>
      </div>
      <div style={{background: "#E1F5EE", borderRadius: "16px", padding: "28px", textAlign: "center", marginBottom: "16px"}}>
        <p style={{fontSize: "12px", fontWeight: 500, color: "#0F6E56", textTransform: "uppercase", letterSpacing: "0.8px"}}>Sua posição na fila</p>
        <div style={{fontSize: "72px", fontWeight: 500, color: "#085041", lineHeight: 1.1, margin: "8px 0"}}>{posicao}</div>
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
            <p style={{fontSize: "14px", fontWeight: 500, color: "#085041"}}>{paciente?.nome?.split(" ")[0]}</p>
          </div>
        </div>
      </div>
      <div style={{background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "12px", padding: "14px", marginBottom: "20px"}}>
        <p style={{fontSize: "11px", color: "#0F6E56", fontWeight: 500, marginBottom: "6px"}}>Queixa registrada</p>
        <p style={{fontSize: "13px", color: "#085041"}}>{queixa}</p>
      </div>
      <p style={{fontSize: "11px", color: "#B4B2A9", textAlign: "center"}}>Não feche essa aba. Você será avisado quando for sua vez.</p>
    </>
  )

  // TELA: QUEIXA
  if (etapa === "queixa") return card(
    <>
      {logo}
      <p style={{fontSize: "14px", color: "#0F6E56", marginBottom: "20px", textAlign: "center"}}>Olá, <strong>{paciente?.nome?.split(" ")[0]}</strong>! Qual é sua queixa hoje?</p>
      <form onSubmit={handleEntrarNaFila} style={{display: "flex", flexDirection: "column", gap: "16px"}}>
        <div>
          <label style={labelStyle}>Queixa principal</label>
          <textarea required placeholder="Descreva brevemente o motivo da consulta..." rows={4} value={queixa} onChange={e => setQueixa(e.target.value)} style={{...inputStyle, resize: "none"}} />
        </div>
        {erro && <div style={{background: "#FCEBEB", border: "0.5px solid #F09595", borderRadius: "10px", padding: "10px 14px"}}><p style={{fontSize: "13px", color: "#A32D2D"}}>{erro}</p></div>}
        <button type="submit" disabled={loading} style={{background: loading ? "#B4B2A9" : "#0F6E56", color: "#fff", padding: "14px", borderRadius: "12px", fontWeight: 500, fontSize: "15px", border: "none", cursor: loading ? "not-allowed" : "pointer"}}>
          {loading ? "Entrando na fila..." : "Entrar na fila"}
        </button>
      </form>
      <button onClick={() => { localStorage.removeItem("kare_paciente"); setPaciente(null); setEtapa("login") }} style={{width: "100%", background: "transparent", color: "#B4B2A9", border: "none", fontSize: "12px", cursor: "pointer", marginTop: "16px"}}>
        Sair da conta
      </button>
    </>
  )

  // TELA: CADASTRO
  if (etapa === "cadastro") return card(
    <>
      {logo}
      <p style={{fontSize: "13px", color: "#0F6E56", marginBottom: "20px", textAlign: "center"}}>Crie sua conta Kare Saúde</p>
      <form onSubmit={handleCadastro} style={{display: "flex", flexDirection: "column", gap: "14px"}}>
        <div>
          <label style={labelStyle}>Nome completo</label>
          <input required placeholder="Seu nome completo" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>CPF</label>
          <input required placeholder="000.000.000-00" value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>E-mail</label>
          <input required type="email" placeholder="seu@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Celular</label>
          <input required placeholder="(11) 99999-9999" value={form.celular} onChange={e => setForm({...form, celular: e.target.value})} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Data de nascimento</label>
          <input required type="date" value={form.dataNascimento} onChange={e => setForm({...form, dataNascimento: e.target.value})} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Gênero</label>
          <select value={form.genero} onChange={e => setForm({...form, genero: e.target.value})} style={{...inputStyle, cursor: "pointer"}}>
            <option value="">Selecione</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
            <option value="nao_binario">Não-binário</option>
            <option value="prefiro_nao_informar">Prefiro não informar</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Senha</label>
          <input required type="password" placeholder="Mínimo 6 caracteres" value={form.senha} onChange={e => setForm({...form, senha: e.target.value})} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Confirmar senha</label>
          <input required type="password" placeholder="Digite a senha novamente" value={form.confirmarSenha} onChange={e => setForm({...form, confirmarSenha: e.target.value})} style={inputStyle} />
        </div>
        {erro && <div style={{background: "#FCEBEB", border: "0.5px solid #F09595", borderRadius: "10px", padding: "10px 14px"}}><p style={{fontSize: "13px", color: "#A32D2D"}}>{erro}</p></div>}
        <button type="submit" disabled={loading} style={{background: loading ? "#B4B2A9" : "#0F6E56", color: "#fff", padding: "14px", borderRadius: "12px", fontWeight: 500, fontSize: "15px", border: "none", cursor: loading ? "not-allowed" : "pointer", marginTop: "4px"}}>
          {loading ? "Criando conta..." : "Criar conta"}
        </button>
      </form>
      <p style={{fontSize: "12px", color: "#B4B2A9", textAlign: "center", marginTop: "16px"}}>
        Já tem conta?{" "}
        <button onClick={() => { setEtapa("login"); setErro("") }} style={{background: "none", border: "none", color: "#0F6E56", fontSize: "12px", cursor: "pointer", fontWeight: 500}}>Fazer login</button>
      </p>
      <p style={{fontSize: "11px", color: "#B4B2A9", textAlign: "center", marginTop: "8px"}}>
        Ao continuar você aceita nossos <a href="#" style={{color: "#5DCAA5", textDecoration: "none"}}>termos de uso</a> e <a href="#" style={{color: "#5DCAA5", textDecoration: "none"}}>política de privacidade</a>
      </p>
    </>, true
  )

  // TELA: LOGIN
  return card(
    <>
      {logo}
      <p style={{fontSize: "13px", color: "#0F6E56", marginBottom: "20px", textAlign: "center"}}>Entre na sua conta para iniciar uma consulta</p>
      <form onSubmit={handleLogin} style={{display: "flex", flexDirection: "column", gap: "16px"}}>
        <div>
          <label style={labelStyle}>CPF</label>
          <input required placeholder="000.000.000-00" value={loginForm.cpf} onChange={e => setLoginForm({...loginForm, cpf: e.target.value})} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Senha</label>
          <input required type="password" placeholder="••••••••" value={loginForm.senha} onChange={e => setLoginForm({...loginForm, senha: e.target.value})} style={inputStyle} />
        </div>
        {erro && <div style={{background: "#FCEBEB", border: "0.5px solid #F09595", borderRadius: "10px", padding: "10px 14px"}}><p style={{fontSize: "13px", color: "#A32D2D"}}>{erro}</p></div>}
        <button type="submit" disabled={loading} style={{background: loading ? "#B4B2A9" : "#0F6E56", color: "#fff", padding: "14px", borderRadius: "12px", fontWeight: 500, fontSize: "15px", border: "none", cursor: loading ? "not-allowed" : "pointer"}}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <p style={{fontSize: "12px", color: "#B4B2A9", textAlign: "center", marginTop: "16px"}}>
        Primeira vez aqui?{" "}
        <button onClick={() => { setEtapa("cadastro"); setErro("") }} style={{background: "none", border: "none", color: "#0F6E56", fontSize: "12px", cursor: "pointer", fontWeight: 500}}>Criar conta</button>
      </p>
    </>
  )
}