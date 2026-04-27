import { useState } from "react";
import {
  XMarkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ChatBubbleLeftEllipsisIcon,
  DevicePhoneMobileIcon,
  PhoneIcon,
  EnvelopeIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import type { Retailer } from "@/types/retailer";
import { getAllOutreachScripts, type OutreachChannel } from "@/utils/retailerOutreach";

interface Props {
  retailer: Retailer;
  onClose: () => void;
  onLogOutreach?: (channel: OutreachChannel, message: string) => void;
}

const CHANNEL_ICONS: Record<OutreachChannel, React.ElementType> = {
  whatsapp: ChatBubbleLeftEllipsisIcon,
  sms: DevicePhoneMobileIcon,
  call: PhoneIcon,
  email: EnvelopeIcon,
  in_person: UsersIcon,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 fbf-scrim">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg flex flex-col max-h-[90vh] ring-1 ring-charcoal-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-100">
          <div>
            <p className="eyebrow mb-1">Outreach</p>
            <h2 className="heading-h1 text-base">Generate a script</h2>
            <p className="text-xs text-charcoal-400 mt-0.5">{retailer.businessName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-cream-100 text-charcoal-400 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 overflow-x-auto">
          {scripts.map((s) => {
            const Icon = CHANNEL_ICONS[s.channel];
            const isActive = active === s.channel;
            return (
              <button
                key={s.channel}
                onClick={() => setActive(s.channel)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors duration-150 ease-standard ${
                  isActive
                    ? "bg-green-500 text-white shadow-sm"
                    : "text-charcoal-500 hover:bg-cream-100"
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {current.channel === "email" && current.subject && (
            <div className="mb-3 p-3 bg-cream-100 rounded-md ring-1 ring-charcoal-100/60">
              <p className="eyebrow mb-1">Subject</p>
              <p className="text-sm font-semibold text-charcoal-700">{current.subject}</p>
            </div>
          )}
          <div className="bg-cream-100 rounded-md p-4 ring-1 ring-charcoal-100/60">
            <pre className="text-sm text-charcoal-700 whitespace-pre-wrap font-sans leading-relaxed">
              {current.content}
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-charcoal-100 gap-3">
          <button onClick={copyToClipboard} className="btn-secondary flex-1">
            {copied ? (
              <>
                <CheckIcon className="h-4 w-4 text-green-500" strokeWidth={2} />
                Copied
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="h-4 w-4" strokeWidth={2} />
                Copy script
              </>
            )}
          </button>
          {onLogOutreach && (
            <button onClick={handleLog} className="btn-primary flex-1">
              Mark sent &amp; log
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
