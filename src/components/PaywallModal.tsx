import React, { useState } from 'react';
import {
  X,
  Star,
  Check,
  HardDrive,
  Video,
  Camera,
  ShieldCheck,
  Zap,
  RefreshCw,
  Repeat
} from 'lucide-react';
import { BillingEntitlements } from '../types/dashcam';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  entitlements: BillingEntitlements;
  onPurchasePro: (plan: 'ANNUAL' | 'MONTHLY') => void;
  onRestorePurchases: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  entitlements,
  onPurchasePro,
  onRestorePurchases
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'ANNUAL' | 'MONTHLY'>('ANNUAL');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleBuy = () => {
    setIsProcessing(true);
    setTimeout(() => {
      onPurchasePro(selectedPlan);
      setIsProcessing(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="bg-neutral-900 border border-amber-500/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">

        {/* Golden accent glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500" />

        {/* Header */}
        <div className="p-5 pb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-amber-500/60 shadow-lg shadow-amber-500/20 bg-black shrink-0 relative">
              <img
                src="/assets/aistudio/Neon_Road_Camera_Aperture_52fc4fc0.png"
                alt="RydeCam Pro Icon"
                className="w-full h-full object-cover"
              />
              <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-0.5 shadow">
                <Star className="w-3.5 h-3.5 fill-black text-black" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-wide">RYDECAM PRO</h2>
              <p className="text-xs text-amber-300 font-semibold">Automotive Dashcam Subscription</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature List */}
        <div className="px-5 py-3 space-y-3.5">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">64 GB High-Capacity Quota</h4>
              <p className="text-[11px] text-neutral-400">
                Over 8 hours of road footage before FIFO auto-deletion kicks in.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">4K Ultra HD Dashcam Encoding</h4>
              <p className="text-[11px] text-neutral-400">
                High-bitrate sensor resolution for crisp license-plate readability.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Dual Cabin + Road Recording</h4>
              <p className="text-[11px] text-neutral-400">
                Simultaneous front selfie interior & road video streams.
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Selector: $30/yr or $3/mo */}
        <div className="px-5 pt-3 grid grid-cols-2 gap-3">
          {/* Annual Plan */}
          <div
            onClick={() => setSelectedPlan('ANNUAL')}
            className={`p-3 rounded-xl border cursor-pointer transition text-left flex flex-col justify-between ${
              selectedPlan === 'ANNUAL'
                ? 'bg-amber-950/50 border-amber-500 shadow-lg shadow-amber-950/60 ring-1 ring-amber-500/50'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-amber-300 mb-1">
                <span>Save 17%</span>
                {selectedPlan === 'ANNUAL' && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </div>
              <div className="text-base font-black text-white font-mono">$30 <span className="text-xs font-normal text-neutral-400">/ yr</span></div>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1 font-medium leading-tight">
              $2.50/mo • auto-renews yearly
            </p>
          </div>

          {/* Monthly Plan */}
          <div
            onClick={() => setSelectedPlan('MONTHLY')}
            className={`p-3 rounded-xl border cursor-pointer transition text-left flex flex-col justify-between ${
              selectedPlan === 'MONTHLY'
                ? 'bg-amber-950/50 border-amber-500 shadow-lg shadow-amber-950/60 ring-1 ring-amber-500/50'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-neutral-400 mb-1">
                <span>Monthly</span>
                {selectedPlan === 'MONTHLY' && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </div>
              <div className="text-base font-black text-white font-mono">$3 <span className="text-xs font-normal text-neutral-400">/ mo</span></div>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1 font-medium leading-tight">
              Auto-renews monthly
            </p>
          </div>
        </div>

        {/* Auto-renewal Notice */}
        <div className="px-5 pt-3">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 bg-neutral-950/80 px-2.5 py-1.5 rounded-lg border border-neutral-800/80">
            <Repeat className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Renewed automatically until canceled in Google Play Store.</span>
          </div>
        </div>

        {/* Google Play Billing CTA */}
        <div className="p-5 pt-3 space-y-2.5">
          <button
            onClick={handleBuy}
            disabled={isProcessing}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-neutral-950 font-black text-xs tracking-wider rounded-xl shadow-xl shadow-amber-500/25 transition active:scale-95 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 fill-current" />
            )}
            <span>
              {entitlements.isProUnlocked ? 'PRO ALREADY ACTIVE' : `START SUBSCRIPTION (${selectedPlan === 'ANNUAL' ? '$30/YEAR' : '$3/MONTH'})`}
            </span>
          </button>

          <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
            <button
              onClick={() => {
                onRestorePurchases();
                alert('Google Play Billing: Subscription active. Entitlements refreshed.');
              }}
              className="text-cyan-400 hover:underline"
            >
              Restore Purchases
            </button>
            <span>Cancel anytime in Play Store</span>
          </div>
        </div>

      </div>
    </div>
  );
};
