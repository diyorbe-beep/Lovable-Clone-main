'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Palette, 
  Volume2, 
  Mic, 
  Hand, 
  Eye, 
  Moon, 
  Sun, 
  Monitor,
  Smartphone,
  Tablet,
  Zap,
  Sparkles,
  Settings,
  Download,
  Upload,
  RefreshCw,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCw,
  Move,
  Pointer,
  MousePointer,
  Touch,
  Keyboard,
  Command,
  Control,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Circle,
  Square,
  Triangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
  preview: string;
}

interface VoiceCommand {
  id: string;
  command: string;
  action: string;
  description: string;
  enabled: boolean;
}

interface Gesture {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

export default function PremiumFeatures() {
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [darkMode, setDarkMode] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [gestureEnabled, setGestureEnabled] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState('desktop');
  const [volume, setVolume] = useState([75]);
  const [speechRate, setSpeechRate] = useState([1]);
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const speechRef = useRef<SpeechRecognition | null>(null);

  const themes: Theme[] = [
    {
      name: 'default',
      colors: {
        primary: '#6366f1',
        secondary: '#8b5cf6',
        accent: '#ec4899',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1e293b'
      },
      preview: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
    },
    {
      name: 'ocean',
      colors: {
        primary: '#0891b2',
        secondary: '#0e7490',
        accent: '#06b6d4',
        background: '#f0f9ff',
        surface: '#e0f2fe',
        text: '#0c4a6e'
      },
      preview: 'linear-gradient(135deg, #0891b2, #06b6d4)'
    },
    {
      name: 'sunset',
      colors: {
        primary: '#f97316',
        secondary: '#ea580c',
        accent: '#fbbf24',
        background: '#fff7ed',
        surface: '#fed7aa',
        text: '#7c2d12'
      },
      preview: 'linear-gradient(135deg, #f97316, #fbbf24)'
    },
    {
      name: 'forest',
      colors: {
        primary: '#16a34a',
        secondary: '#15803d',
        accent: '#84cc16',
        background: '#f0fdf4',
        surface: '#dcfce7',
        text: '#14532d'
      },
      preview: 'linear-gradient(135deg, #16a34a, #84cc16)'
    },
    {
      name: 'midnight',
      colors: {
        primary: '#7c3aed',
        secondary: '#6d28d9',
        accent: '#a78bfa',
        background: '#1e1b4b',
        surface: '#312e81',
        text: '#e9d5ff'
      },
      preview: 'linear-gradient(135deg, #7c3aed, #a78bfa)'
    },
    {
      name: 'cherry',
      colors: {
        primary: '#dc2626',
        secondary: '#b91c1c',
        accent: '#f87171',
        background: '#fef2f2',
        surface: '#fee2e2',
        text: '#7f1d1d'
      },
      preview: 'linear-gradient(135deg, #dc2626, #f87171)'
    }
  ];

  const voiceCommands: VoiceCommand[] = [
    { id: '1', command: 'new project', action: 'createProject', description: 'Create a new project', enabled: true },
    { id: '2', command: 'open dashboard', action: 'openDashboard', description: 'Open the dashboard', enabled: true },
    { id: '3', command: 'start meeting', action: 'startMeeting', description: 'Start a team meeting', enabled: true },
    { id: '4', command: 'generate code', action: 'generateCode', description: 'Generate AI code', enabled: true },
    { id: '5', command: 'save work', action: 'saveWork', description: 'Save current work', enabled: true },
    { id: '6', command: 'show analytics', action: 'showAnalytics', description: 'Show analytics dashboard', enabled: true },
    { id: '7', command: 'toggle dark mode', action: 'toggleDarkMode', description: 'Toggle dark mode', enabled: true },
    { id: '8', command: 'search', action: 'search', description: 'Open search', enabled: true }
  ];

  const gestures: Gesture[] = [
    { id: '1', name: 'Swipe Right', description: 'Navigate to next page', icon: <ArrowRight className="h-4 w-4" />, enabled: true },
    { id: '2', name: 'Swipe Left', description: 'Navigate to previous page', icon: <ArrowLeft className="h-4 w-4" />, enabled: true },
    { id: '3', name: 'Swipe Up', description: 'Scroll up', icon: <ArrowUp className="h-4 w-4" />, enabled: true },
    { id: '4', name: 'Swipe Down', description: 'Scroll down', icon: <ArrowDown className="h-4 w-4" />, enabled: true },
    { id: '5', name: 'Pinch', description: 'Zoom in/out', icon: <Circle className="h-4 w-4" />, enabled: true },
    { id: '6', name: 'Double Tap', description: 'Like/Approve', icon: <Heart className="h-4 w-4" />, enabled: true },
    { id: '7', name: 'Long Press', description: 'Show context menu', icon: <Square className="h-4 w-4" />, enabled: true },
    { id: '8', name: 'Rotate', description: 'Rotate content', icon: <RotateCw className="h-4 w-4" />, enabled: true }
  ];

  useEffect(() => {
    // Initialize speech recognition
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      speechRef.current = new SpeechRecognition();
      speechRef.current.continuous = true;
      speechRef.current.interimResults = true;
      speechRef.current.lang = 'en-US';

      speechRef.current.onresult = (event: any) => {
        const last = event.results.length - 1;
        const command = event.results[last][0].transcript.toLowerCase();
        
        // Check if command matches any voice command
        const matchedCommand = voiceCommands.find(vc => 
          vc.enabled && command.includes(vc.command)
        );
        
        if (matchedCommand) {
          setLastCommand(matchedCommand.command);
          executeVoiceCommand(matchedCommand.action);
        }
      };

      speechRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }
  }, []);

