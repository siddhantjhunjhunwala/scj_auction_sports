import type { AuctionStatus } from '../../types';

interface Props {
  status: AuctionStatus;
  message?: string;
}

export default function AuctionStatusBanner({ status, message }: Props) {
  if (status === 'in_progress') return null;

  const config: Record<AuctionStatus, { text: string; bgClass: string; textClass: string }> = {
    not_started: {
      text: message || 'Auction not started',
      bgClass: 'bg-gray-100',
      textClass: 'text-gray-700',
    },
    paused: {
      text: message || 'Auction paused. Please wait...',
      bgClass: 'bg-yellow-100',
      textClass: 'text-yellow-800',
    },
    completed: {
      text: message || 'Auction has ended',
      bgClass: 'bg-blue-100',
      textClass: 'text-blue-800',
    },
    in_progress: {
      text: '',
      bgClass: '',
      textClass: '',
    },
  };

  const { text, bgClass, textClass } = config[status];

  return (
    <div className={`${bgClass} ${textClass} px-4 py-3 rounded-lg text-center font-medium`}>
      {text}
    </div>
  );
}
