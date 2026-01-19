import { useEffect, useRef } from 'react';
import type { BidLogEntry } from '../../types';

interface Props {
  biddingLog: BidLogEntry[];
  currentParticipantId?: string;
}

export default function LiveBiddingTable({ biddingLog, currentParticipantId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new bids come in
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [biddingLog]);

  if (biddingLog.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-500">No bids yet. Be the first to bid!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Live Bidding</h3>
      </div>
      <div ref={containerRef} className="max-h-64 overflow-y-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                Team
              </th>
              <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                Bid
              </th>
              <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                Time
              </th>
            </tr>
          </thead>
          <tbody>
            {biddingLog.map((bid, index) => {
              const isLatest = index === biddingLog.length - 1;
              const isCurrentUser = bid.participantId === currentParticipantId;
              const time = new Date(bid.timestamp);
              const timeStr = time.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <tr
                  key={`${bid.participantId}-${bid.timestamp}`}
                  className={`
                    border-t border-gray-100 transition-all
                    ${isLatest ? 'bg-green-50 animate-pulse' : ''}
                    ${isCurrentUser ? 'bg-blue-50' : ''}
                  `}
                >
                  <td className="px-4 py-3">
                    <span
                      className={`font-medium ${
                        isCurrentUser ? 'text-blue-600' : 'text-gray-900'
                      }`}
                    >
                      {bid.teamName}
                    </span>
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-blue-500">(You)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-bold ${
                        isLatest ? 'text-green-600 text-lg' : 'text-gray-700'
                      }`}
                    >
                      ${bid.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-500">
                    {timeStr}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {biddingLog.length > 0 && (
        <div className="bg-green-100 px-4 py-3 border-t border-green-200">
          <p className="text-sm font-medium text-green-800">
            Current Bid: ${biddingLog[biddingLog.length - 1].amount.toFixed(2)} by{' '}
            {biddingLog[biddingLog.length - 1].teamName}
          </p>
        </div>
      )}
    </div>
  );
}
