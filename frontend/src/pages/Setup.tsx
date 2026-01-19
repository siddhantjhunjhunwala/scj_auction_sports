import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';

const PREDEFINED_AVATARS = [
  '/avatars/cricket-bat.png',
  '/avatars/cricket-ball.png',
  '/avatars/helmet.png',
  '/avatars/trophy.png',
  '/avatars/stadium.png',
  '/avatars/wicket.png',
];

const AVATAR_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
];

export default function Setup() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [teamName, setTeamName] = useState(user?.teamName || '');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(user?.avatarUrl || null);
  const [selectedColor, setSelectedColor] = useState<string>(AVATAR_COLORS[0]);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image must be less than 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomImage(reader.result as string);
        setSelectedAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!teamName.trim()) {
      setError('Please enter a team name');
      return;
    }

    setIsLoading(true);

    try {
      const avatarUrl = selectedAvatar || `color:${selectedColor}`;
      const response = await authApi.updateProfile({
        teamName: teamName.trim(),
        avatarUrl,
      });
      updateUser(response.data);
      navigate('/auction');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message :
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save profile. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Set Up Your Team</h1>
            <p className="mt-2 text-gray-600">Choose your team name and avatar</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-2">
                Team Name
              </label>
              <input
                id="teamName"
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Royal Challengers"
                maxLength={30}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Choose Avatar
              </label>

              <div className="space-y-6">
                {/* Color avatars */}
                <div>
                  <p className="text-sm text-gray-500 mb-3">Solid colors</p>
                  <div className="flex flex-wrap gap-3">
                    {AVATAR_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setSelectedColor(color);
                          setSelectedAvatar(null);
                          setCustomImage(null);
                        }}
                        className={`w-12 h-12 rounded-full ${color} transition transform hover:scale-110 ${
                          !selectedAvatar && selectedColor === color
                            ? 'ring-4 ring-indigo-500 ring-offset-2'
                            : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Predefined avatars */}
                <div>
                  <p className="text-sm text-gray-500 mb-3">Cricket icons</p>
                  <div className="flex flex-wrap gap-3">
                    {PREDEFINED_AVATARS.map((avatar) => (
                      <button
                        key={avatar}
                        type="button"
                        onClick={() => {
                          setSelectedAvatar(avatar);
                          setCustomImage(null);
                        }}
                        className={`w-12 h-12 rounded-full bg-gray-100 p-2 transition transform hover:scale-110 ${
                          selectedAvatar === avatar
                            ? 'ring-4 ring-indigo-500 ring-offset-2'
                            : ''
                        }`}
                      >
                        <img src={avatar} alt="" className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom upload */}
                <div>
                  <p className="text-sm text-gray-500 mb-3">Or upload your own</p>
                  <div className="flex items-center gap-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                      Upload Image
                    </button>
                    {customImage && (
                      <div
                        className={`w-12 h-12 rounded-full overflow-hidden ${
                          selectedAvatar === customImage
                            ? 'ring-4 ring-indigo-500 ring-offset-2'
                            : ''
                        }`}
                      >
                        <img
                          src={customImage}
                          alt="Custom avatar"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div
                  className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-white text-2xl font-bold ${
                    selectedAvatar
                      ? ''
                      : selectedColor
                  }`}
                  style={
                    selectedAvatar && !selectedAvatar.startsWith('color:')
                      ? {
                          backgroundImage: `url(${selectedAvatar})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : undefined
                  }
                >
                  {!selectedAvatar && teamName.slice(0, 2).toUpperCase()}
                </div>
                <p className="mt-3 text-lg font-semibold text-gray-900">
                  {teamName || 'Your Team Name'}
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? 'Saving...' : 'Continue to Auction'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
