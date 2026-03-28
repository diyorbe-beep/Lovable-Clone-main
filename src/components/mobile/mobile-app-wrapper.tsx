'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  ChevronLeft, 
  ChevronRight, 
  Home, 
  Search, 
  Bell, 
  User, 
  Settings,
  Zap,
  Code,
  Users,
  BarChart3,
  CreditCard,
  Menu,
  X,
  ArrowUp,
  Download,
  Share2,
  Heart,
  MessageCircle,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCw,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  Signal,
  SignalLow
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';

interface MobileAppWrapperProps {
  children: React.ReactNode;
  device?: 'phone' | 'tablet' | 'desktop';
}

export default function MobileAppWrapper({ children, device = 'phone' }: MobileAppWrapperProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(85);
  const [signalStrength, setSignalStrength] = useState(4);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180);
  const [showControls, setShowControls] = useState(true);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [activeTab, setActiveTab] = useState('home');
  const [notifications, setNotifications] = useState(3);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Detect if we're on a mobile device
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Simulate network status changes
    const networkInterval = setInterval(() => {
      setIsOnline(Math.random() > 0.1);
    }, 10000);
    
    // Simulate battery drain
    const batteryInterval = setInterval(() => {
      setBatteryLevel(prev => Math.max(0, prev - Math.random() * 2));
    }, 30000);
    
    // Simulate signal changes
    const signalInterval = setInterval(() => {
      setSignalStrength(Math.floor(Math.random() * 5));
    }, 20000);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearInterval(networkInterval);
      clearInterval(batteryInterval);
      clearInterval(signalInterval);
    };
  }, []);

  useEffect(() => {
    // Auto-hide controls after 3 seconds
    const resetControlsTimeout = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    if (isPlaying) {
      resetControlsTimeout();
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  const handleDeviceRotation = () => {
    setOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait');
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    setIsMuted(value[0] === 0);
  };

  const handleSeek = (value: number[]) => {
    setCurrentTime(value[0]);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDeviceIcon = () => {
    switch (device) {
      case 'phone':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      case 'desktop':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Smartphone className="h-4 w-4" />;
    }
  };

  const getBatteryIcon = () => {
    if (batteryLevel > 60) return <Battery className="h-4 w-4" />;
    if (batteryLevel > 20) return <BatteryLow className="h-4 w-4" />;
    return <BatteryLow className="h-4 w-4 text-red-500" />;
  };

  const getSignalIcon = () => {
    if (signalStrength > 3) return <Signal className="h-4 w-4" />;
    return <SignalLow className="h-4 w-4" />;
  };

  const renderStatusBar = () => (
    <div className="flex items-center justify-between px-4 py-1 bg-black text-white text-xs">
      <div className="flex items-center space-x-2">
        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <div className="flex items-center space-x-1">
          {getSignalIcon()}
          <Wifi className={isOnline ? 'h-3 w-3' : 'h-3 w-3 opacity-50'} />
          <span className={isOnline ? '' : 'opacity-50'}>{isOnline ? '4G' : 'Offline'}</span>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          {getBatteryIcon()}
          <span>{batteryLevel}%</span>
        </div>
      </div>
    </div>
  );

  const renderNavigation = () => (
    <div className="flex items-center justify-around py-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setActiveTab('home')}
        className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
          activeTab === 'home' ? 'text-indigo-600' : 'text-gray-600 dark:text-gray-400'
        }`}
      >
        <Home className="h-5 w-5" />
        <span className="text-xs">Home</span>
      </button>
      
      <button
        onClick={() => setActiveTab('search')}
        className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
          activeTab === 'search' ? 'text-indigo-600' : 'text-gray-600 dark:text-gray-400'
        }`}
      >
        <Search className="h-5 w-5" />
        <span className="text-xs">Search</span>
      </button>
      
      <button
        onClick={() => setActiveTab('ai')}
        className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
          activeTab === 'ai' ? 'text-indigo-600' : 'text-gray-600 dark:text-gray-400'
        }`}
      >
        <Zap className="h-5 w-5" />
        <span className="text-xs">AI</span>
      </button>
      
      <button
        onClick={() => setActiveTab('projects')}
        className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
          activeTab === 'projects' ? 'text-indigo-600' : 'text-gray-600 dark:text-gray-400'
        }`}
      >
        <Code className="h-5 w-5" />
        <span className="text-xs">Projects</span>
      </button>
      
      <button
        onClick={() => setActiveTab('profile')}
        className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors relative ${
          activeTab === 'profile' ? 'text-indigo-600' : 'text-gray-600 dark:text-gray-400'
        }`}
      >
        <User className="h-5 w-5" />
        <span className="text-xs">Profile</span>
        {notifications > 0 && (
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
            {notifications}
          </span>
        )}
      </button>
    </div>
  );

  const renderMediaControls = () => (
    <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity ${
      showControls ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className="mb-3">
        <Progress value={(currentTime / duration) * 100} className="h-1" />
        <div className="flex items-center justify-between text-white text-xs mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button className="text-white/80 hover:text-white transition-colors">
            <SkipBack className="h-5 w-5" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="text-white hover:text-white transition-colors"
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </button>
          <button className="text-white/80 hover:text-white transition-colors">
            <SkipForward className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-white/80 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <div className="w-20">
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="h-1"
            />
          </div>
          <button className="text-white/80 hover:text-white transition-colors">
            <Maximize2 className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderSidebar = () => (
    <div className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform z-50 ${
      sidebarOpen ? 'translate-x-0' : '-translate-x-full'
    }`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold">Menu</h3>
        <button
          onClick={() => setSidebarOpen(false)}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <nav className="p-4 space-y-2">
        <button className="flex items-center space-x-3 w-full p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <Home className="h-5 w-5" />
          <span>Home</span>
        </button>
        <button className="flex items-center space-x-3 w-full p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <Search className="h-5 w-5" />
          <span>Search</span>
        </button>
        <button className="flex items-center space-x-3 w-full p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <Zap className="h-5 w-5" />
          <span>AI Assistant</span>
        </button>
        <button className="flex items-center space-x-3 w-full p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <Code className="h-5 w-5" />
          <span>Projects</span>
        </button>
        <button className="flex items-center space-x-3 w-full p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <Users className="h-5 w-5" />
          <span>Collaboration</span>
        </button>
        <button className="flex items-center space-x-3 w-full p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <BarChart3 className="h-5 w-5" />
          <span>Analytics</span>
        </button>
        <button className="flex items-center space-x-3 w-full p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <CreditCard className="h-5 w-5" />
          <span>Billing</span>
        </button>
        <button className="flex items-center space-x-3 w-full p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </button>
      </nav>
    </div>
  );

  const renderDeviceFrame = () => {
    const baseClasses = "relative bg-black rounded-3xl shadow-2xl overflow-hidden";
    
    switch (device) {
      case 'phone':
        return (
          <div className={`${baseClasses} w-80 h-[600px] ${orientation === 'landscape' ? 'w-[600px] h-80' : ''}`}>
            {/* Phone frame */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl"></div>
            
            {/* Screen */}
            <div className="absolute inset-2 bg-white dark:bg-gray-900 rounded-2xl overflow-hidden">
              {renderStatusBar()}
              <div className="h-full pb-14">
                {children}
              </div>
              {renderNavigation()}
            </div>
            
            {/* Controls overlay */}
            {isPlaying && renderMediaControls()}
          </div>
        );
        
      case 'tablet':
        return (
          <div className={`${baseClasses} w-[600px] h-[800px] ${orientation === 'landscape' ? 'w-[800px] h-600px' : ''}`}>
            {/* Tablet frame */}
            <div className="absolute inset-2 bg-white dark:bg-gray-900 rounded-xl overflow-hidden">
              {renderStatusBar()}
              <div className="h-full pb-16">
                {children}
              </div>
              {renderNavigation()}
            </div>
          </div>
        );
        
      case 'desktop':
        return (
          <div className={`${baseClasses} w-full max-w-4xl h-[600px]`}>
            {/* Desktop frame */}
            <div className="absolute inset-4 bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
              {renderStatusBar()}
              <div className="h-full">
                {children}
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  const renderMobileFeatures = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 dark:text-gray-400"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center space-x-2">
            {getDeviceIcon()}
            <span className="font-semibold">Lovable AI</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="text-gray-600 dark:text-gray-400">
            <Search className="h-5 w-5" />
          </button>
          <div className="relative">
            <button className="text-gray-600 dark:text-gray-400">
              <Bell className="h-5 w-5" />
            </button>
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                {notifications}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Device controls */}
      <div className="flex items-center justify-center space-x-4 p-4 bg-gray-100 dark:bg-gray-800">
        <button
          onClick={handleDeviceRotation}
          className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-gray-700 rounded-lg shadow"
        >
          <RotateCw className="h-4 w-4" />
          <span className="text-sm">Rotate</span>
        </button>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setDevice('phone')}
            className={`p-2 rounded-lg ${device === 'phone' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700'}`}
          >
            <Smartphone className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDevice('tablet')}
            className={`p-2 rounded-lg ${device === 'tablet' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700'}`}
          >
            <Tablet className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDevice('desktop')}
            className={`p-2 rounded-lg ${device === 'desktop' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700'}`}
          >
            <Monitor className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            checked={isOnline}
            onCheckedChange={setIsOnline}
          />
          <span className="text-sm">{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      {/* Mobile features showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Download className="h-5 w-5 mr-2" />
              Offline Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Works seamlessly without internet connection. Cache your data and continue working offline.
            </p>
            <div className="mt-3 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600">Available</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2" />
              Push Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Real-time notifications for important updates, messages, and system alerts.
            </p>
            <div className="mt-3 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600">Enabled</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Share2 className="h-5 w-5 mr-2" />
              Native Sharing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Share content directly to other apps using native sharing capabilities.
            </p>
            <div className="mt-3 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600">Supported</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Heart className="h-5 w-5 mr-2" />
              Haptic Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enhanced user experience with tactile feedback for interactions and notifications.
            </p>
            <div className="mt-3 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600">Enabled</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageCircle className="h-5 w-5 mr-2" />
              Voice Commands
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Control the app using voice commands and speech-to-text capabilities.
            </p>
            <div className="mt-3 flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-yellow-600">Beta</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ArrowUp className="h-5 w-5 mr-2" />
              Background Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Automatic data synchronization in the background for seamless experience.
            </p>
            <div className="mt-3 flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-600">Active</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Mobile Application
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Native mobile experience with advanced features
        </p>
      </div>

      {/* Mobile features */}
      {renderMobileFeatures()}

      {/* Device preview */}
      <div className="flex justify-center">
        {renderDeviceFrame()}
      </div>

      {/* Sidebar */}
      {renderSidebar()}

      {/* Floating action button for mobile */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
