"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { Heart, Activity, Droplet, Search, LogOut, UserCircle, Moon, Sun } from 'lucide-react';
import { collection, onSnapshot, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase"; 

interface Medicao {
  id?: string; cpf: string; data: string; hora: string; hgtNumero: number | null;
  hgtTexto: string; pressao: string; oximetria: string; batimentos: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timestamp?: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label, isDarkMode }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className={`p-3 rounded-xl shadow-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-100 text-gray-800'}`}>
        <p className="font-bold mb-2 border-b border-gray-200 dark:border-gray-700 pb-1">Hora: {label}</p>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((entry: any, index: number) => {
          let status = ""; let colorBg = ""; let colorText = "";
          
          if (entry.dataKey === 'HGT') {
            if (entry.value < 70 || entry.value > 180) { status = "Alerta"; colorBg = "bg-red-100"; colorText = "text-red-700"; }
            else if (entry.value > 130) { status = "Atenção"; colorBg = "bg-amber-100"; colorText = "text-amber-700"; }
            else { status = "Normal"; colorBg = "bg-green-100"; colorText = "text-green-700"; }
          } 
          else if (entry.dataKey === 'SIS') {
            if (entry.value > 180) { status = "Crise"; colorBg = "bg-red-200"; colorText = "text-red-900"; }
            else if (entry.value >= 160) { status = "Estágio 2"; colorBg = "bg-orange-200"; colorText = "text-orange-900"; }
            else if (entry.value >= 140) { status = "Estágio 1"; colorBg = "bg-amber-200"; colorText = "text-amber-900"; }
            else if (entry.value >= 120) { status = "Pré-hipert."; colorBg = "bg-yellow-200"; colorText = "text-yellow-900"; }
            else if (entry.value < 90) { status = "Baixa"; colorBg = "bg-blue-100"; colorText = "text-blue-700"; }
            else { status = "Normal"; colorBg = "bg-green-100"; colorText = "text-green-700"; }
          } 
          else if (entry.dataKey === 'DIA') {
            if (entry.value > 110) { status = "Crise"; colorBg = "bg-red-200"; colorText = "text-red-900"; }
            else if (entry.value >= 100) { status = "Estágio 2"; colorBg = "bg-orange-200"; colorText = "text-orange-900"; }
            else if (entry.value >= 90) { status = "Estágio 1"; colorBg = "bg-amber-200"; colorText = "text-amber-900"; }
            else if (entry.value >= 80) { status = "Pré-hipert."; colorBg = "bg-yellow-200"; colorText = "text-yellow-900"; }
            else if (entry.value < 60) { status = "Baixa"; colorBg = "bg-blue-100"; colorText = "text-blue-700"; }
            else { status = "Normal"; colorBg = "bg-green-100"; colorText = "text-green-700"; }
          } 
          else if (entry.dataKey === 'SpO2') {
            if (entry.value < 90) { status = "Alerta"; colorBg = "bg-red-100"; colorText = "text-red-700"; }
            else if (entry.value < 95) { status = "Atenção"; colorBg = "bg-amber-100"; colorText = "text-amber-700"; }
            else { status = "Normal"; colorBg = "bg-green-100"; colorText = "text-green-700"; }
          } 
          else if (entry.dataKey === 'BPM') {
            if (entry.value < 50 || entry.value > 120) { status = "Alerta"; colorBg = "bg-red-100"; colorText = "text-red-700"; }
            else if (entry.value < 60 || entry.value > 100) { status = "Atenção"; colorBg = "bg-amber-100"; colorText = "text-amber-700"; }
            else { status = "Normal"; colorBg = "bg-green-100"; colorText = "text-green-700"; }
          }

          return (
            <div key={index} className="flex justify-between items-center gap-4 text-sm mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                <span className="font-medium text-gray-500 dark:text-gray-400">{entry.name}:</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{entry.value}</span>
                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md ${colorBg} ${colorText} dark:bg-opacity-20 dark:text-opacity-90`}>{status}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

// COMPONENTE QUE COLORE AS BOLINHAS DO GRÁFICO DINAMICAMENTE
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomDot = (props: any) => {
  const { cx, cy, value, dataKey, isDarkMode } = props;
  if (value === null || value === undefined) return null;

  let dotColor = "#8884d8"; 

  if (dataKey === 'HGT') {
    if (value < 70 || value > 180) dotColor = "#ef4444"; 
    else if (value > 130) dotColor = "#f59e0b"; 
    else dotColor = "#22c55e"; 
  } else if (dataKey === 'SIS') {
    if (value > 180) dotColor = "#ef4444"; 
    else if (value >= 160) dotColor = "#f97316"; 
    else if (value >= 140) dotColor = "#f59e0b"; 
    else if (value >= 120) dotColor = "#eab308"; 
    else if (value < 90) dotColor = "#3b82f6"; 
    else dotColor = "#22c55e"; 
  } else if (dataKey === 'DIA') {
    if (value > 110) dotColor = "#ef4444"; 
    else if (value >= 100) dotColor = "#f97316"; 
    else if (value >= 90) dotColor = "#f59e0b"; 
    else if (value >= 80) dotColor = "#eab308"; 
    else if (value < 60) dotColor = "#3b82f6"; 
    else dotColor = "#22c55e"; 
  } else if (dataKey === 'SpO2') {
    if (value < 90) dotColor = "#ef4444";
    else if (value < 95) dotColor = "#f59e0b";
    else dotColor = "#22c55e";
  } else if (dataKey === 'BPM') {
    if (value < 50 || value > 120) dotColor = "#ef4444";
    else if (value < 60 || value > 100) dotColor = "#f59e0b";
    else dotColor = "#22c55e";
  }

  return (
    <circle cx={cx} cy={cy} r={5} fill={dotColor} stroke={isDarkMode ? '#1f2937' : '#ffffff'} strokeWidth={1.5} />
  );
};

export default function AppFamiliar() {
  const [isMounted, setIsMounted] = useState(false);
  const [telaAtual, setTelaAtual] = useState<string>('busca');
  const [cpfBusca, setCpfBusca] = useState("");
  const [cpfAtivo, setCpfAtivo] = useState("");
  const [erroBusca, setErroBusca] = useState("");
  const [buscando, setBuscando] = useState(false);
  
  const [jaFalouBoasVindas, setJaFalouBoasVindas] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('temaEloVital') === 'escuro';
    return false;
  });

  const [fotoPerfil, setFotoPerfil] = useState("https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80");
  const [nomeUsuario, setNomeUsuario] = useState("Paciente");

  const [abaAtiva, setAbaAtiva] = useState<'painel' | 'historico'>('painel');
  const [listaMedicoes, setListaMedicoes] = useState<Medicao[]>([]);
  
  const [glicemiaAtual, setGlicemiaAtual] = useState("--");
  const [pressaoAtual, setPressaoAtual] = useState("--");
  const [oximetriaAtual, setOximetriaAtual] = useState("--");
  const [batimentosAtual, setBatimentosAtual] = useState("--");

  const emitirVozIA = useCallback((texto: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    const mensagem = new SpeechSynthesisUtterance(texto);
    mensagem.lang = 'pt-BR';
    mensagem.pitch = 1.1; 
    mensagem.rate = 1.0; 
    
    const definirVozEFalar = () => {
      const listaVozes = window.speechSynthesis.getVoices();
      const vozesPtBr = listaVozes.filter(v => v.lang.toLowerCase().replace('_', '-').includes('pt-br'));
      const vozFemininaBr = vozesPtBr.find(v => {
        const nome = v.name.toLowerCase();
        return nome.includes('luciana') || nome.includes('maria') || nome.includes('joana') || nome.includes('female') || nome.includes('google português do brasil');
      }) || vozesPtBr[0];
      
      if (vozFemininaBr) mensagem.voice = vozFemininaBr;
      window.speechSynthesis.speak(mensagem);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', definirVozEFalar, { once: true });
    } else {
      definirVozEFalar();
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
      const cpfSalvo = localStorage.getItem('familiarCpfAtivo');
      if (cpfSalvo) {
        setCpfAtivo(cpfSalvo);
        setTelaAtual('app');
      }
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    if (telaAtual === 'app' && cpfAtivo && nomeUsuario !== "Paciente" && !jaFalouBoasVindas) {
      const timer = setTimeout(() => {
        emitirVozIA(`Seja bem-vindo, familiar de ${nomeUsuario}. Aqui é o lugar onde você pode acompanhar a evolução do seu familiar!`);
        setJaFalouBoasVindas(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [telaAtual, cpfAtivo, jaFalouBoasVindas, nomeUsuario, emitirVozIA]);

  const toggleTheme = () => {
    const novoTema = !isDarkMode;
    setIsDarkMode(novoTema);
    localStorage.setItem('temaEloVital', novoTema ? 'escuro' : 'claro');
  };

  const buscarPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroBusca("");
    
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    }

    if (cpfBusca.length === 11) {
      setBuscando(true);
      try {
        const pacienteRef = doc(db, "pacientes", cpfBusca);
        const pacienteSnap = await getDoc(pacienteRef);

        if (pacienteSnap.exists()) {
          setCpfAtivo(cpfBusca);
          setTelaAtual('app');
          localStorage.setItem('familiarCpfAtivo', cpfBusca);
        } else {
          setErroBusca("Paciente não encontrado. Verifique o CPF.");
        }
      } catch {
        setErroBusca("Erro de conexão. Tente novamente.");
      } finally {
        setBuscando(false);
      }
    } else {
      setErroBusca("Digite um CPF válido com 11 números.");
    }
  };

  const sairFamiliar = () => {
    setTelaAtual('busca');
    setCpfAtivo('');
    setCpfBusca('');
    setJaFalouBoasVindas(false); 
    localStorage.removeItem('familiarCpfAtivo'); 
  };

  useEffect(() => {
    if (!cpfAtivo || telaAtual !== 'app') return;
    const unsubPerfil = onSnapshot(doc(db, "pacientes", cpfAtivo), (documento) => {
      if (documento.exists()) {
        const dados = documento.data();
        if (dados.foto) setFotoPerfil(dados.foto);
        if (dados.nome) setNomeUsuario(dados.nome);
      }
    });
    
    const q = query(collection(db, "medicoes"), where("cpf", "==", cpfAtivo));
    const unsubscribeMedicoes = onSnapshot(q, (snapshot) => {
      const dados: Medicao[] = [];
      snapshot.forEach((doc) => dados.push({ id: doc.id, ...doc.data() } as Medicao));
      dados.sort((a, b) => (a.timestamp && b.timestamp) ? a.timestamp - b.timestamp : 0);
      setListaMedicoes(dados);

      if (dados.length > 0) {
        const ultimos = dados.slice().reverse();
        const ultimaGlicemia = ultimos.find(d => d.hgtTexto !== "--"); if (ultimaGlicemia) setGlicemiaAtual(ultimaGlicemia.hgtTexto);
        const ultimaPressao = ultimos.find(d => d.pressao !== "--"); if (ultimaPressao) setPressaoAtual(ultimaPressao.pressao);
        const ultimaOxi = ultimos.find(d => d.oximetria !== "--"); if (ultimaOxi) setOximetriaAtual(ultimaOxi.oximetria);
        const ultimoBatimento = ultimos.find(d => d.batimentos !== "--"); if (ultimoBatimento) setBatimentosAtual(ultimoBatimento.batimentos);
      } else {
        setGlicemiaAtual("--"); setPressaoAtual("--"); setOximetriaAtual("--"); setBatimentosAtual("--");
      }
    });

    return () => {
      unsubPerfil();
      unsubscribeMedicoes();
    };
  }, [cpfAtivo, telaAtual]);

  const obterStatus = (tipo: string, valor: string) => {
    if (!valor || valor === "--") return null;
    
    if (tipo === "Pressao") {
      const partes = valor.split('/'); if (partes.length !== 2) return null;
      const sis = parseInt(partes[0]); const dia = parseInt(partes[1]);
      
      if (sis > 180 || dia > 110) return { texto: "Crise Hipertensiva", cor: "bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-300" };
      if (sis >= 160 || dia >= 100) return { texto: "Hipertensão Estágio 2", cor: "bg-orange-200 text-orange-900 dark:bg-orange-900/50 dark:text-orange-400" };
      if (sis >= 140 || dia >= 90) return { texto: "Hipertensão Estágio 1", cor: "bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-400" };
      if (sis >= 120 || dia >= 80) return { texto: "Pré-hipertensão", cor: "bg-yellow-200 text-yellow-900 dark:bg-yellow-900/50 dark:text-yellow-400" };
      if (sis < 90 || dia < 60) return { texto: "Baixa", cor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" };
      
      return { texto: "Normal", cor: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" };
    }
    
    if (tipo === "HGT") {
      const num = parseInt(valor);
      if (num < 70) return { texto: "Baixa", cor: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" };
      if (num <= 130) return { texto: "Normal", cor: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" };
      if (num <= 180) return { texto: "Atenção", cor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" };
      return { texto: "Alta", cor: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" };
    }
    
    if (tipo === "SpO2") {
      const num = parseInt(valor);
      if (num >= 95) return { texto: "Normal", cor: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" };
      if (num >= 90) return { texto: "Atenção", cor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" };
      return { texto: "Baixa", cor: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" };
    }
    if (tipo === "BPM") {
      const num = parseInt(valor);
      if (num >= 60 && num <= 100) return { texto: "Normal", cor: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" };
      if ((num >= 50 && num < 60) || (num > 100 && num <= 120)) return { texto: "Atenção", cor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" };
      return { texto: "Alerta", cor: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" };
    }
    return null;
  };

  const statusGlicemia = obterStatus("HGT", glicemiaAtual);
  const statusPressao = obterStatus("Pressao", pressaoAtual);
  const statusOxi = obterStatus("SpO2", oximetriaAtual);
  const statusBpm = obterStatus("BPM", batimentosAtual);

  const dadosGraficoMultiplo = listaMedicoes.map(med => {
    let sis = null; let dia = null;
    if (med.pressao && med.pressao !== "--") {
      const partes = med.pressao.split('/');
      sis = parseInt(partes[0]); dia = parseInt(partes[1]);
    }
    return {
      hora: med.hora, HGT: med.hgtNumero, SIS: sis, DIA: dia,
      SpO2: med.oximetria !== "--" ? parseInt(med.oximetria) : null,
      BPM: med.batimentos !== "--" ? parseInt(med.batimentos) : null
    };
  });

  const getAnimacao = (statusObj: { texto: string, cor: string } | null) => {
    if (!statusObj) return "";
    if (statusObj.texto === 'Alta' || statusObj.texto === 'Crise Hipertensiva' || statusObj.texto === 'Hipertensão Estágio 2' || statusObj.texto === 'Hipertensão Estágio 1' || statusObj.texto === 'Alerta') return "translate-y-[-6px]";
    if (statusObj.texto === 'Baixa') return "translate-y-[6px]";
    return ""; 
  };

  if (!isMounted) return null;

  return (
    <div className={`min-h-screen font-sans antialiased select-none [-webkit-touch-callout:none] transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-[#F8FAFC] text-gray-800'}`} onContextMenu={(e) => e.preventDefault()}>
      
      {String(telaAtual) === 'busca' && (
        <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50'}`}>
          <div className={`max-w-md w-full p-8 rounded-3xl shadow-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex flex-col items-center mb-8">
              <img src="/icon-familiar.png" alt="Logo EloVital" className="w-20 h-20 rounded-2xl mb-4 shadow-md pointer-events-none" />
              <h1 className="text-3xl font-extrabold text-teal-600 dark:text-teal-400">EloVital</h1>
              <p className="text-gray-600 dark:text-gray-400 text-center mt-2">Acompanhe a saúde de quem você ama.</p>
            </div>
            
            {erroBusca && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-4 text-sm font-bold text-center">
                {erroBusca}
              </div>
            )}

            <form onSubmit={buscarPaciente}>
              <label className="block text-sm font-bold mb-2 text-teal-600 dark:text-teal-400">CPF do Paciente</label>
              <input type="text" inputMode="numeric" pattern="[0-9]*" value={cpfBusca} onChange={e => setCpfBusca(e.target.value.replace(/\D/g, ''))} maxLength={11} placeholder="Apenas números" required className={`w-full p-4 text-lg text-center tracking-widest rounded-xl border-2 mb-4 focus:border-teal-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-teal-50/30 border-teal-100 text-gray-900'}`} />
              <button type="submit" disabled={buscando} className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-bold text-lg p-4 rounded-xl shadow-lg transition-transform active:scale-95">
                {buscando ? "Verificando..." : <><Search className="w-5 h-5" /> Acessar Prontuário</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {String(telaAtual) === 'app' && (
        <>
          <nav className={`border-b px-4 md:px-6 py-4 sticky top-0 z-30 shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-3 text-teal-700 dark:text-teal-400">
                <img src="/icon-familiar.png" alt="Logo" className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-contain shadow-sm pointer-events-none" />
                <div className="flex flex-col justify-center">
                  <span className={`text-lg md:text-xl font-extrabold tracking-tight leading-none mb-1 ${isDarkMode ? 'text-white' : 'text-teal-700'}`}>EloVital</span>
                  <span className="font-medium text-xs md:text-sm text-left flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    Acompanhando: {nomeUsuario}
                  </span>
                </div>
              </div>
              
              <div className="hidden md:flex items-center gap-8 font-medium text-sm text-gray-600 dark:text-gray-400">
                <span onClick={() => setAbaAtiva('painel')} className={`pb-1 cursor-pointer transition-colors ${abaAtiva === 'painel' ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400 font-semibold' : 'hover:text-teal-600'}`}>Painel Central</span>
                <span onClick={() => setAbaAtiva('historico')} className={`pb-1 cursor-pointer transition-colors ${abaAtiva === 'historico' ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400 font-semibold' : 'hover:text-teal-600'}`}>Histórico Clínico</span>
              </div>

              <div className="flex items-center gap-4 md:gap-5">
                <div className="hidden md:flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
                  <UserCircle className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Modo Leitura</span>
                </div>

                <button onClick={toggleTheme} className="text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400 transition relative">
                  {isDarkMode ? <Sun className="w-5 h-5 md:w-6 md:h-6 text-amber-400" /> : <Moon className="w-5 h-5 md:w-6 md:h-6" />}
                </button>

                <button onClick={sairFamiliar} className="text-gray-500 hover:text-red-500 dark:text-gray-400 transition" title="Sair">
                  <LogOut className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 md:mx-2 hidden md:block"></div>
                <img src={fotoPerfil} alt="Perfil" className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white dark:border-gray-700 shadow-md object-cover pointer-events-none" />
              </div>
            </div>
          </nav>

          <div className={`md:hidden flex border-b shadow-sm sticky top-[72px] z-20 transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <button onClick={() => setAbaAtiva('painel')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${abaAtiva === 'painel' ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50/10 dark:bg-gray-700/30' : 'border-transparent text-gray-500'}`}>Painel Central</button>
            <button onClick={() => setAbaAtiva('historico')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${abaAtiva === 'historico' ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50/10 dark:bg-gray-700/30' : 'border-transparent text-gray-500'}`}>Histórico Clínico</button>
          </div>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
            {abaAtiva === 'painel' && (
              <div className="animate-in fade-in duration-300">
                <div className="relative overflow-hidden bg-gradient-to-br from-teal-500 via-teal-600 to-teal-900 rounded-2xl md:rounded-3xl p-6 md:p-10 text-white shadow-xl mb-6 md:mb-10 border border-teal-400/20">
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 md:-mt-10 md:-mr-10 opacity-10 pointer-events-none"><Heart className="w-40 h-40 md:w-64 md:h-64" /></div>
                  <div className="relative z-10 text-center md:text-left">
                    <h1 className="text-2xl md:text-4xl font-extrabold mb-1 tracking-tight">Prontuário do Paciente</h1>
                    <p className="text-teal-50 text-sm md:text-lg max-w-lg font-medium opacity-90">Visualizando dados de {nomeUsuario.split(' ')[0]}.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8 md:mb-10">
                  <div className={`p-4 md:p-6 rounded-2xl shadow-sm border flex flex-col justify-between transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div>
                      <div className="flex justify-between items-start mb-2 md:mb-4">
                        <div className={`bg-red-50 dark:bg-red-950/30 p-2 md:p-3 rounded-xl transition-all duration-700 ease-in-out ${getAnimacao(statusGlicemia)}`}><Droplet className="w-4 h-4 md:w-6 md:h-6 text-red-500 dark:text-red-400" /></div>
                        {statusGlicemia && <span className={`px-2 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-bold whitespace-nowrap ${statusGlicemia.cor}`}>{statusGlicemia.texto}</span>}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium text-xs md:text-base mb-1 truncate">Glicemia</p>
                    </div>
                    <div className="flex items-baseline gap-1 md:gap-2 mt-1">
                      <h3 className={`text-xl md:text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{glicemiaAtual}</h3>
                      {glicemiaAtual !== "--" && <span className="text-gray-500 dark:text-gray-500 text-[10px] md:text-sm">mg/dL</span>}
                    </div>
                  </div>

                  <div className={`p-4 md:p-6 rounded-2xl shadow-sm border flex flex-col justify-between transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div>
                      <div className="flex justify-between items-start mb-2 md:mb-4">
                        <div className={`bg-emerald-50 dark:bg-emerald-950/30 p-2 md:p-3 rounded-xl transition-all duration-700 ease-in-out ${getAnimacao(statusPressao)}`}><Heart className="w-4 h-4 md:w-6 md:h-6 text-emerald-500 dark:text-emerald-400" /></div>
                        {statusPressao && <span className={`px-2 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-bold whitespace-nowrap ${statusPressao.cor}`}>{statusPressao.texto}</span>}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium text-xs md:text-base mb-1 truncate">Pressão</p>
                    </div>
                    <div className="flex items-baseline gap-1 md:gap-2 mt-1">
                      <h3 className={`text-xl md:text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{pressaoAtual}</h3>
                      {pressaoAtual !== "--" && <span className="text-gray-500 dark:text-gray-500 text-[10px] md:text-sm">mmHg</span>}
                    </div>
                  </div>

                  <div className={`p-4 md:p-6 rounded-2xl shadow-sm border flex flex-col justify-between transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div>
                      <div className="flex justify-between items-start mb-2 md:mb-4">
                        <div className={`bg-blue-50 dark:bg-blue-950/30 p-2 md:p-3 rounded-xl transition-all duration-700 ease-in-out ${getAnimacao(statusOxi)}`}><Activity className="w-4 h-4 md:w-6 md:h-6 text-blue-500 dark:text-blue-400" /></div>
                        {statusOxi && <span className={`px-2 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-bold whitespace-nowrap ${statusOxi.cor}`}>{statusOxi.texto}</span>}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium text-xs md:text-base mb-1 truncate">Oxigênio</p>
                    </div>
                    <div className="flex items-baseline gap-1 md:gap-2 mt-1">
                      <h3 className={`text-xl md:text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{oximetriaAtual}</h3>
                      {oximetriaAtual !== "--" && <span className="text-gray-500 dark:text-gray-500 text-[10px] md:text-sm">%</span>}
                    </div>
                  </div>

                  <div className={`p-4 md:p-6 rounded-2xl shadow-sm border flex flex-col justify-between transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div>
                      <div className="flex justify-between items-start mb-2 md:mb-4">
                        <div className={`bg-rose-50 dark:bg-rose-950/30 p-2 md:p-3 rounded-xl transition-all duration-700 ease-in-out ${getAnimacao(statusBpm)}`}><Activity className="w-4 h-4 md:w-6 md:h-6 text-rose-500 dark:text-rose-400" /></div>
                        {statusBpm && <span className={`px-2 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-bold whitespace-nowrap ${statusBpm.cor}`}>{statusBpm.texto}</span>}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 font-medium text-xs md:text-base mb-1 truncate">Batimentos</p>
                    </div>
                    <div className="flex items-baseline gap-1 md:gap-2 mt-1">
                      <h3 className={`text-xl md:text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{batimentosAtual}</h3>
                      {batimentosAtual !== "--" && <span className="text-gray-500 dark:text-gray-500 text-[10px] md:text-sm">BPM</span>}
                    </div>
                  </div>
                </div>

                <div className={`p-5 md:p-8 rounded-3xl shadow-sm border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                  <h2 className={`text-xl md:text-2xl font-bold mb-6 md:mb-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Gráfico Geral de Sinais Vitais</h2>
                  <div className="h-72 md:h-96 w-full pointer-events-none">
                    {dadosGraficoMultiplo.length === 0 ? (
                      <div className={`h-full flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-4 text-center ${isDarkMode ? 'text-gray-500 border-gray-700 bg-gray-900/40' : 'text-gray-400 border-gray-200'}`}>
                        <Activity className="w-10 h-10 mb-3 opacity-50" />
                        <p className="text-base font-bold">Sem dados no banco</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <LineChart data={dadosGraficoMultiplo} margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#374151" : "#E5E7EB"} />
                          <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#9CA3AF' : '#4B5563', fontSize: 12 }} dy={10} />
                          <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#9CA3AF' : '#4B5563', fontSize: 12 }} />
                          <Tooltip content={<CustomTooltip isDarkMode={isDarkMode} />} cursor={{ stroke: isDarkMode ? '#4B5563' : '#E5E7EB', strokeWidth: 2, strokeDasharray: '5 5' }} />
                          
                          {/* MARGENS DE ALERTA MÉDICO NO FAMILIAR */}
                          <ReferenceArea y1={180} fill="#EF4444" fillOpacity={0.05} />
                          <ReferenceArea y2={60} fill="#3B82F6" fillOpacity={0.05} />
                          <ReferenceLine y={180} stroke="#EF4444" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'ALERTA MÁXIMO', fill: '#EF4444', fontSize: 10, fontWeight: 'bold' }} />
                          <ReferenceLine y={60} stroke="#3B82F6" strokeDasharray="3 3" label={{ position: 'insideBottomLeft', value: 'ALERTA MÍNIMO', fill: '#3B82F6', fontSize: 10, fontWeight: 'bold' }} />

                          <Line connectNulls type="monotone" dataKey="HGT" name="Glicemia" stroke="#0D9488" strokeWidth={3} dot={(props) => <CustomDot {...props} isDarkMode={isDarkMode} />} activeDot={{ r: 7 }} />
                          <Line connectNulls type="monotone" dataKey="SIS" name="Pressão Alta" stroke="#10B981" strokeWidth={3} dot={(props) => <CustomDot {...props} isDarkMode={isDarkMode} />} activeDot={{ r: 7 }} />
                          <Line connectNulls type="monotone" dataKey="DIA" name="Pressão Baixa" stroke="#34D399" strokeWidth={3} dot={(props) => <CustomDot {...props} isDarkMode={isDarkMode} />} activeDot={{ r: 7 }} />
                          <Line connectNulls type="monotone" dataKey="SpO2" name="Oxigênio" stroke="#3B82F6" strokeWidth={3} dot={(props) => <CustomDot {...props} isDarkMode={isDarkMode} />} activeDot={{ r: 7 }} />
                          <Line connectNulls type="monotone" dataKey="BPM" name="Batimentos" stroke="#F43F5E" strokeWidth={3} dot={(props) => <CustomDot {...props} isDarkMode={isDarkMode} />} activeDot={{ r: 7 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            )}

            {abaAtiva === 'historico' && (
              <div className="animate-in fade-in duration-300">
                <div className={`p-5 md:p-8 rounded-3xl shadow-sm border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                  <h2 className={`text-xl md:text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Histórico Clínico</h2>
                  {listaMedicoes.length === 0 ? (
                    <div className={`text-center py-12 rounded-2xl border-2 border-dashed ${isDarkMode ? 'border-gray-700 text-gray-500 bg-gray-900/30' : 'border-gray-200 text-gray-500'}`}><p className="font-medium">O banco de dados está vazio.</p></div>
                  ) : (
                    <div className="overflow-x-auto -mx-5 md:mx-0">
                      <div className="inline-block min-w-full align-middle px-5 md:px-0">
                        <table className="min-w-full text-left border-collapse">
                          <thead>
                            <tr className={`border-b-2 text-xs md:text-sm uppercase tracking-wider ${isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-100 text-gray-600'}`}>
                              <th className="pb-3 px-3 font-semibold whitespace-nowrap">Data</th>
                              <th className="pb-3 px-3 font-semibold whitespace-nowrap">Hora</th>
                              <th className="pb-3 px-3 font-semibold whitespace-nowrap">HGT</th>
                              <th className="pb-3 px-3 font-semibold whitespace-nowrap">Pressão</th>
                              <th className="pb-3 px-3 font-semibold whitespace-nowrap">SpO2</th>
                              <th className="pb-3 px-3 font-semibold whitespace-nowrap">BPM</th>
                            </tr>
                          </thead>
                          <tbody>
                            {listaMedicoes.slice().reverse().map((medicao, index) => (
                              <tr key={medicao.id || index} className={`border-b transition-colors ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700/50' : 'border-gray-100 text-gray-700 hover:bg-gray-50'}`}>
                                <td className="py-3 px-3 whitespace-nowrap">{medicao.data || "--"}</td>
                                <td className="py-3 px-3 font-medium whitespace-nowrap">{medicao.hora}</td>
                                <td className="py-3 px-3 whitespace-nowrap">{medicao.hgtTexto} {medicao.hgtTexto !== "--" && <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>mg/dL</span>}</td>
                                <td className="py-3 px-3 whitespace-nowrap">{medicao.pressao}</td>
                                <td className="py-3 px-3 whitespace-nowrap">{medicao.oximetria} {medicao.oximetria !== "--" && "%"}</td>
                                <td className="py-3 px-3 whitespace-nowrap">{medicao.batimentos}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}