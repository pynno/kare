export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center" style={{background: "#F0FAF6"}}>
      <div className="text-center max-w-sm px-6">
        <div className="mb-6">
          <h1 style={{fontSize: "32px", fontWeight: 500, color: "#085041", letterSpacing: "-0.5px"}}>
            Kare <span style={{color: "#1D9E75", fontWeight: 400, fontSize: "24px"}}>saúde</span>
          </h1>
        </div>
        <h2 style={{fontSize: "22px", fontWeight: 500, color: "#085041", lineHeight: 1.3}}>
          Médico agora,<br/>sem espera
        </h2>
        <p style={{fontSize: "14px", color: "#0F6E56", marginTop: "8px"}}>
          Consulta online em minutos, de onde você estiver.
        </p>
        <div style={{display: "inline-flex", alignItems: "center", gap: "6px", background: "#fff", border: "0.5px solid #9FE1CB", borderRadius: "20px", padding: "4px 12px", fontSize: "12px", color: "#0F6E56", marginTop: "12px"}}>
          <div style={{width: "6px", height: "6px", borderRadius: "50%", background: "#1D9E75"}}/>
          Médicos disponíveis agora
        </div>
        <a href="/paciente" style={{display: "block", background: "#0F6E56", color: "#fff", padding: "14px", borderRadius: "12px", fontWeight: 500, fontSize: "16px", marginTop: "28px", textDecoration: "none"}}>
          Iniciar consulta
        </a>
        <div style={{marginTop: "32px"}}>
          <div style={{background: "#fff", border: "0.5px solid #9FE1CB", borderRadius: "12px", padding: "14px", marginBottom: "8px", textAlign: "left"}}>
            <p style={{fontWeight: 500, color: "#085041", fontSize: "14px"}}>1. Cadastre-se</p>
            <p style={{fontSize: "12px", color: "#0F6E56", marginTop: "3px"}}>Nome, CPF e queixa em 30 segundos</p>
          </div>
          <div style={{background: "#fff", border: "0.5px solid #9FE1CB", borderRadius: "12px", padding: "14px", marginBottom: "8px", textAlign: "left"}}>
            <p style={{fontWeight: 500, color: "#085041", fontSize: "14px"}}>2. Aguarde na fila</p>
            <p style={{fontSize: "12px", color: "#0F6E56", marginTop: "3px"}}>Veja sua posição e tempo estimado</p>
          </div>
          <div style={{background: "#fff", border: "0.5px solid #9FE1CB", borderRadius: "12px", padding: "14px", textAlign: "left"}}>
            <p style={{fontWeight: 500, color: "#085041", fontSize: "14px"}}>3. Consulte</p>
            <p style={{fontSize: "12px", color: "#0F6E56", marginTop: "3px"}}>Videochamada com médico qualificado</p>
          </div>
        </div>
        <p style={{fontSize: "11px", color: "#B4B2A9", marginTop: "24px"}}>
          Profissional de saúde?{" "}
          <a href="/medico" style={{color: "#5DCAA5", textDecoration: "none"}}>Acesse aqui</a>
        </p>
      </div>
    </main>
  )
}