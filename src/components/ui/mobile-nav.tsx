'use client';

import { useState } from 'react';
import { 
  Menu, 
  X, 
  Home, 
  Settings, 
  CreditCard,
  BarChart3,
  Bell,
  User,
  Search,
  LogOut,
  HelpCircle,
  Zap,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  notifications?: number;
}

export default function MobileNav({ user, notifications = 0 }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  /** Only routes that exist in the app (Lovable-style shell; expand as features land). */
  const navigation = [
    {
      name: 'Home',
      href: '/',
      icon: Home,
      current: pathname === '/',
    },
    {
      name: 'Pricing',
      href: '/pricing',
      icon: BarChart3,
      current: pathname === '/pricing',
    },
    {
      name: 'Billing',
      href: '/billing',
      icon: CreditCard,
      current: pathname === '/billing',
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      current: pathname === '/settings',
    },
  ];

  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleSearch = () => setSearchOpen(!searchOpen);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Zap className="h-6 w-6 text-indigo-600" />
            <span className="text-lg font-semibold text-gray-900 dark:text-white">Lovable AI</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-2">
            {/* Search */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSearch}
              className="h-8 w-8 p-0"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 relative"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {notifications > 9 ? '9+' : notifications}
                </span>
              )}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="text-xs">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-medium">
                  {user?.name}
                </div>
                <div className="px-2 py-1.5 text-xs text-gray-500">
                  {user?.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMenu}
              className="h-8 w-8 p-0"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Search Bar (Expandable) */}
        <div className={cn(
          "px-4 pb-3 overflow-hidden transition-all duration-200",
          searchOpen ? "max-h-16" : "max-h-0"
        )}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search projects, AI models, or settings..."
              className="pl-10 pr-4 h-10"
              autoFocus
            />
          </div>
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      <div className={cn(
        "lg:hidden fixed inset-0 z-40 transition-all duration-200",
        isOpen ? "block" : "hidden"
      )}>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={toggleMenu}
        />

        {/* Navigation Panel */}
        <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-xl">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <Zap className="h-6 w-6 text-indigo-600" />
                <span className="text-lg font-semibold text-gray-900 dark:text-white">Lovable AI</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMenu}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={toggleMenu}
                    className={cn(
                      'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      item.current
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                    )}
                  >
                    <item.icon className="mr-3 h-4 w-4" />
                    {item.name}
                  </Link>
                ))}
              </div>

              {/* Secondary Navigation */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="space-y-1">
                  <Link
                    href="/help"
                    onClick={toggleMenu}
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
                  >
                    <HelpCircle className="mr-3 h-4 w-4" />
                    Help Center
                  </Link>
                  <Link
                    href="/docs"
                    onClick={toggleMenu}
                    className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
                  >
                    <ChevronRight className="mr-3 h-4 w-4" />
                    API Docs
                  </Link>
                </div>
              </div>
            </nav>

            {/* User Section */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="text-xs">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Link
                  href="/profile"
                  onClick={toggleMenu}
                  className="block px-3 py-2 rounded-md text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white transition-colors"
                >
                  Profile Settings
                </Link>
                <button
                  className="block w-full text-left px-3 py-2 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation (Optional) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40">
        <div className="grid grid-cols-4 gap-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center py-2 px-1 text-xs transition-colors',
                item.current
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span className="truncate">{item.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Add padding to content to avoid bottom nav overlap */}
      <div className="lg:hidden h-16"></div>
    </>
  );
}
