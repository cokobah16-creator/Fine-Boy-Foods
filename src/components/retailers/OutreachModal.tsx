import { useState } from "react";
import { XMarkIcon, ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/outline";
import type { Retailer } from "@/types/retailer";
import { getAllOutreachScripts, type OutreachChannel } from "@/utils/retailerOutreach";

interface Props {
  retailer: Retailer;
  onClose: () => void;
  onLogOutreach?: (channel: OutreachChannel, message: string) => void;
}

const CHANNEL_ICONS: Record<OutreachChannel, string> = {
  whatsapp: "💬",
  sms: "📱",
  call: "📞",
  email: "✉️",
  in_person: "🤝",
};

export function OutreachModal({ retailer, onClose, onLogOutreach }: Props) {
  const scripts = getAllOutreachScripts(retailer);
  const [active, setActive] = useState<OutreachChannel>("whatsapp");
  const [copied, setCopied] = useState(false);

  const current = scripts.find((s) => s.channel === active)!;

  function copyToClipboard() {
    const text =
      current.channel === "email"
        ? `Subject: ${current.subject}\n\n${current.content}`
        : current.content;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleLog() {
    onLogOutreach?.(current.channel, current.content);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Outreach Scripts</h2>
            <p className="text-xs text-gray-500 mt-0.5">{retailer.businessName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 overflow-x-auto">
          {scripts.map((s) => (
            <button
              key={s.channel}
              onClick={() => setActive(s.channel)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                active === s.channel
                  ? "bg-brand-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span>{CHANNEL_ICONS[s.channel]}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {current.channel === "email" && current.subject && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Subject</p>
              <p className="text-sm font-medium text-gray-800">{current.subject}</p>
            </div>
          )}
          <div className="bg-gray-50 rounded-xl p-4">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
              {current.content}
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 gap-3">
          <button
            onClick={copyToClipboard}
            className="btn-secondary flex-1"
          >
            {copied ? (
              <>
                <CheckIcon className="h-4 w-4 text-emerald-500" />
                Copied!
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="h-4 w-4" />
                Copy Script
              </>
            )}
          </button>
          {onLogOutreach && (
            <button onClick={handleLog} className="btn-primary flex-1">
              Mark as Sent & Log
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
