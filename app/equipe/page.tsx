"use client"
import { useState } from "react"

export default function EquipePage() {
  const [form, setForm] = useState({ crm: "", senha: "" })
  const [erro, setErro] = useState("")

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (form.crm === "123456" && form.senha === "senha123") {
      window.location.href = "/medico"
    } else {
      setErro("CRM ou senha incorretos. Verifique suas credenciais.")
    }
  }

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
            <label style={{fontSize: "12px", fontWeight: 500, color: "#0F6E56", display: "block", marginBottom: "6px"}}>
              CRM
            </label>
            <input
              required
              placeholder="Somente números"
              value={form.crm}
              onChange={e => setForm({...form, crm: e.target.value})}
              style={{width: "100%", background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", color: "#085041", outline: "none"}}
            />
          </div>

          <div>
            <label style={{fontSize: "12px", fontWeight: 500, color: "#0F6E56", display: "block", marginBottom: "6px"}}>
              Senha
            </label>
            <input
              required
              type="password"
              placeholder="••••••••"
              value={form.senha}
              onChange={e => setForm({...form, senha: e.target.value})}
              style={{width: "100%", background: "#F8FDFB", border: "0.5px solid #9FE1CB", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", color: "#085041", outline: "none"}}
            />
          </div>

          {erro && (
            <div style={{background: "#FCEBEB", border: "0.5px solid #F09595", borderRadius: "10px", padding: "10px 14px"}}>
              <p style={{fontSize: "13px", color: "#A32D2D"}}>{erro}</p>
            </div>
          )}

          <button
            type="submit"
            style={{background: "#0F6E56", color: "#fff", padding: "14px", borderRadius: "12px", fontWeight: 500, fontSize: "15px", border: "none", cursor: "pointer", marginTop: "4px"}}
          >
            Entrar
          </button>

        </form>

        <p style={{fontSize: "11px", color: "#B4B2A9", textAlign: "center", marginTop: "24px"}}>
          Problemas com o acesso? Entre em contato com a administração.
        </p>

      </div>
    </main>
  )
}