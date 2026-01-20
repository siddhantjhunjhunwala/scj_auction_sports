import { useSocket } from '../../context/SocketContext';
import { AchievementNotification } from './AchievementNotification';

export function AchievementNotificationWrapper() {
  const { achievementNotification, clearAchievementNotification } = useSocket();

  if (!achievementNotification || achievementNotification.achievements.length === 0) {
    return null;
  }

  return (
    <AchievementNotification
      achievementTypes={achievementNotification.achievements}
      teamName={achievementNotification.teamName}
      onClose={clearAchievementNotification}
    />
  );
}

export default AchievementNotificationWrapper;
