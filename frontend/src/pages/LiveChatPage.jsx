import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import { HiOutlinePaperAirplane, HiOutlineChat, HiOutlineRefresh, HiOutlineCheckCircle } from 'react-icons/hi';

export default function LiveChatPage() {
  const [conversations, setConversations] = useState([]);
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const { subscribe } = useSocket();

  useEffect(() => {
    loadData();
  }, []);

  // Escuchar mensajes en tiempo real
  useEffect(() => {
    const unsubChat = subscribe('live_chat_message', (data) => {
      if (selectedChat && data.whatsappNumber === selectedChat.whatsappNumber) {
        setMessages((prev) => [...prev, {
          _id: Date.now(),
          direction: data.direction,
          body: data.message,
          createdAt: data.timestamp
        }]);
      }
      loadConversations();
    });

    const unsubTransfer = subscribe('transfer_pending', () => {
      loadPendingTransfers();
    });

    const unsubConfirmed = subscribe('transfer_confirmed', () => {
      loadPendingTransfers();
    });

    return () => { unsubChat(); unsubTransfer(); unsubConfirmed(); };
  }, [subscribe, selectedChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadConversations(), loadPendingTransfers()]);
    setLoading(false);
  };

  const loadConversations = async () => {
    try {
      const res = await api.get('/chat/conversations');
      setConversations(res.data.data);
    } catch {
      // Silenciar error
    }
  };

  const loadPendingTransfers = async () => {
    try {
      const res = await api.get('/chat/pending-transfers');
      setPendingTransfers(res.data.data);
    } catch {
      // Silenciar error
    }
  };

  const selectChat = async (chat) => {
    setSelectedChat(chat);
    try {
      const res = await api.get(`/chat/${encodeURIComponent(chat.whatsappNumber)}/messages`);
      setMessages(res.data.data);
    } catch {
      toast.error('Error cargando mensajes');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    setSending(true);
    try {
      await api.post('/chat/send', {
        whatsappNumber: selectedChat.whatsappNumber,
        message: newMessage.trim()
      });
      setMessages((prev) => [...prev, {
        _id: Date.now(),
        direction: 'outbound',
        body: newMessage.trim(),
        createdAt: new Date().toISOString()
      }]);
      setNewMessage('');
    } catch {
      toast.error('Error enviando mensaje');
    } finally {
      setSending(false);
    }
  };

  const confirmTransfer = async (whatsappNumber) => {
    try {
      await api.post('/chat/confirm-transfer-by-phone', { whatsappNumber });
      toast.success('Transferencia confirmada');
      loadPendingTransfers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error confirmando transferencia');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-fresanova-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Chat en Vivo</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Conversa con clientes y confirma transferencias</p>
        </div>
        <button onClick={loadData} className="btn-secondary flex items-center gap-2">
          <HiOutlineRefresh className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Transferencias pendientes */}
      {pendingTransfers.length > 0 && (
        <div className="card border-l-4 border-yellow-500">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            💸 Transferencias Pendientes ({pendingTransfers.length})
          </h3>
          <div className="space-y-3">
            {pendingTransfers.map((transfer) => (
              <div key={transfer._id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{transfer.customerName}</p>
                  <p className="text-sm text-gray-500">{transfer.phone}</p>
                  {transfer.transferProofUrl && (
                    <a
                      href={transfer.transferProofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      📸 Ver comprobante
                    </a>
                  )}
                </div>
                <button
                  onClick={() => confirmTransfer(transfer.whatsappNumber)}
                  className="btn-primary flex items-center gap-2 py-2 px-3"
                >
                  <HiOutlineCheckCircle className="w-4 h-4" /> Confirmar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Lista de conversaciones */}
        <div className="card overflow-hidden p-0 flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <HiOutlineChat className="w-5 h-5" /> Conversaciones
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No hay chats activos</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv._id}
                  onClick={() => selectChat(conv)}
                  className={`w-full text-left p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                    selectedChat?._id === conv._id ? 'bg-fresanova-50 dark:bg-fresanova-900/20' : ''
                  }`}
                >
                  <p className="font-medium text-gray-900 dark:text-white">{conv.customerName}</p>
                  <p className="text-xs text-gray-500">{conv.phone}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Panel de chat */}
        <div className="lg:col-span-2 card overflow-hidden p-0 flex flex-col">
          {!selectedChat ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <HiOutlineChat className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Selecciona una conversación para comenzar</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header del chat */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <p className="font-semibold text-gray-900 dark:text-white">{selectedChat.customerName}</p>
                <p className="text-xs text-gray-500">{selectedChat.whatsappNumber}</p>
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        msg.direction === 'outbound'
                          ? 'bg-fresanova-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      <p className={`text-[10px] mt-1 ${
                        msg.direction === 'outbound' ? 'text-fresanova-100' : 'text-gray-400'
                      }`}>
                        {new Date(msg.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="input-field flex-1"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="btn-primary px-4 disabled:opacity-50"
                >
                  <HiOutlinePaperAirplane className="w-5 h-5" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