  const toggleVoiceRecognition = () => {
    if (!speechRef.current) return;

    if (isListening) {
      speechRef.current.stop();
      setIsListening(false);
    } else {
      speechRef.current.start();
      setIsListening(true);
    }
  };

  const executeVoiceCommand = (action: string) => {
    // Mock implementation - in real app, execute actual commands
    console.log('Executing voice command:', action);
    
    // Add visual feedback
    const feedback = document.createElement('div');
    feedback.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
    feedback.textContent = `Command executed: ${action}`;
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      document.body.removeChild(feedback);
    }, 2000);
  };

  const applyTheme = (theme: Theme) => {
    // Apply theme colors to CSS variables
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    setSelectedTheme(theme.name);
  };

  const exportSettings = () => {
    const settings = {
      theme: selectedTheme,
      darkMode,
      voiceEnabled,
      gestureEnabled,
      volume: volume[0],
      speechRate: speechRate[0],
      voiceCommands: voiceCommands.filter(vc => vc.enabled).map(vc => vc.command),
      gestures: gestures.filter(g => g.enabled).map(g => g.name)
    };
    
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lovable-premium-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string);
        
        // Apply imported settings
        if (settings.theme) {
          const theme = themes.find(t => t.name === settings.theme);
          if (theme) applyTheme(theme);
        }
        
        setDarkMode(settings.darkMode || false);
        setVoiceEnabled(settings.voiceEnabled || false);
        setGestureEnabled(settings.gestureEnabled || false);
        setVolume([settings.volume || 75]);
        setSpeechRate([settings.speechRate || 1]);
        
        console.log('Settings imported successfully');
      } catch (error) {
        console.error('Failed to import settings:', error);
      }
    };
    reader.readAsText(file);
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'desktop':
        return <Monitor className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Sparkles className="h-6 w-6 mr-2 text-indigo-600" />
            Premium Features
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Advanced customization and accessibility features
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={exportSettings}>
            <Download className="h-4 w-4 mr-2" />
            Export Settings
          </Button>
          <Button variant="outline" onClick={() => document.getElementById('import-settings')?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import Settings
          </Button>
          <input
            id="import-settings"
            type="file"
            accept=".json"
            onChange={importSettings}
            className="hidden"
          />
        </div>
      </div>

      {/* Device Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Monitor className="h-5 w-5 mr-2" />
            Device Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desktop">
                  <div className="flex items-center">
                    <Monitor className="h-4 w-4 mr-2" />
                    Desktop
                  </div>
                </SelectItem>
                <SelectItem value="tablet">
                  <div className="flex items-center">
                    <Tablet className="h-4 w-4 mr-2" />
                    Tablet
                  </div>
                </SelectItem>
                <SelectItem value="mobile">
                  <div className="flex items-center">
                    <Smartphone className="h-4 w-4 mr-2" />
                    Mobile
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
              <span className="text-sm">Dark Mode</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Premium Features */}
      <Tabs defaultValue="themes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="themes">Themes</TabsTrigger>
          <TabsTrigger value="voice">Voice Control</TabsTrigger>
          <TabsTrigger value="gestures">Gestures</TabsTrigger>
          <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
        </TabsList>

        <TabsContent value="themes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="h-5 w-5 mr-2" />
                Custom Themes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {themes.map((theme) => (
                  <div
                    key={theme.name}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedTheme === theme.name
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    onClick={() => applyTheme(theme)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium capitalize">{theme.name}</h4>
                      {selectedTheme === theme.name && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                    <div
                      className="h-16 rounded-lg mb-3"
                      style={{ background: theme.preview }}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <div
                          className="w-6 h-6 rounded-full mx-auto mb-1"
                          style={{ backgroundColor: theme.colors.primary }}
                        />
                        <span className="text-xs">Primary</span>
                      </div>
                      <div className="text-center">
                        <div
                          className="w-6 h-6 rounded-full mx-auto mb-1"
                          style={{ backgroundColor: theme.colors.secondary }}
                        />
                        <span className="text-xs">Secondary</span>
                      </div>
                      <div className="text-center">
                        <div
                          className="w-6 h-6 rounded-full mx-auto mb-1"
                          style={{ backgroundColor: theme.colors.accent }}
                        />
                        <span className="text-xs">Accent</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voice" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mic className="h-5 w-5 mr-2" />
                Voice Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Voice Recognition</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Control the app with voice commands
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={voiceEnabled}
                    onCheckedChange={setVoiceEnabled}
                  />
                  <Button
                    onClick={toggleVoiceRecognition}
                    disabled={!voiceEnabled}
                    variant={isListening ? "destructive" : "default"}
                  >
                    {isListening ? (
                      <>
                        <div className="animate-pulse w-2 h-2 bg-white rounded-full mr-2"></div>
                        Listening...
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-2" />
                        Start Listening
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {lastCommand && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Last command: "{lastCommand}"
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Voice Settings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Volume</label>
                      <Slider
                        value={volume}
                        onValueChange={setVolume}
                        max={100}
                        step={1}
                        className="mt-2"
                      />
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                        <VolumeX className="h-3 w-3" />
                        <span>{volume[0]}%</span>
                        <Volume className="h-3 w-3" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Speech Rate</label>
                      <Slider
                        value={speechRate}
                        onValueChange={setSpeechRate}
                        min={0.5}
                        max={2}
                        step={0.1}
                        className="mt-2"
                      />
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                        <span>0.5x</span>
                        <span>{speechRate[0]}x</span>
                        <span>2x</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Available Commands</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {voiceCommands.map((command) => (
                      <div key={command.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={command.enabled}
                            onCheckedChange={(enabled) => {
                              // Update command enabled state
                              command.enabled = enabled;
                            }}
                          />
                          <div>
                            <p className="text-sm font-medium">"{command.command}"</p>
                            <p className="text-xs text-gray-500">{command.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gestures" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Hand className="h-5 w-5 mr-2" />
                Gesture Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Touch Gestures</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Navigate with touch gestures and hand movements
                  </p>
                </div>
                <Switch
                  checked={gestureEnabled}
                  onCheckedChange={setGestureEnabled}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {gestures.map((gesture) => (
                  <div
                    key={gesture.id}
                    className={`p-4 border rounded-lg ${
                      gesture.enabled
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {gesture.icon}
                        <span className="font-medium">{gesture.name}</span>
                      </div>
                      <Switch
                        checked={gesture.enabled}
                        onCheckedChange={(enabled) => {
                          gesture.enabled = enabled;
                        }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {gesture.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium mb-2">Gesture Tips</h4>
                <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <li>• Use two fingers for zoom gestures</li>
                  <li>• Swipe from edges for navigation</li>
                  <li>• Long press for context menus</li>
                  <li>• Double tap to like or approve</li>
                  <li>• Pinch to zoom in/out</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accessibility" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Accessibility Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">Visual Accessibility</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">High Contrast Mode</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Large Text</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Reduce Motion</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Focus Indicators</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Screen Reader Support</span>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Interaction Accessibility</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Keyboard Navigation</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Alternative Input</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Voice Control</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Gesture Control</span>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Switch Control</span>
                      <Switch />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-medium mb-2">WCAG 2.1 Compliance</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                    <p className="font-medium">Level A</p>
                    <p className="text-xs text-green-600">Compliant</p>
                  </div>
                  <div className="text-center">
                    <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                    <p className="font-medium">Level AA</p>
                    <p className="text-xs text-green-600">Compliant</p>
                  </div>
                  <div className="text-center">
                    <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
                    <p className="font-medium">Level AAA</p>
                    <p className="text-xs text-yellow-600">Partial</p>
                  </div>
                  <div className="text-center">
                    <Shield className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                    <p className="font-medium">Security</p>
                    <p className="text-xs text-blue-600">Enhanced</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
