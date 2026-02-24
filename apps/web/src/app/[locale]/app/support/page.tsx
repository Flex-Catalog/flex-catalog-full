'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';

interface Ticket {
  id: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  messages: { id: string; content: string; senderId: string; senderName: string; isAdmin: boolean; createdAt: string }[];
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  isAdmin: boolean;
  content: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

const categoryLabels: Record<string, string> = {
  FEATURE_REQUEST: 'Feature Request',
  BUG_REPORT: 'Bug Report',
  COMPLAINT: 'Complaint',
  QUESTION: 'Question',
  OTHER: 'Other',
};

export default function SupportPage() {
  const t = useTranslations('support');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<(Ticket & { messages: Message[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [newTicket, setNewTicket] = useState({
    category: 'QUESTION',
    subject: '',
    message: '',
    priority: 'MEDIUM',
  });

  const loadTickets = () => {
    api.get('/support/tickets')
      .then((res) => setTickets(Array.isArray(res.data) ? res.data : res.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/support/tickets', newTicket);
      setShowNew(false);
      setNewTicket({ category: 'QUESTION', subject: '', message: '', priority: 'MEDIUM' });
      loadTickets();
    } catch {}
  };

  const handleSelectTicket = async (id: string) => {
    try {
      const res = await api.get(`/support/tickets/${id}`);
      setSelectedTicket(res.data);
    } catch {}
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyContent.trim()) return;
    try {
      await api.post(`/support/tickets/${selectedTicket.id}/messages`, {
        content: replyContent,
      });
      setReplyContent('');
      handleSelectTicket(selectedTicket.id);
    } catch {}
  };

  if (loading) {
    return <div className="p-8 text-gray-500">{t('loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <button
          onClick={() => { setShowNew(true); setSelectedTicket(null); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          {t('newTicket')}
        </button>
      </div>

      {/* New Ticket Form */}
      {showNew && (
        <form onSubmit={handleCreateTicket} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold">{t('newTicket')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('category')}</label>
              <select
                value={newTicket.category}
                onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="FEATURE_REQUEST">{t('categories.featureRequest')}</option>
                <option value="BUG_REPORT">{t('categories.bugReport')}</option>
                <option value="COMPLAINT">{t('categories.complaint')}</option>
                <option value="QUESTION">{t('categories.question')}</option>
                <option value="OTHER">{t('categories.other')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('priority')}</label>
              <select
                value={newTicket.priority}
                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="LOW">{t('priorities.low')}</option>
                <option value="MEDIUM">{t('priorities.medium')}</option>
                <option value="HIGH">{t('priorities.high')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('subject')}</label>
            <input
              type="text"
              value={newTicket.subject}
              onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('message')}</label>
            <textarea
              value={newTicket.message}
              onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              {t('send')}
            </button>
            <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              {t('cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Ticket Detail */}
      {selectedTicket && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{selectedTicket.subject}</h2>
              <div className="flex gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedTicket.status]}`}>
                  {selectedTicket.status}
                </span>
                <span className="text-xs text-gray-500">{categoryLabels[selectedTicket.category]}</span>
              </div>
            </div>
            <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-gray-600 text-sm">
              {t('close')}
            </button>
          </div>
          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            {selectedTicket.messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isAdmin ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${msg.isAdmin ? 'bg-blue-50 border border-blue-100' : 'bg-gray-100'}`}>
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    {msg.senderName} {msg.isAdmin && `(${t('admin')})`}
                  </p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(msg.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {selectedTicket.status !== 'CLOSED' && (
            <div className="px-6 py-4 border-t border-gray-200 flex gap-2">
              <input
                type="text"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={t('replyPlaceholder')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleReply()}
              />
              <button
                onClick={handleReply}
                disabled={!replyContent.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {t('send')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tickets List */}
      {!showNew && !selectedTicket && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('subject')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('category')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('statusLabel')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => handleSelectTicket(ticket.id)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">{ticket.subject}</td>
                    <td className="px-6 py-4 text-gray-600">{categoryLabels[ticket.category] || ticket.category}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status]}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      {t('noTickets')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
