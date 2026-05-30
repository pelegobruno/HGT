"use client";

import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { Heart, Activity, Droplet, PlusCircle, X, Bell, Camera, AlertCircle, Edit2 } from 'lucide-react';

import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase"; 

interface Medicao {
  id?: string;
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

export default function EloVitalApp() {
  const [isMounted, setIsMounted] = useState(false);
  
  const [fotoPerfil, setFotoPerfil] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fotoPerfilEloVital') || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80";
    }
    return "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80";
  });

  const [nomeUsuario, setNomeUsuario] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nomePacienteEloVital') || "Família";
    }
    return "Família";
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 1);
    return () => clearTimeout(timer);
  }, []);

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

  const trocarFoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();

      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFotoPerfil(base64String);
        localStorage.setItem('fotoPerfilEloVital', base64String);
      };

      reader.readAsDataURL(file);
    }
  };

  const editarNome = () => {
    const novoNome = prompt("Digite o nome do paciente:", nomeUsuario);
    if (novoNome && novoNome.trim() !== "") {
      setNomeUsuario(novoNome);
      localStorage.setItem('nomePacienteEloVital', novoNome);
    }
  };

  useEffect(() => {
    const q = query(collection(db, "medicoes"), orderBy("timestamp", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dados: Medicao[] = [];
      snapshot.forEach((doc) => {
        dados.push({ id: doc.id, ...doc.data() } as Medicao);
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
      }
    });

    return () => unsubscribe();
  }, []);

  const salvarMedicoes = async () => {
    if (!formHGT && !formPressaoSis && !formPressaoDia && !formOxi && !formBpm) {
      setModalAberto(false);
      return;
    }

    const dataExata = new Date().toLocaleDateString('pt-BR');
    const horaExata = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let pressaoFinal = "--";
    if (formPressaoSis || formPressaoDia) {
      pressaoFinal = `${formPressaoSis || "0"}/${formPressaoDia || "0"}`;
    }

    const novoRegistro = {
      data: dataExata,
      hora: horaExata,
      hgtNumero: formHGT ? parseInt(formHGT) : null,
      hgtTexto: formHGT || "--",
      pressao: pressaoFinal,
      oximetria: formOxi || "--",
      batimentos: formBpm || "--",
      timestamp: serverTimestamp() 
    };

    try {
      await addDoc(collection(db, "medicoes"), novoRegistro);
      
      setFormHGT("");
      setFormPressaoSis("");
      setFormPressaoDia("");
      setFormOxi("");
      setFormBpm("");
      setModalAberto(false);
    } catch (error) {
      console.error("Erro ao salvar no Firebase:", error);
      alert("Erro ao conectar com o banco de dados. Verifique o console.");
    }
  };

  const obterStatus = (tipo: string, valor: string) => {
    if (!valor || valor === "--") return null;

    if (tipo === "HGT") {
      const num = parseInt(valor);
      if (num < 70) return { texto: "Baixa", cor: "bg-red-100 text-red-700" };
      if (num <= 130) return { texto: "Normal", cor: "bg-green-100 text-green-700" };
      if (num <= 180) return { texto: "Atenção", cor: "bg-amber-100 text-amber-700" };
      return { texto: "Alta", cor: "bg-red-100 text-red-700" };
    }

    if (tipo === "Pressao") {
      const partes = valor.split('/');
      if (partes.length !== 2) return null;
      const sis = parseInt(partes[0]);
      const dia = parseInt(partes[1]);
      
      if (sis < 100 || dia < 60) return { texto: "Baixa", cor: "bg-amber-100 text-amber-700" };
      if (sis <= 130 && dia <= 85) return { texto: "Normal", cor: "bg-green-100 text-green-700" };
      if (sis <= 139 || dia <= 89) return { texto: "Atenção", cor: "bg-amber-100 text-amber-700" };
      return { texto: "Alta", cor: "bg-red-100 text-red-700" };
    }

    if (tipo === "SpO2") {
      const num = parseInt(valor);
      if (num >= 95) return { texto: "Normal", cor: "bg-green-100 text-green-700" };
      if (num >= 90) return { texto: "Atenção", cor: "bg-amber-100 text-amber-700" };
      return { texto: "Baixa", cor: "bg-red-100 text-red-700" };
    }

    if (tipo === "BPM") {
      const num = parseInt(valor);
      if (num >= 60 && num <= 100) return { texto: "Normal", cor: "bg-green-100 text-green-700" };
      if ((num >= 50 && num < 60) || (num > 100 && num <= 120)) return { texto: "Atenção", cor: "bg-amber-100 text-amber-700" };
      return { texto: "Alerta", cor: "bg-red-100 text-red-700" };
    }

    return null;
  };

  const statusGlicemia = obterStatus("HGT", glicemiaAtual);
  const statusPressao = obterStatus("Pressao", pressaoAtual);
  const statusOxi = obterStatus("SpO2", oximetriaAtual);
  const statusBpm = obterStatus("BPM", batimentosAtual);

  const dadosGrafico = listaMedicoes.filter(medicao => medicao.hgtNumero !== null);
  const precisaLembrete = listaMedicoes.length === 0;

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans antialiased text-gray-800">
      
      <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          
          <div className="flex items-center gap-3 text-teal-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/icon.png" 
              alt="Logo EloVital" 
              className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-contain shadow-sm"
            />
            
            <div className="flex flex-col justify-center">
              <span className="text-lg md:text-xl font-extrabold tracking-tight leading-none mb-1">EloVital</span>
              <button onClick={editarNome} className="text-gray-400 font-medium text-xs md:text-sm text-left flex items-center gap-1 hover:text-teal-600 transition-colors">
                {nomeUsuario} <Edit2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-8 font-medium text-sm text-gray-500">
            <span 
              onClick={() => setAbaAtiva('painel')}
              className={`pb-1 cursor-pointer transition-colors ${abaAtiva === 'painel' ? 'text-teal-600 border-b-2 border-teal-600 font-semibold' : 'hover:text-teal-600'}`}
            >
              Painel Central
            </span>
            <span 
              onClick={() => setAbaAtiva('historico')}
              className={`pb-1 cursor-pointer transition-colors ${abaAtiva === 'historico' ? 'text-teal-600 border-b-2 border-teal-600 font-semibold' : 'hover:text-teal-600'}`}
            >
              Histórico Clínico
            </span>
          </div>

          <div className="flex items-center gap-4 md:gap-5">
            <button className="text-gray-400 hover:text-teal-600 transition relative">
              <Bell className="w-5 h-5 md:w-6 md:h-6" />
              {precisaLembrete && (
                <span className="absolute top-0 right-0 flex h-2 w-2 md:h-3 md:w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 md:h-3 md:w-3 bg-red-500"></span>
                </span>
              )}
            </button>
            <div className="h-8 w-px bg-gray-200 mx-1 md:mx-2 hidden md:block"></div>
            
            <div className="relative group cursor-pointer" onClick={() => inputFotoRef.current?.click()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={fotoPerfil} 
                alt="Perfil" 
                className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-white shadow-md object-cover group-hover:opacity-75 transition-all"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-4 h-4 md:w-5 md:h-5 text-white drop-shadow-md" />
              </div>
              <input type="file" ref={inputFotoRef} onChange={trocarFoto} accept="image/*" className="hidden" />
            </div>
          </div>
        </div>
      </nav>

      <div className="md:hidden flex bg-white border-b border-gray-200 shadow-sm sticky top-[72px] z-20">
        <button 
          onClick={() => setAbaAtiva('painel')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${abaAtiva === 'painel' ? 'border-teal-500 text-teal-700 bg-teal-50/30' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
        >
          Painel Central
        </button>
        <button 
          onClick={() => setAbaAtiva('historico')}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${abaAtiva === 'historico' ? 'border-teal-500 text-teal-700 bg-teal-50/30' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
        >
          Histórico Clínico
        </button>
      </div>

      {precisaLembrete && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-3 md:p-4 mx-4 md:mx-6 lg:mx-auto max-w-7xl mt-4 md:mt-6 rounded-r-xl shadow-sm flex items-center gap-3 md:gap-4">
          <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-amber-500 flex-shrink-0" />
          <p className="text-amber-800 font-medium text-sm md:text-base">Lembrete: Você ainda não registrou os sinais vitais de hoje.</p>
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
                  {precisaLembrete ? "Nuvem conectada. Faça a primeira medição." : "Sinais vitais salvos na nuvem e atualizados!"}
                </p>
              </div>
              
              <button 
                onClick={() => setModalAberto(true)}
                className="relative z-10 w-full md:w-auto justify-center bg-white text-teal-700 hover:bg-gray-50 px-6 py-3 md:px-8 md:py-4 rounded-full font-bold flex items-center gap-2 md:gap-3 transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95 border-2 border-transparent hover:border-teal-100"
              >
                <PlusCircle className="w-5 h-5 md:w-6 md:h-6 text-teal-500" />
                <span className="text-base md:text-lg">Nova Medição</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-10">
              
              <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3 md:mb-4">
                    <div className="bg-red-50 p-2 md:p-3 rounded-xl"><Droplet className="w-5 h-5 md:w-6 md:h-6 text-red-500" /></div>
                    {statusGlicemia && (
                      <span className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${statusGlicemia.cor}`}>
                        {statusGlicemia.texto}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 font-medium text-sm md:text-base mb-1">Glicemia (HGT)</p>
                </div>
                <div className="flex items-baseline gap-2 mt-1 md:mt-2">
                  <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900">{glicemiaAtual}</h3>
                  {glicemiaAtual !== "--" && <span className="text-gray-400 font-medium text-xs md:text-sm">mg/dL</span>}
                </div>
              </div>

              <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3 md:mb-4">
                    <div className="bg-emerald-50 p-2 md:p-3 rounded-xl"><Heart className="w-5 h-5 md:w-6 md:h-6 text-emerald-500" /></div>
                    {statusPressao && (
                      <span className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${statusPressao.cor}`}>
                        {statusPressao.texto}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 font-medium text-sm md:text-base mb-1">Pressão Arterial</p>
                </div>
                <div className="flex items-baseline gap-2 mt-1 md:mt-2">
                  <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900">{pressaoAtual}</h3>
                  {pressaoAtual !== "--" && <span className="text-gray-400 font-medium text-xs md:text-sm">mmHg</span>}
                </div>
              </div>

              <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3 md:mb-4">
                    <div className="bg-blue-50 p-2 md:p-3 rounded-xl"><Activity className="w-5 h-5 md:w-6 md:h-6 text-blue-500" /></div>
                    {statusOxi && (
                      <span className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${statusOxi.cor}`}>
                        {statusOxi.texto}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 font-medium text-sm md:text-base mb-1">Oxigênio (SpO2)</p>
                </div>
                <div className="flex items-baseline gap-2 mt-1 md:mt-2">
                  <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900">{oximetriaAtual}</h3>
                  {oximetriaAtual !== "--" && <span className="text-gray-400 font-medium text-xs md:text-sm">%</span>}
                </div>
              </div>

              <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3 md:mb-4">
                    <div className="bg-rose-50 p-2 md:p-3 rounded-xl"><Activity className="w-5 h-5 md:w-6 md:h-6 text-rose-500" /></div>
                    {statusBpm && (
                      <span className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${statusBpm.cor}`}>
                        {statusBpm.texto}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 font-medium text-sm md:text-base mb-1">Batimentos Cardíacos</p>
                </div>
                <div className="flex items-baseline gap-2 mt-1 md:mt-2">
                  <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900">{batimentosAtual}</h3>
                  {batimentosAtual !== "--" && <span className="text-gray-400 font-medium text-xs md:text-sm">BPM</span>}
                </div>
              </div>

            </div>

            <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-gray-100">
              <div className="mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Evolução Glicêmica (HGT)</h2>
                <p className="text-sm md:text-base text-gray-500 mt-1">Sincronizado com a nuvem do Firebase</p>
              </div>
              
              <div className="h-64 md:h-96 w-full">
                {dadosGrafico.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50 p-4 text-center">
                    <Droplet className="w-10 h-10 md:w-12 md:h-12 mb-3 md:mb-4 text-gray-300" />
                    <p className="text-base md:text-lg font-bold">Sem dados de HGT no banco</p>
                    <p className="text-xs md:text-sm">Preencha a Glicemia para visualizar a curva.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dadosGrafico} margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                      <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <ReferenceArea y1={70} y2={130} fill="#10B981" fillOpacity={0.08} />
                      <Line type="monotone" dataKey="hgtNumero" name="Glicemia" stroke="#0D9488" strokeWidth={4} dot={{ r: 4, fill: '#fff', strokeWidth: 2, stroke: '#0D9488' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'historico' && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6 md:mb-8">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">Histórico da Nuvem</h2>
                </div>
              </div>

              {listaMedicoes.length === 0 ? (
                <div className="text-center py-12 md:py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <p className="text-gray-500 font-medium">O banco de dados está vazio.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-5 md:mx-0">
                  <div className="inline-block min-w-full align-middle px-5 md:px-0">
                    <table className="min-w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-100 text-gray-500 text-xs md:text-sm uppercase tracking-wider">
                          <th className="pb-3 md:pb-4 px-3 md:px-4 font-semibold whitespace-nowrap">Data</th>
                          <th className="pb-3 md:pb-4 px-3 md:px-4 font-semibold whitespace-nowrap">Hora</th>
                          <th className="pb-3 md:pb-4 px-3 md:px-4 font-semibold whitespace-nowrap">HGT</th>
                          <th className="pb-3 md:pb-4 px-3 md:px-4 font-semibold whitespace-nowrap">Pressão</th>
                          <th className="pb-3 md:pb-4 px-3 md:px-4 font-semibold whitespace-nowrap">SpO2</th>
                          <th className="pb-3 md:pb-4 px-3 md:px-4 font-semibold whitespace-nowrap">BPM</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-700 text-sm md:text-base">
                        {listaMedicoes.slice().reverse().map((medicao, index) => (
                          <tr key={medicao.id || index} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="py-3 md:py-4 px-3 md:px-4 whitespace-nowrap">{medicao.data || "--"}</td>
                            <td className="py-3 md:py-4 px-3 md:px-4 font-medium whitespace-nowrap">{medicao.hora}</td>
                            <td className="py-3 md:py-4 px-3 md:px-4 whitespace-nowrap">{medicao.hgtTexto} {medicao.hgtTexto !== "--" && <span className="text-xs text-gray-400">mg/dL</span>}</td>
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

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-0">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setModalAberto(false)}></div>
          
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative z-10 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Nova Medição</h2>
              <button onClick={() => setModalAberto(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-5 md:space-y-6 mb-6 md:mb-8 max-h-[60vh] overflow-y-auto pr-1 md:pr-2">
              
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <label className="flex items-center gap-2 text-gray-700 font-bold mb-2 md:mb-3 text-sm md:text-base">
                  <Droplet className="w-4 h-4 md:w-5 md:h-5 text-red-500"/> Glicemia (HGT)
                </label>
                <div className="flex items-center gap-3">
                  <input type="number" value={formHGT} onChange={(e) => setFormHGT(e.target.value)} placeholder="000"
                    className="w-full text-xl md:text-2xl font-black text-center text-gray-900 bg-white border-2 border-gray-200 rounded-xl py-2 md:py-3 focus:border-teal-500 focus:outline-none transition-colors"
                  />
                  <span className="text-gray-400 font-medium text-sm md:text-base">mg/dL</span>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <label className="flex items-center gap-2 text-gray-700 font-bold mb-2 md:mb-3 text-sm md:text-base">
                  <Heart className="w-4 h-4 md:w-5 md:h-5 text-emerald-500"/> Pressão Arterial
                </label>
                <div className="flex items-center justify-center gap-2 md:gap-3">
                  <input type="number" value={formPressaoSis} onChange={(e) => setFormPressaoSis(e.target.value)} placeholder="120"
                    className="w-full text-xl md:text-2xl font-black text-center text-gray-900 bg-white border-2 border-gray-200 rounded-xl py-2 md:py-3 focus:border-teal-500 focus:outline-none transition-colors"
                  />
                  <span className="text-2xl md:text-3xl text-gray-300 font-light">/</span>
                  <input type="number" value={formPressaoDia} onChange={(e) => setFormPressaoDia(e.target.value)} placeholder="80"
                    className="w-full text-xl md:text-2xl font-black text-center text-gray-900 bg-white border-2 border-gray-200 rounded-xl py-2 md:py-3 focus:border-teal-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex gap-3 md:gap-4">
                <div className="w-1/2">
                  <label className="flex items-center gap-1 md:gap-2 text-gray-700 font-bold mb-2 md:mb-3 text-xs md:text-sm">
                    <Activity className="w-4 h-4 text-blue-500"/> Oxigênio
                  </label>
                  <div className="flex items-center gap-1">
                    <input type="number" value={formOxi} onChange={(e) => setFormOxi(e.target.value)} placeholder="98"
                      className="w-full text-lg md:text-2xl font-black text-center text-gray-900 bg-white border-2 border-gray-200 rounded-xl py-2 md:py-3 focus:border-teal-500 focus:outline-none transition-colors"
                    />
                    <span className="text-gray-400 font-medium text-sm md:text-base">%</span>
                  </div>
                </div>
                
                <div className="w-1/2">
                  <label className="flex items-center gap-1 md:gap-2 text-gray-700 font-bold mb-2 md:mb-3 text-xs md:text-sm">
                    <Activity className="w-4 h-4 text-rose-500"/> Batimentos
                  </label>
                  <div className="flex items-center gap-1">
                    <input type="number" value={formBpm} onChange={(e) => setFormBpm(e.target.value)} placeholder="75"
                      className="w-full text-lg md:text-2xl font-black text-center text-gray-900 bg-white border-2 border-gray-200 rounded-xl py-2 md:py-3 focus:border-teal-500 focus:outline-none transition-colors"
                    />
                    <span className="text-gray-400 font-medium text-xs md:text-sm">BPM</span>
                  </div>
                </div>
              </div>

            </div>

            <button 
              onClick={salvarMedicoes}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white text-lg md:text-xl font-bold py-3 md:py-4 rounded-xl shadow-lg active:scale-95 transition-all"
            >
              Confirmar Dados
            </button>
          </div>
        </div>
      )}

    </div>
  );
}