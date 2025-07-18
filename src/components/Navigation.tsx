'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <nav className="bg-white shadow-lg border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold !text-gray-900">
                📱 Device Dashboard
              </Link>
            </div>
            {/* 데스크톱 네비게이션 */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <NavLink href="/" label="대시보드" />
              <NavLink href="/stats" label="통계" />
            </div>
          </div>
          
          <div className="flex items-center">
            <span className="hidden md:block text-sm !text-gray-500">
              실시간 디바이스 모니터링
            </span>
            
            {/* 모바일 햄버거 메뉴 버튼 */}
            <div className="sm:hidden ml-4">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md !text-gray-400 hover:!text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                aria-expanded="false"
              >
                <span className="sr-only">메뉴 열기</span>
                {isMobileMenuOpen ? (
                  // X 아이콘
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  // 햄버거 아이콘
                  <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* 모바일 드롭다운 메뉴 */}
        {isMobileMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
              <MobileNavLink 
                href="/" 
                label="📊 대시보드" 
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <MobileNavLink 
                href="/stats" 
                label="📈 통계" 
                onClick={() => setIsMobileMenuOpen(false)}
              />
            </div>
            {/* 모바일에서 설명 텍스트 */}
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="px-4">
                <div className="text-sm !text-gray-500 text-center">
                  실시간 디바이스 모니터링
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
        isActive
          ? 'border-blue-500 !text-gray-900'
          : 'border-transparent !text-gray-500 hover:border-gray-300 hover:!text-gray-700'
      }`}
    >
      {label}
    </Link>
  )
}

function MobileNavLink({ href, label, onClick }: { href: string; label: string; onClick: () => void }) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors ${
        isActive
          ? 'bg-blue-50 border-blue-500 !text-blue-700'
          : 'border-transparent !text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:!text-gray-800'
      }`}
    >
      {label}
    </Link>
  )
}