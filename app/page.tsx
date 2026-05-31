"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Heart, Activity, Droplet, PlusCircle, X, Bell, Camera, AlertCircle, Edit2, Moon, Sun, CheckCircle, LogOut, UserCircle } from 'lucide-react';

import { collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, setDoc, getDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, User } from "firebase/auth";
import { db, auth } from "./firebase"; 

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
          } else if (entry.dataKey === 'SIS') {
            if (entry.value < 90) { status = "Alerta"; colorBg = "bg-red-100"; colorText = "text-red-700"; }
            else if (entry.value >= 140) { status = "Alerta"; colorBg = "bg-red-100"; colorText = "text-red-700"; }
            else if (entry.value >= 130) { status = "Atenção"; colorBg = "bg-amber-100"; colorText = "text-amber-700"; }
            else { status = "Normal"; colorBg = "bg-green-100"; colorText = "text-green-700"; }
          } else if (entry.dataKey === 'DIA') {
            if (entry.value < 60) { status = "Alerta"; colorBg = "bg-red-100"; colorText = "text-red-700"; }
            else if (entry.value >= 90) { status = "Alerta"; colorBg = "bg-red-100"; colorText = "text-red-700"; }
            else if (entry.value >= 85) { status = "Atenção"; colorBg = "bg-amber-100"; colorText = "text-amber-700"; }
            else { status = "Normal"; colorBg = "bg-green-100"; colorText = "text-green-700"; }
          } else if (entry.dataKey === 'SpO2') {
            if (entry.value < 90) { status = "Alerta"; colorBg = "bg-red-100"; colorText = "text-red-700"; }
            else if (entry.value < 95) { status = "Atenção"; colorBg = "bg-amber-100"; colorText = "text-amber-700"; }
            else { status = "Normal"; colorBg = "bg-green-100"; colorText = "text-green-700"; }
          } else if (entry.dataKey === 'BPM') {
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

export default function AppIdoso() {
  const [isMounted, setIsMounted] = useState(false);
  const [telaAtual, setTelaAtual] = useState<string>('carregando');
  const [usuario, setUsuario] = useState<User | null>(null);
  const [cpfAtivo, setCpfAtivo] = useState<string>(""); 
  
  const [isLoginModo, setIsLoginModo] = useState(true);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [cpfRegistro, setCpfRegistro] = useState(""); 
  const [nomeRegistro, setNomeRegistro] = useState(""); 
  const [erroAuth, setErroAuth] = useState(""); 
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('temaEloVital') === 'escuro';
    return false;
  });
  const [showToast, setShowToast] = useState(false);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);
  const [jaFalouBoasVindas, setJaFalouBoasVindas] = useState(false);

  const [fotoPerfil, setFotoPerfil] = useState("https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80");
  const [nomeUsuario, setNomeUsuario] = useState("Paciente");

  const [abaAtiva, setAbaAtiva] = useState<'painel' | 'historico'>('painel');
  const [listaMedicoes, setListaMedicoes] = useState<Medicao[]>([]);
  
  const [glicemiaAtual, setGlicemiaAtual] = useState("--");
  const [pressaoAtual, setPressaoAtual] = useState("--");
  const [oximetriaAtual, setOximetriaAtual] = useState("--");
  const [batimentosAtual, setBatimentosAtual] = useState("--");

  const [modalAberto, setModalAberto] = useState(false);
  const [formHGT, setFormHGT] = useState("");
  const [formPressaoSis, setFormPressaoSis] = useState(""); 
  const [formPressaoDia, setFormPressaoDia] = useState(""); 
  const [formOxi, setFormOxi] = useState("");
  const [formBpm, setFormBpm] = useState("");

  const inputFotoRef = useRef<HTMLInputElement>(null);

  const obterStatus = (tipo: string, valor: string) => {
    if (!valor || valor === "--") return null;
    if (tipo === "HGT") {
      const num = parseInt(valor);
      if (num < 70) return { texto: "Baixa", cor: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" };
      if (num <= 130) return { texto: "Normal", cor: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" };
      if (num <= 180) return { texto: "Atenção", cor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" };
      return { texto: "Alta", cor: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" };
    }
    if (tipo === "Pressao") {
      const partes = valor.split('/'); if (partes.length !== 2) return null;
      const sis = parseInt(partes[0]); const dia = parseInt(partes[1]);
      
      if (sis < 90 || dia < 60) return { texto: "Baixa", cor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" };
      if (sis >= 140 || dia >= 90) return { texto: "Alta", cor: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" };
      if (sis >= 130 || dia >= 85) return { texto: "Atenção", cor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" };
      return { texto: "Normal", cor: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" };
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

  const getAnimacao = (statusObj: { texto: string, cor: string } | null) => {
    if (!statusObj) return "";
    if (statusObj.texto === 'Alta' || statusObj.texto === 'Alerta') return "translate-y-[-6px]";
    if (statusObj.texto === 'Baixa') return "translate-y-[6px]";
    return ""; 
  };

  // IA DE VOZ CONFIGURADA
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

  // LÓGICA DE FALA CIRÚRGICA (SÓ FALA O QUE FOI PREENCHIDO)
  const falarResumoSaude = (hgt: string, pressaoFinal: string, oxi: string, bpm: string) => {
    let textoResumo = "Medição salva com sucesso. ";
    
    if (hgt && hgt !== "") {
      const st = obterStatus("HGT", hgt)?.texto;
      if (st === "Alta" || st === "Alerta") textoResumo += "Sua glicemia está alta, beba bastante água. ";
      else if (st === "Baixa") textoResumo += "Sua glicemia está baixa, procure comer algo doce. ";
      else if (st === "Atenção") textoResumo += "Sua glicemia está um pouco acima do ideal, requer atenção. ";
      else if (st === "Normal") textoResumo += "Sua glicemia está normal. Muito bem! ";
    }
    
    if (pressaoFinal && pressaoFinal !== "--" && pressaoFinal !== "/") {
      const st = obterStatus("Pressao", pressaoFinal)?.texto; 
      if (st === "Alta") textoResumo += "Sua pressão arterial está alta, procure repousar. ";
      else if (st === "Baixa") textoResumo += "Sua pressão arterial está baixa, levante-se devagar. ";
      else if (st === "Atenção") textoResumo += "Sua pressão arterial requer atenção. ";
      else if (st === "Normal") textoResumo += "Sua pressão arterial está excelente. ";
    }
    
    if (oxi && oxi !== "") {
      const st = obterStatus("SpO2", oxi)?.texto;
      if (st === "Baixa" || st === "Alerta") textoResumo += "Sua oxigenação está baixa, respire fundo algumas vezes. ";
      else if (st === "Atenção") textoResumo += "Sua oxigenação requer atenção. ";
      else if (st === "Normal") textoResumo += "Sua oxigenação está ótima. ";
    }
    
    if (bpm && bpm !== "") {
      const st = obterStatus("BPM", bpm)?.texto;
      if (st === "Atenção" || st === "Alerta") textoResumo += "Seus batimentos cardíacos requerem atenção. ";
      else if (st === "Normal") textoResumo += "Seus batimentos estão no ritmo certo. ";
    }

    emitirVozIA(textoResumo);
  };

  const sair = useCallback(() => {
    signOut(auth);
    setUsuario(null);
    setCpfAtivo("");
    setErroAuth("");
    setMostrarNotificacoes(false);
    setJaFalouBoasVindas(false);
    setTelaAtual('auth');
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (telaAtual === 'app') {
      window.history.pushState(null, '', window.location.href);
      window.onpopstate = function () { 
        window.history.pushState(null, '', window.location.href); 
      };
    }
  }, [telaAtual]);

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // BOAS VINDAS COM NOME COMPLETO
  useEffect(() => {
    if (telaAtual === 'app' && cpfAtivo && nomeUsuario !== "Paciente" && !jaFalouBoasVindas) {
      const timer = setTimeout(() => {
        const horaAtual = new Date().getHours();
        let saudacaoPeriodo = "Bom dia";
        if (horaAtual >= 12 && horaAtual < 18) saudacaoPeriodo = "Boa tarde";
        else if (horaAtual >= 18 || horaAtual < 5) saudacaoPeriodo = "Boa noite";
        
        // Agora lê a variável inteira com o nome completo
        const nomeCompleto = nomeUsuario;
        emitirVozIA(`${saudacaoPeriodo}, ${nomeCompleto}. Tudo bem com você?`);
        
        setJaFalouBoasVindas(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [telaAtual, cpfAtivo, jaFalouBoasVindas, nomeUsuario, emitirVozIA]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setErroAuth("");
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "usuarios_permissoes", user.uid));
          if (!userDoc.exists()) {
            sair(); 
          } else {
            setUsuario(user);
            const dados = userDoc.data();
            
            if (dados.role === 'idoso') {
              const pacSnap = await getDoc(doc(db, "pacientes", dados.cpf));
              if (pacSnap.exists()) {
                setCpfAtivo(dados.cpf);
                setTelaAtual('app');
              } else {
                setErroAuth("Cliente não Cadastrado no sistema.");
                await signOut(auth);
                setTelaAtual('auth');
              }
            } else {
                sair(); 
            }
          }
        } catch {
          await signOut(auth);
          setTelaAtual('auth');
        }
      } else {
        setUsuario(null);
        setTelaAtual('auth');
      }
    });
    return () => unsubscribe();
  }, [sair]);

  const fazerLoginPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroAuth("");
    
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    }

    try {
      await signInWithEmailAndPassword(auth, email, senha);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err?.code === 'auth/invalid-credential') setErroAuth("E-mail ou senha incorretos.");
      else if (err?.code === 'auth/too-many-requests') setErroAuth("Muitas tentativas falhas. Aguarde um momento.");
      else setErroAuth("Erro ao entrar. Verifique os seus dados.");
    }
  };

  const criarContaPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroAuth("");
    
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    }

    if (!nomeRegistro || nomeRegistro.trim().length < 2) { setErroAuth("Por favor, introduza um nome válido."); return; }
    if (cpfRegistro.length < 11) { setErroAuth("Introduza um CPF com 11 números."); return; }
    if (senha.length < 6) { setErroAuth("A senha deve ter no mínimo 6 caracteres."); return; }
    
    try {
      const credencial = await createUserWithEmailAndPassword(auth, email, senha);
      await setDoc(doc(db, "usuarios_permissoes", credencial.user.uid), { role: 'idoso', email: email, cpf: cpfRegistro });
      await setDoc(doc(db, "pacientes", cpfRegistro), {
        nome: nomeRegistro.trim(),
        foto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') setErroAuth("Este e-mail já se encontra registado.");
      else setErroAuth("Erro ao criar conta. Verifique a sua ligação.");
    }
  };

  const toggleTheme = () => {
    const novoTema = !isDarkMode;
    setIsDarkMode(novoTema);
    localStorage.setItem('temaEloVital', novoTema ? 'escuro' : 'claro');
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
    return () => unsubPerfil();
  }, [cpfAtivo, telaAtual]);

  const trocarFoto = (evento: React.ChangeEvent<HTMLInputElement>) => {
    if (evento.target.files && evento.target.files[0]) {
      const file = evento.target.files[0];
      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400; 
        let width = img.width; let height = img.height;
        if (width > MAX_WIDTH) { height = height * (MAX_WIDTH / width); width = MAX_WIDTH; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const base64String = canvas.toDataURL('image/jpeg', 0.7);
        setFotoPerfil(base64String);
        try { await setDoc(doc(db, "pacientes", cpfAtivo), { foto: base64String }, { merge: true }); } catch { /* erro silencioso */ }
      };
    }
  };

  const editarNome = async () => {
    const novoNome = prompt("Introduza o seu nome:", nomeUsuario !== "Paciente" ? nomeUsuario : "");
    if (novoNome && novoNome.trim() !== "") {
      setNomeUsuario(novoNome);
      await setDoc(doc(db, "pacientes", cpfAtivo), { nome: novoNome }, { merge: true });
    }
  };

  useEffect(() => {
    if (!cpfAtivo || telaAtual !== 'app') return;
    const q = query(collection(db, "medicoes"), where("cpf", "==", cpfAtivo));
    const unsubscribe = onSnapshot(q, (snapshot) => {
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
    return () => unsubscribe();
  }, [cpfAtivo, telaAtual]);

  const salvarMedicoes = async () => {
    if (!formHGT && !formPressaoSis && !formPressaoDia && !formOxi && !formBpm) { setModalAberto(false); return; }
    const dataExExata = new Date().toLocaleDateString('pt-BR');
    const horaExExata = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    let pressaoFinal = "--";
    if (formPressaoSis && formPressaoDia) pressaoFinal = `${formPressaoSis}/${formPressaoDia}`;

    const novoRegistro = {
      cpf: cpfAtivo, data: dataExExata, hora: horaExExata, hgtNumero: formHGT ? parseInt(formHGT) : null,
      hgtTexto: formHGT || "--", pressao: pressaoFinal, oximetria: formOxi || "--", batimentos: formBpm || "--",
      timestamp: serverTimestamp(), autor: usuario?.email || 'Paciente'
    };

    try {
      await addDoc(collection(db, "medicoes"), novoRegistro);
      falarResumoSaude(formHGT, pressaoFinal, formOxi, formBpm); 
      
      setFormHGT(""); setFormPressaoSis(""); setFormPressaoDia(""); setFormOxi(""); setFormBpm("");
      setModalAberto(false);
      setShowToast(true); setTimeout(() => setShowToast(false), 4000);
    } catch { alert("Erro ao guardar medição."); }
  };

  const statusGlicemia = obterStatus("HGT", glicemiaAtual);
  const statusPressao = obterStatus("Pressao", pressaoAtual);
  const statusOxi = obterStatus("SpO2", oximetriaAtual);
  const statusBpm = obterStatus("BPM", batimentosAtual);
  const precisaLembrete = listaMedicoes.length === 0;

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

  const notificacoes = [];
  if (precisaLembrete && cpfAtivo && telaAtual === 'app') {
    notificacoes.push('Lembrete: Você ainda não registrou os sinais vitais de hoje.');
  }

  if (!isMounted || telaAtual === 'carregando') return null;

  return (
    <div className={`min-h-screen font-sans antialiased select-none [-webkit-touch-callout:none] transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-[#F8FAFC] text-gray-800'}`} onContextMenu={(e) => e.preventDefault()}>
      
      {telaAtual === 'auth' && (
        <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
          <div className={`max-w-md w-full p-8 rounded-3xl shadow-2xl border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-100'}`}>
            <div className="flex flex-col items-center mb-8">
              <img src="/icon.png" alt="Logo" className="w-20 h-20 rounded-2xl mb-4 shadow-md pointer-events-none" />
              <h1 className="text-3xl font-extrabold text-teal-600 dark:text-teal-400">EloVital</h1>
              <p className="text-gray-500 dark:text-gray-400 text-center mt-2">Acesso exclusivo do Paciente.</p>
            </div>

            {erroAuth && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm font-bold text-center">{erroAuth}</div>}

            <form onSubmit={isLoginModo ? fazerLoginPaciente : criarContaPaciente} className="space-y-4">
              {!isLoginModo && (
                <>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-teal-600 dark:text-teal-400">Seu Nome</label>
                    <input type="text" value={nomeRegistro} onChange={e => setNomeRegistro(e.target.value)} required className={`w-full p-4 rounded-xl border-2 border-teal-500/50 bg-teal-50/30 focus:border-teal-500 outline-none ${isDarkMode ? 'bg-teal-900/20 text-white' : 'text-gray-900'}`} placeholder="Ex: Sr. João" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-teal-600 dark:text-teal-400">Seu CPF (Apenas números)</label>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={cpfRegistro} onChange={e => setCpfRegistro(e.target.value.replace(/\D/g, ''))} required maxLength={11} className={`w-full p-4 rounded-xl border-2 border-teal-500/50 bg-teal-50/30 focus:border-teal-500 outline-none ${isDarkMode ? 'bg-teal-900/20 text-white' : 'text-gray-900'}`} placeholder="12345678900" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-bold mb-2">E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={`w-full p-4 rounded-xl border-2 focus:border-teal-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`} placeholder="paciente@email.com" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Senha</label>
                <input type="password" value={senha} onChange={e => setSenha(e.target.value)} required minLength={6} className={`w-full p-4 rounded-xl border-2 focus:border-teal-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`} placeholder="******" />
              </div>
              <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-lg p-4 rounded-xl shadow-lg transition-transform active:scale-95 mt-2">
                {isLoginModo ? "Entrar" : "Criar Minha Conta"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button onClick={() => {setIsLoginModo(!isLoginModo); setErroAuth("");}} className="text-teal-600 dark:text-teal-400 font-semibold hover:underline text-sm">
                {isLoginModo ? "Primeiro acesso? Cadastre-se" : "Já tem conta? Fazer Login"}
              </button>
            </div>
          </div>
        </div>
      )}

      {telaAtual === 'app' && (
        <>
          {showToast && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top fade-in duration-300">
              <div className="bg-teal-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold">
                <CheckCircle className="w-5 h-5" /> Atualização salva!
              </div>
            </div>
          )}

          <nav className={`border-b px-4 md:px-6 py-4 sticky top-0 z-30 shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-3 text-teal-700 dark:text-teal-400">
                <img src="/icon.png" alt="Logo" className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-contain shadow-sm pointer-events-none" />
                <div className="flex flex-col justify-center">
                  <span className={`text-lg md:text-xl font-extrabold tracking-tight leading-none mb-1 ${isDarkMode ? 'text-white' : 'text-teal-700'}`}>EloVital</span>
                  <button onClick={editarNome} className="font-medium text-xs md:text-sm text-left flex items-center gap-1 text-gray-500 hover:text-teal-600 dark:text-gray-400 transition-colors">
                    {nomeUsuario} <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              <div className="hidden md:flex items-center gap-8 font-medium text-sm text-gray-600 dark:text-gray-400">
                <span onClick={() => setAbaAtiva('painel')} className={`pb-1 cursor-pointer transition-colors ${abaAtiva === 'painel' ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 font-semibold' : 'hover:text-teal-600'}`}>Painel Central</span>
                <span onClick={() => setAbaAtiva('historico')} className={`pb-1 cursor-pointer transition-colors ${abaAtiva === 'historico' ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 font-semibold' : 'hover:text-teal-600'}`}>Histórico Clínico</span>
              </div>

              <div className="flex items-center gap-4 md:gap-5">
                <div className="hidden md:flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
                  <UserCircle className="w-4 h-4 text-teal-500" />
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Paciente</span>
                </div>

                <button onClick={toggleTheme} className="text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-400 transition relative">
                  {isDarkMode ? <Sun className="w-5 h-5 md:w-6 md:h-6 text-amber-400" /> : <Moon className="w-5 h-5 md:w-6 md:h-6" />}
                </button>

                <div className="relative">
                  <button onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)} className="text-gray-500 hover:text-teal-600 dark:text-gray-400 transition relative">
                    <Bell className="w-5 h-5 md:w-6 md:h-6" />
                    {notificacoes.length > 0 && (
                      <span className="absolute top-0 right-0 flex h-2 w-2 md:h-3 md:w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 md:h-3 md:w-3 bg-red-500"></span>
                      </span>
                    )}
                  </button>
                  {mostrarNotificacoes && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMostrarNotificacoes(false)}></div>
                      <div className={`absolute right-0 top-full mt-3 w-72 rounded-2xl shadow-xl border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                        <div className={`p-4 border-b font-bold flex justify-between items-center ${isDarkMode ? 'border-gray-700 text-white' : 'border-gray-100 text-gray-800'}`}>
                          Notificações {notificacoes.length > 0 && <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded-full text-xs">{notificacoes.length}</span>}
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {notificacoes.length > 0 ? (
                            notificacoes.map((notif, idx) => (
                              <div key={idx} className={`p-4 border-b last:border-0 flex gap-3 ${isDarkMode ? 'border-gray-700 text-gray-300' : 'border-gray-50 text-gray-600'}`}>
                                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" /> <p className="text-sm font-medium">{notif}</p>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center flex flex-col items-center">
                              <Bell className={`w-8 h-8 mb-3 opacity-20 ${isDarkMode ? 'text-white' : 'text-gray-900'}`} />
                              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Não há novidades.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button onClick={sair} className="text-gray-500 hover:text-red-500 dark:text-gray-400 transition" title="Sair">
                  <LogOut className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 md:mx-2 hidden md:block"></div>
                <div className="relative group cursor-pointer" onClick={() => inputFotoRef.current?.click()}>
                  <img src={fotoPerfil} alt="Perfil" className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white dark:border-gray-700 shadow-md object-cover group-hover:opacity-75 transition-all" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="w-4 h-4 text-white drop-shadow-md" /></div>
                  <input type="file" ref={inputFotoRef} onChange={trocarFoto} accept="image/*" className="hidden" />
                </div>
              </div>
            </div>
          </nav>

          <div className={`md:hidden flex border-b shadow-sm sticky top-[72px] z-20 transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <button onClick={() => setAbaAtiva('painel')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${abaAtiva === 'painel' ? 'border-teal-500 text-teal-600 dark:bg-gray-700/30' : 'border-transparent text-gray-500'}`}>Painel Central</button>
            <button onClick={() => setAbaAtiva('historico')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${abaAtiva === 'historico' ? 'border-teal-500 text-teal-600 dark:bg-gray-700/30' : 'border-transparent text-gray-500'}`}>Histórico Clínico</button>
          </div>

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
            {abaAtiva === 'painel' && (
              <div className="animate-in fade-in duration-300">
                <div className="relative overflow-hidden bg-gradient-to-br from-teal-500 via-teal-600 to-teal-900 rounded-2xl md:rounded-3xl p-6 md:p-10 text-white shadow-xl flex flex-col md:flex-row justify-between items-center mb-6 md:mb-10 border border-teal-400/20">
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 md:-mt-10 md:-mr-10 opacity-10 pointer-events-none"><Heart className="w-40 h-40 md:w-64 md:h-64" /></div>
                  <div className="relative z-10 mb-5 md:mb-0 text-center md:text-left w-full md:w-auto">
                    <h1 className="text-2xl md:text-4xl font-extrabold mb-1 tracking-tight">Monitoramento Doméstico</h1>
                    <p className="text-teal-50 text-sm md:text-lg max-w-lg font-medium opacity-90">Sinais vitais salvos na nuvem com segurança.</p>
                  </div>
                  <button onClick={() => setModalAberto(true)} className="relative z-10 w-full md:w-auto justify-center bg-white dark:bg-gray-800 text-teal-700 dark:text-teal-400 hover:bg-gray-50 px-6 py-3 md:px-8 md:py-4 rounded-full font-bold flex items-center gap-2 md:gap-3 transition-all hover:scale-105 active:scale-95">
                    <PlusCircle className="w-5 h-5 md:w-6 md:h-6 text-teal-500" /> <span className="text-base md:text-lg">Nova Medição</span>
                  </button>
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
                          <Line connectNulls type="monotone" dataKey="HGT" name="Glicemia" stroke="#0D9488" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          <Line connectNulls type="monotone" dataKey="SIS" name="Pressão Alta" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          <Line connectNulls type="monotone" dataKey="DIA" name="Pressão Baixa" stroke="#34D399" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          <Line connectNulls type="monotone" dataKey="SpO2" name="Oxigênio" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          <Line connectNulls type="monotone" dataKey="BPM" name="Batimentos" stroke="#F43F5E" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
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

          {modalAberto && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-0">
              <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm" onClick={() => setModalAberto(false)}></div>
              <div className={`rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative z-10 animate-in fade-in zoom-in duration-200 border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-100 text-gray-900'}`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Nova Medição</h2>
                  <button onClick={() => setModalAberto(false)} className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-5 mb-6 max-h-[60vh] overflow-y-auto pr-1">
                  
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-gray-900/40 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                    <label className="flex items-center gap-2 font-bold mb-2 text-sm"><Droplet className="w-4 h-4 text-red-500"/> Glicemia (HGT)</label>
                    <div className="flex items-center gap-3">
                      <input type="text" inputMode="numeric" pattern="[0-9]*" value={formHGT} onChange={(e) => setFormHGT(e.target.value.replace(/\D/g, ''))} placeholder="000" className={`w-full text-xl font-black text-center rounded-xl py-2 border-2 focus:border-teal-500 focus:outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`} />
                      <span className="text-gray-400 font-medium text-sm">mg/dL</span>
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-gray-900/40 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                    <label className="flex items-center gap-2 font-bold mb-2 text-sm"><Heart className="w-4 h-4 text-emerald-500"/> Pressão Arterial</label>
                    <div className="flex items-center justify-center gap-2">
                      <input type="text" inputMode="numeric" pattern="[0-9]*" value={formPressaoSis} onChange={(e) => setFormPressaoSis(e.target.value.replace(/\D/g, ''))} placeholder="120" className={`w-full text-xl font-black text-center rounded-xl py-2 border-2 focus:border-teal-500 focus:outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`} />
                      <span className="text-2xl text-gray-300 dark:text-gray-600 font-light">/</span>
                      <input type="text" inputMode="numeric" pattern="[0-9]*" value={formPressaoDia} onChange={(e) => setFormPressaoDia(e.target.value.replace(/\D/g, ''))} placeholder="80" className={`w-full text-xl font-black text-center rounded-xl py-2 border-2 focus:border-teal-500 focus:outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`} />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className={`w-1/2 p-4 rounded-2xl border ${isDarkMode ? 'bg-gray-900/40 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                      <label className="flex items-center gap-1 font-bold mb-2 text-xs"><Activity className="w-4 h-4 text-blue-500"/> Oxigênio</label>
                      <div className="flex items-center gap-1">
                        <input type="text" inputMode="numeric" pattern="[0-9]*" value={formOxi} onChange={(e) => setFormOxi(e.target.value.replace(/\D/g, ''))} placeholder="98" className={`w-full text-lg font-black text-center rounded-xl py-2 border-2 focus:border-teal-500 focus:outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`} />
                        <span className="text-gray-400 font-medium text-sm">%</span>
                      </div>
                    </div>
                    <div className={`w-1/2 p-4 rounded-2xl border ${isDarkMode ? 'bg-gray-900/40 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                      <label className="flex items-center gap-1 font-bold mb-2 text-xs"><Activity className="w-4 h-4 text-rose-500"/> Batimentos</label>
                      <div className="flex items-center gap-1">
                        <input type="text" inputMode="numeric" pattern="[0-9]*" value={formBpm} onChange={(e) => setFormBpm(e.target.value.replace(/\D/g, ''))} placeholder="75" className={`w-full text-lg font-black text-center rounded-xl py-2 border-2 focus:border-teal-500 focus:outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`} />
                        <span className="text-gray-400 font-medium text-xs">BPM</span>
                      </div>
                    </div>
                  </div>

                </div>
                <button onClick={salvarMedicoes} className="w-full bg-teal-600 hover:bg-teal-700 text-white text-lg font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all">Confirmar Dados</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}