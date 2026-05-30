"use client";

import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { Heart, Activity, Droplet, PlusCircle, X, Bell, Camera, AlertCircle, Edit2, Moon, Sun, CheckCircle, LogOut, UserCircle, Search, Eye } from 'lucide-react';

import { collection, addDoc, onSnapshot, query, where, serverTimestamp, doc, setDoc, getDoc } from "firebase/firestore";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, signInAnonymously, User } from "firebase/auth";
import { db, auth } from "./firebase"; 

interface Medicao {
  id?: string;
  cpf: string;
  data: string;
  hora: string;
  hgtNumero: number | null;
  hgtTexto: string;
  pressao: string;
  oximetria: string;
  batimentos: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timestamp?: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DotPersonalizado = (props: any) => {
  const { cx, cy, value, isDarkMode } = props;
  let cor = "#10B981"; 
  if (value > 130 && value <= 180) cor = "#F59E0B"; 
  if (value > 180 || value < 70) cor = "#EF4444"; 
  return <circle cx={cx} cy={cy} r={5} fill={cor} stroke={isDarkMode ? "#1F2937" : "#fff"} strokeWidth={2} />;
};

export default function EloVitalApp() {
  const [isMounted, setIsMounted] = useState(false);
  
  // SISTEMA DE USUÁRIO E MULTI-TENANT (CPF)
  const [usuario, setUsuario] = useState<User | null>(null);
  const [perfilAcesso, setPerfilAcesso] = useState<'idoso' | 'familiar' | null>(null);
  const [cpfAtivo, setCpfAtivo] = useState<string>(""); 
  const [carregandoLogin, setCarregandoLogin] = useState(true);
  
  // TELA DE LOGIN E CADASTRO
  const [isLoginModo, setIsLoginModo] = useState(true);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [cpfRegistro, setCpfRegistro] = useState(""); 
  const [nomeRegistro, setNomeRegistro] = useState(""); 
  const [erroAuth, setErroAuth] = useState(""); 
  
  // TELA DE BUSCA DO FAMILIAR
  const [cpfBuscaFamiliar, setCpfBuscaFamiliar] = useState("");
  const [buscandoPaciente, setBuscandoPaciente] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('temaEloVital') === 'escuro';
    return false;
  });
  
  const [showToast, setShowToast] = useState(false);

  const [fotoPerfil, setFotoPerfil] = useState("https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80");
  const [nomeUsuario, setNomeUsuario] = useState("Paciente");

  // BLOQUEIO DO BOTÃO "VOLTAR"
  useEffect(() => {
    if (usuario && !carregandoLogin) {
      window.history.pushState(null, '', window.location.href);
      window.onpopstate = function () {
        signOut(auth);
      };
    }
  }, [usuario, carregandoLogin]);

  // VERIFICAÇÃO DE SESSÃO E BANCO DE DADOS
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setErroAuth("");
      if (user) {
        try {
          if (user.isAnonymous) {
            setUsuario(user);
            setPerfilAcesso('familiar');
          } else {
            const userDoc = await getDoc(doc(db, "usuarios_permissoes", user.uid));
            
            if (!userDoc.exists()) {
              await signOut(auth);
              setUsuario(null);
              setPerfilAcesso(null);
              setCpfAtivo("");
            } else {
              setUsuario(user);
              const dados = userDoc.data();
              setPerfilAcesso(dados.role);
              
              if (dados.role === 'idoso') {
                const pacSnap = await getDoc(doc(db, "pacientes", dados.cpf));
                if (pacSnap.exists()) {
                  setCpfAtivo(dados.cpf);
                } else {
                  setErroAuth("Cliente não Cadastrado no sistema.");
                  await signOut(auth);
                }
              }
            }
          }
        } catch (e) {
          console.error("Erro ao verificar auth state:", e);
          await signOut(auth);
        }
      } else {
        setUsuario(null);
        setPerfilAcesso(null);
        setCpfAtivo("");
      }
      setCarregandoLogin(false);
    });
    return () => unsubscribe();
  }, []);

  const fazerLoginPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroAuth("");
    try {
      await signInWithEmailAndPassword(auth, email, senha);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error);
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setErroAuth("E-mail ou senha incorretos. (Se você excluiu os dados, crie uma conta nova)");
      } else if (error.code === 'auth/invalid-email') {
        setErroAuth("O formato do e-mail é inválido.");
      } else if (error.code === 'auth/too-many-requests') {
        setErroAuth("Muitas tentativas falhas. Aguarde um momento e tente novamente.");
      } else {
        setErroAuth("Erro ao entrar: " + error.message);
      }
    }
  };

  const criarContaPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroAuth("");
    
    if (!nomeRegistro || nomeRegistro.trim().length < 2) {
      setErroAuth("Por favor, digite um nome válido.");
      return;
    }
    
    if (cpfRegistro.length < 11) {
      setErroAuth("Digite um CPF com 11 números.");
      return;
    }
    
    if (senha.length < 6) {
      setErroAuth("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    
    try {
      const credencial = await createUserWithEmailAndPassword(auth, email, senha);
      
      await setDoc(doc(db, "usuarios_permissoes", credencial.user.uid), {
        role: 'idoso',
        email: email,
        cpf: cpfRegistro
      });

      await setDoc(doc(db, "pacientes", cpfRegistro), {
        nome: nomeRegistro.trim(),
        foto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
      });
      
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        setErroAuth("Este e-mail já está cadastrado.");
      } else if (error.code === 'auth/weak-password') {
        setErroAuth("A senha deve ter pelo menos 6 caracteres (letras ou números).");
      } else {
        setErroAuth("Erro ao criar conta. Tente novamente.");
      }
    }
  };

  const fazerLoginFamiliar = async () => {
    setErroAuth("");
    try {
      await signInAnonymously(auth);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error);
      setErroAuth("Erro de conexão com servidor.");
    }
  };

  const vincularPacienteComoFamiliar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroAuth("");
    
    if (cpfBuscaFamiliar.length === 11) {
      setBuscandoPaciente(true);
      try {
        const pacienteRef = doc(db, "pacientes", cpfBuscaFamiliar);
        const pacienteSnap = await getDoc(pacienteRef);

        if (pacienteSnap.exists()) {
          setCpfAtivo(cpfBuscaFamiliar);
        } else {
          setErroAuth("Cliente não Cadastrado.");
        }
      } catch (error) {
        console.error(error);
        setErroAuth("Erro ao buscar dados no servidor.");
      } finally {
        setBuscandoPaciente(false);
      }
    } else {
      setErroAuth("Digite um CPF válido com 11 números.");
    }
  };

  const sair = () => {
    signOut(auth);
    setCpfAtivo("");
    setCpfBuscaFamiliar("");
    setErroAuth("");
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 1);
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    return () => clearTimeout(timer);
  }, [isDarkMode]);

  const toggleTheme = () => {
    const novoTema = !isDarkMode;
    setIsDarkMode(novoTema);
    localStorage.setItem('temaEloVital', novoTema ? 'escuro' : 'claro');
  };

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

  useEffect(() => {
    if (!cpfAtivo) return;
    const unsubPerfil = onSnapshot(doc(db, "pacientes", cpfAtivo), (documento) => {
      if (documento.exists()) {
        const dados = documento.data();
        if (dados.foto) setFotoPerfil(dados.foto);
        if (dados.nome) setNomeUsuario(dados.nome);
      } else {
        setNomeUsuario("Paciente");
      }
    });
    return () => unsubPerfil();
  }, [cpfAtivo]);

  const trocarFoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (perfilAcesso !== 'idoso') return; 
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setFotoPerfil(base64String);
        await setDoc(doc(db, "pacientes", cpfAtivo), { foto: base64String }, { merge: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const editarNome = async () => {
    if (perfilAcesso !== 'idoso') return; 
    const novoNome = prompt("Digite o nome do paciente:", nomeUsuario !== "Paciente" ? nomeUsuario : "");
    if (novoNome && novoNome.trim() !== "") {
      setNomeUsuario(novoNome);
      await setDoc(doc(db, "pacientes", cpfAtivo), { nome: novoNome }, { merge: true });
    }
  };

  useEffect(() => {
    if (!cpfAtivo) return;
    
    const q = query(collection(db, "medicoes"), where("cpf", "==", cpfAtivo));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dados: Medicao[] = [];
      snapshot.forEach((doc) => {
        dados.push({ id: doc.id, ...doc.data() } as Medicao);
      });
      
      dados.sort((a, b) => {
        if (a.timestamp && b.timestamp) return a.timestamp - b.timestamp;
        return 0;
      });

      setListaMedicoes(dados);

      if (dados.length > 0) {
        const ultimos = dados.slice().reverse();
        const ultimaGlicemia = ultimos.find(d => d.hgtTexto !== "--");
        if (ultimaGlicemia) setGlicemiaAtual(ultimaGlicemia.hgtTexto);
        const ultimaPressao = ultimos.find(d => d.pressao !== "--");
        if (ultimaPressao) setPressaoAtual(ultimaPressao.pressao);
        const ultimaOxi = ultimos.find(d => d.oximetria !== "--");
        if (ultimaOxi) setOximetriaAtual(ultimaOxi.oximetria);
        const ultimoBatimento = ultimos.find(d => d.batimentos !== "--");
        if (ultimoBatimento) setBatimentosAtual(ultimoBatimento.batimentos);
      } else {
        setGlicemiaAtual("--");
        setPressaoAtual("--");
        setOximetriaAtual("--");
        setBatimentosAtual("--");
      }
    });
    return () => unsubscribe();
  }, [cpfAtivo]);

  const salvarMedicoes = async () => {
    if (perfilAcesso !== 'idoso') return; 

    if (!formHGT && !formPressaoSis && !formPressaoDia && !formOxi && !formBpm) {
      setModalAberto(false);
      return;
    }

    const dataExata = new Date().toLocaleDateString('pt-BR');
    const horaExata = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    let pressaoFinal = "--";
    if (formPressaoSis || formPressaoDia) pressaoFinal = `${formPressaoSis || "0"}/${formPressaoDia || "0"}`;

    const novoRegistro = {
      cpf: cpfAtivo, 
      data: dataExata,
      hora: horaExata,
      hgtNumero: formHGT ? parseInt(formHGT) : null,
      hgtTexto: formHGT || "--",
      pressao: pressaoFinal,
      oximetria: formOxi || "--",
      batimentos: formBpm || "--",
      timestamp: serverTimestamp(),
      autor: usuario?.email || 'Desconhecido'
    };

    try {
      await addDoc(collection(db, "medicoes"), novoRegistro);
      setFormHGT(""); setFormPressaoSis(""); setFormPressaoDia(""); setFormOxi(""); setFormBpm("");
      setModalAberto(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (error) {
      console.error(error);
      setErroAuth("Erro ao conectar com o banco de dados.");
    }
  };

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
      const partes = valor.split('/');
      if (partes.length !== 2) return null;
      const sis = parseInt(partes[0]);
      const dia = parseInt(partes[1]);
      
      if (sis < 100 || dia < 60) return { texto: "Baixa", cor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" };
      if (sis <= 130 && dia <= 85) return { texto: "Normal", cor: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" };
      if (sis <= 139 || dia <= 89) return { texto: "Atenção", cor: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" };
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

  const dadosGrafico = listaMedicoes.filter(medicao => medicao.hgtNumero !== null);
  const precisaLembrete = listaMedicoes.length === 0;
  const isSomenteLeitura = perfilAcesso === 'familiar';

  if (!isMounted || carregandoLogin) return null;

  // RENDERIZAÇÃO GERAL: SELECT-NONE (Evita copiar textos)
  return (
    <div 
      className={`min-h-screen font-sans antialiased select-none [-webkit-touch-callout:none] transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-[#F8FAFC] text-gray-800'}`}
      onContextMenu={(e) => e.preventDefault()}
    >
      
      {/* 1. TELA DE LOGIN / CADASTRO */}
      {!usuario ? (
        <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
          <div className={`max-w-md w-full p-8 rounded-3xl shadow-2xl border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-100'}`}>
            <div className="flex flex-col items-center mb-8">
               {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.png" alt="Logo" className="w-20 h-20 rounded-2xl mb-4 shadow-md pointer-events-none" />
              <h1 className="text-3xl font-extrabold text-teal-600 dark:text-teal-400">EloVital</h1>
              <p className="text-gray-500 dark:text-gray-400 text-center mt-2">Plataforma de acompanhamento de saúde.</p>
            </div>

            {erroAuth && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-4 text-sm font-bold text-center">
                {erroAuth}
              </div>
            )}

            <form onSubmit={isLoginModo ? fazerLoginPaciente : criarContaPaciente} className="space-y-4">
              {!isLoginModo && (
                <>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-teal-600 dark:text-teal-400">Nome ou Apelido</label>
                    <input type="text" value={nomeRegistro} onChange={e => setNomeRegistro(e.target.value)} required className={`w-full p-4 rounded-xl border-2 border-teal-500/50 bg-teal-50/30 focus:border-teal-500 outline-none ${isDarkMode ? 'bg-teal-900/20 text-white' : 'text-gray-900'}`} placeholder="Ex: Sr. João" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-teal-600 dark:text-teal-400">Seu CPF (Apenas números)</label>
                    <input type="text" value={cpfRegistro} onChange={e => setCpfRegistro(e.target.value.replace(/\D/g, ''))} required maxLength={11} className={`w-full p-4 rounded-xl border-2 border-teal-500/50 bg-teal-50/30 focus:border-teal-500 outline-none ${isDarkMode ? 'bg-teal-900/20 text-white' : 'text-gray-900'}`} placeholder="12345678900" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-bold mb-2">E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={`w-full p-4 rounded-xl border-2 focus:border-teal-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`} placeholder="paciente@email.com" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Senha (Mín. 6 caracteres)</label>
                <input type="password" value={senha} onChange={e => setSenha(e.target.value)} required minLength={6} className={`w-full p-4 rounded-xl border-2 focus:border-teal-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`} placeholder="******" />
              </div>

              <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-lg p-4 rounded-xl shadow-lg transition-transform active:scale-95 mt-2">
                {isLoginModo ? "Entrar como Paciente" : "Cadastrar Paciente"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button onClick={() => {setIsLoginModo(!isLoginModo); setErroAuth("");}} className="text-teal-600 dark:text-teal-400 font-semibold hover:underline text-sm">
                {isLoginModo ? "Paciente novo? Cadastre-se" : "Já tem conta? Fazer Login"}
              </button>
            </div>

            <div className="relative flex py-6 items-center">
              <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-bold">OU</span>
              <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
            </div>

            <button onClick={fazerLoginFamiliar} className={`w-full flex items-center justify-center gap-2 border-2 font-bold text-lg p-4 rounded-xl shadow-sm transition-transform active:scale-95 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-teal-400' : 'bg-white hover:bg-gray-50 border-teal-100 text-teal-700'}`}>
              <Eye className="w-5 h-5" />
              Acompanhar Familiar
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">Acesso sem senha, apenas com o CPF do paciente.</p>
          </div>
        </div>
      ) 
      
      // 2. TELA INTERMEDIÁRIA DO FAMILIAR
      : usuario && perfilAcesso === 'familiar' && !cpfAtivo ? (
        <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${isDarkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50'}`}>
          <div className={`max-w-md w-full p-8 rounded-3xl shadow-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-teal-600 dark:text-teal-400">Buscar Paciente</h2>
              <button onClick={sair} className="text-gray-400 hover:text-red-500" title="Voltar"><LogOut className="w-5 h-5"/></button>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Digite o CPF do paciente que você deseja acompanhar.</p>
            
            {erroAuth && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-4 text-sm font-bold text-center">
                {erroAuth}
              </div>
            )}

            <form onSubmit={vincularPacienteComoFamiliar}>
              <input type="text" value={cpfBuscaFamiliar} onChange={e => setCpfBuscaFamiliar(e.target.value.replace(/\D/g, ''))} maxLength={11} placeholder="CPF (só números)" required className={`w-full p-4 text-lg text-center tracking-widest rounded-xl border-2 mb-4 focus:border-teal-500 outline-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`} />
              <button type="submit" disabled={buscandoPaciente} className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-bold text-lg p-4 rounded-xl shadow-lg transition-transform active:scale-95">
                {buscandoPaciente ? "Verificando..." : <><Search className="w-5 h-5" /> Acessar Prontuário</>}
              </button>
            </form>
          </div>
        </div>
      ) 
      
      // 3. TELA PRINCIPAL
      : (
        <>
          {showToast && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top fade-in duration-300">
              <div className="bg-teal-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold">
                <CheckCircle className="w-5 h-5" />
                Atualização salva com sucesso!
              </div>
            </div>
          )}

          <nav className={`border-b px-4 md:px-6 py-4 sticky top-0 z-30 shadow-sm transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              
              <div className="flex items-center gap-3 text-teal-700 dark:text-teal-400">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon.png" alt="Logo EloVital" className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-contain shadow-sm pointer-events-none" />
                
                <div className="flex flex-col justify-center">
                  <span className={`text-lg md:text-xl font-extrabold tracking-tight leading-none mb-1 ${isDarkMode ? 'text-white' : 'text-teal-700'}`}>EloVital</span>
                  <button onClick={editarNome} disabled={isSomenteLeitura} className={`font-medium text-xs md:text-sm text-left flex items-center gap-1 transition-colors ${isSomenteLeitura ? 'text-gray-400 cursor-default' : 'text-gray-400 hover:text-teal-600 dark:hover:text-teal-300'}`}>
                    {nomeUsuario} {!isSomenteLeitura && <Edit2 className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              
              <div className="hidden md:flex items-center gap-8 font-medium text-sm text-gray-500 dark:text-gray-400">
                <span onClick={() => setAbaAtiva('painel')} className={`pb-1 cursor-pointer transition-colors ${abaAtiva === 'painel' ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400 font-semibold' : 'hover:text-teal-600'}`}>Painel Central</span>
                <span onClick={() => setAbaAtiva('historico')} className={`pb-1 cursor-pointer transition-colors ${abaAtiva === 'historico' ? 'text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400 font-semibold' : 'hover:text-teal-600'}`}>Histórico Clínico</span>
              </div>

              <div className="flex items-center gap-4 md:gap-5">
                <div className="hidden md:flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
                  <UserCircle className={`w-4 h-4 ${isSomenteLeitura ? 'text-blue-500' : 'text-teal-500'}`} />
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{isSomenteLeitura ? 'Familiar' : 'Paciente'}</span>
                </div>

                <button onClick={toggleTheme} className="text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition relative">
                  {isDarkMode ? <Sun className="w-5 h-5 md:w-6 md:h-6 text-amber-400" /> : <Moon className="w-5 h-5 md:w-6 md:h-6 text-gray-500" />}
                </button>

                <button className="text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition relative">
                  <Bell className="w-5 h-5 md:w-6 md:h-6" />
                  {precisaLembrete && !isSomenteLeitura && (
                    <span className="absolute top-0 right-0 flex h-2 w-2 md:h-3 md:w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 md:h-3 md:w-3 bg-red-500"></span>
                    </span>
                  )}
                </button>

                <button onClick={sair} className="text-gray-400 hover:text-red-500 transition" title="Sair ou Trocar CPF">
                  <LogOut className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                
                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 md:mx-2 hidden md:block"></div>
                
                <div className="relative group cursor-pointer" onClick={() => !isSomenteLeitura && inputFotoRef.current?.click()}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fotoPerfil} alt="Perfil" className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white dark:border-gray-700 shadow-md object-cover pointer-events-none transition-all ${!isSomenteLeitura && 'group-hover:opacity-75'}`} />
                  {!isSomenteLeitura && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-4 h-4 md:w-5 md:h-5 text-white drop-shadow-md" />
                    </div>
                  )}
                  <input type="file" ref={inputFotoRef} onChange={trocarFoto} accept="image/*" className="hidden" />
                </div>
              </div>
            </div>
          </nav>

          <div className={`md:hidden flex border-b shadow-sm sticky top-[72px] z-20 transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <button onClick={() => setAbaAtiva('painel')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${abaAtiva === 'painel' ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50/10 dark:bg-gray-700/30' : 'border-transparent text-gray-500'}`}>Painel Central</button>
            <button onClick={() => setAbaAtiva('historico')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${abaAtiva === 'historico' ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-50/10 dark:bg-gray-700/30' : 'border-transparent text-gray-500'}`}>Histórico Clínico</button>
          </div>

          {precisaLembrete && (
            <div className={`border-l-4 p-3 md:p-4 mx-4 md:mx-6 lg:mx-auto max-w-7xl mt-4 md:mt-6 rounded-r-xl shadow-sm flex items-center gap-3 md:gap-4 transition-colors ${isDarkMode ? 'bg-amber-950/40 border-amber-500 text-amber-300' : 'bg-amber-50 border-amber-500 text-amber-800'}`}>
              <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-amber-500 flex-shrink-0" />
              <p className="font-medium text-sm md:text-base">
                {isSomenteLeitura ? `Lembrete: ${nomeUsuario} ainda não registrou os sinais hoje.` : 'Lembrete: Você ainda não registrou os sinais vitais de hoje.'}
              </p>
            </div>
          )}

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
            
            {abaAtiva === 'painel' && (
              <div className="animate-in fade-in duration-300">
                
                <div className="relative overflow-hidden bg-gradient-to-br from-teal-500 via-teal-600 to-teal-900 rounded-2xl md:rounded-3xl p-6 md:p-10 text-white shadow-xl flex flex-col md:flex-row justify-between items-center mb-6 md:mb-10 border border-teal-400/20">
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 md:-mt-10 md:-mr-10 opacity-10 pointer-events-none">
                    <Heart className="w-40 h-40 md:w-64 md:h-64" />
                  </div>
                  <div className="relative z-10 mb-5 md:mb-0 text-center md:text-left w-full md:w-auto">
                    <h1 className="text-2xl md:text-4xl font-extrabold mb-1 md:mb-2 tracking-tight">Monitoramento Doméstico</h1>
                    <p className="text-teal-50 text-sm md:text-lg max-w-lg font-medium opacity-90">
                      {isSomenteLeitura ? `Acompanhando CPF: ${cpfAtivo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}` : "Sinais vitais salvos na nuvem com segurança."}
                    </p>
                  </div>
                  
                  {!isSomenteLeitura && (
                    <button onClick={() => setModalAberto(true)} className="relative z-10 w-full md:w-auto justify-center bg-white dark:bg-gray-800 text-teal-700 dark:text-teal-400 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-3 md:px-8 md:py-4 rounded-full font-bold flex items-center gap-2 md:gap-3 transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95">
                      <PlusCircle className="w-5 h-5 md:w-6 md:h-6 text-teal-500 dark:text-teal-400" />
                      <span className="text-base md:text-lg">Nova Medição</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-10">
                  <div className={`p-5 md:p-6 rounded-2xl shadow-sm border flex flex-col justify-between transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div>
                      <div className="flex justify-between items-start mb-3 md:mb-4">
                        <div className="bg-red-50 dark:bg-red-950/30 p-2 md:p-3 rounded-xl"><Droplet className="w-5 h-5 md:w-6 md:h-6 text-red-500 dark:text-red-400" /></div>
                        {statusGlicemia && <span className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${statusGlicemia.cor}`}>{statusGlicemia.texto}</span>}
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium text-sm md:text-base mb-1">Glicemia (HGT)</p>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1 md:mt-2">
                      <h3 className={`text-2xl md:text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{glicemiaAtual}</h3>
                      {glicemiaAtual !== "--" && <span className="text-gray-400 dark:text-gray-500 font-medium text-xs md:text-sm">mg/dL</span>}
                    </div>
                  </div>

                  <div className={`p-5 md:p-6 rounded-2xl shadow-sm border flex flex-col justify-between transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div>
                      <div className="flex justify-between items-start mb-3 md:mb-4">
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2 md:p-3 rounded-xl"><Heart className="w-5 h-5 md:w-6 md:h-6 text-emerald-500 dark:text-emerald-400" /></div>
                        {statusPressao && <span className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${statusPressao.cor}`}>{statusPressao.texto}</span>}
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium text-sm md:text-base mb-1">Pressão Arterial</p>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1 md:mt-2">
                      <h3 className={`text-2xl md:text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{pressaoAtual}</h3>
                      {pressaoAtual !== "--" && <span className="text-gray-400 dark:text-gray-500 font-medium text-xs md:text-sm">mmHg</span>}
                    </div>
                  </div>

                  <div className={`p-5 md:p-6 rounded-2xl shadow-sm border flex flex-col justify-between transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div>
                      <div className="flex justify-between items-start mb-3 md:mb-4">
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-2 md:p-3 rounded-xl"><Activity className="w-5 h-5 md:w-6 md:h-6 text-blue-500 dark:text-blue-400" /></div>
                        {statusOxi && <span className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${statusOxi.cor}`}>{statusOxi.texto}</span>}
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium text-sm md:text-base mb-1">Oxigênio (SpO2)</p>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1 md:mt-2">
                      <h3 className={`text-2xl md:text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{oximetriaAtual}</h3>
                      {oximetriaAtual !== "--" && <span className="text-gray-400 dark:text-gray-500 font-medium text-xs md:text-sm">%</span>}
                    </div>
                  </div>

                  <div className={`p-5 md:p-6 rounded-2xl shadow-sm border flex flex-col justify-between transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <div>
                      <div className="flex justify-between items-start mb-3 md:mb-4">
                        <div className="bg-rose-50 dark:bg-rose-950/30 p-2 md:p-3 rounded-xl"><Activity className="w-5 h-5 md:w-6 md:h-6 text-rose-500 dark:text-rose-400" /></div>
                        {statusBpm && <span className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${statusBpm.cor}`}>{statusBpm.texto}</span>}
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 font-medium text-sm md:text-base mb-1">Batimentos Cardíacos</p>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1 md:mt-2">
                      <h3 className={`text-2xl md:text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{batimentosAtual}</h3>
                      {batimentosAtual !== "--" && <span className="text-gray-400 dark:text-gray-500 font-medium text-xs md:text-sm">BPM</span>}
                    </div>
                  </div>

                </div>

                <div className={`p-5 md:p-8 rounded-3xl shadow-sm border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                  <div className="mb-6 md:mb-8">
                    <h2 className={`text-xl md:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Evolução Glicêmica (HGT)</h2>
                  </div>
                  
                  <div className="h-64 md:h-96 w-full pointer-events-none">
                    {dadosGrafico.length === 0 ? (
                      <div className={`h-full flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-4 text-center ${isDarkMode ? 'text-gray-500 border-gray-700 bg-gray-900/40' : 'text-gray-400 border-gray-200 bg-gray-50'}`}>
                        <Droplet className="w-10 h-10 md:w-12 md:h-12 mb-3 md:mb-4 opacity-50" />
                        <p className="text-base md:text-lg font-bold">Sem dados de HGT no banco</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dadosGrafico} margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#374151" : "#E5E7EB"} />
                          <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#9CA3AF' : '#6B7280', fontSize: 12 }} dy={10} />
                          <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#9CA3AF' : '#6B7280', fontSize: 12 }} />
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: isDarkMode ? '#1F2937' : '#fff', color: isDarkMode ? '#fff' : '#000', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)' }} />
                          <ReferenceArea y1={70} y2={130} fill="#10B981" fillOpacity={isDarkMode ? 0.15 : 0.08} />
                          <Line type="monotone" dataKey="hgtNumero" name="Glicemia" stroke="#0D9488" strokeWidth={4} dot={(props) => <DotPersonalizado {...props} isDarkMode={isDarkMode} />} activeDot={{ r: 7 }} />
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
                  <div className="flex justify-between items-center mb-6 md:mb-8">
                    <h2 className={`text-xl md:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Histórico Clínico</h2>
                  </div>

                  {listaMedicoes.length === 0 ? (
                    <div className={`text-center py-12 md:py-16 rounded-2xl border-2 border-dashed ${isDarkMode ? 'bg-gray-900/30 border-gray-700 text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                      <p className="font-medium">O banco de dados está vazio.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto -mx-5 md:mx-0">
                      <div className="inline-block min-w-full align-middle px-5 md:px-0">
                        <table className="min-w-full text-left border-collapse">
                          <thead>
                            <tr className={`border-b-2 text-xs md:text-sm uppercase tracking-wider ${isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-100 text-gray-500'}`}>
                              <th className="pb-3 md:pb-4 px-3 md:px-4 font-semibold whitespace-nowrap">Data</th>
                              <th className="pb-3 md:pb-4 px-3 md:px-4 font-semibold whitespace-nowrap">Hora</th>
                              <th className="pb-3 md:pb-4 px-3 md:px-4 font-semibold whitespace-nowrap">HGT</th>
                              <th className="pb-3 md:pb-4 px-3 md:px-4 font-semibold whitespace-nowrap">Pressão</th>
                              <th className="pb-3 md:pb-4 px-3 md:px-4 font-semibold whitespace-nowrap">SpO2</th>
                              <th className="pb-3 md:pb-4 px-3 md:px-4 font-semibold whitespace-nowrap">BPM</th>
                            </tr>
                          </thead>
                          <tbody>
                            {listaMedicoes.slice().reverse().map((medicao, index) => (
                              <tr key={medicao.id || index} className={`border-b transition-colors ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-700/50' : 'border-gray-50 text-gray-700 hover:bg-gray-50'}`}>
                                <td className="py-3 md:py-4 px-3 md:px-4 whitespace-nowrap">{medicao.data || "--"}</td>
                                <td className="py-3 md:py-4 px-3 md:px-4 font-medium whitespace-nowrap">{medicao.hora}</td>
                                <td className="py-3 md:py-4 px-3 md:px-4 whitespace-nowrap">{medicao.hgtTexto} {medicao.hgtTexto !== "--" && <span className="text-xs text-gray-400 dark:text-gray-500">mg/dL</span>}</td>
                                <td className="py-3 md:py-4 px-3 md:px-4 whitespace-nowrap">{medicao.pressao}</td>
                                <td className="py-3 md:py-4 px-3 md:px-4 whitespace-nowrap">{medicao.oximetria} {medicao.oximetria !== "--" && "%"}</td>
                                <td className="py-3 md:py-4 px-3 md:px-4 whitespace-nowrap">{medicao.batimentos}</td>
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

          {modalAberto && !isSomenteLeitura && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-0">
              <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm" onClick={() => setModalAberto(false)}></div>
              
              <div className={`rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative z-10 animate-in fade-in zoom-in duration-200 border transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-100 text-gray-900'}`}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl md:text-2xl font-bold">Nova Medição</h2>
                  <button onClick={() => setModalAberto(false)} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-5 md:space-y-6 mb-6 md:mb-8 max-h-[60vh] overflow-y-auto pr-1 md:pr-2">
                  <div className={`p-4 rounded-2xl border transition-colors ${isDarkMode ? 'bg-gray-900/40 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                    <label className="flex items-center gap-2 font-bold mb-2 md:mb-3 text-sm md:text-base">
                      <Droplet className="w-4 h-4 md:w-5 md:h-5 text-red-500"/> Glicemia (HGT)
                    </label>
                    <div className="flex items-center gap-3">
                      <input type="number" value={formHGT} onChange={(e) => setFormHGT(e.target.value)} placeholder="000"
                        className={`w-full text-xl md:text-2xl font-black text-center rounded-xl py-2 md:py-3 border-2 focus:border-teal-500 focus:outline-none transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                      />
                      <span className="text-gray-400 font-medium text-sm md:text-base">mg/dL</span>
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-2xl border transition-colors ${isDarkMode ? 'bg-gray-900/40 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                    <label className="flex items-center gap-2 font-bold mb-2 md:mb-3 text-sm md:text-base">
                      <Heart className="w-4 h-4 md:w-5 md:h-5 text-emerald-500"/> Pressão Arterial
                    </label>
                    <div className="flex items-center justify-center gap-2 md:gap-3">
                      <input type="number" value={formPressaoSis} onChange={(e) => setFormPressaoSis(e.target.value)} placeholder="120"
                        className={`w-full text-xl md:text-2xl font-black text-center rounded-xl py-2 md:py-3 border-2 focus:border-teal-500 focus:outline-none transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                      />
                      <span className="text-2xl md:text-3xl text-gray-300 dark:text-gray-600 font-light">/</span>
                      <input type="number" value={formPressaoDia} onChange={(e) => setFormPressaoDia(e.target.value)} placeholder="80"
                        className={`w-full text-xl md:text-2xl font-black text-center rounded-xl py-2 md:py-3 border-2 focus:border-teal-500 focus:outline-none transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 md:gap-4">
                    <div className={`w-1/2 p-4 rounded-2xl border transition-colors ${isDarkMode ? 'bg-gray-900/40 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                      <label className="flex items-center gap-1 md:gap-2 font-bold mb-2 md:mb-3 text-xs md:text-sm">
                        <Activity className="w-4 h-4 text-blue-500"/> Oxigênio
                      </label>
                      <div className="flex items-center gap-1">
                        <input type="number" value={formOxi} onChange={(e) => setFormOxi(e.target.value)} placeholder="98"
                          className={`w-full text-lg md:text-2xl font-black text-center rounded-xl py-2 md:py-3 border-2 focus:border-teal-500 focus:outline-none transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                        />
                        <span className="text-gray-400 font-medium text-sm md:text-base">%</span>
                      </div>
                    </div>
                    
                    <div className={`w-1/2 p-4 rounded-2xl border transition-colors ${isDarkMode ? 'bg-gray-900/40 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                      <label className="flex items-center gap-1 md:gap-2 font-bold mb-2 md:mb-3 text-xs md:text-sm">
                        <Activity className="w-4 h-4 text-rose-500"/> Batimentos
                      </label>
                      <div className="flex items-center gap-1">
                        <input type="number" value={formBpm} onChange={(e) => setFormBpm(e.target.value)} placeholder="75"
                          className={`w-full text-lg md:text-2xl font-black text-center rounded-xl py-2 md:py-3 border-2 focus:border-teal-500 focus:outline-none transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                        />
                        <span className="text-gray-400 font-medium text-xs md:text-sm">BPM</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={salvarMedicoes} className="w-full bg-teal-600 hover:bg-teal-700 text-white text-lg md:text-xl font-bold py-3 md:py-4 rounded-xl shadow-lg active:scale-95 transition-all">
                  Confirmar Dados
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}