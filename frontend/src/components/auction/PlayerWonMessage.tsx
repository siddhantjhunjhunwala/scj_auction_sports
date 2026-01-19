interface Props {
  message: string;
  isVisible: boolean;
}

export default function PlayerWonMessage({ message, isVisible }: Props) {
  if (!isVisible || !message) return null;

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
      <div className="bg-green-600 text-white px-8 py-6 rounded-xl shadow-2xl animate-bounce">
        <p className="text-2xl font-bold text-center">{message}</p>
      </div>
    </div>
  );
}
